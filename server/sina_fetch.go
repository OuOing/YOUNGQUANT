package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// sinaPrefix returns the exchange prefix for a symbol.
// sh = Shanghai, sz = Shenzhen
func sinaPrefix(symbol string) string {
	if strings.HasPrefix(symbol, "6") {
		return "sh" + symbol
	}
	return "sz" + symbol
}

// SinaQuote holds real-time quote data from Sina Finance.
type SinaQuote struct {
	Symbol string
	Name   string
	Open   float64
	Close  float64 // yesterday's close (prev close)
	Price  float64 // current price
	High   float64
	Low    float64
	Volume float64
	Date   string
	Time   string
}

// fetchSinaQuote fetches real-time quote for a single symbol from Sina Finance.
// Returns nil on failure.
func fetchSinaQuote(symbol string) *SinaQuote {
	code := sinaPrefix(symbol)
	url := fmt.Sprintf("https://hq.sinajs.cn/list=%s", code)

	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil
	}
	// Sina requires a Referer header
	req.Header.Set("Referer", "https://finance.sina.com.cn")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	// Response format:
	// var hq_str_sh601899="紫金矿业,open,prevClose,price,high,low,...,date,time,...";
	line := string(body)
	start := strings.Index(line, "\"")
	end := strings.LastIndex(line, "\"")
	if start < 0 || end <= start {
		return nil
	}
	data := line[start+1 : end]
	parts := strings.Split(data, ",")
	if len(parts) < 32 {
		return nil
	}

	name := parts[0]
	open, _ := strconv.ParseFloat(parts[1], 64)
	prevClose, _ := strconv.ParseFloat(parts[2], 64)
	price, _ := strconv.ParseFloat(parts[3], 64)
	high, _ := strconv.ParseFloat(parts[4], 64)
	low, _ := strconv.ParseFloat(parts[5], 64)
	vol, _ := strconv.ParseFloat(parts[8], 64)
	date := parts[30]
	t := parts[31]

	if price == 0 {
		return nil
	}

	return &SinaQuote{
		Symbol: symbol,
		Name:   name,
		Open:   open,
		Close:  prevClose,
		Price:  price,
		High:   high,
		Low:    low,
		Volume: vol,
		Date:   date,
		Time:   t,
	}
}

// fetchSinaHistory fetches daily K-line history from Sina Finance.
// Returns slice of OHLCV bars.
func fetchSinaHistory(symbol string, count int) []map[string]interface{} {
	code := sinaPrefix(symbol)
	url := fmt.Sprintf("https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=%s&scale=240&ma=no&datalen=%d", code, count)

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Referer", "https://finance.sina.com.cn")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	// Response: [{"d":"2024-01-02","o":"3.50","h":"3.60","l":"3.45","c":"3.55","v":"12345678"},...]
	var raw []struct {
		D string `json:"d"`
		O string `json:"o"`
		H string `json:"h"`
		L string `json:"l"`
		C string `json:"c"`
		V string `json:"v"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil
	}

	result := make([]map[string]interface{}, 0, len(raw))
	for _, r := range raw {
		o, _ := strconv.ParseFloat(r.O, 64)
		h, _ := strconv.ParseFloat(r.H, 64)
		l, _ := strconv.ParseFloat(r.L, 64)
		c, _ := strconv.ParseFloat(r.C, 64)
		v, _ := strconv.ParseFloat(r.V, 64)
		result = append(result, map[string]interface{}{
			"date": r.D, "open": o, "high": h, "low": l, "close": c, "volume": v,
		})
	}
	return result
}

// syncSinaDataToDB fetches latest daily data from Sina and upserts into stock_bars + features tables.
// This replaces the Python fetch_data.py + prepare_features.py pipeline for daily updates.
func syncSinaDataToDB(symbol string) error {
	bars := fetchSinaHistory(symbol, 500)
	if len(bars) == 0 {
		return fmt.Errorf("no data from Sina for %s", symbol)
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, bar := range bars {
		date := bar["date"].(string)
		o := bar["open"].(float64)
		h := bar["high"].(float64)
		l := bar["low"].(float64)
		c := bar["close"].(float64)
		v := bar["volume"].(float64)

		_, _ = tx.Exec(`INSERT OR REPLACE INTO stock_bars (symbol, period, date, open, high, low, close, volume)
			VALUES (?, 'daily', ?, ?, ?, ?, ?, ?)`, symbol, date, o, h, l, c, v)
	}

	// Compute simple MA5/MA20 and insert into features
	closes := make([]float64, len(bars))
	for i, b := range bars {
		closes[i] = b["close"].(float64)
	}

	for i, bar := range bars {
		date := bar["date"].(string)
		o := bar["open"].(float64)
		h := bar["high"].(float64)
		l := bar["low"].(float64)
		c := bar["close"].(float64)
		v := bar["volume"].(float64)

		ma5 := calcMA(closes, i, 5)
		ma20 := calcMA(closes, i, 20)
		rsi := calcRSI(closes, i, 14)

		_, _ = tx.Exec(`INSERT OR REPLACE INTO features (symbol, period, date, open, high, low, close, volume, ma5, ma20, rsi14, macd_hist)
			VALUES (?, 'daily', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`, symbol, date, o, h, l, c, v, ma5, ma20, rsi)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	log.Printf("✅ Sina sync: %s daily, %d bars", symbol, len(bars))
	return nil
}

func calcMA(closes []float64, idx, period int) float64 {
	if idx < period-1 {
		return 0
	}
	sum := 0.0
	for i := idx - period + 1; i <= idx; i++ {
		sum += closes[i]
	}
	return sum / float64(period)
}

func calcRSI(closes []float64, idx, period int) float64 {
	if idx < period {
		return 50
	}
	gains, losses := 0.0, 0.0
	for i := idx - period + 1; i <= idx; i++ {
		diff := closes[i] - closes[i-1]
		if diff > 0 {
			gains += diff
		} else {
			losses -= diff
		}
	}
	if losses == 0 {
		return 100
	}
	rs := (gains / float64(period)) / (losses / float64(period))
	return 100 - 100/(1+rs)
}
