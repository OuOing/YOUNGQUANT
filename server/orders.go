package main

import (
	"fmt"
	"log"
	"math"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// PendingOrder represents a limit order waiting to be filled.
type PendingOrder struct {
	ID         int     `json:"id"`
	UserID     int     `json:"user_id,omitempty"`
	Symbol     string  `json:"symbol"`
	Name       string  `json:"name"`
	Action     string  `json:"action"`
	LimitPrice float64 `json:"limit_price"`
	Qty        float64 `json:"qty"`
	Status     string  `json:"status"`
	CreatedAt  string  `json:"created_at"`
	FilledAt   string  `json:"filled_at,omitempty"`
	FilledPrice float64 `json:"filled_price,omitempty"`
}

// handlePendingOrders handles GET/POST /api/orders
func handlePendingOrders(c *gin.Context) {
	userID := c.GetInt(userContextKey)

	switch c.Request.Method {
	case http.MethodGet:
		rows, err := db.Query(
			`SELECT id, symbol, name, action, limit_price, qty, status, created_at,
			 COALESCE(filled_at,''), COALESCE(filled_price,0)
			 FROM pending_orders WHERE user_id = ? AND status IN ('pending','filled','cancelled')
			 ORDER BY created_at DESC LIMIT 50`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var orders []PendingOrder
		for rows.Next() {
			var o PendingOrder
			rows.Scan(&o.ID, &o.Symbol, &o.Name, &o.Action, &o.LimitPrice, &o.Qty,
				&o.Status, &o.CreatedAt, &o.FilledAt, &o.FilledPrice)
			orders = append(orders, o)
		}
		if orders == nil {
			orders = []PendingOrder{}
		}
		c.JSON(http.StatusOK, gin.H{"orders": orders})

	case http.MethodPost:
		var req struct {
			Symbol     string  `json:"symbol"`
			Action     string  `json:"action"`
			LimitPrice float64 `json:"limit_price"`
			Qty        float64 `json:"qty"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if req.Symbol == "" || req.LimitPrice <= 0 || req.Qty <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "参数无效"})
			return
		}
		if req.Action != "buy" && req.Action != "sell" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "action 必须为 buy 或 sell"})
			return
		}
		if int(req.Qty)%100 != 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "数量必须是 100 的整数倍"})
			return
		}

		// 买单：预冻结资金
		if req.Action == "buy" {
			portfolioMutex.Lock()
			p, _ := loadPortfolio(userID)
			needed := req.LimitPrice*req.Qty + math.Max(req.LimitPrice*req.Qty*commissionRate, commissionMinFee)
			if p.Cash < needed {
				portfolioMutex.Unlock()
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("资金不足，需要 ¥%.2f，可用 ¥%.2f", needed, p.Cash)})
				return
			}
			// 冻结资金（从 cash 扣除，挂单取消时归还）
			db.Exec("UPDATE portfolios SET cash = cash - ? WHERE user_id = ?", needed, userID)
			portfolioMutex.Unlock()
		}

		name := stockNames[req.Symbol]
		res, err := db.Exec(
			`INSERT INTO pending_orders (user_id, symbol, name, action, limit_price, qty) VALUES (?,?,?,?,?,?)`,
			userID, req.Symbol, name, req.Action, req.LimitPrice, req.Qty)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		id, _ := res.LastInsertId()
		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"msg":    fmt.Sprintf("限价%s单已挂出，等待成交", map[string]string{"buy": "买", "sell": "卖"}[req.Action]),
			"id":     id,
		})
	}
}

// handleCancelOrder handles DELETE /api/orders/:id
func handleCancelOrder(c *gin.Context) {
	userID := c.GetInt(userContextKey)
	orderID := c.Param("id")

	var o PendingOrder
	err := db.QueryRow(
		`SELECT id, user_id, action, limit_price, qty, status FROM pending_orders WHERE id = ? AND user_id = ?`,
		orderID, userID).Scan(&o.ID, &o.UserID, &o.Action, &o.LimitPrice, &o.Qty, &o.Status)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "订单不存在"})
		return
	}
	if o.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "只能撤销待成交的订单"})
		return
	}

	db.Exec(`UPDATE pending_orders SET status = 'cancelled' WHERE id = ?`, o.ID)

	// 买单撤销：归还冻结资金
	if o.Action == "buy" {
		refund := o.LimitPrice*o.Qty + math.Max(o.LimitPrice*o.Qty*commissionRate, commissionMinFee)
		portfolioMutex.Lock()
		db.Exec("UPDATE portfolios SET cash = cash + ? WHERE user_id = ?", refund, userID)
		portfolioMutex.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "msg": "订单已撤销"})
}

// matchPendingOrders 撮合引擎：检查所有 pending 订单，触及限价则成交
// 在每次 K 线更新后调用
func matchPendingOrders() {
	rows, err := db.Query(
		`SELECT id, user_id, symbol, action, limit_price, qty FROM pending_orders WHERE status = 'pending'`)
	if err != nil {
		return
	}
	defer rows.Close()

	type order struct {
		id, userID int
		symbol, action string
		limitPrice, qty float64
	}
	var orders []order
	for rows.Next() {
		var o order
		rows.Scan(&o.id, &o.userID, &o.symbol, &o.action, &o.limitPrice, &o.qty)
		orders = append(orders, o)
	}

	for _, o := range orders {
		// 获取最新 K 线的 high/low
		var high, low, close float64
		err := db.QueryRow(
			`SELECT high, low, close FROM stock_bars WHERE symbol = ? AND period = 'daily'
			 ORDER BY date DESC LIMIT 1`, o.symbol).Scan(&high, &low, &close)
		if err != nil {
			continue
		}

		triggered := false
		fillPrice := o.limitPrice

		if o.action == "buy" && o.limitPrice >= low {
			// 买单：限价 >= 最低价，以限价成交（保守）
			triggered = true
			fillPrice = o.limitPrice
		} else if o.action == "sell" && o.limitPrice <= high {
			// 卖单：限价 <= 最高价，以限价成交
			triggered = true
			fillPrice = o.limitPrice
		}

		if !triggered {
			continue
		}

		// 执行成交
		portfolioMutex.Lock()
		p, err := loadPortfolio(o.userID)
		if err != nil {
			portfolioMutex.Unlock()
			continue
		}

		fee := math.Max(fillPrice*o.qty*commissionRate, commissionMinFee)
		amount := fillPrice * o.qty
		hold := p.Holdings[o.symbol]
		now := time.Now().Format("2006-01-02 15:04:05")
		today := time.Now().Format("2006-01-02")

		if o.action == "buy" {
			// 资金已在挂单时冻结，直接更新持仓
			totalCost := hold.Shares*hold.Cost + amount
			hold.Shares += o.qty
			hold.Cost = totalCost / hold.Shares
			hold.LastDate = today
			p.Holdings[o.symbol] = hold
		} else {
			// 卖单：检查持仓
			if hold.Shares < o.qty {
				// 持仓不足，撤单
				db.Exec(`UPDATE pending_orders SET status='cancelled' WHERE id=?`, o.id)
				portfolioMutex.Unlock()
				log.Printf("[撮合] 卖单 #%d 持仓不足，已撤销", o.id)
				continue
			}
			hold.Shares -= o.qty
			hold.Available -= o.qty
			if hold.Available < 0 {
				hold.Available = 0
			}
			p.Cash += amount - fee
			if hold.Shares <= 0 {
				delete(p.Holdings, o.symbol)
			} else {
				p.Holdings[o.symbol] = hold
			}
		}

		// 写入成交记录
		tx, _ := db.Begin()
		tx.Exec(`UPDATE pending_orders SET status='filled', filled_at=?, filled_price=? WHERE id=?`,
			now, fillPrice, o.id)
		tx.Exec(`INSERT INTO trades (user_id, date, symbol, name, action, price, shares, fee) VALUES (?,?,?,?,?,?,?,?)`,
			o.userID, now, o.symbol, stockNames[o.symbol], o.action, fillPrice, o.qty, fee)
		if hold.Shares > 0 {
			tx.Exec(`INSERT OR REPLACE INTO holdings (user_id, symbol, shares, cost, available, last_date) VALUES (?,?,?,?,?,?)`,
				o.userID, o.symbol, hold.Shares, hold.Cost, hold.Available, hold.LastDate)
		} else {
			tx.Exec(`DELETE FROM holdings WHERE user_id=? AND symbol=?`, o.userID, o.symbol)
		}
		tx.Exec(`UPDATE portfolios SET cash=? WHERE user_id=?`, p.Cash, o.userID)
		tx.Commit()

		portfolioMutex.Unlock()

		// 推送成交通知给用户
		actionCN := map[string]string{"buy": "买入", "sell": "卖出"}[o.action]
		pushToUser(o.userID, "order_filled", fmt.Sprintf(
			`{"id":%d,"symbol":"%s","name":"%s","action":"%s","qty":%.0f,"price":%.2f}`,
			o.id, o.symbol, stockNames[o.symbol], actionCN, o.qty, fillPrice,
		))
		log.Printf("[撮合] 订单 #%d %s %s %.0f股 @¥%.2f 成交", o.id, o.action, o.symbol, o.qty, fillPrice)
	}
}
