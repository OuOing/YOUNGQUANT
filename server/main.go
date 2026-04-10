package main

import (
	"flag"
	"log"
	"os"
	"os/exec"
	"time"
)

// isTradeDay 判断是否为交易日（简单判断：非周末）
func isTradeDay(t time.Time) bool {
	wd := t.Weekday()
	return wd != time.Saturday && wd != time.Sunday
}

// isTradeHour 判断是否在交易时段 9:30-15:00
func isTradeHour(t time.Time) bool {
	h, m := t.Hour(), t.Minute()
	afterOpen := h > 9 || (h == 9 && m >= 30)
	beforeClose := h < 15 || (h == 15 && m == 0)
	return afterOpen && beforeClose
}

var coreSymbols = []string{
	"601899", "601318", "600519", "300750", "000001",
	"600036", "000858", "600900", "601012", "000725",
	"601398", "601288", "601939", "601988", "601166",
	"002594", "600438", "300274", "688599",
	"688981", "002415", "300059", "002230", "300760",
	"000651", "000333", "600887", "603288", "601888",
	"601088", "600028", "601857", "601225",
	"600276", "000538", "300122",
}

func fetchSymbol(sym, period string) {
	cmd := exec.Command("python3", "fetch_data.py", "--symbol", sym, "--period", period)
	cmd.Dir = projectDir
	if out, err := cmd.CombinedOutput(); err != nil {
		log.Printf("  ✗ %s [%s] 失败: %v | %s", sym, period, err, string(out))
		return
	}
	log.Printf("  ✓ %s [%s] 数据拉取完成", sym, period)

	// 生成特征文件
	go func() {
		cmd2 := exec.Command("python3", "prepare_features.py", "--symbol", sym, "--period", period)
		cmd2.Dir = projectDir
		if _, err := cmd2.CombinedOutput(); err != nil {
			log.Printf("  ✗ %s [%s] 特征生成失败", sym, period)
			return
		}
		log.Printf("  ✓ %s [%s] 特征生成完成", sym, period)

		// 把 CSV 导入数据库（覆盖旧数据）
		p := period
		if p == "daily" {
			importStockBars("stock_" + sym + ".csv")
			importFeatures("features_" + sym + "_v3.csv")
		} else {
			importStockBars("stock_" + sym + "_" + p + "m.csv")
			importFeatures("features_" + sym + "_" + p + "m_v3.csv")
		}
		log.Printf("  ✓ %s [%s] 数据库已更新", sym, period)
	}()
}

// autoFetchDaily 每天 15:35 拉取日线
func autoFetchDaily() {
	for {
		now := time.Now()
		next := time.Date(now.Year(), now.Month(), now.Day(), 15, 35, 0, 0, now.Location())
		if now.After(next) {
			next = next.Add(24 * time.Hour)
		}
		time.Sleep(time.Until(next))

		if !isTradeDay(time.Now()) {
			continue
		}
		log.Println("⏰ [日线] 开始拉取...")
		for _, sym := range coreSymbols {
			fetchSymbol(sym, "daily")
		}
		log.Println("⏰ [日线] 完成")
		go matchPendingOrders()
	}
}

// autoFetch15m 交易时段每 15 分钟拉取 15 分钟线
func autoFetch15m() {
	ticker := time.NewTicker(15 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		if !isTradeDay(now) || !isTradeHour(now) {
			continue
		}
		log.Println("⏰ [15m] 开始拉取...")
		for _, sym := range coreSymbols[:10] {
			fetchSymbol(sym, "15")
		}
		log.Println("⏰ [15m] 完成")
		go matchPendingOrders()
	}
}

// autoMatch 每分钟在交易时段运行撮合引擎
func autoMatch() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		if !isTradeDay(now) || !isTradeHour(now) {
			continue
		}
		matchPendingOrders()
	}
}

// initMissingData 服务器启动后后台补齐缺失或过期的股票数据
// 检查每只核心股票是否有日线数据，没有或数据超过7天未更新则拉取
func initMissingData() {
	time.Sleep(5 * time.Second)

	toUpdate := []string{}
	cutoff := time.Now().AddDate(0, 0, -7).Format("2006-01-02")

	for _, sym := range coreSymbols {
		var latestDate string
		db.QueryRow("SELECT MAX(date) FROM stock_bars WHERE symbol = ? AND period = 'daily'", sym).Scan(&latestDate)
		if latestDate == "" || latestDate < cutoff {
			toUpdate = append(toUpdate, sym)
		}
	}

	if len(toUpdate) == 0 {
		log.Println("✅ 所有核心股票数据均为最新，无需初始化")
		return
	}

	log.Printf("📥 检测到 %d 只股票需要更新数据（缺失或超过7天）...", len(toUpdate))

	for i, sym := range toUpdate {
		log.Printf("  [%d/%d] 拉取 %s 日线数据...", i+1, len(toUpdate), sym)
		fetchSymbol(sym, "daily")
		cmd := exec.Command("python3", "prepare_features.py", "--symbol", sym, "--period", "daily")
		cmd.Dir = projectDir
		if out, err := cmd.CombinedOutput(); err != nil {
			outStr := string(out)
			if len(outStr) > 100 {
				outStr = outStr[:100]
			}
			log.Printf("  ✗ %s 特征生成失败: %s", sym, outStr)
		} else {
			log.Printf("  ✓ %s 特征生成完成", sym)
		}
		time.Sleep(3 * time.Second)
	}

	log.Printf("✅ 数据初始化完成，共更新 %d 只股票", len(toUpdate))
}

func main() {
	migrateFlag := flag.Bool("migrate", false, "Migrate CSV data to SQLite")
	flag.Parse()

	// 生产模式：减少日志输出
	if os.Getenv("GIN_MODE") == "" {
		os.Setenv("GIN_MODE", "release")
	}

	loadEnv()
	initDB()
	migrateAlterTables()

	if *migrateFlag {
		migrateCSVs()
		return
	}

	go autoFetchDaily()
	go autoFetch15m()
	go autoMatch()
	// 启动时后台补齐缺失数据（不阻塞启动）
	go initMissingData()

	r := setupRouter()
	log.Printf("🚀 YoungQuant Pro Server 启动: http://localhost:8080")
	r.Run(":8080")
}
