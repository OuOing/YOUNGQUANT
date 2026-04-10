package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	_ "modernc.org/sqlite"
	"pgregory.net/rapid"
)

// newInMemoryNotesDB creates a fresh in-memory SQLite DB with users and notes tables.
func newInMemoryNotesDB(t interface{ Fatal(...interface{}) }) *sql.DB {
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
		`CREATE TABLE IF NOT EXISTS notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			symbol TEXT,
			content TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id)
		);`,
	}
	for _, q := range queries {
		if _, err := testDB.Exec(q); err != nil {
			t.Fatal("failed to create table:", err)
		}
	}
	if _, err := testDB.Exec(
		"INSERT INTO users (id, email, password, name) VALUES (1, 'notes@example.com', 'hashed', 'Notes User')",
	); err != nil {
		t.Fatal("failed to insert test user:", err)
	}
	return testDB
}

// setupNotesRouter builds a test router with the notes handlers and a fixed user_id=1.
func setupNotesRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set(userContextKey, 1)
		c.Next()
	})
	r.GET("/api/notes", handleNotes)
	r.POST("/api/notes", handleNotes)
	r.PUT("/api/notes/:id", handleNotesUpdate)
	r.DELETE("/api/notes/:id", handleNotesDelete)
	return r
}

// TestNotesContentLengthLimit is a property test (Property 25):
// For any content string with rune count > 2000, POST /api/notes should return 400.
//
// **Validates: Requirements 13.1, 13.2**
func TestNotesContentLengthLimit(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryNotesDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupNotesRouter()

		// Generate a string that is definitely > 2000 runes.
		// Use a base string of 2001+ runes by repeating a character.
		extraLen := rapid.IntRange(1, 500).Draw(rt, "extra")
		content := strings.Repeat("字", 2000+extraLen)

		if utf8.RuneCountInString(content) <= 2000 {
			rt.Skip() // shouldn't happen, but guard anyway
		}

		body, _ := json.Marshal(map[string]interface{}{
			"content": content,
			"symbol":  "",
		})
		req := httptest.NewRequest(http.MethodPost, "/api/notes", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			rt.Fatalf("expected 400 for content with %d runes (>2000), got %d; body: %s",
				utf8.RuneCountInString(content), w.Code, w.Body.String())
		}
	})
}

// TestNotesRoundTrip is a property test (Property 25):
// For any valid content (rune count <= 2000), POST then GET should return a note with the same content.
//
// **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
func TestNotesRoundTrip(t *testing.T) {
	rapid.Check(t, func(rt *rapid.T) {
		testDB := newInMemoryNotesDB(rt)
		defer testDB.Close()

		origDB := db
		db = testDB
		defer func() { db = origDB }()

		r := setupNotesRouter()

		// Generate valid content: 1 to 2000 runes (printable ASCII to keep it simple)
		runeCount := rapid.IntRange(1, 2000).Draw(rt, "runeCount")
		content := strings.Repeat("a", runeCount)
		symbol := rapid.StringMatching(`[0-9]{6}`).Draw(rt, "symbol")

		// POST: create the note
		body, _ := json.Marshal(map[string]interface{}{
			"content": content,
			"symbol":  symbol,
		})
		req := httptest.NewRequest(http.MethodPost, "/api/notes", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			rt.Fatalf("POST /api/notes returned %d, want 200; body: %s", w.Code, w.Body.String())
		}

		// GET: retrieve notes list
		req2 := httptest.NewRequest(http.MethodGet, "/api/notes", nil)
		w2 := httptest.NewRecorder()
		r.ServeHTTP(w2, req2)

		if w2.Code != http.StatusOK {
			rt.Fatalf("GET /api/notes returned %d, want 200", w2.Code)
		}

		var items []map[string]interface{}
		if err := json.Unmarshal(w2.Body.Bytes(), &items); err != nil {
			rt.Fatalf("failed to parse GET response: %v", err)
		}

		// The note we created must appear with the same content and symbol
		found := false
		for _, item := range items {
			if item["content"] == content && item["symbol"] == symbol {
				found = true
				break
			}
		}
		if !found {
			rt.Fatalf("note with content len=%d and symbol=%q not found after POST; list: %v",
				runeCount, symbol, items)
		}
	})
}
