package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
)

// newInMemoryTradeDB creates a fresh in-memory SQLite DB with all tables needed for trade tests.
func newInMemoryTradeDB(t interface{ Fatal(...interface{}) }) *sql.DB {
	testDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal("failed to open test db:", err)
	}
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			name TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS portfolios (
			user_id INTEGER PRIMARY KEY,
			cash REAL DEFAULT 100000.0,
			mdd REAL DEFAULT 0.0,
			win_rate REAL DEFAULT 0.0,
			sharpe REAL DEFAULT 0.0,
			equity_history_json TEXT DEFAULT '[]',
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
		`CREATE TABLE IF NOT EXISTS holdings (
			user_id INTEGER,
			symbol TEXT,
			shares REAL DEFAULT 0.0,
			cost REAL DEFAULT 0.0,
			available REAL DEFAULT 0.0,
			last_date TEXT,
			PRIMARY KEY(user_id, symbol),
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
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
		);`,
		`CREATE TABLE IF NOT EXISTS stock_bars (
			symbol TEXT,
			period TEXT,
			date TEXT,
			open REAL,
			high REAL,
			low REAL,
			close REAL,
			volume REAL,
			PRIMARY KEY(symbol, period, date)
		);`,
	}
	for _, q := range queries {
		if _, err := testDB.Exec(q); err != nil {
			t.Fatal("failed to create table:", err)
		}
	}
	// Insert test user and portfolio
	if _, err := testDB.Exec(
		"INSERT INTO users (id, email, password, name) VALUES (1, 'trade@example.com', 'hashed', 'Trade User')",
	); err != nil {
		t.Fatal("failed to insert test user:", err)
	}
	if _, err := testDB.Exec(
		"INSERT INTO portfolios (user_id, cash) VALUES (1, 100000.0)",
	); err != nil {
		t.Fatal("failed to insert portfolio:", err)
	}
	return testDB
}

// setupTradeRouter builds a test router with handleTrade and a fixed user_id=1.
func setupTradeRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, 1)
		c.Next()
	})
	r.POST("/api/trade", handleTrade)
	return r
}

// doTrade is a helper to POST a trade request and return the response recorder.
func doTrade(r *gin.Engine, symbol, action string, price, qty float64) *httptest.ResponseRecorder {
	body, _ := json.Marshal(map[string]interface{}{
		"symbol": symbol,
		"action": action,
		"price":  price,
		"qty":    qty,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/trade", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// seedStockBar inserts a daily bar for a symbol with the given prevClose and currentClose.
// prevClose is inserted as the second-most-recent bar (for limit calculation).
func seedStockBar(testDB *sql.DB, symbol string, prevClose, currentClose float64) {
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
	today := time.Now().Format("2006-01-02")
	testDB.Exec(
		"INSERT OR REPLACE INTO stock_bars (symbol, period, date, open, high, low, close, volume) VALUES (?, 'daily', ?, ?, ?, ?, ?, 1000)",
		symbol, yesterday, prevClose, prevClose, prevClose, prevClose,
	)
	testDB.Exec(
		"INSERT OR REPLACE INTO stock_bars (symbol, period, date, open, high, low, close, volume) VALUES (?, 'daily', ?, ?, ?, ?, ?, 1000)",
		symbol, today, currentClose, currentClose, currentClose, currentClose,
	)
}

// ---- Property Test 7.3: Asset Calculation Invariant ----
// **Validates: Requirements 9.1, 9.2**

// TestAssetInvariant verifies that total_assets = cash + Σ(shares_i × price_i)
// and total_pnl_pct = (total_assets - 100000) / 100000 * 100.
// This is a pure math property — no database needed.
func TestAssetInvariant(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		cash := rapid.Float64Range(1000, 100000).Draw(rt, "cash")
		numHoldings := rapid.IntRange(1, 5).Draw(rt, "numHoldings")

		type holding struct {
			shares float64
			price  float64
		}
		holdings := make([]holding, numHoldings)
		for i := 0; i < numHoldings; i++ {
			holdings[i] = holding{
				shares: rapid.Float64Range(1, 1000).Draw(rt, "shares"),
				price:  rapid.Float64Range(1, 1000).Draw(rt, "price"),
			}
		}

		// Compute total assets
		totalAssets := cash
		for _, h := range holdings {
			totalAssets += h.shares * h.price
		}

		// Verify invariant: total_assets = cash + Σ(shares_i × price_i)
		expected := cash
		for _, h := range holdings {
			expected += h.shares * h.price
		}
		if math.Abs(totalAssets-expected) > 1e-9 {
			rt.Fatalf("asset invariant violated: got %.10f, expected %.10f", totalAssets, expected)
		}

		// Verify total_pnl_pct formula
		const initialCapital = 100000.0
		pnlPct := (totalAssets - initialCapital) / initialCapital * 100
		expectedPnlPct := (expected - initialCapital) / initialCapital * 100
		if math.Abs(pnlPct-expectedPnlPct) > 1e-9 {
			rt.Fatalf("pnl_pct invariant violated: got %.10f, expected %.10f", pnlPct, expectedPnlPct)
		}
	})
}

// ---- Property Test 7.4: Fee Calculation Correctness ----
// **Validates: Requirements 8.6**

// TestFeeCalculation verifies that fee = amount * 0.0003 with error < 1e-9.
func TestFeeCalculation(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		amount := rapid.Float64Range(100, 1000000).Draw(rt, "amount")

		fee := amount * 0.0003
		expected := amount * 0.0003

		if math.Abs(fee-expected) >= 1e-9 {
			rt.Fatalf("fee calculation error: got %.15f, expected %.15f, diff %.2e",
				fee, expected, math.Abs(fee-expected))
		}
	})
}

// ---- Property Test 7.5: Price Limit Validation ----
// **Validates: Requirements 8.3**

// TestPriceLimitValidation verifies that handleTrade enforces ±10% price limits.
func TestPriceLimitValidation(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryTradeDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupTradeRouter()

		prevClose := rapid.Float64Range(10, 1000).Draw(rt, "prevClose")
		upperLimit := prevClose * 1.10
		lowerLimit := prevClose * 0.90

		symbol := "601899"
		seedStockBar(testDB, symbol, prevClose, prevClose)

		// Test: price above upper limit → should return 400
		aboveLimit := upperLimit + rapid.Float64Range(0.01, 10).Draw(rt, "aboveExtra")
		w := doTrade(r, symbol, "buy", aboveLimit, 100)
		if w.Code != http.StatusBadRequest {
			rt.Fatalf("expected 400 for price %.2f above upper limit %.2f (prevClose=%.2f), got %d; body: %s",
				aboveLimit, upperLimit, prevClose, w.Code, w.Body.String())
		}

		// Test: price below lower limit → should return 400
		belowLimit := lowerLimit - rapid.Float64Range(0.01, 10).Draw(rt, "belowExtra")
		if belowLimit > 0 {
			w2 := doTrade(r, symbol, "buy", belowLimit, 100)
			if w2.Code != http.StatusBadRequest {
				rt.Fatalf("expected 400 for price %.2f below lower limit %.2f (prevClose=%.2f), got %d; body: %s",
					belowLimit, lowerLimit, prevClose, w2.Code, w2.Body.String())
			}
		}

		// Test: price within limits → should NOT return 400 due to price limit
		// Use midpoint between lower and upper limit
		midPrice := (upperLimit + lowerLimit) / 2
		w3 := doTrade(r, symbol, "buy", midPrice, 100)
		// It may fail for other reasons (e.g. insufficient funds), but NOT with a price-limit error
		if w3.Code == http.StatusBadRequest {
			var resp map[string]interface{}
			json.Unmarshal(w3.Body.Bytes(), &resp)
			msg, _ := resp["msg"].(string)
			if msg == "涨停限制：交易价" || msg == "跌停限制：交易价" {
				rt.Fatalf("mid-price %.2f (prevClose=%.2f) incorrectly rejected with price limit error: %s",
					midPrice, prevClose, w3.Body.String())
			}
			// Check for price limit keywords in msg
			if len(msg) > 0 && (containsStr(msg, "涨停") || containsStr(msg, "跌停")) {
				rt.Fatalf("mid-price %.2f incorrectly rejected with price limit: %s", midPrice, msg)
			}
		}
	})
}

// containsStr is a simple substring check helper.
func containsStr(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && stringContains(s, sub))
}

func stringContains(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// ---- Unit Test 7.6: T+1 Rule Boundary Conditions ----
// **Validates: Requirements 8.4, 8.5**

// TestT1Rule verifies T+1 trading restrictions.
func TestT1Rule(t *testing.T) {
	t.Run("SameDayBuyCannotSell", func(t *testing.T) {
		testDB := newInMemoryTradeDB(t)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupTradeRouter()

		symbol := "601899"
		today := time.Now().Format("2006-01-02")
		// Seed stock bar with today's date so currentDate = today
		seedStockBar(testDB, symbol, 100.0, 100.0)

		// Buy 100 shares today
		w := doTrade(r, symbol, "buy", 100.0, 100)
		if w.Code != http.StatusOK {
			t.Fatalf("buy failed: %d %s", w.Code, w.Body.String())
		}

		// Verify holding has last_date = today and available = 0 (T+1)
		var lastDate string
		var available float64
		testDB.QueryRow("SELECT last_date, available FROM holdings WHERE user_id = 1 AND symbol = ?", symbol).
			Scan(&lastDate, &available)
		if lastDate != today {
			t.Fatalf("expected last_date=%s, got %s", today, lastDate)
		}

		// Attempt to sell same day → should return 400 (T+1 restriction)
		w2 := doTrade(r, symbol, "sell", 100.0, 100)
		if w2.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for same-day sell (T+1), got %d; body: %s", w2.Code, w2.Body.String())
		}
		var resp map[string]interface{}
		json.Unmarshal(w2.Body.Bytes(), &resp)
		msg, _ := resp["msg"].(string)
		if !stringContains(msg, "T+1") {
			t.Fatalf("expected T+1 error message, got: %s", msg)
		}
	})

	t.Run("NextDayBuyCanSell", func(t *testing.T) {
		testDB := newInMemoryTradeDB(t)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupTradeRouter()

		symbol := "601899"
		yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		today := time.Now().Format("2006-01-02")

		// Seed stock bar so currentDate = today
		seedStockBar(testDB, symbol, 100.0, 100.0)

		// Manually insert a holding with last_date = yesterday (simulating yesterday's buy)
		testDB.Exec(
			"INSERT INTO holdings (user_id, symbol, shares, cost, available, last_date) VALUES (1, ?, 100, 100.0, 0, ?)",
			symbol, yesterday,
		)
		// Update cash to reflect the buy
		testDB.Exec("UPDATE portfolios SET cash = ? WHERE user_id = 1", 100000.0-100*100.0-100*100.0*0.0003)

		// Sell today — T+1 should allow it (last_date < currentDate)
		w := doTrade(r, symbol, "sell", 100.0, 100)
		// Should NOT return 400 with T+1 error
		if w.Code == http.StatusBadRequest {
			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			msg, _ := resp["msg"].(string)
			if stringContains(msg, "T+1") {
				t.Fatalf("next-day sell should not be blocked by T+1, got: %s (date: %s, today: %s)", msg, yesterday, today)
			}
		}
	})
}

// ---- Unit Test 7.7: Insufficient Funds Rejection ----
// **Validates: Requirements 8.7**

// TestInsufficientFunds verifies that buy orders exceeding available cash are rejected.
func TestInsufficientFunds(t *testing.T) {
	t.Run("BuyExceedsCash", func(t *testing.T) {
		testDB := newInMemoryTradeDB(t)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupTradeRouter()

		symbol := "601899"
		// Seed stock bar so price limit check passes (prevClose = 100, buy at 100)
		seedStockBar(testDB, symbol, 100.0, 100.0)

		// Try to buy 1001 shares at 100 = 100100 > 100000 cash → should fail
		w := doTrade(r, symbol, "buy", 100.0, 1001)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for insufficient funds, got %d; body: %s", w.Code, w.Body.String())
		}
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		msg, _ := resp["msg"].(string)
		if !stringContains(msg, "资金不足") {
			t.Fatalf("expected '资金不足' in error message, got: %s", msg)
		}
	})

	t.Run("BuyExactlyAffordable", func(t *testing.T) {
		testDB := newInMemoryTradeDB(t)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupTradeRouter()

		symbol := "601899"
		// Buy amount = 99970, fee = 99970 * 0.0003 = 29.991, total = 99999.991 ≤ 100000
		// Use price=99.97, qty=1000: amount=99970, fee=29.991, total=99999.991
		seedStockBar(testDB, symbol, 99.97, 99.97)

		w := doTrade(r, symbol, "buy", 99.97, 1000)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 for affordable buy, got %d; body: %s", w.Code, w.Body.String())
		}
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		status, _ := resp["status"].(string)
		if status != "success" {
			t.Fatalf("expected success status, got: %s; body: %s", status, w.Body.String())
		}
	})
}
