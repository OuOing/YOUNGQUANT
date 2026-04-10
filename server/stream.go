package main

import (
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// ── SSE 推送中心 ──────────────────────────────────────────

type sseEvent struct {
	Event string
	Data  string
}

type sseClient struct {
	userID int
	ch     chan sseEvent
}

var (
	sseMu      sync.RWMutex
	sseClients = make(map[int][]*sseClient) // userID -> clients
)

// registerSSE 注册一个 SSE 客户端
func registerSSE(userID int) *sseClient {
	c := &sseClient{userID: userID, ch: make(chan sseEvent, 16)}
	sseMu.Lock()
	sseClients[userID] = append(sseClients[userID], c)
	sseMu.Unlock()
	return c
}

// unregisterSSE 注销客户端
func unregisterSSE(userID int, c *sseClient) {
	sseMu.Lock()
	defer sseMu.Unlock()
	list := sseClients[userID]
	for i, cl := range list {
		if cl == c {
			sseClients[userID] = append(list[:i], list[i+1:]...)
			break
		}
	}
	close(c.ch)
}

// pushToUser 向指定用户推送事件
func pushToUser(userID int, event, data string) {
	sseMu.RLock()
	clients := sseClients[userID]
	sseMu.RUnlock()
	for _, c := range clients {
		select {
		case c.ch <- sseEvent{Event: event, Data: data}:
		default: // 客户端消费太慢，丢弃
		}
	}
}

// handleStream handles GET /api/stream (requires auth)
// Streams server-sent events to the authenticated user.
// Token can be passed as ?token= query param (EventSource doesn't support headers).
func handleStream(c *gin.Context) {
	// 支持 query param token（EventSource 不支持自定义 header）
	userID := c.GetInt(userContextKey)
	if userID == 0 {
		// 尝试从 query param 读取
		tokenStr := c.Query("token")
		if tokenStr != "" {
			claims := &Claims{}
			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
				return jwtSecret, nil
			})
			if err == nil && token.Valid {
				userID = claims.UserID
			}
		}
	}
	if userID == 0 {
		c.JSON(401, gin.H{"error": "unauthorized"})
		return
	}
	client := registerSSE(userID)
	defer unregisterSSE(userID, client)

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	// 发送连接确认
	fmt.Fprintf(c.Writer, "event: connected\ndata: {\"user_id\":%d}\n\n", userID)
	c.Writer.Flush()

	ticker := time.NewTicker(25 * time.Second) // 心跳，防止连接超时
	defer ticker.Stop()

	notify := c.Request.Context().Done()
	for {
		select {
		case <-notify:
			return
		case <-ticker.C:
			fmt.Fprintf(c.Writer, ": heartbeat\n\n")
			c.Writer.Flush()
		case evt, ok := <-client.ch:
			if !ok {
				return
			}
			fmt.Fprintf(c.Writer, "event: %s\ndata: %s\n\n", evt.Event, evt.Data)
			c.Writer.Flush()
		}
	}
}
