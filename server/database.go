package main

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"strings"

	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

var db *sql.DB

// dbDriver returns "postgres" or "sqlite" based on DATABASE_URL env var.
func dbDriver() string {
	if os.Getenv("DATABASE_URL") != "" {
		return "postgres"
	}
	return "sqlite"
}

// placeholder returns the correct SQL placeholder for the current driver.
// SQLite uses ?, PostgreSQL uses $1, $2, ...
func ph(n int) string {
	if dbDriver() == "postgres" {
		return "$" + strings.TrimSpace(strings.Repeat("?", n)) // handled below
	}
	return "?"
}

// placeholders returns n placeholders for the current driver.
// e.g. placeholders(3) → "?,?,?" for SQLite, "$1,$2,$3" for Postgres
func placeholders(n int) string {
	if dbDriver() == "sqlite" {
		parts := make([]string, n)
		for i := range parts {
			parts[i] = "?"
		}
		return strings.Join(parts, ",")
	}
	// PostgreSQL
	parts := make([]string, n)
	for i := range parts {
		parts[i] = "$" + string(rune('0'+i+1))
		if i+1 >= 10 {
			parts[i] = "$" + strings.TrimSpace(strings.Repeat("0", 0))
		}
	}
	// Use a simpler approach for postgres placeholders
	result := make([]string, n)
	for i := range result {
		result[i] = "$" + itoa(i+1)
	}
	return strings.Join(result, ",")
}

func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return strings.TrimSpace(strings.Repeat("0", 0)) + itoa(n/10) + itoa(n%10)
}

func initDB() {
	driver := dbDriver()

	if driver == "postgres" {
		dsn := os.Getenv("DATABASE_URL")
		var err error
		db, err = sql.Open("postgres", dsn)
		if err != nil {
			log.Fatalf("Failed to connect to PostgreSQL: %v", err)
		}
		if err = db.Ping(); err != nil {
			log.Fatalf("PostgreSQL ping failed: %v", err)
		}
		log.Println("✅ Connected to PostgreSQL")
		initPostgresSchema()
	} else {
		dbPath := filepath.Join(projectDir, "youngquant.db")
		var err error
		db, err = sql.Open("sqlite", dbPath)
		if err != nil {
			log.Fatal(err)
		}
		log.Println("✅ Connected to SQLite")
		initSQLiteSchema()
	}

	seedDailyLessons()
}

// initSQLiteSchema creates all tables for SQLite (uses AUTOINCREMENT, REAL types).
func initSQLiteSchema() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			name TEXT,
			is_public INTEGER DEFAULT 1,
			learning_pct REAL DEFAULT 0.0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS portfolios (
			user_id INTEGER PRIMARY KEY,
			cash REAL DEFAULT 100000.0,
			mdd REAL DEFAULT 0.0,
			win_rate REAL DEFAULT 0.0,
			sharpe REAL DEFAULT 0.0,
			equity_history_json TEXT DEFAULT '[]',
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS holdings (
			user_id INTEGER,
			symbol TEXT,
			shares REAL DEFAULT 0.0,
			cost REAL DEFAULT 0.0,
			available REAL DEFAULT 0.0,
			last_date TEXT,
			PRIMARY KEY(user_id, symbol),
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS trades (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER,
			date TEXT,
			symbol TEXT,
			name TEXT,
			action TEXT,
			price REAL,
			shares REAL,
			fee REAL,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS stock_bars (
			symbol TEXT,
			period TEXT,
			date TEXT,
			open REAL, high REAL, low REAL, close REAL, volume REAL,
			PRIMARY KEY(symbol, period, date)
		)`,
		`CREATE TABLE IF NOT EXISTS features (
			symbol TEXT, period TEXT, date TEXT,
			open REAL, high REAL, low REAL, close REAL, volume REAL,
			ma5 REAL, ma20 REAL, rsi14 REAL, macd_hist REAL,
			PRIMARY KEY(symbol, period, date)
		)`,
		`CREATE TABLE IF NOT EXISTS watchlist (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, symbol),
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS chat_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS learning_progress (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			module TEXT NOT NULL,
			status TEXT DEFAULT 'not_started',
			read_at DATETIME,
			duration_seconds INTEGER DEFAULT 0,
			UNIQUE(user_id, module),
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS daily_lessons (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			day_index INTEGER UNIQUE NOT NULL,
			category TEXT NOT NULL,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			detail_module TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS lesson_reads (
			user_id INTEGER NOT NULL,
			lesson_id INTEGER NOT NULL,
			read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(user_id, lesson_id),
			FOREIGN KEY(user_id) REFERENCES users(id),
			FOREIGN KEY(lesson_id) REFERENCES daily_lessons(id)
		)`,
		`CREATE TABLE IF NOT EXISTS backtest_reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			strategy TEXT NOT NULL,
			params_json TEXT NOT NULL,
			result_json TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS api_cache (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS pending_orders (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			name TEXT,
			action TEXT NOT NULL,
			limit_price REAL NOT NULL,
			qty REAL NOT NULL,
			status TEXT DEFAULT 'pending',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			filled_at DATETIME,
			filled_price REAL,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
	}
	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatalf("SQLite schema error: %v\nQuery: %s", err, q)
		}
	}
	log.Println("✅ SQLite schema initialized")
	migrateAlterTables()
}

// initPostgresSchema creates all tables for PostgreSQL.
// Uses SERIAL instead of AUTOINCREMENT, DOUBLE PRECISION instead of REAL.
func initPostgresSchema() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			name TEXT,
			is_public INTEGER DEFAULT 1,
			learning_pct DOUBLE PRECISION DEFAULT 0.0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS portfolios (
			user_id INTEGER PRIMARY KEY,
			cash DOUBLE PRECISION DEFAULT 100000.0,
			mdd DOUBLE PRECISION DEFAULT 0.0,
			win_rate DOUBLE PRECISION DEFAULT 0.0,
			sharpe DOUBLE PRECISION DEFAULT 0.0,
			equity_history_json TEXT DEFAULT '[]',
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS holdings (
			user_id INTEGER,
			symbol TEXT,
			shares DOUBLE PRECISION DEFAULT 0.0,
			cost DOUBLE PRECISION DEFAULT 0.0,
			available DOUBLE PRECISION DEFAULT 0.0,
			last_date TEXT,
			PRIMARY KEY(user_id, symbol),
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS trades (
			id SERIAL PRIMARY KEY,
			user_id INTEGER,
			date TEXT,
			symbol TEXT,
			name TEXT,
			action TEXT,
			price DOUBLE PRECISION,
			shares DOUBLE PRECISION,
			fee DOUBLE PRECISION,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS stock_bars (
			symbol TEXT, period TEXT, date TEXT,
			open DOUBLE PRECISION, high DOUBLE PRECISION,
			low DOUBLE PRECISION, close DOUBLE PRECISION, volume DOUBLE PRECISION,
			PRIMARY KEY(symbol, period, date)
		)`,
		`CREATE TABLE IF NOT EXISTS features (
			symbol TEXT, period TEXT, date TEXT,
			open DOUBLE PRECISION, high DOUBLE PRECISION,
			low DOUBLE PRECISION, close DOUBLE PRECISION, volume DOUBLE PRECISION,
			ma5 DOUBLE PRECISION, ma20 DOUBLE PRECISION,
			rsi14 DOUBLE PRECISION, macd_hist DOUBLE PRECISION,
			PRIMARY KEY(symbol, period, date)
		)`,
		`CREATE TABLE IF NOT EXISTS watchlist (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, symbol),
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS notes (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			symbol TEXT,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS chat_history (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			symbol TEXT,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS learning_progress (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			module TEXT NOT NULL,
			status TEXT DEFAULT 'not_started',
			read_at TIMESTAMP,
			duration_seconds INTEGER DEFAULT 0,
			UNIQUE(user_id, module),
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS daily_lessons (
			id SERIAL PRIMARY KEY,
			day_index INTEGER UNIQUE NOT NULL,
			category TEXT NOT NULL,
			title TEXT NOT NULL,
			content TEXT NOT NULL,
			detail_module TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS lesson_reads (
			user_id INTEGER NOT NULL,
			lesson_id INTEGER NOT NULL,
			read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY(user_id, lesson_id),
			FOREIGN KEY(user_id) REFERENCES users(id),
			FOREIGN KEY(lesson_id) REFERENCES daily_lessons(id)
		)`,
		`CREATE TABLE IF NOT EXISTS backtest_reports (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			strategy TEXT NOT NULL,
			params_json TEXT NOT NULL,
			result_json TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
		`CREATE TABLE IF NOT EXISTS api_cache (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL,
			fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS pending_orders (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			name TEXT,
			action TEXT NOT NULL,
			limit_price DOUBLE PRECISION NOT NULL,
			qty DOUBLE PRECISION NOT NULL,
			status TEXT DEFAULT 'pending',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			filled_at TIMESTAMP,
			filled_price DOUBLE PRECISION,
			FOREIGN KEY(user_id) REFERENCES users(id)
		)`,
	}
	for _, q := range queries {
		if _, err := db.Exec(q); err != nil {
			log.Fatalf("PostgreSQL schema error: %v\nQuery: %s", err, q)
		}
	}
	log.Println("✅ PostgreSQL schema initialized")
}

// migrateAlterTables adds new columns to existing SQLite tables.
func migrateAlterTables() {
	alterStmts := []string{
		`ALTER TABLE users ADD COLUMN is_public INTEGER DEFAULT 1`,
		`ALTER TABLE users ADD COLUMN learning_pct REAL DEFAULT 0.0`,
		`ALTER TABLE portfolios ADD COLUMN equity_history_json TEXT DEFAULT '[]'`,
		`ALTER TABLE portfolios ADD COLUMN initial_cash REAL DEFAULT 100000.0`,
	}
	for _, stmt := range alterStmts {
		if _, err := db.Exec(stmt); err != nil {
			log.Printf("migrateAlterTables (ignored): %v", err)
		}
	}
	log.Println("✅ Table migration completed")
}

// seedDailyLessons inserts 60 preset daily lessons if not already present.
func seedDailyLessons() {
	type lesson struct {
		dayIndex     int
		category     string
		title        string
		content      string
		detailModule string
	}

	lessons := []lesson{
		{0, "技术分析", "K线基础：阳线与阴线", "K线由开盘价、收盘价、最高价、最低价构成。收盘价高于开盘价为阳线（红色），反之为阴线（绿色）。实体越长，多空力量越强。", "kline_basics"},
		{1, "技术分析", "K线形态：锤子线与上吊线", "锤子线出现在下跌趋势末端，实体小、下影线长，预示反转向上。上吊线形态相同但出现在上涨趋势末端，预示反转向下。", "kline_patterns"},
		{2, "技术分析", "K线形态：吞没形态", "看涨吞没：阴线后出现更大阳线完全覆盖前一根实体，多方力量强势反转。看跌吞没：阳线后出现更大阴线，空方占据主导。", "kline_patterns"},
		{3, "技术分析", "均线系统：MA5与MA20", "MA5为5日均线，反映短期趋势；MA20为20日均线，反映中期趋势。价格在均线上方为多头市场，下方为空头市场。", "moving_average"},
		{4, "技术分析", "均线金叉与死叉", "短期均线（MA5）从下方穿越长期均线（MA20）形成金叉，是买入信号。短期均线从上方穿越长期均线形成死叉，是卖出信号。", "moving_average"},
		{5, "技术分析", "成交量分析基础", "量价配合是技术分析核心。价涨量增为健康上涨；价涨量缩需警惕；价跌量增为恐慌抛售；价跌量缩为缩量整理。", "volume_analysis"},
		{6, "技术分析", "RSI相对强弱指标", "RSI衡量价格变动速度与幅度，范围0-100。RSI>70为超买区，可能回调；RSI<30为超卖区，可能反弹。中轴50是多空分界线。", "rsi"},
		{7, "技术分析", "MACD指标解读", "MACD由DIF线、DEA线和柱状图组成。DIF上穿DEA为金叉买入信号；DIF下穿DEA为死叉卖出信号。柱状图由负转正预示趋势转变。", "macd"},
		{8, "技术分析", "布林带（Bollinger Bands）", "布林带由中轨（20日均线）和上下轨（±2倍标准差）组成。价格触及上轨可能回落，触及下轨可能反弹。带宽收窄预示即将大幅波动。", "bollinger_bands"},
		{9, "技术分析", "支撑位与压力位", "支撑位是价格下跌时遇到买盘支撑的价格区域；压力位是价格上涨时遇到卖盘阻力的区域。突破压力位后，压力位转变为支撑位。", "support_resistance"},
		{10, "技术分析", "趋势线的画法与应用", "连接两个以上低点画上升趋势线，连接两个以上高点画下降趋势线。价格沿趋势线运行，突破趋势线预示趋势改变。", "trend_lines"},
		{11, "技术分析", "KDJ随机指标", "KDJ由K、D、J三线组成。K线与D线在低位（<20）金叉为买入信号，在高位（>80）死叉为卖出信号。J线超买超卖信号更灵敏。", "kdj"},
		{12, "技术分析", "量价背离信号", "价格创新高但成交量未同步放大，称为顶背离，预示上涨动能减弱。价格创新低但成交量萎缩，称为底背离，预示下跌动能减弱。", "volume_analysis"},
		{13, "技术分析", "头肩顶与头肩底形态", "头肩顶由左肩、头部、右肩三个高点组成，颈线被跌破后目标跌幅等于头部到颈线距离。头肩底为反转向上的形态。", "chart_patterns"},
		{14, "技术分析", "双顶与双底形态", "双顶（M头）：价格两次冲高未能突破，颈线跌破后确认下跌。双底（W底）：价格两次探低后反弹，颈线突破后确认上涨。", "chart_patterns"},
		{15, "基本面分析", "市盈率（PE）解读", "市盈率=股价/每股收益，反映市场对公司盈利的估值倍数。PE越低通常越便宜，但需结合行业平均水平和成长性综合判断。", "valuation"},
		{16, "基本面分析", "市净率（PB）解读", "市净率=股价/每股净资产，反映市场对公司账面价值的溢价。PB<1可能被低估，但需排除资产质量差的情况。银行股常用PB估值。", "valuation"},
		{17, "基本面分析", "营收与净利润增长", "营收增长反映公司业务扩张能力，净利润增长反映盈利能力提升。持续的双位数增长是成长股的重要特征。", "financial_statements"},
		{18, "基本面分析", "毛利率与净利率", "毛利率=（营收-成本）/营收，反映产品竞争力。净利率=净利润/营收，反映综合盈利能力。高毛利率行业如软件、医药具有更强护城河。", "financial_statements"},
		{19, "基本面分析", "ROE股东权益回报率", "ROE=净利润/股东权益，衡量公司利用股东资金创造利润的效率。巴菲特偏好ROE持续>15%的公司，这类公司通常具有竞争优势。", "financial_statements"},
		{20, "基本面分析", "资产负债率与财务健康", "资产负债率=总负债/总资产，反映财务杠杆水平。过高的负债率（>70%）增加财务风险，但不同行业标准不同，如房地产行业普遍较高。", "financial_statements"},
		{21, "基本面分析", "现金流分析", "经营性现金流是公司真实盈利能力的体现。净利润高但经营现金流为负需警惕，可能存在应收账款积压或利润质量问题。", "cash_flow"},
		{22, "基本面分析", "行业分析：周期股与成长股", "周期股（钢铁、化工）随经济周期波动，低PE时买入；成长股（科技、消费）关注增速，可接受较高PE。选股需先判断行业属性。", "industry_analysis"},
		{23, "基本面分析", "护城河理论", "护城河是公司持续竞争优势的来源，包括品牌（茅台）、网络效应（微信）、成本优势（制造业龙头）、转换成本（企业软件）等。", "competitive_advantage"},
		{24, "基本面分析", "分红与股息率", "股息率=每股分红/股价，高股息率股票适合价值投资者。连续多年稳定分红的公司通常现金流充裕、经营稳健。", "dividends"},
		{25, "基本面分析", "PEG估值法", "PEG=PE/净利润增长率，综合考虑估值与成长性。PEG<1通常被认为低估，PEG>2则可能高估。适用于成长型公司估值。", "valuation"},
		{26, "基本面分析", "季报与年报解读", "重点关注：营收和净利润同比增速、毛利率变化趋势、经营现金流、管理层展望。业绩超预期往往带来股价上涨，不及预期则下跌。", "financial_statements"},
		{27, "基本面分析", "行业景气度分析", "行业景气度高时，即使普通公司也能获得超额收益。通过PMI、行业产销数据、龙头公司订单情况判断行业所处周期位置。", "industry_analysis"},
		{28, "基本面分析", "商誉风险", "商誉是并购溢价的体现，若被收购公司业绩不达预期，需计提商誉减值，直接冲击净利润。高商誉公司需关注减值风险。", "risk_factors"},
		{29, "基本面分析", "股权结构与大股东行为", "大股东持股比例高且稳定是积极信号；大股东频繁减持需警惕。股权质押比例过高（>50%）存在强制平仓风险。", "corporate_governance"},
		{30, "交易心理", "损失厌恶心理", "人们对损失的痛苦感约是同等收益快乐感的2倍。这导致投资者倾向于过早卖出盈利股票（落袋为安），却长期持有亏损股票（不愿认亏）。", "behavioral_finance"},
		{31, "交易心理", "锚定效应", "投资者常以买入价格为锚点，影响后续决策。股价跌破成本价就不愿卖出，或以历史高点为参考认为当前价格便宜。应以当前价值而非历史价格做决策。", "behavioral_finance"},
		{32, "交易心理", "羊群效应与从众心理", "市场大涨时追高买入，大跌时恐慌抛售，是典型的羊群效应。成功的投资者往往逆向思考：在别人恐惧时贪婪，在别人贪婪时恐惧。", "behavioral_finance"},
		{33, "交易心理", "过度自信偏差", "研究表明大多数投资者认为自己的选股能力高于平均水平。过度自信导致交易频率过高、仓位过重、忽视风险。保持谦逊，承认不确定性。", "behavioral_finance"},
		{34, "交易心理", "确认偏误", "人们倾向于寻找支持自己观点的信息，忽视相反证据。买入某股后只关注利好消息，忽视风险信号。主动寻找反对意见有助于客观决策。", "behavioral_finance"},
		{35, "交易心理", "处置效应", "投资者倾向于过早卖出盈利股票、长期持有亏损股票，这称为处置效应。正确做法是：让利润奔跑，及时止损。", "behavioral_finance"},
		{36, "交易心理", "情绪与交易纪律", "恐惧和贪婪是市场的两大驱动力。建立交易计划并严格执行，避免情绪化操作。在市场极度恐慌或狂热时，往往是最好的反向操作时机。", "trading_psychology"},
		{37, "交易心理", "建立交易日志", "记录每笔交易的买卖理由、预期目标、实际结果和复盘总结。定期回顾交易日志有助于发现自身的系统性错误，持续改进交易策略。", "trading_psychology"},
		{38, "交易心理", "接受亏损的心态", "亏损是交易的一部分，即使最优秀的交易者也有亏损交易。关键是控制单笔亏损幅度，保证整体期望值为正。不要因为一次亏损而怀疑整个策略。", "trading_psychology"},
		{39, "交易心理", "避免频繁交易", "频繁交易增加手续费成本，且研究表明交易越频繁的投资者收益越差。坚持高质量的交易机会，宁可错过也不要追逐不确定的机会。", "trading_psychology"},
		{40, "交易心理", "设定止盈止损的重要性", "进场前设定止盈止损位，并严格执行。止损保护本金，止盈锁定利润。不要因为贪婪而取消止盈，也不要因为侥幸而移动止损。", "risk_management"},
		{41, "交易心理", "市场噪音与长期视角", "短期市场充满噪音，日内波动往往无意义。培养长期视角，关注公司基本面和趋势，而非每日涨跌。减少看盘频率有助于做出更理性的决策。", "trading_psychology"},
		{42, "交易心理", "复盘与持续学习", "每周进行交易复盘，分析盈利和亏损交易的共同特征。市场在变化，成功的交易者需要持续学习和适应，不断优化自己的交易系统。", "trading_psychology"},
		{43, "交易心理", "仓位与心理压力", "仓位过重会导致心理压力过大，影响判断力。合理的仓位管理让你在市场波动时保持冷静。一般建议单只股票仓位不超过总资产的20%。", "position_sizing"},
		{44, "交易心理", "等待最佳时机", "优秀的交易者大部分时间在等待，而非频繁操作。耐心等待高确定性的交易机会，在胜率最高时出手，是提升收益的关键。", "trading_psychology"},
		{45, "风险管理", "风险管理的核心原则", "风险管理的首要原则是保护本金。宁可少赚，不可大亏。一次50%的亏损需要100%的盈利才能回本。控制最大回撤是长期生存的关键。", "risk_basics"},
		{46, "风险管理", "仓位管理：固定比例法", "每笔交易使用固定比例的资金（如总资产的5-10%）。这样即使连续亏损，也不会因单次失误而伤及根本，保证长期参与市场的能力。", "position_sizing"},
		{47, "风险管理", "止损策略：百分比止损", "设定固定百分比止损（如买入价的5-8%）。一旦价格跌破止损位立即执行，不要犹豫。止损是保护本金的保险，而非失败的标志。", "stop_loss"},
		{48, "风险管理", "止损策略：技术位止损", "以重要支撑位（如均线、前期低点）作为止损参考。技术位止损比固定百分比更符合市场逻辑，但需要一定的技术分析基础。", "stop_loss"},
		{49, "风险管理", "分散投资与集中投资", "分散投资降低单一股票风险，但过度分散会稀释收益。建议持有5-10只股票，既能分散风险，又能保持对每只股票的深度研究。", "diversification"},
		{50, "风险管理", "最大回撤（MDD）指标", "最大回撤是从历史最高点到最低点的最大跌幅，衡量策略的最大亏损风险。MDD越小，策略越稳健。一般要求MDD不超过20-30%。", "performance_metrics"},
		{51, "风险管理", "夏普比率（Sharpe Ratio）", "夏普比率=（策略收益-无风险收益）/收益标准差，衡量单位风险的超额收益。夏普比率>1为良好，>2为优秀。用于比较不同策略的风险调整后收益。", "performance_metrics"},
		{52, "风险管理", "胜率与盈亏比的关系", "胜率高不一定盈利，关键是盈亏比。胜率40%但盈亏比3:1的策略，期望值为正（0.4×3-0.6×1=0.6）。追求合理的盈亏比比追求高胜率更重要。", "risk_reward"},
		{53, "风险管理", "集中持仓风险", "单只股票仓位超过总资产30%属于集中持仓，风险较高。即使对某只股票非常看好，也应控制仓位，避免因黑天鹅事件造成重大损失。", "concentration_risk"},
		{54, "风险管理", "流动性风险", "小市值股票流动性差，买卖时可能面临较大的冲击成本。在市场恐慌时，流动性差的股票可能无法及时卖出。优先选择流动性好的股票。", "liquidity_risk"},
		{55, "风险管理", "系统性风险与非系统性风险", "系统性风险（市场整体下跌）无法通过分散投资消除；非系统性风险（个股风险）可以通过持有多只股票分散。了解两类风险有助于制定合理策略。", "risk_types"},
		{56, "风险管理", "黑天鹅事件应对", "黑天鹅是极端罕见但影响巨大的事件。应对方法：保持适当现金仓位、设置止损、避免过度杠杆。不要因为小概率而忽视极端风险。", "tail_risk"},
		{57, "风险管理", "杠杆的双刃剑效应", "杠杆放大收益的同时也放大亏损。2倍杠杆下，50%的下跌会导致本金归零。初学者应避免使用杠杆，先在无杠杆环境下建立稳定盈利能力。", "leverage"},
		{58, "风险管理", "定期评估与再平衡", "定期（如每月）评估持仓，检查是否偏离原始投资逻辑。若基本面发生变化，及时调整仓位。再平衡有助于控制风险敞口，保持策略一致性。", "portfolio_management"},
		{59, "风险管理", "建立个人风险承受能力认知", "了解自己的风险承受能力：能承受多大回撤而不影响睡眠？资金是否为闲置资金？投资期限多长？根据自身情况制定适合的风险管理策略。", "risk_basics"},
	}

	stmt := `INSERT OR IGNORE INTO daily_lessons (day_index, category, title, content, detail_module) VALUES (?, ?, ?, ?, ?)`
	if dbDriver() == "postgres" {
		stmt = `INSERT INTO daily_lessons (day_index, category, title, content, detail_module) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (day_index) DO NOTHING`
	}
	for _, l := range lessons {
		if _, err := db.Exec(stmt, l.dayIndex, l.category, l.title, l.content, l.detailModule); err != nil {
			log.Printf("seedDailyLessons: failed to insert day_index=%d: %v", l.dayIndex, err)
		}
	}
	log.Println("✅ Daily lessons seeded (60 entries)")
}
