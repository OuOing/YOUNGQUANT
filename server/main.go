package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

var projectDir = "/Users/bytedance/youngquant"
var portfolioMutex sync.Mutex

type Portfolio struct {
	Cash     float64            `json:"cash"`
	Holdings map[string]Holding `json:"holdings"` // symbol -> 持仓
	History  []TradeLog         `json:"history"`
	Metrics  AccountMetrics     `json:"metrics"`
}

type AccountMetrics struct {
	MDD     float64 `json:"mdd"`
	WinRate float64 `json:"win_rate"`
	Sharpe  float64 `json:"sharpe"`
}

type Holding struct {
	Shares    float64 `json:"shares"`
	Cost      float64 `json:"cost"`
	Available float64 `json:"available"` // 可卖份额 (T+1)
	LastDate  string  `json:"last_date"` // 上次买入日期 (yyyy-mm-dd)
}

type TradeLog struct {
	Date   string  `json:"date"`
	Symbol string  `json:"symbol"`
	Name   string  `json:"name"`
	Action string  `json:"action"`
	Price  float64 `json:"price"`
	Shares float64 `json:"shares"`
	Fee    float64 `json:"fee"`
}

// ---------------------------------------------------------
// 模拟账户逻辑
// ---------------------------------------------------------

var stockNames = map[string]string{
	"601899": "紫金矿业",
	"600519": "贵州茅台",
	"000001": "平安银行",
	"600036": "招商银行",
	"300750": "宁德时代",
	"601318": "中国平安",
	"000858": "五粮液",
	"600900": "长江电力",
	"601012": "隆基绿能",
	"000725": "京东方A",
}

var stockProfiles = map[string]map[string]interface{}{
	"601899": {
		"name": "紫金矿业 (Zijin Mining)",
		"intro": "中国最大的金、铜、锌生产企业之一，在海外拥有大量矿山。",
		"factors": "1. 国际铜价与金价\n2. 全球通胀预期\n3. 美联储政策\n4. 环保与地缘政治",
	},
	"600519": {
		"name": "贵州茅台 (Kweichow Moutai)",
		"intro": "中国白酒龙头，全球市值最高的烈酒企业，品牌护城河极深。",
		"factors": "1. 消费升级与降级周期\n2. 经销商渠道库存\n3. 宏观经济与消费信心\n4. 政策（禁酒令等）",
	},
	"000001": {
		"name": "平安银行 (Ping An Bank)",
		"intro": "中国平安旗下银行，零售银行转型标杆。",
		"factors": "1. LPR 利率调整\n2. 房地产风险敞口\n3. 零售贷款质量\n4. 金融科技竞争",
	},
	"300750": {
		"name": "宁德时代 (CATL)",
		"intro": "全球最大的动力电池制造商，市占率超 35%。",
		"factors": "1. 新能源车销量\n2. 碳酸锂原材料价格\n3. 欧美产能布局\n4. 固态电池技术路线",
	},
}

// 速率限制：每只股票刷新冷却 5 分钟
var (
	lastRefresh     = make(map[string]time.Time)
	lastRefreshLock sync.Mutex
	refreshCooldown = 5 * time.Minute
)

func loadPortfolio() (*Portfolio, error) {
	fname := filepath.Join(projectDir, "portfolio.json")
	data, err := os.ReadFile(fname)
	if err != nil {
		return &Portfolio{Cash: 100000, Holdings: make(map[string]Holding)}, nil
	}
	var p Portfolio
	json.Unmarshal(data, &p)
	if p.Holdings == nil {
		p.Holdings = make(map[string]Holding)
	}
	return &p, nil
}

func savePortfolio(p *Portfolio) error {
	fname := filepath.Join(projectDir, "portfolio.json")
	data, _ := json.MarshalIndent(p, "", "  ")
	return os.WriteFile(fname, data, 0644)
}

func handlePortfolio(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	portfolioMutex.Lock()
	defer portfolioMutex.Unlock()

	period := r.URL.Query().Get("period")
	if period == "" {
		period = "15"
	}

	p, _ := loadPortfolio()
	totalAssets := p.Cash
	
	// 计算 1h 前和 1d 前的总资产 (假设持仓数量不变)
	totalAssets1h := p.Cash
	totalAssets1d := p.Cash

	details := make(map[string]interface{})

	for symbol, hold := range p.Holdings {
		// 1. 获取当前最新价（与 UI 所选 period 对齐）
		lastPrice := 0.0
		if period == "daily" {
			csvDailyLatest, _ := os.ReadFile(filepath.Join(projectDir, fmt.Sprintf("stock_%s.csv", symbol)))
			linesDailyLatest := strings.Split(strings.TrimSpace(string(csvDailyLatest)), "\n")
			if len(linesDailyLatest) > 1 {
				parts := strings.Split(linesDailyLatest[len(linesDailyLatest)-1], ",")
				// Daily CSV: 日期,股票代码,开盘,收盘,最高,最低,...  → close = index[3]
				if len(parts) > 3 {
					lastPrice, _ = strconv.ParseFloat(parts[3], 64)
				}
			}
		} else {
			// Minute CSV: 日期,开盘,收盘,最高,最低,...  → close = index[2]
			csvData, _ := os.ReadFile(filepath.Join(projectDir, fmt.Sprintf("stock_%s_%sm.csv", symbol, period)))
			lines := strings.Split(strings.TrimSpace(string(csvData)), "\n")
			if len(lines) > 1 {
				parts := strings.Split(lines[len(lines)-1], ",")
				if len(parts) > 2 {
					lastPrice, _ = strconv.ParseFloat(parts[2], 64)
				}
			}
		}

		// 1h 前价格仍基于 15m 数据（1h = 4 个 15m bar）
		price1h := 0.0
		csv15m, _ := os.ReadFile(filepath.Join(projectDir, fmt.Sprintf("stock_%s_15m.csv", symbol)))
		lines15m := strings.Split(strings.TrimSpace(string(csv15m)), "\n")
		if len(lines15m) > 1 {
			idx1h := len(lines15m) - 5
			if idx1h < 1 {
				idx1h = 1
			}
			parts1h := strings.Split(lines15m[idx1h], ",")
			if len(parts1h) > 2 {
				price1h, _ = strconv.ParseFloat(parts1h[2], 64)
			}
		}

		// 2. 获取 1d 前价格 (从日线读取)
		// Daily CSV: 日期,股票代码,开盘,收盘,最高,最低,...  → close = index[3]
		csvDaily, _ := os.ReadFile(filepath.Join(projectDir, fmt.Sprintf("stock_%s.csv", symbol)))
		dailyLines := strings.Split(strings.TrimSpace(string(csvDaily)), "\n")
		price1d := lastPrice
		if len(dailyLines) > 2 {
			parts1d := strings.Split(dailyLines[len(dailyLines)-2], ",")
			if len(parts1d) > 3 {
				price1d, _ = strconv.ParseFloat(parts1d[3], 64)
			}
		}

		totalAssets += hold.Shares * lastPrice
		totalAssets1h += hold.Shares * price1h
		totalAssets1d += hold.Shares * price1d

		name := stockNames[symbol]
		if name == "" { name = symbol }

		details[symbol] = map[string]interface{}{
			"name": name, "shares": hold.Shares, "cost": hold.Cost, "price": lastPrice,
			"available": hold.Available, "last_date": hold.LastDate,
			"pnl": (lastPrice - hold.Cost) * hold.Shares,
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

	json.NewEncoder(w).Encode(map[string]interface{}{
		"total_assets":   totalAssets,
		"cash":           p.Cash,
		"position_value": totalAssets - p.Cash,
		"holdings":       details,
		"history":        p.History,
		"total_pnl":      totalAssets - 100000.0,
		"total_pnl_pct":  (totalAssets - 100000.0) / 100000.0 * 100,
		"metrics": map[string]float64{
			"mdd":      p.Metrics.MDD,
			"win_rate": p.Metrics.WinRate,
			"sharpe":   p.Metrics.Sharpe,
			"pnl_1h":   pnl1hPct,
			"pnl_1d":   pnl1dPct,
		},
	})
}

func handleTrade(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Symbol string  `json:"symbol"`
		Action string  `json:"action"`
		Price  float64 `json:"price"`
		Qty    float64 `json:"qty"`
	}
	json.NewDecoder(r.Body).Decode(&req)

	w.Header().Set("Content-Type", "application/json")
	portfolioMutex.Lock()
	defer portfolioMutex.Unlock()

	p, _ := loadPortfolio()
	
	// 获取当前模拟日期（从日线读取，保证 T+1 逻辑一致）
	currentDate := ""
	csvData, _ := os.ReadFile(filepath.Join(projectDir, fmt.Sprintf("stock_%s.csv", req.Symbol)))
	lines := strings.Split(strings.TrimSpace(string(csvData)), "\n")
	if len(lines) > 1 {
		parts := strings.Split(lines[len(lines)-1], ",")
		currentDate = strings.Split(parts[0], " ")[0] // 取日期部分 yyyy-mm-dd
	}

	req.Action = strings.ToLower(req.Action)
	hold := p.Holdings[req.Symbol]
	
	// ===== A股涨跌停限制 ±10% =====
	// 从日线CSV获取前一收盘价
	prevClose := 0.0
	csvDaily, _ := os.ReadFile(filepath.Join(projectDir, fmt.Sprintf("stock_%s.csv", req.Symbol)))
	dailyLines := strings.Split(strings.TrimSpace(string(csvDaily)), "\n")
	// Daily CSV: 日期,股票代码,开盘,收盘,最高,最低,...  → close = index[3]
	if len(dailyLines) > 1 {
		lastDayParts := strings.Split(dailyLines[len(dailyLines)-1], ",")
		if len(lastDayParts) > 3 {
			prevClose, _ = strconv.ParseFloat(lastDayParts[3], 64)
		}
	}
	
	if prevClose > 0 {
		upperLimit := prevClose * 1.10
		lowerLimit := prevClose * 0.90
		if req.Price > upperLimit {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "error",
				"msg": fmt.Sprintf("涨停限制：交易价 ¥%.2f 超过涨停价 ¥%.2f (前收 ¥%.2f × 110%%)", req.Price, upperLimit, prevClose),
			})
			return
		}
		if req.Price < lowerLimit {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "error",
				"msg": fmt.Sprintf("跌停限制：交易价 ¥%.2f 低于跌停价 ¥%.2f (前收 ¥%.2f × 90%%)", req.Price, lowerLimit, prevClose),
			})
			return
		}
	}

	// 估算交易费
	amount := req.Price * req.Qty
	fee := amount * 0.0003 

	var res map[string]interface{}

	if req.Action == "buy" {
		if p.Cash < amount+fee { 
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"status": "error", "msg": "资金不足"})
			return 
		}
		
		totalCost := hold.Shares*hold.Cost + amount
		hold.Shares += req.Qty
		hold.Cost = totalCost / hold.Shares
		hold.LastDate = currentDate // 更新上次买入日期
		p.Cash -= (amount + fee)
		p.Holdings[req.Symbol] = hold
		res = map[string]interface{}{
			"status": "success", "msg": "买入成功", "qty_traded": req.Qty, "price": req.Price, "remaining_shares": hold.Shares,
		}
	} else { // sell
		// 卖出逻辑：检查 T+1
		if currentDate > hold.LastDate && hold.LastDate != "" {
			hold.Available = hold.Shares
		}

		if req.Qty > hold.Available {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]interface{}{"status": "error", "msg": "T+1 限制：今日买入部分不可卖出"})
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
			"status": "success", 
			"msg": "卖出成功", 
			"realized_pnl": realized,
			"qty_traded": req.Qty,
			"remaining_shares": hold.Shares,
			"price": req.Price,
		}
	}

	p.History = append(p.History, TradeLog{
		Date:   time.Now().Format("2006-01-02 15:04:05"),
		Symbol: req.Symbol,
		Name:   stockNames[req.Symbol],
		Action: req.Action,
		Price:  req.Price,
		Shares: req.Qty,
		Fee:    fee,
	})
	savePortfolio(p)
	json.NewEncoder(w).Encode(res)
}

// ---------------------------------------------------------
// AI 流水线接口 (核心：支持 period)
// ---------------------------------------------------------

func handleRefresh(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" { symbol = "601899" }
	period := r.URL.Query().Get("period")
	if period == "" { period = "15" }

	w.Header().Set("Content-Type", "application/json")

	// 速率限制检查
	lastRefreshLock.Lock()
	key := symbol + "_" + period
	if last, ok := lastRefresh[key]; ok {
		remaining := refreshCooldown - time.Since(last)
		if remaining > 0 {
			lastRefreshLock.Unlock()
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "cooldown",
				"msg": fmt.Sprintf("请等待 %d 秒后再刷新（防止数据源封禁）", int(remaining.Seconds())),
				"cooldown_remaining": int(remaining.Seconds()),
			})
			return
		}
	}
	lastRefresh[key] = time.Now()
	lastRefreshLock.Unlock()

	start := time.Now()
	steps := []string{}
	scripts := []struct {
		n string
		s string
	}{
		{"数据获取", "fetch_data.py"},
		{"特征工程", "prepare_features.py"},
		{"模型训练", "train_model.py"},
		{"回测评估", "backtest.py"},
	}

	for _, sc := range scripts {
		cmd := exec.Command("python3", sc.s, "--symbol", symbol, "--period", period)
		cmd.Dir = projectDir
		if out, err := cmd.CombinedOutput(); err == nil {
			steps = append(steps, sc.n + " 完成")
		} else {
			steps = append(steps, sc.n + " 失败: " + string(out))
			break
		}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{ "duration": time.Since(start).String(), "steps": steps, "status": "success" })
}

func handleSignal(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" { symbol = "601899" }
	period := r.URL.Query().Get("period")
	if period == "" { period = "15" }

	cmd := exec.Command("python3", "predict.py", "--symbol", symbol, "--period", period)
	cmd.Dir = projectDir
	out, err := cmd.Output()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]string{"error": "未训练模型"})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(out)
}

func handleIndicators(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" { symbol = "601899" }
	period := r.URL.Query().Get("period")
	if period == "" { period = "15" }

	fname := fmt.Sprintf("features_%s_v3.csv", symbol)
	if period != "daily" { fname = fmt.Sprintf("features_%s_%sm_v3.csv", symbol, period) }
	
	file, err := os.Open(filepath.Join(projectDir, fname))
	if err != nil {
		http.Error(w, "数据文件正在生成中，请刷新或稍后...", 404)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	lines, _ := reader.ReadAll()

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
	for i, r := range lines {
		if i == 0 || len(r) < 22 { continue }
		o, _ := strconv.ParseFloat(r[1], 64); c, _ := strconv.ParseFloat(r[2], 64); h, _ := strconv.ParseFloat(r[3], 64); l, _ := strconv.ParseFloat(r[4], 64)
		v, _ := strconv.ParseFloat(r[7], 64); m5, _ := strconv.ParseFloat(r[15], 64); m20, _ := strconv.ParseFloat(r[16], 64); rs, _ := strconv.ParseFloat(r[19], 64); mc, _ := strconv.ParseFloat(r[22], 64)
		data = append(data, Row{Time: r[0], Open: o, High: h, Low: l, Close: c, Volume: v, MA5: m5, MA20: m20, RSI: rs, MACD: mc})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func handleBacktest(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" { symbol = "601899" }
	period := r.URL.Query().Get("period")
	if period == "" { period = "15" }

	fname := fmt.Sprintf("backtest_results_%s.csv", symbol)
	if period != "daily" { fname = fmt.Sprintf("backtest_results_%s_%sm.csv", symbol, period) }

	data, err := os.ReadFile(filepath.Join(projectDir, fname))
	if err != nil {
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	lines := strings.Split(strings.TrimSpace(string(data)), "\n")
	var curve []interface{}
	for i, line := range lines {
		if i == 0 { continue }
		p := strings.Split(line, ",")
		if len(p) < 5 { continue }
		s, _ := strconv.ParseFloat(p[3], 64); h, _ := strconv.ParseFloat(p[4], 64)
		curve = append(curve, map[string]interface{}{"date": p[0], "strategy": s, "hold": h})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(curve)
}

func handleStocks(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	q := strings.ToLower(r.URL.Query().Get("q"))
	
	type StockInfo struct {
		Symbol string `json:"symbol"`
		Name   string `json:"name"`
	}
	var results []StockInfo
	for sym, name := range stockNames {
		if q == "" || strings.Contains(sym, q) || strings.Contains(strings.ToLower(name), q) {
			results = append(results, StockInfo{Symbol: sym, Name: name})
		}
	}
	json.NewEncoder(w).Encode(results)
}

func handleAIAdvisor(w http.ResponseWriter, r *http.Request) {
	symbol := r.URL.Query().Get("symbol")
	if symbol == "" { symbol = "601899" }
	period := r.URL.Query().Get("period")
	if period == "" { period = "15" }

	w.Header().Set("Content-Type", "application/json")

	cmd := exec.Command("python3", "-m", "ai.main", "--mode", "analyze", "--symbol", symbol, "--period", period)
	cmd.Dir = projectDir
	// 安全传递 API Key：仅通过环境变量，不暴露在日志或前端
	cmd.Env = append(os.Environ(), "DEEPSEEK_API_KEY="+os.Getenv("DEEPSEEK_API_KEY"))
	
	out, err := cmd.Output()
	if err != nil {
		errOut := ""
		if exitErr, ok := err.(*exec.ExitError); ok {
			errOut = string(exitErr.Stderr)
		}
		json.NewEncoder(w).Encode(map[string]string{"error": "AI 分析失败: " + errOut})
		return
	}
	w.Write(out)
}

// loadEnv 从 .env 文件加载环境变量（无需第三方依赖）
func loadEnv() {
	data, err := os.ReadFile(filepath.Join(projectDir, ".env"))
	if err != nil { return }
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") { continue }
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			os.Setenv(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
		}
	}
}

func handleAIChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Query   string `json:"query"`
		History string `json:"history"`
		Context string `json:"context"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	cmd := exec.Command("python3", "-m", "ai.main", "--mode", "chat", "--query", req.Query, "--history", req.History, "--context", req.Context)
	cmd.Dir = projectDir
	cmd.Env = append(os.Environ(), "DEEPSEEK_API_KEY="+os.Getenv("DEEPSEEK_API_KEY"))

	out, err := cmd.CombinedOutput()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]string{"error": "Chat failed: " + string(out)})
		return
	}
	w.Write(out)
}

func handleNews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	cmd := exec.Command("python3", "-m", "ai.main", "--mode", "news")
	cmd.Dir = projectDir
	out, err := cmd.Output()
	if err != nil {
		json.NewEncoder(w).Encode([]string{})
		return
	}
	w.Write(out)
}

func main() {
	// 安全加载 .env 中的密钥
	loadEnv()
	
	// SPA 路由处理：如果是 API 请求则交给 API 处理，否则尝试提供静态文件，若无则返回 index.html
	distDir := filepath.Join(projectDir, "frontend/dist")
	fs := http.FileServer(http.Dir(distDir))
	
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// API 请求不应该进入这里，但在这种简单的路由结构下，我们需要手动过滤
		if len(r.URL.Path) > 4 && r.URL.Path[:5] == "/api/" {
			http.NotFound(w, r)
			return
		}
		
		path := filepath.Join(distDir, r.URL.Path)
		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			// 如果文件不存在（如 /analysis），返回 index.html 实现 SPA 路由
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	http.HandleFunc("/api/signal", handleSignal)
	http.HandleFunc("/api/indicators", handleIndicators)
	http.HandleFunc("/api/refresh", handleRefresh)
	http.HandleFunc("/api/backtest", handleBacktest)
	http.HandleFunc("/api/portfolio", handlePortfolio)
	http.HandleFunc("/api/trade", handleTrade)
	http.HandleFunc("/api/stocks", handleStocks)
	http.HandleFunc("/api/ai-advisor", handleAIAdvisor)
	http.HandleFunc("/api/ai-chat", handleAIChat)
	http.HandleFunc("/api/news", handleNews)

	log.Printf("🚀 YoungQuant Pro Server [Phase 8] 启动: http://localhost:8080")
	if os.Getenv("DEEPSEEK_API_KEY") != "" {
		log.Printf("🤖 DeepSeek AI 顾问已启用")
	} else {
		log.Printf("⚠️  DeepSeek AI 顾问未配置 (缺少 .env 中的 DEEPSEEK_API_KEY)")
	}
	log.Fatal(http.ListenAndServe(":8080", nil))
}
