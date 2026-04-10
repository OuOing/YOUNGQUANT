package main

import (
	"encoding/csv"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func migrateCSVs() {
	files, err := os.ReadDir(filepath.Join(projectDir, "data"))
	if err != nil {
		log.Printf("Error reading data dir: %v", err)
		return
	}

	for _, file := range files {
		name := file.Name()
		if !strings.HasSuffix(name, ".csv") {
			continue
		}

		if strings.HasPrefix(name, "stock_") {
			importStockBars(name)
		} else if strings.HasPrefix(name, "features_") && strings.HasSuffix(name, "_v3.csv") {
			importFeatures(name)
		}
	}
	log.Println("✅ Migration completed")
}

func importStockBars(filename string) {
	// stock_601899.csv -> symbol=601899, period=daily
	// stock_601899_15m.csv -> symbol=601899, period=15
	parts := strings.Split(strings.TrimSuffix(filename, ".csv"), "_")
	symbol := parts[1]
	period := "daily"
	if len(parts) > 2 {
		period = strings.TrimSuffix(parts[2], "m")
	}

	f, err := os.Open(filepath.Join(projectDir, "data", filename))
	if err != nil {
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	header, _ := reader.Read()
	colMap := make(map[string]int)
	for i, h := range header {
		colMap[h] = i
	}

	// stock_zh_a_hist: 日期,股票代码,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率
	// min_em: 日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率

	tx, _ := db.Begin()
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		date := rec[colMap["日期"]]
		open, _ := strconv.ParseFloat(rec[colMap["开盘"]], 64)
		high, _ := strconv.ParseFloat(rec[colMap["最高"]], 64)
		low, _ := strconv.ParseFloat(rec[colMap["最低"]], 64)
		close, _ := strconv.ParseFloat(rec[colMap["收盘"]], 64)
		vol, _ := strconv.ParseFloat(rec[colMap["成交量"]], 64)

		_, _ = tx.Exec(`INSERT OR REPLACE INTO stock_bars (symbol, period, date, open, high, low, close, volume) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, symbol, period, date, open, high, low, close, vol)
	}
	tx.Commit()
	log.Printf("Imported %s", filename)
}

func importFeatures(filename string) {
	// features_601899_v3.csv -> symbol=601899, period=daily
	// features_601899_15m_v3.csv -> symbol=601899, period=15
	parts := strings.Split(strings.TrimSuffix(filename, "_v3.csv"), "_")
	symbol := parts[1]
	period := "daily"
	if len(parts) > 2 {
		period = strings.TrimSuffix(parts[2], "m")
	}

	f, err := os.Open(filepath.Join(projectDir, "data", filename))
	if err != nil {
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	header, _ := reader.Read()
	colMap := make(map[string]int)
	for i, h := range header {
		colMap[h] = i
	}

	tx, _ := db.Begin()
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		date := rec[colMap["日期"]]
		open, _ := strconv.ParseFloat(rec[colMap["开盘"]], 64)
		high, _ := strconv.ParseFloat(rec[colMap["最高"]], 64)
		low, _ := strconv.ParseFloat(rec[colMap["最低"]], 64)
		close, _ := strconv.ParseFloat(rec[colMap["收盘"]], 64)
		vol, _ := strconv.ParseFloat(rec[colMap["成交量"]], 64)
		ma5, _ := strconv.ParseFloat(rec[colMap["MA5"]], 64)
		ma20, _ := strconv.ParseFloat(rec[colMap["MA20"]], 64)
		rsi, _ := strconv.ParseFloat(rec[colMap["RSI14"]], 64)
		macd, _ := strconv.ParseFloat(rec[colMap["MACD_Hist"]], 64)

		_, _ = tx.Exec(`INSERT OR REPLACE INTO features (symbol, period, date, open, high, low, close, volume, ma5, ma20, rsi14, macd_hist) 
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, symbol, period, date, open, high, low, close, vol, ma5, ma20, rsi, macd)
	}
	tx.Commit()
	log.Printf("Imported %s", filename)
}
