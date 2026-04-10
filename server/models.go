package main

import (
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

type Portfolio struct {
	Cash        float64            `json:"cash"`
	InitialCash float64            `json:"initial_cash"`
	Holdings    map[string]Holding `json:"holdings"` // symbol -> 持仓
	History     []TradeLog         `json:"history"`
	Metrics     AccountMetrics     `json:"metrics"`
}

type AccountMetrics struct {
	MDD     float64 `json:"mdd"`
	WinRate float64 `json:"win_rate"`
	Sharpe  float64 `json:"sharpe"`
}

type Holding struct {
	Shares    float64 `json:"shares"`
	Cost      float64 `json:"cost"`
	Available float64 `json:"available"` // 可卖份额 (T+1)
	LastDate  string  `json:"last_date"` // 上次买入日期 (yyyy-mm-dd)
}

type TradeLog struct {
	ID     int     `json:"id"`
	Date   string  `json:"date"`
	Symbol string  `json:"symbol"`
	Name   string  `json:"name"`
	Action string  `json:"action"`
	Price  float64 `json:"price"`
	Shares float64 `json:"shares"`
	Fee    float64 `json:"fee"`
}

// EquitySnapshot represents a single daily net-value snapshot.
type EquitySnapshot struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}
