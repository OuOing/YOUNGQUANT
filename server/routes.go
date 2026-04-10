package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"sync"
	"time"
)

var (
	rateLimitMap  sync.Map
	rateLimitDur  = 10 * time.Second
	rateLimitBurst = 60
)

func setupRouter() *gin.Engine {
	// r := gin.Default()
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// CORS configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	r.Use(cors.New(config))

	// API Routes
	api := r.Group("/api")
	{
		// Public (with rate limiting)
		authLimit := api.Group("/")
		authLimit.Use(rateLimitMiddleware())
		{
			authLimit.POST("/register", handleRegister)
			authLimit.POST("/login", handleLogin)

			// Essential public data
			authLimit.GET("/indicators", handleIndicators)
			authLimit.GET("/stocks", handleStocks)
			authLimit.GET("/availability", handleAvailability)
			authLimit.GET("/news", handleNews)
		}

		// Public market data (no auth, no rate limit)
		api.GET("/market/hot-stocks", handleHotStocks)
		api.GET("/market/sectors", handleSectors)
		api.GET("/leaderboard", handleLeaderboard)

		// Protected
		auth := api.Group("/")
		auth.Use(authMiddleware())
		{
			auth.GET("/me", handleMe)
			auth.PUT("/me", handleUpdateProfile)
			auth.PUT("/me/initial-cash", handleSetInitialCash)
			auth.GET("/leaderboard/me", handleLeaderboardMe)
			auth.GET("/portfolio", handlePortfolio)
			auth.POST("/trade", handleTrade)
			auth.POST("/refresh", handleRefresh)
			auth.GET("/signal", handleSignal)
			auth.GET("/backtest", handleBacktest)
			auth.POST("/backtest/custom", handleBacktestCustom)
			auth.GET("/ai/advisor", handleAIAdvisor)
			auth.GET("/ai/screener", handleStockScreener)
			auth.GET("/ai/review/summary", handleReviewSummary)
			auth.GET("/ai/review/:trade_id", handleReviewTrade)
			auth.GET("/watchlist", handleWatchlist)
			auth.POST("/watchlist", handleWatchlist)
			auth.GET("/orders", handlePendingOrders)
			auth.POST("/orders", handlePendingOrders)
			auth.DELETE("/orders/:id", handleCancelOrder)
			// /stream 自己处理 token，放在 auth 组外
			auth.DELETE("/watchlist/:symbol", handleWatchlistDelete)
			auth.GET("/notes", handleNotes)
			auth.POST("/notes", handleNotes)
			auth.PUT("/notes/:id", handleNotesUpdate)
			auth.DELETE("/notes/:id", handleNotesDelete)
			auth.GET("/chat-history", handleChatHistory)
			auth.GET("/trades", handleTrades)
			auth.GET("/learning/progress", handleLearningProgress)
			auth.POST("/learning/progress", handleLearningProgress)
			auth.POST("/learning/daily-lesson/read", handleMarkLessonRead)
		}

		// Public learning routes (no auth required)
		api.GET("/learning/daily-lesson", handleDailyLesson)

		// Optional auth (guests allowed, userID=0 if no valid token)
		optAuth := api.Group("/")
		optAuth.Use(optionalAuthMiddleware())
		optAuth.Use(aiRateLimitMiddleware()) // AI 接口专用限流：每 IP 每分钟最多 20 次
		{
			optAuth.POST("/ai/chat", handleAIChat)
		}

		// SSE stream — 自己验证 token（EventSource 不支持自定义 header）
		api.GET("/stream", handleStream)
	}

	// Static files & SPA fallback
	distDir := filepath.Join(projectDir, "frontend", "dist")
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") {
			c.JSON(http.StatusNotFound, gin.H{"error": "API route not found"})
			return
		}

		fullPath := filepath.Join(distDir, path)
		if _, err := os.Stat(fullPath); os.IsNotExist(err) || path == "/" {
			c.File(filepath.Join(distDir, "index.html"))
			return
		}
		c.File(fullPath)
	})

	return r
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		c.Set(userContextKey, claims.UserID)
		c.Next()
	}
}

// optionalAuthMiddleware sets userID in context if a valid JWT is present,
// otherwise sets userID=0 (guest). It never aborts the request.
func optionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				return jwtSecret, nil
			})
			if err == nil && token.Valid {
				c.Set(userContextKey, claims.UserID)
				c.Next()
				return
			}
		}
		c.Set(userContextKey, 0)
		c.Next()
	}
}

// aiRateLimitMiddleware limits AI chat to 20 requests per IP per minute
func aiRateLimitMiddleware() gin.HandlerFunc {
	var aiLimitMap sync.Map
	const aiWindow = 60 * time.Second
	const aiMaxReqs = 20
	return func(c *gin.Context) {
		ip := c.ClientIP()
		val, _ := aiLimitMap.LoadOrStore(ip, make([]time.Time, 0))
		times := val.([]time.Time)
		now := time.Now()
		var valid []time.Time
		for _, t := range times {
			if now.Sub(t) < aiWindow {
				valid = append(valid, t)
			}
		}
		if len(valid) >= aiMaxReqs {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "AI 请求过于频繁，请稍后再试"})
			return
		}
		valid = append(valid, now)
		aiLimitMap.Store(ip, valid)
		c.Next()
	}
}

func rateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		path := c.Request.URL.Path
		key := ip + ":" + path

		val, _ := rateLimitMap.LoadOrStore(key, make([]time.Time, 0))
		times := val.([]time.Time)

		// Remove expired entries
		now := time.Now()
		var valid []time.Time
		for _, t := range times {
			if now.Sub(t) < rateLimitDur {
				valid = append(valid, t)
			}
		}

		if len(valid) >= rateLimitBurst {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "访问频率过高, 请稍后再试"})
			return
		}

		valid = append(valid, now)
		rateLimitMap.Store(key, valid)
		c.Next()
	}
}

func loadEnv() {
	data, err := os.ReadFile(filepath.Join(projectDir, ".env"))
	if err != nil {
		return
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			os.Setenv(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
		}
	}
}
