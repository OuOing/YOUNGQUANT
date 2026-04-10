package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func loadPortfolio(userID int) (*Portfolio, error) {
	p := &Portfolio{Cash: defaultInitCash, InitialCash: defaultInitCash, Holdings: make(map[string]Holding)}

	err := db.QueryRow("SELECT cash, COALESCE(initial_cash, 100000.0), mdd, win_rate, sharpe FROM portfolios WHERE user_id = ?", userID).
		Scan(&p.Cash, &p.InitialCash, &p.Metrics.MDD, &p.Metrics.WinRate, &p.Metrics.Sharpe)
	if err == sql.ErrNoRows {
		_, err = db.Exec("INSERT INTO portfolios (user_id, cash, initial_cash) VALUES (?, ?, ?)", userID, defaultInitCash, defaultInitCash)
		return p, err
	} else if err != nil {
		return nil, err
	}

	rows, err := db.Query("SELECT symbol, shares, cost, available, last_date FROM holdings WHERE user_id = ?", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var sym string
		var hold Holding
		if err := rows.Scan(&sym, &hold.Shares, &hold.Cost, &hold.Available, &hold.LastDate); err != nil {
			return nil, err
		}
		p.Holdings[sym] = hold
	}

	rowsHistory, err := db.Query("SELECT id, date, symbol, name, action, price, shares, fee FROM trades WHERE user_id = ? ORDER BY date DESC LIMIT 50", userID)
	if err != nil {
		return nil, err
	}
	defer rowsHistory.Close()

	for rowsHistory.Next() {
		var log TradeLog
		if err := rowsHistory.Scan(&log.ID, &log.Date, &log.Symbol, &log.Name, &log.Action, &log.Price, &log.Shares, &log.Fee); err != nil {
			return nil, err
		}
		p.History = append(p.History, log)
	}

	return p, nil
}

func savePortfolioToDB(userID int, p *Portfolio) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE portfolios SET cash = ?, mdd = ?, win_rate = ?, sharpe = ? WHERE user_id = ?",
		p.Cash, p.Metrics.MDD, p.Metrics.WinRate, p.Metrics.Sharpe, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func featuresFilename(symbol, period string) string {
	if period == "daily" {
		return filepath.Join("data", fmt.Sprintf("features_%s_v3.csv", symbol))
	}
	return filepath.Join("data", fmt.Sprintf("features_%s_%sm_v3.csv", symbol, period))
}

func modelFilename(symbol, period string) string {
	if period == "daily" {
		return filepath.Join("data", fmt.Sprintf("model_%s.pkl", symbol))
	}
	return filepath.Join("data", fmt.Sprintf("model_%s_%sm.pkl", symbol, period))
}

func stockBarsFilename(symbol, period string) string {
	if period == "daily" {
		return filepath.Join("data", fmt.Sprintf("stock_%s.csv", symbol))
	}
	return filepath.Join("data", fmt.Sprintf("stock_%s_%sm.csv", symbol, period))
}

// updateEquityHistory appends a daily equity snapshot to portfolios.equity_history_json.
// It keeps at most 90 entries (oldest are dropped). Errors are logged but do not affect the caller.
func updateEquityHistory(userID int, totalAssets float64) {
	// Read existing history
	var raw string
	err := db.QueryRow("SELECT COALESCE(equity_history_json, '[]') FROM portfolios WHERE user_id = ?", userID).Scan(&raw)
	if err != nil {
		log.Printf("updateEquityHistory: read failed for user %d: %v", userID, err)
		return
	}

	var history []EquitySnapshot
	if err := json.Unmarshal([]byte(raw), &history); err != nil {
		log.Printf("updateEquityHistory: unmarshal failed: %v", err)
		history = []EquitySnapshot{}
	}

	// Append new snapshot
	today := time.Now().Format("2006-01-02")
	history = append(history, EquitySnapshot{Date: today, Value: totalAssets})

	// Keep only the most recent 90 entries
	if len(history) > 90 {
		history = history[len(history)-90:]
	}

	updated, err := json.Marshal(history)
	if err != nil {
		log.Printf("updateEquityHistory: marshal failed: %v", err)
		return
	}

	if _, err := db.Exec("UPDATE portfolios SET equity_history_json = ? WHERE user_id = ?", string(updated), userID); err != nil {
		log.Printf("updateEquityHistory: write failed for user %d: %v", userID, err)
	}
}
