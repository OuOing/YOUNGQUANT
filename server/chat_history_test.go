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

// newInMemoryChatDB creates a fresh in-memory SQLite DB with users and chat_history tables.
func newInMemoryChatDB(t interface{ Fatal(...interface{}) }) *sql.DB {
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
		`CREATE TABLE IF NOT EXISTS chat_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT,
			role TEXT NOT NULL,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
	}
	for _, q := range queries {
		if _, err := testDB.Exec(q); err != nil {
			t.Fatal("failed to create table:", err)
		}
	}
	if _, err := testDB.Exec(
		"INSERT INTO users (id, email, password, name) VALUES (1, 'chat@example.com', 'hashed', 'Chat User')",
	); err != nil {
		t.Fatal("failed to insert test user:", err)
	}
	return testDB
}

// setupChatHistoryRouter builds a test router with handleChatHistory and a fixed user_id=1.
func setupChatHistoryRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, 1)
		c.Next()
	})
	r.GET("/api/chat-history", handleChatHistory)
	return r
}

// setupAIChatRouter builds a test router for handleAIChat with a configurable userID.
func setupAIChatRouter(userID int) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, userID)
		c.Next()
	})
	r.POST("/api/ai/chat", handleAIChat)
	return r
}

// TestChatHistoryRoundTrip is a property test (Property 10):
// For any authenticated user's chat record, after saving to the database and querying back,
// the record should contain the same role, content, symbol fields.
//
// **Validates: Requirements 6.5, 18.2**
func TestChatHistoryRoundTrip(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryChatDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupChatHistoryRouter()

		// Generate random role: "user" or "assistant"
		role := rapid.SampledFrom([]string{"user", "assistant"}).Draw(rt, "role")

		// Generate random content: 1-500 chars (use StringMatching for simplicity)
		contentLen := rapid.IntRange(1, 500).Draw(rt, "contentLen")
		// Build content by repeating a generated char pattern
		baseChar := rapid.StringMatching(`[a-z]`).Draw(rt, "baseChar")
		content := ""
		for len(content) < contentLen {
			content += baseChar
		}
		content = content[:contentLen]

		// Generate symbol: 6-digit string or empty
		useSymbol := rapid.Bool().Draw(rt, "useSymbol")
		symbol := ""
		if useSymbol {
			symbol = rapid.StringMatching(`[0-9]{6}`).Draw(rt, "symbol")
		}

		// Insert chat_history row directly via SQL
		_, err := testDB.Exec(
			"INSERT INTO chat_history (user_id, symbol, role, content) VALUES (1, ?, ?, ?)",
			symbol, role, content,
		)
		if err != nil {
			rt.Fatalf("failed to insert chat_history row: %v", err)
		}

		// Query back via GET /api/chat-history
		req := httptest.NewRequest(http.MethodGet, "/api/chat-history", nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			rt.Fatalf("GET /api/chat-history returned %d, want 200; body: %s", w.Code, w.Body.String())
		}

		var resp struct {
			History []map[string]interface{} `json:"history"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			rt.Fatalf("failed to parse response: %v", err)
		}

		// Find the inserted record in the returned history
		found := false
		for _, item := range resp.History {
			if item["role"] == role && item["content"] == content && item["symbol"] == symbol {
				found = true
				break
			}
		}
		if !found {
			rt.Fatalf("chat record with role=%q content_len=%d symbol=%q not found in history; got %d items",
				role, len(content), symbol, len(resp.History))
		}
	})
}

// TestGuestMessageLimit is a unit test (Property 11):
// Boundary condition tests for guest message limit.
//
// **Validates: Requirements 6.6**
func TestGuestMessageLimit(t *testing.T) {
	testDB := newInMemoryChatDB(t)
	defer testDB.Close()

	origDB := db
	db = testDB
	defer func() { db = origDB }()

	t.Run("session_count=4 guest is allowed (not 403)", func(t *testing.T) {
		r := setupAIChatRouter(0) // guest: userID=0

		body, _ := json.Marshal(map[string]interface{}{
			"query":         "test",
			"history":       "",
			"context":       "",
			"session_count": 4,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/ai/chat", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		// session_count=4 < 5, so guest should NOT be rejected with 403
		if w.Code == http.StatusForbidden {
			t.Fatalf("expected non-403 for session_count=4 (guest), got 403; body: %s", w.Body.String())
		}
	})

	t.Run("session_count=5 guest returns 403", func(t *testing.T) {
		r := setupAIChatRouter(0) // guest: userID=0

		body, _ := json.Marshal(map[string]interface{}{
			"query":         "test",
			"history":       "",
			"context":       "",
			"session_count": 5,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/ai/chat", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 for session_count=5 (guest), got %d; body: %s", w.Code, w.Body.String())
		}

		var resp map[string]interface{}
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
			t.Fatalf("failed to parse 403 response: %v", err)
		}
		if resp["error"] == nil {
			t.Fatalf("expected error field in 403 response, got: %v", resp)
		}
	})

	t.Run("session_count=5 authenticated user is NOT rejected with 403", func(t *testing.T) {
		r := setupAIChatRouter(1) // authenticated: userID=1

		body, _ := json.Marshal(map[string]interface{}{
			"query":         "test",
			"history":       "",
			"context":       "",
			"session_count": 5,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/ai/chat", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		// Authenticated user should NOT get 403 regardless of session_count
		if w.Code == http.StatusForbidden {
			t.Fatalf("expected non-403 for session_count=5 (authenticated), got 403; body: %s", w.Body.String())
		}
	})
}
