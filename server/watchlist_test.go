package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
)

// newInMemoryDB creates a fresh in-memory SQLite DB with watchlist tables and a test user.
// Accepts any type with a Fatal method so it works with both *testing.T and *rapid.T.
func newInMemoryDB(t interface{ Fatal(...interface{}) }) *sql.DB {
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
		`CREATE TABLE IF NOT EXISTS watchlist (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(user_id, symbol),
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
	}
	for _, q := range queries {
		if _, err := testDB.Exec(q); err != nil {
			t.Fatal("failed to create table:", err)
		}
	}
	if _, err := testDB.Exec(
		"INSERT INTO users (id, email, password, name) VALUES (1, 'test@example.com', 'hashed', 'Test User')",
	); err != nil {
		t.Fatal("failed to insert test user:", err)
	}
	return testDB
}

// TestWatchlistRoundTrip is a property test (Property 25 partial):
// For any valid symbol string, after POST to add it, GET should return a list containing that symbol.
//
// **Validates: Requirements 12.2, 18.4**
func TestWatchlistRoundTrip(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		gin.SetMode(gin.TestMode)
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set(userContextKey, 1)
			c.Next()
		})
		r.GET("/api/watchlist", handleWatchlist)
		r.POST("/api/watchlist", handleWatchlist)
		r.DELETE("/api/watchlist/:symbol", handleWatchlistDelete)

		// Generate a valid symbol: 6-digit numeric string (A-share style)
		symbol := rapid.StringMatching(`[0-9]{6}`).Draw(rt, "symbol")

		// POST: add the symbol
		body, _ := json.Marshal(map[string]string{"symbol": symbol})
		req := httptest.NewRequest(http.MethodPost, "/api/watchlist", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			rt.Fatalf("POST /api/watchlist returned %d, want 200", w.Code)
		}

		// GET: retrieve the list
		req2 := httptest.NewRequest(http.MethodGet, "/api/watchlist", nil)
		w2 := httptest.NewRecorder()
		r.ServeHTTP(w2, req2)

		if w2.Code != http.StatusOK {
			rt.Fatalf("GET /api/watchlist returned %d, want 200", w2.Code)
		}

		var items []map[string]interface{}
		if err := json.Unmarshal(w2.Body.Bytes(), &items); err != nil {
			rt.Fatalf("failed to parse GET response: %v", err)
		}

		// The symbol we added must appear in the list
		found := false
		for _, item := range items {
			if item["symbol"] == symbol {
				found = true
				break
			}
		}
		if !found {
			rt.Fatalf("symbol %q not found in watchlist after POST; list: %v", symbol, items)
		}
	})
}

// TestWatchlistMaxLimit verifies that adding more than 50 symbols returns 400.
//
// **Validates: Requirements 12.2, 18.4**
func TestWatchlistMaxLimit(t *testing.T) {
	testDB := newInMemoryDB(t)
	defer testDB.Close()

	origDB := db
	db = testDB
	defer func() { db = origDB }()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, 1)
		c.Next()
	})
	r.POST("/api/watchlist", handleWatchlist)

	// Insert 50 symbols directly into the DB
	for i := 0; i < 50; i++ {
		symbol := fmt.Sprintf("%06d", i)
		if _, err := testDB.Exec(
			"INSERT OR IGNORE INTO watchlist (user_id, symbol) VALUES (1, ?)", symbol,
		); err != nil {
			t.Fatalf("failed to seed watchlist: %v", err)
		}
	}

	// Attempt to add the 51st symbol — should return 400
	body, _ := json.Marshal(map[string]string{"symbol": "999999"})
	req := httptest.NewRequest(http.MethodPost, "/api/watchlist", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when exceeding 50-symbol limit, got %d; body: %s", w.Code, w.Body.String())
	}
}
