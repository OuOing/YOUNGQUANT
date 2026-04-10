package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	_ "modernc.org/sqlite"
	"golang.org/x/crypto/bcrypt"
	"pgregory.net/rapid"
)

// newInMemoryAuthTradeDB creates a fresh in-memory SQLite DB with all tables needed for auth/trade tests.
func newInMemoryAuthTradeDB(t interface{ Fatal(...interface{}) }) *sql.DB {
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
		`CREATE TABLE IF NOT EXISTS learning_progress (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			module TEXT NOT NULL,
			status TEXT DEFAULT 'not_started',
			read_at DATETIME,
			duration_seconds INTEGER DEFAULT 0,
			UNIQUE(user_id, module),
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
	}
	for _, q := range queries {
		if _, err := testDB.Exec(q); err != nil {
			t.Fatal("failed to create table:", err)
		}
	}
	return testDB
}

// setupTradesRouter builds a test router with handleTrades and a fixed user_id=1.
func setupTradesRouter(userID int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, userID)
		c.Next()
	})
	r.GET("/api/trades", handleTrades)
	return r
}

// setupRegisterLoginRouter builds a test router with handleRegister and handleLogin.
func setupRegisterLoginRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/register", handleRegister)
	r.POST("/api/login", handleLogin)
	return r
}

// doRegister is a helper to POST a register request.
func doRegister(r *gin.Engine, email, password, name string) *httptest.ResponseRecorder {
	body, _ := json.Marshal(map[string]interface{}{
		"email":    email,
		"password": password,
		"name":     name,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// doLogin is a helper to POST a login request.
func doLogin(r *gin.Engine, email, password string, rememberMe bool) *httptest.ResponseRecorder {
	body, _ := json.Marshal(map[string]interface{}{
		"email":       email,
		"password":    password,
		"remember_me": rememberMe,
	})
	req := httptest.NewRequest(http.MethodPost, "/api/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// ---- Property Test 8.3 (Property 20): Trade Record Persistence Round-Trip ----
// **Validates: Requirements 10.1, 18.1**

// TestTradeRecordRoundTrip verifies that a trade record inserted directly into the DB
// can be retrieved via GET /api/trades with matching fields.
func TestTradeRecordRoundTrip(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryAuthTradeDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		// Insert a test user
		res, err := testDB.Exec(
			"INSERT INTO users (email, password, name) VALUES ('roundtrip@example.com', 'hashed', 'RT User')",
		)
		if err != nil {
			rt.Fatalf("failed to insert user: %v", err)
		}
		userID64, _ := res.LastInsertId()
		userID := int(userID64)

		r := setupTradesRouter(userID)

		// Generate random trade fields
		symbol := rapid.StringMatching(`[0-9]{6}`).Draw(rt, "symbol")
		action := rapid.SampledFrom([]string{"buy", "sell"}).Draw(rt, "action")
		price := rapid.Float64Range(1, 1000).Draw(rt, "price")
		shares := rapid.Float64Range(1, 1000).Draw(rt, "shares")
		fee := rapid.Float64Range(0, 100).Draw(rt, "fee")
		date := time.Now().Format("2006-01-02")

		// INSERT directly into trades table
		_, err = testDB.Exec(
			"INSERT INTO trades (user_id, date, symbol, name, action, price, shares, fee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			userID, date, symbol, "", action, price, shares, fee,
		)
		if err != nil {
			rt.Fatalf("failed to insert trade: %v", err)
		}

		// GET /api/trades
		req := httptest.NewRequest(http.MethodGet, "/api/trades", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			rt.Fatalf("GET /api/trades returned %d, want 200; body: %s", w.Code, w.Body.String())
		}

		var items []map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &items); err != nil {
			rt.Fatalf("failed to parse response: %v", err)
		}

		// Find the inserted record
		found := false
		for _, item := range items {
			if item["symbol"] == symbol && item["action"] == action {
				gotPrice, _ := item["price"].(float64)
				gotShares, _ := item["shares"].(float64)
				gotFee, _ := item["fee"].(float64)
				const eps = 1e-6
				if abs64(gotPrice-price) < eps && abs64(gotShares-shares) < eps && abs64(gotFee-fee) < eps {
					found = true
					break
				}
			}
		}
		if !found {
			rt.Fatalf("trade record (symbol=%s, action=%s, price=%.4f, shares=%.4f, fee=%.4f) not found in response; got %d items",
				symbol, action, price, shares, fee, len(items))
		}
	})
}

// abs64 returns the absolute value of a float64.
func abs64(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

// ---- Property Test 8.4 (Property 21): Trade Filter Correctness ----
// **Validates: Requirements 10.2**

// TestTradeFilterCorrectness verifies that filtering by symbol or action returns only matching records.
func TestTradeFilterCorrectness(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryAuthTradeDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		// Insert a test user
		res, err := testDB.Exec(
			"INSERT INTO users (email, password, name) VALUES ('filter@example.com', 'hashed', 'Filter User')",
		)
		if err != nil {
			rt.Fatalf("failed to insert user: %v", err)
		}
		userID64, _ := res.LastInsertId()
		userID := int(userID64)

		r := setupTradesRouter(userID)

		// Generate two distinct symbols and actions
		symbol1 := rapid.StringMatching(`[0-9]{6}`).Draw(rt, "symbol1")
		symbol2 := rapid.StringMatching(`[0-9]{6}`).Draw(rt, "symbol2")
		// Ensure they differ
		if symbol1 == symbol2 {
			symbol2 = fmt.Sprintf("%06d", (func() int {
				n := 0
				for _, c := range symbol1 {
					n = n*10 + int(c-'0')
				}
				return (n + 1) % 1000000
			})())
		}

		date := time.Now().Format("2006-01-02")

		// Insert trades for symbol1 (buy) and symbol2 (sell)
		testDB.Exec(
			"INSERT INTO trades (user_id, date, symbol, name, action, price, shares, fee) VALUES (?, ?, ?, '', 'buy', 100, 10, 0.3)",
			userID, date, symbol1,
		)
		testDB.Exec(
			"INSERT INTO trades (user_id, date, symbol, name, action, price, shares, fee) VALUES (?, ?, ?, '', 'sell', 200, 5, 0.3)",
			userID, date, symbol2,
		)

		// Filter by symbol1 — all returned records must have symbol == symbol1
		req := httptest.NewRequest(http.MethodGet, "/api/trades?symbol="+symbol1, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			rt.Fatalf("GET /api/trades?symbol=%s returned %d; body: %s", symbol1, w.Code, w.Body.String())
		}
		var items []map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &items)
		for _, item := range items {
			if item["symbol"] != symbol1 {
				rt.Fatalf("symbol filter: expected symbol=%s, got %s", symbol1, item["symbol"])
			}
		}

		// Filter by action=buy — all returned records must have action == "buy"
		req2 := httptest.NewRequest(http.MethodGet, "/api/trades?action=buy", nil)
		w2 := httptest.NewRecorder()
		r.ServeHTTP(w2, req2)

		if w2.Code != http.StatusOK {
			rt.Fatalf("GET /api/trades?action=buy returned %d; body: %s", w2.Code, w2.Body.String())
		}
		var items2 []map[string]interface{}
		json.Unmarshal(w2.Body.Bytes(), &items2)
		for _, item := range items2 {
			if item["action"] != "buy" {
				rt.Fatalf("action filter: expected action=buy, got %s", item["action"])
			}
		}
	})
}

// ---- Property Test 8.5 (Property 22): Password Secure Storage ----
// **Validates: Requirements 11.1, 11.2**

// TestPasswordSecureStorage verifies that passwords are stored as bcrypt hashes, not plaintext.
func TestPasswordSecureStorage(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryAuthTradeDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupRegisterLoginRouter()

		// Generate a random password (8-20 alphanumeric chars)
		pwLen := rapid.IntRange(8, 20).Draw(rt, "pwLen")
		chars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
		pw := ""
		for i := 0; i < pwLen; i++ {
			idx := rapid.IntRange(0, len(chars)-1).Draw(rt, fmt.Sprintf("char%d", i))
			pw += string(chars[idx])
		}

		email := fmt.Sprintf("pwtest_%s@example.com", rapid.StringMatching(`[a-z]{6}`).Draw(rt, "suffix"))

		// Register
		w := doRegister(r, email, pw, "PW Test User")
		if w.Code != http.StatusOK {
			rt.Fatalf("register returned %d; body: %s", w.Code, w.Body.String())
		}

		// Query stored password from DB
		var storedPw string
		err := testDB.QueryRow("SELECT password FROM users WHERE email = ?", email).Scan(&storedPw)
		if err != nil {
			rt.Fatalf("failed to query stored password: %v", err)
		}

		// Stored password must NOT equal original
		if storedPw == pw {
			rt.Fatalf("password stored as plaintext: %q", storedPw)
		}

		// bcrypt.CompareHashAndPassword must return nil
		if err := bcrypt.CompareHashAndPassword([]byte(storedPw), []byte(pw)); err != nil {
			rt.Fatalf("bcrypt comparison failed: %v (stored=%q, original=%q)", err, storedPw, pw)
		}
	})
}

// ---- Property Test 8.6 (Property 23): JWT Token Expiry ----
// **Validates: Requirements 11.3**

// TestJWTExpiry verifies that JWT tokens have the correct expiry time.
func TestJWTExpiry(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryAuthTradeDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupRegisterLoginRouter()

		suffix := rapid.StringMatching(`[a-z]{8}`).Draw(rt, "suffix")
		email := fmt.Sprintf("jwt_%s@example.com", suffix)
		password := "password123"

		// Register
		w := doRegister(r, email, password, "JWT User")
		if w.Code != http.StatusOK {
			rt.Fatalf("register returned %d; body: %s", w.Code, w.Body.String())
		}

		// Test remember_me=false → exp in now+24h ±60s
		before := time.Now()
		wLogin := doLogin(r, email, password, false)
		if wLogin.Code != http.StatusOK {
			rt.Fatalf("login (remember_me=false) returned %d; body: %s", wLogin.Code, wLogin.Body.String())
		}

		var loginResp map[string]interface{}
		json.Unmarshal(wLogin.Body.Bytes(), &loginResp)
		tokenStr, _ := loginResp["token"].(string)
		if tokenStr == "" {
			rt.Fatalf("no token in login response")
		}

		claims := &Claims{}
		_, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil {
			rt.Fatalf("failed to parse JWT: %v", err)
		}

		expected24h := before.Add(24 * time.Hour)
		exp := claims.ExpiresAt.Time
		diff := exp.Sub(expected24h)
		if diff < -60*time.Second || diff > 60*time.Second {
			rt.Fatalf("JWT exp for remember_me=false: got %v, expected ~%v (diff=%v)", exp, expected24h, diff)
		}

		// Test remember_me=true → exp in now+7d ±60s
		before7d := time.Now()
		wLogin7d := doLogin(r, email, password, true)
		if wLogin7d.Code != http.StatusOK {
			rt.Fatalf("login (remember_me=true) returned %d; body: %s", wLogin7d.Code, wLogin7d.Body.String())
		}

		var loginResp7d map[string]interface{}
		json.Unmarshal(wLogin7d.Body.Bytes(), &loginResp7d)
		tokenStr7d, _ := loginResp7d["token"].(string)

		claims7d := &Claims{}
		_, err = jwt.ParseWithClaims(tokenStr7d, claims7d, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil {
			rt.Fatalf("failed to parse JWT (7d): %v", err)
		}

		expected7d := before7d.Add(7 * 24 * time.Hour)
		exp7d := claims7d.ExpiresAt.Time
		diff7d := exp7d.Sub(expected7d)
		if diff7d < -60*time.Second || diff7d > 60*time.Second {
			rt.Fatalf("JWT exp for remember_me=true: got %v, expected ~%v (diff=%v)", exp7d, expected7d, diff7d)
		}
	})
}

// ---- Unit Test 8.7 (Property 24): Duplicate Email Registration Rejection ----
// **Validates: Requirements 11.4**

// TestDuplicateEmailRejection verifies that registering the same email twice returns 400
// and only one record exists in the database.
func TestDuplicateEmailRejection(t *testing.T) {
	testDB := newInMemoryAuthTradeDB(t)
	defer testDB.Close()

	origDB := db
	db = testDB
	defer func() { db = origDB }()

	r := setupRegisterLoginRouter()

	email := "duplicate@example.com"
	password := "password123"

	// First registration — should succeed
	w1 := doRegister(r, email, password, "User One")
	if w1.Code != http.StatusOK {
		t.Fatalf("first register returned %d; body: %s", w1.Code, w1.Body.String())
	}

	// Second registration with same email — should return 400
	w2 := doRegister(r, email, "differentpassword", "User Two")
	if w2.Code != http.StatusBadRequest {
		t.Fatalf("second register with duplicate email returned %d, want 400; body: %s", w2.Code, w2.Body.String())
	}

	// Verify only 1 record in DB
	var count int
	testDB.QueryRow("SELECT COUNT(*) FROM users WHERE email = ?", email).Scan(&count)
	if count != 1 {
		t.Fatalf("expected 1 user record for email %q, got %d", email, count)
	}
}

// ---- Property Test 8.8 (Property 14): New User Initial Funds ----
// **Validates: Requirements 8.1**

// TestNewUserInitialFunds verifies that every newly registered user gets cash = 100000.0.
func TestNewUserInitialFunds(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryAuthTradeDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupRegisterLoginRouter()

		suffix := rapid.StringMatching(`[a-z0-9]{8}`).Draw(rt, "suffix")
		email := fmt.Sprintf("funds_%s@example.com", suffix)
		password := "password123"

		// Register
		w := doRegister(r, email, password, "Funds User")
		if w.Code != http.StatusOK {
			rt.Fatalf("register returned %d; body: %s", w.Code, w.Body.String())
		}

		// Query portfolios table for this user's cash
		var userID int
		testDB.QueryRow("SELECT id FROM users WHERE email = ?", email).Scan(&userID)

		var cash float64
		err := testDB.QueryRow("SELECT cash FROM portfolios WHERE user_id = ?", userID).Scan(&cash)
		if err != nil {
			rt.Fatalf("failed to query portfolio cash: %v", err)
		}

		if cash != 100000.0 {
			rt.Fatalf("expected initial cash = 100000.0, got %.2f", cash)
		}
	})
}
