# 🇮🇳 Indian Stock Market Dashboard

Built by **Subrat** — A full-featured Indian stock market dashboard covering NSE & BSE with live prices, sector view, technical screener, watchlist, and more.

## Features

| Feature | Description |
|---|---|
| 📊 Live Dashboard | Nifty 50 + BSE Sensex stocks with real-time prices |
| 📈 10 Index Cards | NIFTY 50, NIFTY BANK, SENSEX, IT, PHARMA, AUTO, FMCG, etc. |
| 🚀 Top Gainers & Losers | Real-time daily movers |
| 📉 52W High / Low | Stocks near yearly highs and lows |
| 🔍 Smart Search | Search all 2,400+ NSE stocks with live price autocomplete |
| 🏭 Sector View | All NSE stocks organised by sector (screener.in style) |
| ★ Watchlist | Save stocks with star button, persisted in localStorage |
| 🔔 Price Alerts | Set target price alerts with browser notifications |
| 🔍 Opportunity Screener | RSI-14, EMA-20/50, Volume Surge, Momentum signals across Nifty 500 |
| 💰 Financial Details | P/E, EPS, Book Value, ROE, Dividends per stock |
| 📅 Quarterly Results | Revenue, Net Income, EPS Beat/Miss for last 4 quarters |
| 🏦 Shareholding | Promoter / FII / DII / Public breakdown with donut chart |
| 📰 Stock News | Latest news per stock from Yahoo Finance RSS |
| 📈 Interactive Charts | Candlestick chart with OHLCV, crosshair tooltip (1M/3M/6M/1Y/2Y) |
| 🎯 Analyst Analysis | Target prices, consensus, moving averages |
| 🌡 Sector Heatmap | Colour-coded sector performance |
| 📰 ET Markets News | Live news from Economic Times |
| ⬇ CSV Export | Download any sector or filtered stock list |
| 🌙 Dark / Light Theme | Toggle with one click |

## Custom Sectors

In addition to Nifty 500 industries, hand-curated sectors include:
- ✈️ **Tour & Travel** (24 stocks)
- 🛡 **Defence & Aerospace** (20 stocks)
- 🍬 **Sugar** (19 stocks)
- 👕 **Textiles** (10 stocks)
- 🏗 **Cement** (10 stocks)
- 🏠 **Real Estate** (10 stocks)
- 🌱 **Fertilizers** (8 stocks)

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Install & Run

```bash
cd IndianStocksDashboard
npm install
npm start
```

Open **http://localhost:3001** in your browser.

### Data Sources
- **Yahoo Finance** — live prices, OHLCV, financials (via local proxy, no API key needed)
- **NSE India** — stock list, Nifty 500 sector classification
- **Economic Times** — market news RSS feed
- **companiesmarketcap.com / Clearbit** — company logos

> ⚠️ Prices are delayed ~15 minutes. This dashboard is for informational purposes only — not financial advice.

## Project Structure

```
IndianStocksDashboard/
├── server.js      # Express backend — all API endpoints
├── index.html     # Single-page frontend (all JS/CSS inline)
├── package.json
└── README.md
```

## License

MIT © Subrat
