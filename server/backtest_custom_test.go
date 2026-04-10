package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
)

// newInMemoryBacktestDB creates a minimal in-memory DB for backtest tests.
func newInMemoryBacktestDB(t interface{ Fatal(...interface{}) }) *sql.DB {
	testDB, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal("failed to open test db:", err)
	}
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL,
			name TEXT
		);`,
		`CREATE TABLE IF NOT EXISTS backtest_reports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			strategy TEXT NOT NULL,
			params_json TEXT NOT NULL,
			result_json TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
	}
	for _, q := range queries {
		if _, err := testDB.Exec(q); err != nil {
			t.Fatal("failed to create table:", err)
		}
	}
	testDB.Exec("INSERT INTO users (id, email, password, name) VALUES (1, 'bt@example.com', 'hashed', 'BT User')")
	return testDB
}

// setupBacktestRouter builds a test router for handleBacktestCustom with user_id=1.
func setupBacktestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, 1)
		c.Next()
	})
	r.POST("/api/backtest/custom", handleBacktestCustom)
	return r
}

// doBacktestCustom posts a custom backtest request and returns the recorder.
func doBacktestCustom(r *gin.Engine, body map[string]interface{}) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/backtest/custom", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

// TestBacktestCustomParamValidation is a property test (Property 28):
// For any custom backtest request with out-of-range parameters, the system should return 400.
//
// Feature: youngquant-platform-enhancement, Property 28
// **Validates: Requirements 19.1, 19.2**
func TestBacktestCustomParamValidation(t *testing.T) {
	testDB := newInMemoryBacktestDB(t)
	defer testDB.Close()
	origDB := db
	db = testDB
	defer func() { db = origDB }()

	r := setupBacktestRouter()

	t.Run("ma_fast below 5 returns 400", func(t *testing.T) {
		rapid.Check(t, func(rt *rapid.T) {
			// ma_fast < 5 (out of range)
			maPeriod := rapid.Float64Range(0.1, 4.9).Draw(rt, "ma_fast")
			w := doBacktestCustom(r, map[string]interface{}{
				"symbol":   "601899",
				"strategy": "ma_cross",
				"params":   map[string]interface{}{"ma_fast": maPeriod},
			})
			if w.Code != http.StatusBadRequest {
				rt.Fatalf("expected 400 for ma_fast=%.2f (<5), got %d; body: %s", maPeriod, w.Code, w.Body.String())
			}
		})
	})

	t.Run("ma_fast above 120 returns 400", func(t *testing.T) {
		rapid.Check(t, func(rt *rapid.T) {
			maPeriod := rapid.Float64Range(120.1, 500.0).Draw(rt, "ma_fast")
			w := doBacktestCustom(r, map[string]interface{}{
				"symbol":   "601899",
				"strategy": "ma_cross",
				"params":   map[string]interface{}{"ma_fast": maPeriod},
			})
			if w.Code != http.StatusBadRequest {
				rt.Fatalf("expected 400 for ma_fast=%.2f (>120), got %d; body: %s", maPeriod, w.Code, w.Body.String())
			}
		})
	})

	t.Run("stop_loss out of [0.01, 0.20] returns 400", func(t *testing.T) {
		rapid.Check(t, func(rt *rapid.T) {
			// Generate stop_loss outside [0.01, 0.20]
			outOfRange := rapid.SampledFrom([]float64{0.0, 0.005, 0.21, 0.5, 1.0}).Draw(rt, "stop_loss")
			w := doBacktestCustom(r, map[string]interface{}{
				"symbol":   "601899",
				"strategy": "ma_cross",
				"params":   map[string]interface{}{"stop_loss": outOfRange},
			})
			if w.Code != http.StatusBadRequest {
				rt.Fatalf("expected 400 for stop_loss=%.3f (out of range), got %d; body: %s", outOfRange, w.Code, w.Body.String())
			}
		})
	})

	t.Run("take_profit out of [0.01, 0.50] returns 400", func(t *testing.T) {
		rapid.Check(t, func(rt *rapid.T) {
			outOfRange := rapid.SampledFrom([]float64{0.0, 0.005, 0.51, 0.8, 1.0}).Draw(rt, "take_profit")
			w := doBacktestCustom(r, map[string]interface{}{
				"symbol":   "601899",
				"strategy": "ma_cross",
				"params":   map[string]interface{}{"take_profit": outOfRange},
			})
			if w.Code != http.StatusBadRequest {
				rt.Fatalf("expected 400 for take_profit=%.3f (out of range), got %d; body: %s", outOfRange, w.Code, w.Body.String())
			}
		})
	})

	t.Run("valid params do not return 400 due to validation", func(t *testing.T) {
		// Valid: ma_fast=10, stop_loss=0.05, take_profit=0.10
		// Will likely fail with 400 due to missing python/data, but NOT due to param validation
		w := doBacktestCustom(r, map[string]interface{}{
			"symbol":     "601899",
			"strategy":   "ma_cross",
			"start_date": "2024-01-01",
			"end_date":   "2024-12-31",
			"params": map[string]interface{}{
				"ma_fast":     10.0,
				"ma_slow":     20.0,
				"stop_loss":   0.05,
				"take_profit": 0.10,
			},
		})
		// Should NOT return 400 with a param validation error message
		if w.Code == http.StatusBadRequest {
			var resp map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &resp)
			errMsg, _ := resp["error"].(string)
			if errMsg == "均线周期必须在 [5, 120] 范围内" ||
				errMsg == "止损比例必须在 [0.01, 0.20] 范围内" ||
				errMsg == "止盈比例必须在 [0.01, 0.50] 范围内" {
				t.Fatalf("valid params incorrectly rejected with param validation error: %s", errMsg)
			}
		}
	})
}
