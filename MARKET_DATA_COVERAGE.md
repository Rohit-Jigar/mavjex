# MavJex Market Data Coverage & Provider Architecture

This document specifies the global market instruments, exchanges, data providers, freshness semantics, rate limits, and paper-trading execution guarantees supported by **MavJex**.

---

## 1. Supported Markets and Exchanges

MavJex provides comprehensive coverage across Indian equities, US equities, ETFs, and major cryptocurrencies:

| Market / Exchange | Region | Tradable Asset Types | Currency | Trading Hours | Freshness Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NSE** (National Stock Exchange of India) | 🇮🇳 India | Equities, Index ETFs | INR (₹) | 09:15 – 15:30 IST (Mon–Fri) | `DELAYED_15M` / `MARKET_CLOSED` |
| **BSE** (Bombay Stock Exchange) | 🇮🇳 India | Equities, Sectoral Stocks | INR (₹) | 09:15 – 15:30 IST (Mon–Fri) | `DELAYED_15M` / `MARKET_CLOSED` |
| **NASDAQ** | 🇺🇸 United States | Tech Equities, Index ETFs | USD ($) | 09:30 – 16:00 EST (Mon–Fri) | `LIVE` / `MARKET_CLOSED` |
| **NYSE** | 🇺🇸 United States | Large-Cap Equities, ETFs | USD ($) | 09:30 – 16:00 EST (Mon–Fri) | `LIVE` / `MARKET_CLOSED` |
| **Crypto (Binance Feed)** | ⚡ Global | Cryptocurrencies | USDT ($) | 24 hours / 7 days / 365 days | `LIVE` |

---

## 2. Exchange Symbol & ISIN Disambiguation

Indian equities frequently list on both the **National Stock Exchange (NSE)** and the **Bombay Stock Exchange (BSE)** under different ticker codes but sharing a common **International Securities Identification Number (ISIN)**.

MavJex tracks individual exchange execution while linking entities via ISIN:

| Company Name | NSE Ticker | BSE Script Code | ISIN | Sector |
| :--- | :--- | :--- | :--- | :--- |
| **Reliance Industries Ltd** | `RELIANCE.NS` | `500325.BO` | `INE002A01018` | Conglomerate / Energy & Telecom |
| **Tata Consultancy Services Ltd** | `TCS.NS` | `532540.BO` | `INE467B01029` | Information Technology |
| **HDFC Bank Ltd** | `HDFCBANK.NS` | `500180.BO` | `INE040A01034` | Banking & Financial Services |
| **Infosys Ltd** | `INFY.NS` | `500209.BO` | `INE009A01021` | Information Technology |
| **ICICI Bank Ltd** | `ICICIBANK.NS` | `532174.BO` | `INE090A01021` | Banking & Financial Services |
| **Bharti Airtel Ltd** | `BHARTIARTL.NS` | `532454.BO` | `INE397D01024` | Telecommunications |
| **State Bank of India** | `SBIN.NS` | `500112.BO` | `INE062A01020` | Banking & Public Sector |
| **Tata Motors Ltd** | `TATAMOTORS.NS` | `500570.BO` | `INE155A01022` | Automobile |
| **Larsen & Toubro Ltd** | `LT.NS` | `500510.BO` | `INE018A01030` | Infrastructure & Engineering |
| **ITC Ltd** | `ITC.NS` | `500875.BO` | `INE154A01025` | FMCG & Hospitality |
| **Suzlon Energy Ltd** | `SUZLON.NS` | `532667.BO` | `INE040H01021` | Renewable Energy |
| **Nippon India Nifty 50 BeES ETF** | `NIFTYBEES.NS` | `590106.BO` | `INF732E01015` | Index Exchange Traded Fund |

---

## 3. Provider Abstraction Architecture

The data ingestion pipeline decouples the frontend client and trading engine from direct third-party exchange dependencies:

```
                  ┌──────────────────────────────────────────────┐
                  │              MavJex Client (UI)              │
                  │   - Market Explorer                          │
                  │   - Candlestick & Line Chart Engine          │
                  │   - Simple Leveraged Trade Ticket            │
                  └──────────────────────┬───────────────────────┘
                                         │ JSON API (REST / Polling)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │          MavJex Backend Server               │
                  │  (server/src/index.ts, Port 3001 / 10000)    │
                  └──────┬───────────────────────────────┬───────┘
                         │                               │
                         ▼                               ▼
       ┌────────────────────────────────┐  ┌───────────────────────────────┐
       │     InstrumentCatalog.ts       │  │     MarketDataService.ts      │
       │  - Full In-Memory Catalog      │  │  - NormalizedQuote Model      │
       │  - Fuzzy Scoring Search        │  │  - TTL Rate-Limit Cache       │
       │  - ISIN Cross-Reference Index  │  │  - Historical OHLCV Candles   │
       └────────────────────────────────┘  └─────────────┬─────────────────┘
                                                         │
                         ┌───────────────────────────────┼──────────────────────────────┐
                         ▼                               ▼                              ▼
             ┌──────────────────────┐        ┌──────────────────────┐       ┌──────────────────────┐
             │ Binance Global / US  │        │ Yahoo Finance v8 API │       │ Alpaca Markets API   │
             │ (24/7 Crypto Ticker) │        │ (NSE, BSE, US Quotes)│       │ (Live Paper Broker)  │
             └──────────────────────┘        └──────────────────────┘       └──────────────────────┘
```

### Key Modules:

1. **`InstrumentCatalog.ts`**:
   - Manages the universe of equities, ETFs, and cryptocurrencies.
   - Computes deterministic fuzzy relevance scores:
     - Exact Ticker Match = `100` points
     - Symbol Prefix Match = `80` points
     - Exact Word in Company Name = `70` points
     - Substring in Name = `50` points
     - ISIN Match = `40` points
   - Supports filtering by `exchange` (`ALL`, `NSE`, `BSE`, `NASDAQ`, `NYSE`, `BINANCE`) and asset `type` (`ALL`, `EQUITY`, `ETF`, `CRYPTO`).

2. **`MarketDataService.ts`**:
   - Normalizes data from heterogeneous sources into standard `NormalizedQuote` and `Candle` models.
   - Implements multi-tier failover:
     - **Crypto**: Binance Global ➔ Binance US ➔ Exchange Baseline Tick.
     - **Equities**: Real-time / delayed Yahoo Finance chart endpoints ➔ Last Known Close Baseline.
   - Built-in TTL Cache: Quotes are cached for `2,500ms` to protect against IP rate limits while maintaining interactive responsiveness.

---

## 4. Market Data Freshness Semantics

MavJex explicitly tags every quote with a verified `status` flag:

- **`LIVE`**: Sub-second to 2-second streaming or live orderbook price (Cryptocurrencies 24/7, US Equities during market open).
- **`DELAYED_15M`**: Standard 15-minute delayed quotes for Indian equities (NSE & BSE) per regulatory redistribution rules.
- **`MARKET_CLOSED`**: Outside normal trading hours for the respective exchange. Price reflects the final official closing price.
- **`LAST_KNOWN`**: Fallback price retained during network isolation or upstream provider downtime. Stale data warning is rendered in the UI.

---

## 5. Paper Trading Execution Engine

MavJex is configured with an initial paper balance of **$100,000,000.00 USD**:

1. **Order Types**:
   - **Market Order**: Executes immediately at the current indicative quote price.
   - **Limit Order**: Reserves the required cash collateral into margin escrow. The order stays open until the market price reaches the trigger price (`price <= limitPrice` for BUY, `price >= limitPrice` for SELL).
2. **Leverage & Collateral**:
   - Multiplier from `1x` (Spot Safe, 0 liquidation risk) up to `100x` (High Risk).
   - Cash Margin Required = $\frac{\text{Notional USD}}{\text{Leverage}}$.
3. **Liquidation Protection**:
   - Uses an institutional 0.5% Maintenance Margin Rate (MMR).
   - $\text{Liq Price (BUY)} = \text{Entry} \times \left(1 - \left(\frac{1}{\text{Leverage}} - 0.005\right)\right)$
   - $\text{Liq Price (SELL)} = \text{Entry} \times \left(1 + \left(\frac{1}{\text{Leverage}} - 0.005\right)\right)$
4. **State Persistence**:
   - The paper book is saved to `.paper-portfolio.json` across server restarts.
   - An instant "Reset $100M Seed Balance" button restores the portfolio to pristine factory defaults.
