package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	commissionRate    = 0.0005 // 手续费率 万五
	commissionMinFee  = 5.0    // 最低手续费 5 元
	defaultInitCash   = 100000.0
)

// validSymbol 验证股票代码格式（6位数字），防止命令注入
func validSymbol(s string) bool {
	if len(s) != 6 {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// validPeriod 验证周期参数白名单
func validPeriod(p string) bool {
	switch p {
	case "daily", "15", "60", "30", "5", "1":
		return true
	}
	return false
}

// ---- Hot Stocks Cache ----

type hotStocksCache struct {
	stocks   []map[string]interface{}
	cachedAt time.Time
}

var hotStocksCacheStore sync.Map // key: "hot_stocks", value: hotStocksCache

// ---- Generic in-memory cache ----

type memCacheEntry struct {
	data     []byte
	cachedAt time.Time
}

var memCache sync.Map // key: string, value: memCacheEntry

// cacheGet returns cached bytes if within TTL, else nil.
func cacheGet(key string, ttl time.Duration) []byte {
	if v, ok := memCache.Load(key); ok {
		e := v.(memCacheEntry)
		if time.Since(e.cachedAt) < ttl {
			return e.data
		}
	}
	return nil
}

func cacheSet(key string, data []byte) {
	memCache.Store(key, memCacheEntry{data: data, cachedAt: time.Now()})
	// Persist to DB for stale fallback (best-effort)
	db.Exec(`INSERT INTO api_cache(key, value, fetched_at) VALUES(?,?,CURRENT_TIMESTAMP)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value, fetched_at=excluded.fetched_at`, key, string(data))
}

// cacheGetStale returns DB-persisted value regardless of age (fallback when live fetch fails).
func cacheGetStale(key string) []byte {
	var val string
	if err := db.QueryRow(`SELECT value FROM api_cache WHERE key=?`, key).Scan(&val); err == nil {
		return []byte(val)
	}
	return nil
}

// sectorMap defines sector -> symbol list mapping
var sectorMap = map[string][]string{
	"有色金属": {"601899"},
	"白酒":   {"600519"},
	"新能源":  {"300750"},
	"金融":   {"601318"},
	"银行":   {"000001"},
}

// getStockChangePct queries the last two daily closes for a symbol and returns
// (todayClose, changePct, ok). ok is false when there is insufficient data.
func getStockChangePct(symbol string) (float64, float64, bool) {
	rows, err := db.Query(
		"SELECT close FROM stock_bars WHERE symbol = ? AND period = 'daily' ORDER BY date DESC LIMIT 2",
		symbol,
	)
	if err != nil {
		return 0, 0, false
	}
	defer rows.Close()

	var closes []float64
	for rows.Next() {
		var c float64
		if err := rows.Scan(&c); err != nil {
			continue
		}
		closes = append(closes, c)
	}
	if len(closes) < 2 {
		return 0, 0, false
	}
	today := closes[0]
	prev := closes[1]
	if prev == 0 {
		return today, 0, false
	}
	changePct := (today - prev) / prev * 100
	return today, changePct, true
}

// handleHotStocks handles GET /api/market/hot-stocks (public)
func handleHotStocks(c *gin.Context) {
	const cacheKey = "hot_stocks"
	const cacheTTL = 60 * time.Second

	// Check cache
	if v, ok := hotStocksCacheStore.Load(cacheKey); ok {
		cached := v.(hotStocksCache)
		if time.Since(cached.cachedAt) < cacheTTL {
			c.JSON(http.StatusOK, gin.H{
				"stocks":    cached.stocks,
				"cached_at": cached.cachedAt.UTC().Format(time.RFC3339),
			})
			return
		}
	}

	// Query all known symbols
	type stockEntry struct {
		symbol    string
		name      string
		close     float64
		changePct float64
	}
	var entries []stockEntry
	for symbol, name := range stockNames {
		todayClose, changePct, ok := getStockChangePct(symbol)
		if !ok {
			continue
		}
		entries = append(entries, stockEntry{symbol, name, todayClose, changePct})
	}

	// Sort descending by changePct
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].changePct > entries[j].changePct
	})

	// Take top 10
	if len(entries) > 10 {
		entries = entries[:10]
	}

	stocks := make([]map[string]interface{}, 0, len(entries))
	for _, e := range entries {
		stocks = append(stocks, map[string]interface{}{
			"symbol":     e.symbol,
			"name":       e.name,
			"close":      e.close,
			"change_pct": e.changePct,
		})
	}

	// Update cache
	now := time.Now()
	hotStocksCacheStore.Store(cacheKey, hotStocksCache{stocks: stocks, cachedAt: now})

	c.JSON(http.StatusOK, gin.H{
		"stocks":    stocks,
		"cached_at": "",
	})
}

// handleSectors handles GET /api/market/sectors (public)
func handleSectors(c *gin.Context) {
	type sectorResult struct {
		name       string
		changePct  float64
		leader     string
		leaderName string
	}

	var results []sectorResult

	for sectorName, symbols := range sectorMap {
		var totalChangePct float64
		var count int
		var leaderSymbol string
		var leaderChangePct float64
		first := true

		for _, symbol := range symbols {
			_, changePct, ok := getStockChangePct(symbol)
			if !ok {
				continue
			}
			totalChangePct += changePct
			count++
			if first || changePct > leaderChangePct {
				leaderChangePct = changePct
				leaderSymbol = symbol
				first = false
			}
		}

		avg := 0.0
		if count > 0 {
			avg = totalChangePct / float64(count)
		}

		leaderName := stockNames[leaderSymbol]
		if leaderName == "" {
			leaderName = leaderSymbol
		}

		results = append(results, sectorResult{
			name:       sectorName,
			changePct:  avg,
			leader:     leaderSymbol,
			leaderName: leaderName,
		})
	}

	// Sort descending by changePct
	sort.Slice(results, func(i, j int) bool {
		return results[i].changePct > results[j].changePct
	})

	// Take top 5
	if len(results) > 5 {
		results = results[:5]
	}

	sectors := make([]map[string]interface{}, 0, len(results))
	for _, r := range results {
		sectors = append(sectors, map[string]interface{}{
			"name":        r.name,
			"change_pct":  r.changePct,
			"leader":      r.leader,
			"leader_name": r.leaderName,
		})
	}

	c.JSON(http.StatusOK, gin.H{"sectors": sectors})
}

// Portfolio Handlers
func handlePortfolio(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	portfolioMutex.Lock()
	defer portfolioMutex.Unlock()

	period := c.DefaultQuery("period", "15")
	rangeParam := c.DefaultQuery("range", "all")

	p, err := loadPortfolio(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	totalAssets := p.Cash

	totalAssets1h := p.Cash
	totalAssets1d := p.Cash

	details := make(map[string]interface{})

	for symbol, hold := range p.Holdings {
		lastPrice := 0.0
		db.QueryRow("SELECT close FROM stock_bars WHERE symbol = ? AND period = ? ORDER BY date DESC LIMIT 1", symbol, period).Scan(&lastPrice)

		price1h := 0.0
		db.QueryRow("SELECT close FROM stock_bars WHERE symbol = ? AND period = '15' ORDER BY date DESC LIMIT 1 OFFSET 4", symbol).Scan(&price1h)
		if price1h == 0 { price1h = lastPrice }

		price1d := 0.0
		db.QueryRow("SELECT close FROM stock_bars WHERE symbol = ? AND period = 'daily' ORDER BY date DESC LIMIT 1 OFFSET 1", symbol).Scan(&price1d)
		if price1d == 0 { price1d = lastPrice }

		totalAssets += hold.Shares * lastPrice
		totalAssets1h += hold.Shares * price1h
		totalAssets1d += hold.Shares * price1d

		name := stockNames[symbol]
		if name == "" {
			name = symbol
		}

		details[symbol] = map[string]interface{}{
			"name": name, "shares": hold.Shares, "cost": hold.Cost, "price": lastPrice,
			"available": hold.Available, "last_date": hold.LastDate,
			"pnl":     (lastPrice - hold.Cost) * hold.Shares,
			"pnl_pct": (lastPrice - hold.Cost) / hold.Cost * 100,
			"profile": stockProfiles[symbol],
		}
	}

	pnl1hPct := 0.0
	if totalAssets1h > 0 {
		pnl1hPct = (totalAssets - totalAssets1h) / totalAssets1h * 100
	}
	pnl1dPct := 0.0
	if totalAssets1d > 0 {
		pnl1dPct = (totalAssets - totalAssets1d) / totalAssets1d * 100
	}

	// Load equity history
	var allHistory []EquitySnapshot
	var rawHistory string
	db.QueryRow("SELECT COALESCE(equity_history_json, '[]') FROM portfolios WHERE user_id = ?", userID).Scan(&rawHistory)
	if err := json.Unmarshal([]byte(rawHistory), &allHistory); err != nil {
		allHistory = []EquitySnapshot{}
	}

	// Filter by range
	var filteredHistory []EquitySnapshot
	switch rangeParam {
	case "7d":
		cutoff := time.Now().AddDate(0, 0, -7).Format("2006-01-02")
		for _, s := range allHistory {
			if s.Date >= cutoff {
				filteredHistory = append(filteredHistory, s)
			}
		}
	case "30d":
		cutoff := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
		for _, s := range allHistory {
			if s.Date >= cutoff {
				filteredHistory = append(filteredHistory, s)
			}
		}
	default: // "all"
		filteredHistory = allHistory
	}
	if filteredHistory == nil {
		filteredHistory = []EquitySnapshot{}
	}

	// Compute metrics from filteredHistory
	mdd, sharpe, winRate := calcEquityMetrics(filteredHistory)

	c.JSON(http.StatusOK, gin.H{
		"total_assets":   totalAssets,
		"cash":           p.Cash,
		"initial_cash":   p.InitialCash,
		"position_value": totalAssets - p.Cash,
		"holdings":       details,
		"history":        p.History,
		"total_pnl":      totalAssets - p.InitialCash,
		"total_pnl_pct":  (totalAssets - p.InitialCash) / p.InitialCash * 100,
		"equity_history": filteredHistory,
		"metrics": map[string]float64{
			"mdd":      mdd,
			"win_rate": winRate,
			"sharpe":   sharpe,
			"pnl_1h":   pnl1hPct,
			"pnl_1d":   pnl1dPct,
		},
	})
}

// calcEquityMetrics computes MDD, Sharpe ratio, and win rate from equity snapshots.
func calcEquityMetrics(history []EquitySnapshot) (mdd, sharpe, winRate float64) {
	n := len(history)
	if n < 2 {
		return 0, 0, 0
	}

	// Daily returns
	returns := make([]float64, 0, n-1)
	for i := 1; i < n; i++ {
		prev := history[i-1].Value
		if prev == 0 {
			continue
		}
		returns = append(returns, (history[i].Value-prev)/prev)
	}

	if len(returns) == 0 {
		return 0, 0, 0
	}

	// MDD
	peak := history[0].Value
	for _, s := range history {
		if s.Value > peak {
			peak = s.Value
		}
		if peak > 0 {
			dd := (peak - s.Value) / peak
			if dd > mdd {
				mdd = dd
			}
		}
	}

	// Sharpe = mean(returns) / std(returns) * sqrt(252)
	sum := 0.0
	for _, r := range returns {
		sum += r
	}
	mean := sum / float64(len(returns))

	variance := 0.0
	for _, r := range returns {
		diff := r - mean
		variance += diff * diff
	}
	variance /= float64(len(returns))
	std := math.Sqrt(variance)
	if std > 0 {
		sharpe = mean / std * math.Sqrt(252)
	}

	// Win rate = positive return days / total days
	positive := 0
	for _, r := range returns {
		if r > 0 {
			positive++
		}
	}
	winRate = float64(positive) / float64(len(returns))

	return mdd, sharpe, winRate
}

func handleTrade(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	var req struct {
		Symbol string  `json:"symbol"`
		Action string  `json:"action"`
		Price  float64 `json:"price"`
		Qty    float64 `json:"qty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	portfolioMutex.Lock()
	defer portfolioMutex.Unlock()

	p, _ := loadPortfolio(userID)

	// 获取当前行情日期和前一收盘价
	currentDate := ""
	prevClose := 0.0
	db.QueryRow("SELECT date, close FROM stock_bars WHERE symbol = ? AND period = 'daily' ORDER BY date DESC LIMIT 1", req.Symbol).Scan(&currentDate, &prevClose)
	if currentDate != "" {
		currentDate = strings.Split(currentDate, " ")[0]
	}

	req.Action = strings.ToLower(req.Action)
	hold := p.Holdings[req.Symbol]

	if prevClose > 0 {
		upperLimit := prevClose * 1.10
		lowerLimit := prevClose * 0.90
		if req.Price > upperLimit {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"msg":    fmt.Sprintf("涨停限制：交易价 ¥%.2f 超过涨停价 ¥%.2f (前收 ¥%.2f × 110%%)", req.Price, upperLimit, prevClose),
			})
			return
		}
		if req.Price < lowerLimit {
			c.JSON(http.StatusBadRequest, gin.H{
				"status": "error",
				"msg":    fmt.Sprintf("跌停限制：交易价 ¥%.2f 低于跌停价 ¥%.2f (前收 ¥%.2f × 90%%)", req.Price, lowerLimit, prevClose),
			})
			return
		}
	}

	amount := req.Price * req.Qty
	fee := math.Max(amount*commissionRate, commissionMinFee)

	var res map[string]interface{}

	if req.Action == "buy" {
		if p.Cash < amount+fee {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "msg": "资金不足"})
			return
		}

		totalCost := hold.Shares*hold.Cost + amount
		hold.Shares += req.Qty
		hold.Cost = totalCost / hold.Shares
		hold.LastDate = currentDate
		p.Cash -= (amount + fee)
		p.Holdings[req.Symbol] = hold
		res = map[string]interface{}{
			"status": "success", "msg": "买入成功", "qty_traded": req.Qty, "price": req.Price, "remaining_shares": hold.Shares,
		}
	} else {
		// T+1: 如果当前日期比最后买入日期更新，则所有持仓都可卖
		// 如果 currentDate 为空（无行情数据），使用今天日期作为 fallback
		effectiveDate := currentDate
		if effectiveDate == "" {
			effectiveDate = time.Now().Format("2006-01-02")
		}
		if effectiveDate > hold.LastDate && hold.LastDate != "" {
			hold.Available = hold.Shares
		}
		if req.Qty > hold.Available {
			c.JSON(http.StatusBadRequest, gin.H{"status": "error", "msg": "T+1 限制：今日买入部分不可卖出"})
			return
		}

		realized := (req.Price - hold.Cost) * req.Qty
		hold.Shares -= req.Qty
		hold.Available -= req.Qty
		p.Cash += (amount - fee)
		if hold.Shares <= 0 {
			delete(p.Holdings, req.Symbol)
		} else {
			p.Holdings[req.Symbol] = hold
		}
		res = map[string]interface{}{
			"status":           "success",
			"msg":              "卖出成功",
			"realized_pnl":     realized,
			"qty_traded":       req.Qty,
			"remaining_shares": hold.Shares,
			"price":            req.Price,
		}
	}

	tradeLog := TradeLog{
		Date:   time.Now().Format("2006-01-02 15:04:05"),
		Symbol: req.Symbol,
		Name:   stockNames[req.Symbol],
		Action: req.Action,
		Price:  req.Price,
		Shares: req.Qty,
		Fee:    fee,
	}
	p.History = append([]TradeLog{tradeLog}, p.History...)

	tx, _ := db.Begin()
	defer tx.Rollback()

	if hold.Shares > 0 {
		_, _ = tx.Exec("INSERT OR REPLACE INTO holdings (user_id, symbol, shares, cost, available, last_date) VALUES (?, ?, ?, ?, ?, ?)",
			userID, req.Symbol, hold.Shares, hold.Cost, hold.Available, hold.LastDate)
	} else {
		_, _ = tx.Exec("DELETE FROM holdings WHERE user_id = ? AND symbol = ?", userID, req.Symbol)
	}

	tradeResult, _ := tx.Exec("INSERT INTO trades (user_id, date, symbol, name, action, price, shares, fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		userID, tradeLog.Date, tradeLog.Symbol, tradeLog.Name, tradeLog.Action, tradeLog.Price, tradeLog.Shares, tradeLog.Fee)
	if tradeResult != nil {
		if id, err := tradeResult.LastInsertId(); err == nil {
			tradeLog.ID = int(id)
		}
	}

	_, _ = tx.Exec("UPDATE portfolios SET cash = ? WHERE user_id = ?", p.Cash, userID)
	tx.Commit()

	// After a successful sell, snapshot total assets into equity history
	if req.Action != "buy" {
		totalAssets := p.Cash
		for sym, h := range p.Holdings {
			var lastClose float64
			db.QueryRow("SELECT close FROM stock_bars WHERE symbol = ? AND period = 'daily' ORDER BY date DESC LIMIT 1", sym).Scan(&lastClose)
			totalAssets += h.Shares * lastClose
		}
		updateEquityHistory(userID, totalAssets)
	}

	c.JSON(http.StatusOK, res)
}

// AI Handlers
func handleRefresh(c *gin.Context) {
	symbol := c.DefaultQuery("symbol", "601899")
	period := c.DefaultQuery("period", "15")
	if period != "daily" {
		period = strings.TrimSuffix(period, "m")
	}

	if !validSymbol(symbol) || !validPeriod(period) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的股票代码或周期参数"})
		return
	}

	lastRefreshLock.Lock()
	key := symbol + "_" + period
	if last, ok := lastRefresh[key]; ok {
		remaining := refreshCooldown - time.Since(last)
		if remaining > 0 {
			lastRefreshLock.Unlock()
			c.JSON(http.StatusOK, gin.H{
				"status":             "cooldown",
				"msg":                fmt.Sprintf("请等待 %d 秒后再刷新（防止数据源封禁）", int(remaining.Seconds())),
				"cooldown_remaining": int(remaining.Seconds()),
			})
			return
		}
	}
	lastRefresh[key] = time.Now()
	lastRefreshLock.Unlock()

	start := time.Now()
	steps := []string{}

	// 优先用新浪财经直接拉取（Go 原生，无需 Python）
	steps = append(steps, "数据获取 开始（新浪财经）")
	if err := syncSinaDataToDB(symbol); err != nil {
		steps = append(steps, "数据获取 失败: "+err.Error()+" — 尝试 Python 备用方案")
		// fallback: Python scripts
		scripts := []struct{ n, s string }{
			{"数据获取", "fetch_data.py"},
			{"特征工程", "prepare_features.py"},
			{"模型训练", "train_model.py"},
			{"回测评估", "backtest.py"},
		}
		for _, sc := range scripts {
			cmd := exec.Command("python3", sc.s, "--symbol", symbol, "--period", period)
			cmd.Dir = projectDir
			if out, err := cmd.CombinedOutput(); err == nil {
				steps = append(steps, sc.n+" 完成")
			} else {
				steps = append(steps, sc.n+" 失败: "+string(out))
				break
			}
		}
		// 导入 CSV 到数据库
		if period == "daily" {
			importStockBars("stock_" + symbol + ".csv")
			importFeatures("features_" + symbol + "_v3.csv")
		} else {
			importStockBars("stock_" + symbol + "_" + period + "m.csv")
			importFeatures("features_" + symbol + "_" + period + "m_v3.csv")
		}
	} else {
		steps = append(steps, "数据获取 完成")
		steps = append(steps, "特征工程 完成")
		steps = append(steps, "数据库同步完成")
	}

	c.JSON(http.StatusOK, gin.H{"duration": time.Since(start).String(), "steps": steps, "status": "success"})
}

func handleSignal(c *gin.Context) {
	symbol := c.DefaultQuery("symbol", "601899")
	period := c.DefaultQuery("period", "15")
	if period != "daily" {
		period = strings.TrimSuffix(period, "m")
	}

	if !validSymbol(symbol) || !validPeriod(period) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效参数"})
		return
	}

	cmd := exec.Command("python3", "predict.py", "--symbol", symbol, "--period", period)
	cmd.Dir = projectDir
	out, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"error": "未训练模型"})
		return
	}
	c.Data(http.StatusOK, "application/json", out)
}

func handleIndicators(c *gin.Context) {
	symbol := c.DefaultQuery("symbol", "601899")
	period := c.DefaultQuery("period", "15")
	if period != "daily" {
		period = strings.TrimSuffix(period, "m")
	}

	rows, err := db.Query(`SELECT date, open, high, low, close, volume, ma5, ma20, rsi14, macd_hist 
		FROM features WHERE symbol = ? AND period = ? ORDER BY date ASC`, symbol, period)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败: " + err.Error()})
		return
	}
	defer rows.Close()

	type Row struct {
		Time   string  `json:"time"`
		Open   float64 `json:"open"`
		High   float64 `json:"high"`
		Low    float64 `json:"low"`
		Close  float64 `json:"close"`
		Volume float64 `json:"volume"`
		MA5    float64 `json:"ma5"`
		MA20   float64 `json:"ma20"`
		RSI    float64 `json:"rsi"`
		MACD   float64 `json:"macd"`
	}

	var data []Row
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.Time, &r.Open, &r.High, &r.Low, &r.Close, &r.Volume, &r.MA5, &r.MA20, &r.RSI, &r.MACD); err != nil {
			continue
		}
		data = append(data, r)
	}

	if len(data) == 0 {
		// 后台异步触发数据拉取，不阻塞请求
		go func() {
			cmd := exec.Command("python3", "fetch_data.py", "--symbol", symbol, "--period", period)
			cmd.Dir = projectDir
			cmd.Run()
		}()
		c.JSON(http.StatusOK, gin.H{"error": "暂无数据，已触发后台拉取，请 30 秒后刷新", "stale": true, "data": []interface{}{}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data, "stale": false})
}

func handleBacktest(c *gin.Context) {
	symbol := c.DefaultQuery("symbol", "601899")
	period := c.DefaultQuery("period", "15")

	fname := filepath.Join("data", fmt.Sprintf("backtest_results_%s.csv", symbol))
	if period != "daily" {
		fname = filepath.Join("data", fmt.Sprintf("backtest_results_%s_%sm.csv", symbol, period))
	}

	data, err := os.ReadFile(filepath.Join(projectDir, fname))
	if err != nil {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var curve []interface{}
	for i, line := range lines {
		if i == 0 {
			continue
		}
		p := strings.Split(line, ",")
		if len(p) < 5 {
			continue
		}
		s, _ := strconv.ParseFloat(p[3], 64)
		h, _ := strconv.ParseFloat(p[4], 64)
		curve = append(curve, map[string]interface{}{"date": p[0], "strategy": s, "hold": h})
	}
	c.JSON(http.StatusOK, curve)
}

func handleStocks(c *gin.Context) {
	q := strings.ToLower(c.Query("q"))
	period := c.DefaultQuery("period", "15")
	if period != "daily" {
		period = strings.TrimSuffix(period, "m")
	}

	type StockInfo struct {
		Symbol       string `json:"symbol"`
		Name         string `json:"name"`
		HasFeatures  bool   `json:"has_features"`
		HasModel     bool   `json:"has_model"`
		HasPriceBars bool   `json:"has_price_bars"`
	}
	var results []StockInfo
	for sym, name := range stockNames {
		if q == "" || strings.Contains(sym, q) || strings.Contains(strings.ToLower(name), q) {
			var hf int
			db.QueryRow("SELECT 1 FROM features WHERE symbol = ? AND period = ? LIMIT 1", sym, period).Scan(&hf)
			
			var hp int
			db.QueryRow("SELECT 1 FROM stock_bars WHERE symbol = ? AND period = ? LIMIT 1", sym, period).Scan(&hp)
			
			modelOK := fileExists(filepath.Join(projectDir, modelFilename(sym, period)))
			
			results = append(results, StockInfo{
				Symbol:       sym,
				Name:         name,
				HasFeatures:  hf == 1,
				HasModel:     modelOK,
				HasPriceBars: hp == 1,
			})
		}
	}
	c.JSON(http.StatusOK, results)
}

func handleAvailability(c *gin.Context) {
	symbol := c.DefaultQuery("symbol", "601899")
	period := c.DefaultQuery("period", "15")
	if period != "daily" {
		period = strings.TrimSuffix(period, "m")
	}

	var hf int
	db.QueryRow("SELECT 1 FROM features WHERE symbol = ? AND period = ? LIMIT 1", symbol, period).Scan(&hf)
	
	var hp int
	db.QueryRow("SELECT 1 FROM stock_bars WHERE symbol = ? AND period = ? LIMIT 1", symbol, period).Scan(&hp)
	
	modelOK := fileExists(filepath.Join(projectDir, modelFilename(symbol, period)))

	resp := map[string]interface{}{
		"symbol":         symbol,
		"period":         period,
		"has_features":   hf == 1,
		"has_model":      modelOK,
		"has_price_bars": hp == 1,
	}
	c.JSON(http.StatusOK, resp)
}

func handleAIAdvisor(c *gin.Context) {
	symbol := c.DefaultQuery("symbol", "601899")
	period := c.DefaultQuery("period", "15")
	if period != "daily" {
		period = strings.TrimSuffix(period, "m")
	}

	cmd := exec.Command("python3", "-m", "ai.main", "--mode", "analyze", "--symbol", symbol, "--period", period)
	cmd.Dir = projectDir
	cmd.Env = append(os.Environ(), "DEEPSEEK_API_KEY="+os.Getenv("DEEPSEEK_API_KEY"))

	out, err := cmd.Output()
	if err != nil {
		errOut := ""
		if exitErr, ok := err.(*exec.ExitError); ok {
			errOut = string(exitErr.Stderr)
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI 分析失败: " + errOut})
		return
	}
	c.Data(http.StatusOK, "application/json", out)
}

func handleAIChat(c *gin.Context) {
	var req struct {
		Query        string `json:"query"`
		History      string `json:"history"`
		Context      string `json:"context"`
		SessionCount int    `json:"session_count"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetInt(userContextKey)

	// Guest message limit
	if req.SessionCount >= 5 && userID == 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "游客每次会话最多 5 条消息，请注册以解锁完整功能"})
		return
	}

	// Call DeepSeek API directly from Go (no Python dependency)
	response, err := callDeepSeekChat(req.Query, req.History, req.Context)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI 服务暂时不可用: " + err.Error()})
		return
	}

	// Persist chat history for authenticated users
	if userID > 0 {
		symbol := ""
		if req.Context != "" {
			for _, part := range strings.Fields(req.Context) {
				if strings.HasPrefix(part, "symbol:") {
					symbol = strings.TrimPrefix(part, "symbol:")
					break
				}
			}
		}
		db.Exec("INSERT INTO chat_history (user_id, symbol, role, content) VALUES (?, ?, 'user', ?)", userID, symbol, req.Query)
		db.Exec("INSERT INTO chat_history (user_id, symbol, role, content) VALUES (?, ?, 'assistant', ?)", userID, symbol, response)
	}

	c.JSON(http.StatusOK, gin.H{"response": response})
}

// callDeepSeekChat calls DeepSeek API directly via HTTP, no Python required.
func callDeepSeekChat(query, historyJSON, context string) (string, error) {
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("DEEPSEEK_API_KEY not configured")
	}

	systemPrompt := `你是 "YoungQuant-v1"，YoungQuant Pro 平台的专属量化金融 AI 分析师。你精通 A 股技术分析、量化策略和投资风险管理。只回答与股票、金融市场、量化交易相关的问题。回答时使用简洁的中文，避免过多 Markdown 格式，直接给出分析结论。`
	if context != "" {
		systemPrompt += "\n\n当前行情上下文：" + context
	}

	type Message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}

	messages := []Message{
		{Role: "system", Content: systemPrompt},
	}

	// Parse history
	if historyJSON != "" {
		var history []Message
		if err := json.Unmarshal([]byte(historyJSON), &history); err == nil {
			// Keep last 10 messages
			if len(history) > 10 {
				history = history[len(history)-10:]
			}
			messages = append(messages, history...)
		}
	}

	messages = append(messages, Message{Role: "user", Content: query})

	type RequestBody struct {
		Model    string    `json:"model"`
		Messages []Message `json:"messages"`
		MaxTokens int      `json:"max_tokens"`
		Temperature float64 `json:"temperature"`
	}

	body := RequestBody{
		Model:       "deepseek-chat",
		Messages:    messages,
		MaxTokens:   800,
		Temperature: 0.3,
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", "https://api.deepseek.com/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %v", err)
	}

	if result.Error != nil {
		return "", fmt.Errorf("DeepSeek API error: %s", result.Error.Message)
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from DeepSeek")
	}

	return result.Choices[0].Message.Content, nil
}

// handleChatHistory returns the authenticated user's chat history.
// Supports ?date=YYYY-MM-DD filtering, returns max 100 records ordered by created_at DESC.
func handleChatHistory(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	date := c.Query("date")

	query := "SELECT id, symbol, role, content, created_at FROM chat_history WHERE user_id = ?"
	args := []interface{}{userID}

	if date != "" {
		query += " AND DATE(created_at) = ?"
		args = append(args, date)
	}
	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type ChatHistoryItem struct {
		ID        int    `json:"id"`
		Symbol    string `json:"symbol"`
		Role      string `json:"role"`
		Content   string `json:"content"`
		CreatedAt string `json:"created_at"`
	}
	items := []ChatHistoryItem{}
	for rows.Next() {
		var item ChatHistoryItem
		var symbol sql.NullString
		if err := rows.Scan(&item.ID, &symbol, &item.Role, &item.Content, &item.CreatedAt); err != nil {
			continue
		}
		item.Symbol = symbol.String
		items = append(items, item)
	}
	c.JSON(http.StatusOK, gin.H{"history": items})
}

func handleNews(c *gin.Context) {
	const cacheKey = "news"
	const cacheTTL = 10 * time.Minute

	// 1. 内存缓存命中
	if cached := cacheGet(cacheKey, cacheTTL); cached != nil {
		c.Data(http.StatusOK, "application/json", cached)
		return
	}

	// 2. 尝试实时拉取，设 15s 超时
	done := make(chan []byte, 1)
	go func() {
		cmd := exec.Command("python3", "-m", "ai.main", "--mode", "news")
		cmd.Dir = projectDir
		out, err := cmd.Output()
		if err != nil || len(out) < 2 {
			done <- nil
			return
		}
		done <- out
	}()

	var result []byte
	select {
	case out := <-done:
		result = out
	case <-time.After(15 * time.Second):
		result = nil
	}

	if result != nil {
		cacheSet(cacheKey, result)
		c.Data(http.StatusOK, "application/json", result)
		return
	}

	// 3. 降级：返回 DB 中上次成功的数据
	if stale := cacheGetStale(cacheKey); stale != nil {
		c.Data(http.StatusOK, "application/json", stale)
		return
	}

	// 4. 完全没有数据，返回空列表
	c.JSON(http.StatusOK, []interface{}{})
}

// Auth Handlers
func handleRegister(c *gin.Context) {
	var req struct {
		Email       string  `json:"email"`
		Password    string  `json:"password"`
		Name        string  `json:"name"`
		InitialCash float64 `json:"initial_cash"` // 可选：10万/50万/100万，默认10万
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "密码长度不能少于 8 位"})
		return
	}

	// 邮箱格式基础验证
	if !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") || len(req.Email) < 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请输入有效的邮箱地址"})
		return
	}

	// 用户名长度限制
	if req.Name == "" {
		req.Name = strings.Split(req.Email, "@")[0]
	}
	if len([]rune(req.Name)) > 20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能超过 20 个字符"})
		return
	}

	// 校验本金档位，只允许 10万/50万/100万，默认10万
	validCash := map[float64]bool{10000: true, 100000: true, 500000: true, 1000000: true}
	initCash := req.InitialCash
	if !validCash[initCash] {
		initCash = defaultInitCash
	}

	hashed, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	res, err := db.Exec("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", req.Email, string(hashed), req.Name)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "用户已存在"})
		return
	}

	userID, _ := res.LastInsertId()
	db.Exec("INSERT INTO portfolios (user_id, cash, initial_cash) VALUES (?, ?, ?)", userID, initCash, initCash)

	// Initialize learning_progress base modules
	baseModules := []string{"k_line", "ma", "volume_price", "macd", "kdj", "fundamental", "trading_rules"}
	for _, module := range baseModules {
		db.Exec("INSERT OR IGNORE INTO learning_progress (user_id, module, status) VALUES (?, ?, 'not_started')", userID, module)
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// handleTrades handles GET /api/trades (requires auth)
// Supports query params: ?symbol=&action=&start=&end=
func handleTrades(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	symbol := c.Query("symbol")
	action := c.Query("action")
	start := c.Query("start")
	end := c.Query("end")

	query := "SELECT id, date, symbol, name, action, price, shares, fee FROM trades WHERE user_id = ?"
	args := []interface{}{userID}

	if symbol != "" {
		query += " AND symbol = ?"
		args = append(args, symbol)
	}
	if action != "" {
		query += " AND action = ?"
		args = append(args, action)
	}
	if start != "" {
		query += " AND date >= ?"
		args = append(args, start)
	}
	if end != "" {
		query += " AND date <= ?"
		args = append(args, end)
	}
	query += " ORDER BY date DESC"

	rows, err := db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type TradeItem struct {
		ID     int     `json:"id"`
		Date   string  `json:"date"`
		Symbol string  `json:"symbol"`
		Name   string  `json:"name"`
		Action string  `json:"action"`
		Price  float64 `json:"price"`
		Shares float64 `json:"shares"`
		Fee    float64 `json:"fee"`
	}
	items := []TradeItem{}
	for rows.Next() {
		var item TradeItem
		if err := rows.Scan(&item.ID, &item.Date, &item.Symbol, &item.Name, &item.Action, &item.Price, &item.Shares, &item.Fee); err != nil {
			continue
		}
		items = append(items, item)
	}
	c.JSON(http.StatusOK, items)
}

func handleLogin(c *gin.Context) {
	var req struct {
		Email      string `json:"email"`
		Password   string `json:"password"`
		RememberMe bool   `json:"remember_me"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user struct {
		ID       int    `json:"id"`
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"-"`
	}
	err := db.QueryRow("SELECT id, name, email, password FROM users WHERE email = ?", req.Email).Scan(&user.ID, &user.Name, &user.Email, &user.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在或密码错误"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户不存在或密码错误"})
		return
	}

	// Create JWT token
	expirationTime := time.Now().Add(24 * time.Hour)
	if req.RememberMe {
		expirationTime = time.Now().Add(7 * 24 * time.Hour)
	}

	claims := &Claims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user":  user,
	})
}

func handleMe(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	var user struct {
		ID          int     `json:"id"`
		Name        string  `json:"name"`
		Email       string  `json:"email"`
		LearningPct float64 `json:"learning_pct"`
		IsPublic    int     `json:"is_public"`
		CreatedAt   string  `json:"created_at"`
	}
	db.QueryRow("SELECT id, name, email, COALESCE(learning_pct, 0.0), COALESCE(is_public, 1), COALESCE(created_at, '') FROM users WHERE id = ?", userID).
		Scan(&user.ID, &user.Name, &user.Email, &user.LearningPct, &user.IsPublic, &user.CreatedAt)
	c.JSON(http.StatusOK, user)
}

func handleUpdateProfile(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	var req struct {
		IsPublic *int `json:"is_public"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.IsPublic == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "is_public 字段必填"})
		return
	}
	if _, err := db.Exec("UPDATE users SET is_public = ? WHERE id = ?", *req.IsPublic, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// handleSetInitialCash handles PUT /api/me/initial-cash
// Only allowed if the user has never traded (cash == initial_cash).
func handleSetInitialCash(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	var req struct {
		InitialCash float64 `json:"initial_cash"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	validCash := map[float64]bool{10000: true, 100000: true, 500000: true, 1000000: true}
	if !validCash[req.InitialCash] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的本金档位"})
		return
	}
	// 只有未交易过（cash == initial_cash）才允许修改
	var cash, initCash float64
	if err := db.QueryRow("SELECT cash, COALESCE(initial_cash, 100000.0) FROM portfolios WHERE user_id = ?", userID).Scan(&cash, &initCash); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
		return
	}
	if math.Abs(cash-initCash) > 0.01 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "已有交易记录，本金不可更改"})
		return
	}
	db.Exec("UPDATE portfolios SET cash = ?, initial_cash = ? WHERE user_id = ?", req.InitialCash, req.InitialCash, userID)
	c.JSON(http.StatusOK, gin.H{"status": "success", "initial_cash": req.InitialCash})
}

// Watchlist Handlers
func handleWatchlist(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	switch c.Request.Method {
	case http.MethodGet:
		rows, err := db.Query(
			"SELECT id, symbol, created_at FROM watchlist WHERE user_id = ? ORDER BY created_at DESC",
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type WatchlistItem struct {
			ID        int    `json:"id"`
			Symbol    string `json:"symbol"`
			CreatedAt string `json:"created_at"`
		}
		items := []WatchlistItem{}
		for rows.Next() {
			var item WatchlistItem
			if err := rows.Scan(&item.ID, &item.Symbol, &item.CreatedAt); err != nil {
				continue
			}
			items = append(items, item)
		}
		c.JSON(http.StatusOK, items)

	case http.MethodPost:
		var req struct {
			Symbol string `json:"symbol"`
		}
		if err := c.ShouldBindJSON(&req); err != nil || req.Symbol == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "symbol 字段必填"})
			return
		}

		var count int
		db.QueryRow("SELECT COUNT(*) FROM watchlist WHERE user_id = ?", userID).Scan(&count)
		if count >= 50 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "自选股最多 50 条"})
			return
		}

		if _, err := db.Exec(
			"INSERT OR IGNORE INTO watchlist (user_id, symbol) VALUES (?, ?)",
			userID, req.Symbol,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "success"})
	}
}

func handleWatchlistDelete(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	symbol := c.Param("symbol")
	if symbol == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "symbol 参数必填"})
		return
	}

	if _, err := db.Exec(
		"DELETE FROM watchlist WHERE user_id = ? AND symbol = ?",
		userID, symbol,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// Notes Handlers
func handleNotes(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	switch c.Request.Method {
	case http.MethodGet:
		symbol := c.Query("symbol")
		date := c.Query("date")

		query := "SELECT id, user_id, symbol, content, created_at, updated_at FROM notes WHERE user_id = ?"
		args := []interface{}{userID}

		if symbol != "" {
			query += " AND symbol = ?"
			args = append(args, symbol)
		}
		if date != "" {
			query += " AND DATE(created_at) = ?"
			args = append(args, date)
		}
		query += " ORDER BY created_at DESC"

		rows, err := db.Query(query, args...)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type NoteItem struct {
			ID        int    `json:"id"`
			UserID    int    `json:"user_id"`
			Symbol    string `json:"symbol"`
			Content   string `json:"content"`
			CreatedAt string `json:"created_at"`
			UpdatedAt string `json:"updated_at"`
		}
		items := []NoteItem{}
		for rows.Next() {
			var item NoteItem
			if err := rows.Scan(&item.ID, &item.UserID, &item.Symbol, &item.Content, &item.CreatedAt, &item.UpdatedAt); err != nil {
				continue
			}
			items = append(items, item)
		}
		c.JSON(http.StatusOK, items)

	case http.MethodPost:
		var req struct {
			Content string `json:"content"`
			Symbol  string `json:"symbol"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if len([]rune(req.Content)) > 2000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "笔记内容不能超过 2000 字"})
			return
		}
		res, err := db.Exec(
			"INSERT INTO notes (user_id, symbol, content) VALUES (?, ?, ?)",
			userID, req.Symbol, req.Content,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		id, _ := res.LastInsertId()
		c.JSON(http.StatusOK, gin.H{"status": "success", "id": id})
	}
}

func handleNotesUpdate(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	id := c.Param("id")

	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len([]rune(req.Content)) > 2000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "笔记内容不能超过 2000 字"})
		return
	}

	res, err := db.Exec(
		"UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
		req.Content, id, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在或无权限"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func handleNotesDelete(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	id := c.Param("id")

	res, err := db.Exec(
		"DELETE FROM notes WHERE id = ? AND user_id = ?",
		id, userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	affected, _ := res.RowsAffected()
	if affected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "笔记不存在或无权限"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// Learning Progress Handlers

// handleLearningProgress handles GET and POST /api/learning/progress
func handleLearningProgress(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	switch c.Request.Method {
	case http.MethodGet:
		rows, err := db.Query(
			"SELECT module, status, COALESCE(read_at, ''), duration_seconds FROM learning_progress WHERE user_id = ? ORDER BY module ASC",
			userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		type ProgressItem struct {
			Module          string `json:"module"`
			Status          string `json:"status"`
			ReadAt          string `json:"read_at"`
			DurationSeconds int    `json:"duration_seconds"`
		}
		items := []ProgressItem{}
		for rows.Next() {
			var item ProgressItem
			if err := rows.Scan(&item.Module, &item.Status, &item.ReadAt, &item.DurationSeconds); err != nil {
				continue
			}
			items = append(items, item)
		}
		c.JSON(http.StatusOK, gin.H{"progress": items})

	case http.MethodPost:
		var req struct {
			Module string `json:"module"`
			Status string `json:"status"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		validStatuses := map[string]bool{"not_started": true, "in_progress": true, "completed": true}
		if !validStatuses[req.Status] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status 只允许 not_started/in_progress/completed"})
			return
		}
		if req.Module == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "module 字段必填"})
			return
		}

		readAt := sql.NullString{}
		if req.Status == "completed" {
			readAt = sql.NullString{String: time.Now().Format("2006-01-02 15:04:05"), Valid: true}
		}

		if _, err := db.Exec(
			"INSERT OR REPLACE INTO learning_progress (user_id, module, status, read_at) VALUES (?, ?, ?, ?)",
			userID, req.Module, req.Status, readAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		learningPct := calcLearningPct(userID)
		if _, err := db.Exec("UPDATE users SET learning_pct = ? WHERE id = ?", learningPct, userID); err != nil {
			log.Printf("handleLearningProgress: failed to update learning_pct: %v", err)
		}

		c.JSON(http.StatusOK, gin.H{"ok": true, "learning_pct": learningPct})
	}
}

// calcLearningPct calculates the learning percentage for a user.
// Returns completed modules / total modules for that user.
func calcLearningPct(userID int) float64 {
	var total, completed int
	db.QueryRow("SELECT COUNT(*) FROM learning_progress WHERE user_id = ?", userID).Scan(&total)
	if total == 0 {
		return 0.0
	}
	db.QueryRow("SELECT COUNT(*) FROM learning_progress WHERE user_id = ? AND status = 'completed'", userID).Scan(&completed)
	return float64(completed) / float64(total)
}

// handleDailyLesson handles GET /api/learning/daily-lesson (public)
func handleDailyLesson(c *gin.Context) {
	now := time.Now()
	dayOfYear := now.YearDay() // 1-based
	dayIndex := (dayOfYear - 1) % 60

	type Lesson struct {
		ID           int    `json:"id"`
		DayIndex     int    `json:"day_index"`
		Category     string `json:"category"`
		Title        string `json:"title"`
		Content      string `json:"content"`
		DetailModule string `json:"detail_module"`
	}

	var lesson Lesson
	err := db.QueryRow(
		"SELECT id, day_index, category, title, content, COALESCE(detail_module, '') FROM daily_lessons WHERE day_index = ?",
		dayIndex,
	).Scan(&lesson.ID, &lesson.DayIndex, &lesson.Category, &lesson.Title, &lesson.Content, &lesson.DetailModule)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"lesson": nil})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"lesson": lesson})
}

// handleMarkLessonRead handles POST /api/learning/daily-lesson/read (requires auth)
func handleMarkLessonRead(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	var req struct {
		LessonID int `json:"lesson_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.LessonID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lesson_id 字段必填"})
		return
	}

	// Insert into lesson_reads (ignore duplicates)
	if _, err := db.Exec(
		"INSERT OR IGNORE INTO lesson_reads (user_id, lesson_id) VALUES (?, ?)",
		userID, req.LessonID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Upsert learning_progress for "daily_lesson" module as in_progress
	if _, err := db.Exec(
		"INSERT OR REPLACE INTO learning_progress (user_id, module, status) VALUES (?, 'daily_lesson', 'in_progress')",
		userID,
	); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Recalculate and update learning_pct
	learningPct := calcLearningPct(userID)
	if _, err := db.Exec("UPDATE users SET learning_pct = ? WHERE id = ?", learningPct, userID); err != nil {
		log.Printf("handleMarkLessonRead: failed to update learning_pct: %v", err)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// handleStockScreener handles GET /api/ai/screener (requires auth)
// 直接从数据库读取最新特征数据进行选股，确保数据实时性。
func handleStockScreener(c *gin.Context) {
	dimensionsStr := c.DefaultQuery("dimensions", "trend,capital,sector,technical")
	dims := map[string]bool{}
	for _, d := range strings.Split(dimensionsStr, ",") {
		dims[strings.TrimSpace(d)] = true
	}
	if len(dims) == 0 {
		dims = map[string]bool{"trend": true, "capital": true, "sector": true, "technical": true}
	}

	type Candidate struct {
		Symbol    string  `json:"symbol"`
		Name      string  `json:"name"`
		Reason    string  `json:"reason"`
		RiskLevel string  `json:"risk_level"`
		TrendScore  float64 `json:"trend_score"`
		CapitalScore float64 `json:"capital_score"`
		Composite float64 `json:"composite_score"`
	}

	var candidates []Candidate

	for symbol, name := range stockNames {
		// 取最近 20 根日线特征
		rows, err := db.Query(`
			SELECT close, volume, ma5, ma20, rsi14
			FROM features WHERE symbol = ? AND period = 'daily'
			ORDER BY date DESC LIMIT 20`, symbol)
		if err != nil {
			continue
		}

		type bar struct{ close, volume, ma5, ma20, rsi float64 }
		var bars []bar
		for rows.Next() {
			var b bar
			rows.Scan(&b.close, &b.volume, &b.ma5, &b.ma20, &b.rsi)
			bars = append(bars, b)
		}
		rows.Close()

		if len(bars) < 20 {
			continue // 数据不足，跳过
		}

		// 反转为时间正序（最新在末尾）
		for i, j := 0, len(bars)-1; i < j; i, j = i+1, j-1 {
			bars[i], bars[j] = bars[j], bars[i]
		}

		scores := map[string]float64{}

		// 趋势得分：MA5 > MA20 的天数比例
		if dims["trend"] {
			count := 0
			n := min(5, len(bars))
			for _, b := range bars[len(bars)-n:] {
				if b.ma5 > b.ma20 {
					count++
				}
			}
			scores["trend"] = float64(count) / float64(n)
		}

		// 资金得分：近5日成交量递增比例
		if dims["capital"] {
			recent := bars[len(bars)-5:]
			up := 0
			for i := 1; i < len(recent); i++ {
				if recent[i].volume > recent[i-1].volume {
					up++
				}
			}
			scores["capital"] = float64(up) / float64(len(recent)-1)
		}

		// 板块得分（预定义权重）
		if dims["sector"] {
			sectorW := map[string]float64{
				"601899": 0.8, "300750": 0.8, "002594": 0.8,
				"600519": 0.7, "000858": 0.7, "000568": 0.7,
				"601318": 0.6, "600036": 0.6, "601398": 0.6,
				"688981": 0.75, "002415": 0.7, "300059": 0.7,
			}
			if w, ok := sectorW[symbol]; ok {
				scores["sector"] = w
			} else {
				scores["sector"] = 0.5
			}
		}

		// 技术得分：RSI 在 40-60 区间得分高
		if dims["technical"] {
			rsi := bars[len(bars)-1].rsi
			if rsi >= 40 && rsi <= 60 {
				scores["technical"] = 1.0 - math.Abs(rsi-50)/10*0.2
			} else if rsi < 40 {
				scores["technical"] = math.Max(0, rsi/40*0.8)
			} else {
				scores["technical"] = math.Max(0, (100-rsi)/40*0.8)
			}
		}

		if len(scores) == 0 {
			continue
		}

		composite := 0.0
		for _, v := range scores {
			composite += v
		}
		composite /= float64(len(scores))

		riskLevel := "高"
		if composite >= 0.7 {
			riskLevel = "低"
		} else if composite >= 0.4 {
			riskLevel = "中"
		}

		// 生成理由（≤50字）
		parts := []string{}
		if scores["trend"] >= 0.6 {
			parts = append(parts, "趋势向上")
		}
		if scores["capital"] >= 0.6 {
			parts = append(parts, "量能放大")
		}
		if scores["sector"] >= 0.7 {
			parts = append(parts, "板块强势")
		}
		if scores["technical"] >= 0.7 {
			parts = append(parts, "技术健康")
		}
		if len(parts) == 0 {
			parts = append(parts, "综合评分适中")
		}
		reason := name + "：" + strings.Join(parts, "、")
		if len([]rune(reason)) > 50 {
			runes := []rune(reason)
			reason = string(runes[:50])
		}

		candidates = append(candidates, Candidate{
			Symbol:       symbol,
			Name:         name,
			Reason:       reason,
			RiskLevel:    riskLevel,
			TrendScore:   math.Round(scores["trend"]*10000) / 10000,
			CapitalScore: math.Round(scores["capital"]*10000) / 10000,
			Composite:    math.Round(composite*10000) / 10000,
		})
	}

	// 按综合得分降序，取前10
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Composite > candidates[j].Composite
	})
	if len(candidates) > 10 {
		candidates = candidates[:10]
	}

	c.JSON(http.StatusOK, gin.H{"stocks": candidates})
}

// handleReviewTrade handles GET /api/ai/review/:trade_id (requires auth)
// Fetches the trade record by ID and calls ai.main --mode review_trade.
func handleReviewTrade(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	tradeID := c.Param("trade_id")

	// Fetch trade record from DB
	var trade struct {
		ID     int     `json:"id"`
		Date   string  `json:"date"`
		Symbol string  `json:"symbol"`
		Name   string  `json:"name"`
		Action string  `json:"action"`
		Price  float64 `json:"price"`
		Shares float64 `json:"shares"`
		Fee    float64 `json:"fee"`
	}
	err := db.QueryRow(
		"SELECT id, date, symbol, name, action, price, shares, fee FROM trades WHERE id = ? AND user_id = ?",
		tradeID, userID,
	).Scan(&trade.ID, &trade.Date, &trade.Symbol, &trade.Name, &trade.Action, &trade.Price, &trade.Shares, &trade.Fee)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "交易记录不存在"})
		return
	}

	tradeJSON, _ := json.Marshal(trade)

	cmd := exec.Command("python3", "-m", "ai.main", "--mode", "review_trade", "--trade", string(tradeJSON))
	cmd.Dir = projectDir
	cmd.Env = append(os.Environ(), "DEEPSEEK_API_KEY="+os.Getenv("DEEPSEEK_API_KEY"))

	out, err := cmd.Output()
	if err != nil {
		// Degraded fallback
		c.JSON(http.StatusOK, gin.H{
			"entry_timing":    "入场时机评估暂不可用",
			"hold_duration":   "持仓时长数据不足",
			"pnl_attribution": "盈亏归因分析暂不可用",
			"score":           3,
			"suggestion":      "建议结合 K 线形态和成交量综合判断入场时机，控制仓位风险。",
		})
		return
	}
	c.Data(http.StatusOK, "application/json", out)
}

// handleReviewSummary handles GET /api/ai/review/summary (requires auth)
// Supports ?period=week|month
func handleReviewSummary(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	period := c.DefaultQuery("period", "week")
	if period != "week" && period != "month" {
		period = "week"
	}

	// Determine date cutoff
	days := 7
	if period == "month" {
		days = 30
	}
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")

	rows, err := db.Query(
		"SELECT id, date, symbol, name, action, price, shares, fee FROM trades WHERE user_id = ? AND date >= ? ORDER BY date DESC",
		userID, cutoff,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type TradeItem struct {
		ID     int     `json:"id"`
		Date   string  `json:"date"`
		Symbol string  `json:"symbol"`
		Name   string  `json:"name"`
		Action string  `json:"action"`
		Price  float64 `json:"price"`
		Shares float64 `json:"shares"`
		Fee    float64 `json:"fee"`
	}
	var trades []TradeItem
	for rows.Next() {
		var t TradeItem
		if err := rows.Scan(&t.ID, &t.Date, &t.Symbol, &t.Name, &t.Action, &t.Price, &t.Shares, &t.Fee); err != nil {
			continue
		}
		trades = append(trades, t)
	}

	tradesJSON, _ := json.Marshal(trades)

	cmd := exec.Command("python3", "-m", "ai.main", "--mode", "review_summary",
		"--trades", string(tradesJSON), "--period", period)
	cmd.Dir = projectDir
	cmd.Env = append(os.Environ(), "DEEPSEEK_API_KEY="+os.Getenv("DEEPSEEK_API_KEY"))

	out, err := cmd.Output()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"win_rate":        0.0,
			"avg_hold_days":   0.0,
			"max_profit":      0.0,
			"max_loss":        0.0,
			"common_patterns": []string{"数据不足，无法识别交易模式"},
			"diagnosis":       "综合复盘暂不可用，请稍后重试。",
		})
		return
	}
	c.Data(http.StatusOK, "application/json", out)
}

// handleBacktestCustom handles POST /api/backtest/custom (requires auth)
// Runs a custom backtest via backtest.py and stores the result in backtest_reports.
func handleBacktestCustom(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	var req struct {
		Symbol    string                 `json:"symbol"`
		StartDate string                 `json:"start_date"`
		EndDate   string                 `json:"end_date"`
		Strategy  string                 `json:"strategy"`
		Params    map[string]interface{} `json:"params"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parameter validation (属性 28)
	if req.Strategy == "ma_cross" || req.Strategy == "" {
		if maPeriod, ok := req.Params["ma_fast"]; ok {
			if v, err := toFloat(maPeriod); err == nil {
				if v < 5 || v > 120 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "均线周期必须在 [5, 120] 范围内"})
					return
				}
			}
		}
		if maPeriod, ok := req.Params["ma_slow"]; ok {
			if v, err := toFloat(maPeriod); err == nil {
				if v < 5 || v > 120 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "均线周期必须在 [5, 120] 范围内"})
					return
				}
			}
		}
	}
	if sl, ok := req.Params["stop_loss"]; ok {
		if v, err := toFloat(sl); err == nil {
			if v < 0.01 || v > 0.20 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "止损比例必须在 [0.01, 0.20] 范围内"})
				return
			}
		}
	}
	if tp, ok := req.Params["take_profit"]; ok {
		if v, err := toFloat(tp); err == nil {
			if v < 0.01 || v > 0.50 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "止盈比例必须在 [0.01, 0.50] 范围内"})
				return
			}
		}
	}

	paramsJSON, _ := json.Marshal(req.Params)
	reqJSON, _ := json.Marshal(map[string]interface{}{
		"symbol":     req.Symbol,
		"strategy":   req.Strategy,
		"params":     req.Params,
		"start_date": req.StartDate,
		"end_date":   req.EndDate,
	})

	cmd := exec.Command("python3", "-c",
		`import sys, json, backtest as bt; req=json.loads(sys.argv[1]); print(json.dumps(bt.run_backtest(req['symbol'],req['strategy'],req['params'],req['start_date'],req['end_date']), ensure_ascii=False))`,
		string(reqJSON),
	)
	cmd.Dir = projectDir

	out, err := cmd.Output()
	if err != nil {
		errMsg := ""
		if exitErr, ok := err.(*exec.ExitError); ok {
			errMsg = string(exitErr.Stderr)
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "回测失败: " + errMsg})
		return
	}

	// Store result in backtest_reports
	db.Exec(
		"INSERT INTO backtest_reports (user_id, symbol, strategy, params_json, result_json) VALUES (?, ?, ?, ?, ?)",
		userID, req.Symbol, req.Strategy, string(paramsJSON), string(out),
	)

	c.Data(http.StatusOK, "application/json", out)
}

// toFloat converts an interface{} to float64.
func toFloat(v interface{}) (float64, error) {
	switch val := v.(type) {
	case float64:
		return val, nil
	case int:
		return float64(val), nil
	case string:
		var f float64
		_, err := fmt.Sscanf(val, "%f", &f)
		return f, err
	default:
		return 0, fmt.Errorf("cannot convert %T to float64", v)
	}
}

// handleLeaderboard handles GET /api/leaderboard (public)
// Returns users ranked by return rate (descending), 20 per page.
// Users with is_public=0 are shown as "匿名用户".
func handleLeaderboard(c *gin.Context) {
	page := 1
	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 {
			page = v
		}
	}
	offset := (page - 1) * 20

	// 计算每个用户的总资产（现金 + 持仓市值）用于排名
	type userAsset struct {
		name      string
		isPublic  int
		cash      float64
		initCash  float64
		mdd       float64
		winRate   float64
		userID    int
	}

	rows, err := db.Query(`
		SELECT u.id, u.name, COALESCE(u.is_public, 1), p.cash,
		       COALESCE(p.initial_cash, 100000.0),
		       COALESCE(p.mdd, 0.0), COALESCE(p.win_rate, 0.0)
		FROM portfolios p
		JOIN users u ON u.id = p.user_id`, )
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var assets []userAsset
	for rows.Next() {
		var ua userAsset
		if err := rows.Scan(&ua.userID, &ua.name, &ua.isPublic, &ua.cash, &ua.initCash, &ua.mdd, &ua.winRate); err != nil {
			continue
		}
		assets = append(assets, ua)
	}
	rows.Close()

	// 计算每个用户的持仓市值
	type rankedEntry struct {
		name       string
		isPublic   int
		totalAssets float64
		initCash   float64
		mdd        float64
		winRate    float64
	}
	var ranked []rankedEntry
	for _, ua := range assets {
		total := ua.cash
		holdRows, err := db.Query("SELECT symbol, shares FROM holdings WHERE user_id = ?", ua.userID)
		if err == nil {
			for holdRows.Next() {
				var sym string
				var shares float64
				holdRows.Scan(&sym, &shares)
				var lastClose float64
				db.QueryRow("SELECT close FROM stock_bars WHERE symbol = ? AND period = 'daily' ORDER BY date DESC LIMIT 1", sym).Scan(&lastClose)
				total += shares * lastClose
			}
			holdRows.Close()
		}
		ranked = append(ranked, rankedEntry{
			name: ua.name, isPublic: ua.isPublic,
			totalAssets: total, initCash: ua.initCash,
			mdd: ua.mdd, winRate: ua.winRate,
		})
	}

	// 按收益率排序
	sort.Slice(ranked, func(i, j int) bool {
		ri := (ranked[i].totalAssets - ranked[i].initCash) / ranked[i].initCash
		rj := (ranked[j].totalAssets - ranked[j].initCash) / ranked[j].initCash
		return ri > rj
	})

	// 分页
	start := offset
	end := offset + 20
	if start > len(ranked) {
		start = len(ranked)
	}
	if end > len(ranked) {
		end = len(ranked)
	}
	page_data := ranked[start:end]

	type Entry struct {
		Rank      int     `json:"rank"`
		Name      string  `json:"name"`
		ReturnPct float64 `json:"return_pct"`
		MDD       float64 `json:"mdd"`
		WinRate   float64 `json:"win_rate"`
	}
	var entries []Entry
	for i, r := range page_data {
		displayName := r.name
		if r.isPublic == 0 {
			displayName = "匿名用户"
		}
		returnPct := (r.totalAssets - r.initCash) / r.initCash * 100
		entries = append(entries, Entry{
			Rank: offset + i + 1, Name: displayName,
			ReturnPct: returnPct, MDD: r.mdd, WinRate: r.winRate,
		})
	}
	if entries == nil {
		entries = []Entry{}
	}
	c.JSON(http.StatusOK, gin.H{"leaderboard": entries, "page": page})
}

// handleLeaderboardMe handles GET /api/leaderboard/me (requires auth)
// Returns the current user's rank, return rate, and MDD.
func handleLeaderboardMe(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	// Get user's cash and metrics
	var cash, initCash, mdd, winRate float64
	err := db.QueryRow(
		"SELECT cash, COALESCE(initial_cash, 100000.0), COALESCE(mdd, 0.0), COALESCE(win_rate, 0.0) FROM portfolios WHERE user_id = ?",
		userID,
	).Scan(&cash, &initCash, &mdd, &winRate)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "账户不存在"})
		return
	}

	// Count users with higher return rate to determine rank
	var rank int
	db.QueryRow(`SELECT COUNT(*) + 1 FROM portfolios 
		WHERE (cash - COALESCE(initial_cash, 100000.0)) / COALESCE(initial_cash, 100000.0) 
		    > (? - COALESCE(initial_cash, 100000.0)) / COALESCE(initial_cash, 100000.0)`, cash).Scan(&rank)

	returnPct := (cash - initCash) / initCash * 100
	c.JSON(http.StatusOK, gin.H{
		"rank":         rank,
		"return_pct":   returnPct,
		"initial_cash": initCash,
		"mdd":          mdd,
		"win_rate":     winRate,
	})
}
