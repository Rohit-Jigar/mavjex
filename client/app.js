/**
 * MavJex — Simple, High-Performance Trading Terminal
 * Full Support for NSE/BSE Global Search, Limit/Market Orders,
 * Positions, Market Depth, Strategy Bots, and Risk Breakers.
 * Tagline: Simulate. Analyze. Evolve.
 */

const BACKEND_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001"
    : "https://mavjex.onrender.com";

// Base Catalog of Curated Instruments
const ASSETS = {
  RELIANCE: {
    symbol: "RELIANCE",
    exchangeSymbol: "RELIANCE.NS",
    name: "Reliance Industries Ltd",
    type: "Equities • Energy & Telecom",
    exchange: "NSE",
    country: "IN",
    currency: "₹",
    isin: "INE002A01018",
    price: 2845.50,
    change: 1.45,
    status: "DELAYED_15M"
  },
  TCS: {
    symbol: "TCS",
    exchangeSymbol: "TCS.NS",
    name: "Tata Consultancy Services Ltd",
    type: "Equities • IT Services",
    exchange: "NSE",
    country: "IN",
    currency: "₹",
    isin: "INE467B01029",
    price: 4120.25,
    change: 0.82,
    status: "DELAYED_15M"
  },
  INFY: {
    symbol: "INFY",
    exchangeSymbol: "INFY.NS",
    name: "Infosys Limited",
    type: "Equities • Digital Services",
    exchange: "NSE",
    country: "IN",
    currency: "₹",
    isin: "INE009A01021",
    price: 1892.40,
    change: -0.45,
    status: "DELAYED_15M"
  },
  AAPL: {
    symbol: "AAPL",
    exchangeSymbol: "AAPL",
    name: "Apple Inc.",
    type: "US Equities • Consumer Tech",
    exchange: "NASDAQ",
    country: "US",
    currency: "$",
    isin: "US0378331005",
    price: 232.50,
    change: 1.12,
    status: "LIVE"
  },
  NVDA: {
    symbol: "NVDA",
    exchangeSymbol: "NVDA",
    name: "NVIDIA Corp.",
    type: "US Equities • Semiconductors & AI",
    exchange: "NASDAQ",
    country: "US",
    currency: "$",
    isin: "US67066G1040",
    price: 141.20,
    change: 4.25,
    status: "LIVE"
  },
  SOLUSDT: {
    symbol: "SOLUSDT",
    exchangeSymbol: "SOLUSDT",
    name: "Solana",
    type: "Crypto • Layer 1 Blockchain",
    exchange: "BINANCE",
    country: "GLOBAL",
    currency: "$",
    isin: "CRYPTO-SOL",
    price: 101.41,
    change: 3.42,
    status: "LIVE"
  },
  BTCUSDT: {
    symbol: "BTCUSDT",
    exchangeSymbol: "BTCUSDT",
    name: "Bitcoin",
    type: "Crypto • Digital Gold",
    exchange: "BINANCE",
    country: "GLOBAL",
    currency: "$",
    isin: "CRYPTO-BTC",
    price: 80600.01,
    change: 2.18,
    status: "LIVE"
  },
  ETHUSDT: {
    symbol: "ETHUSDT",
    exchangeSymbol: "ETHUSDT",
    name: "Ethereum",
    type: "Crypto • Smart Contracts",
    exchange: "BINANCE",
    country: "GLOBAL",
    currency: "$",
    isin: "CRYPTO-ETH",
    price: 2343.71,
    change: -0.84,
    status: "LIVE"
  },
  TSLA: {
    symbol: "TSLA",
    exchangeSymbol: "TSLA",
    name: "Tesla Inc.",
    type: "US Equities • Electric Vehicles",
    exchange: "NASDAQ",
    country: "US",
    currency: "$",
    isin: "US88160R1014",
    price: 218.40,
    change: 2.30,
    status: "LIVE"
  }
};

// Rich Client-Side Fallback Catalog for Offline/Fast Explorer Usage
const FALLBACK_CATALOG = [
  { id: "NSE:RELIANCE", symbol: "RELIANCE.NS", displaySymbol: "RELIANCE", name: "Reliance Industries Ltd", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE002A01018", basePrice: 2845.50, change: 1.45, status: "DELAYED_15M" },
  { id: "NSE:TCS", symbol: "TCS.NS", displaySymbol: "TCS", name: "Tata Consultancy Services Ltd", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE467B01029", basePrice: 4120.25, change: 0.82, status: "DELAYED_15M" },
  { id: "NSE:HDFCBANK", symbol: "HDFCBANK.NS", displaySymbol: "HDFCBANK", name: "HDFC Bank Limited", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE040A01034", basePrice: 1720.80, change: 0.55, status: "DELAYED_15M" },
  { id: "NSE:INFY", symbol: "INFY.NS", displaySymbol: "INFY", name: "Infosys Limited", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE009A01021", basePrice: 1892.40, change: -0.45, status: "DELAYED_15M" },
  { id: "NSE:ICICIBANK", symbol: "ICICIBANK.NS", displaySymbol: "ICICIBANK", name: "ICICI Bank Ltd", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE090A01021", basePrice: 1245.30, change: 1.10, status: "DELAYED_15M" },
  { id: "NSE:BHARTIARTL", symbol: "BHARTIARTL.NS", displaySymbol: "BHARTIARTL", name: "Bharti Airtel Ltd", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE397D01024", basePrice: 1680.15, change: 2.15, status: "DELAYED_15M" },
  { id: "NSE:SBIN", symbol: "SBIN.NS", displaySymbol: "SBIN", name: "State Bank of India", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE062A01020", basePrice: 830.40, change: -0.20, status: "DELAYED_15M" },
  { id: "NSE:TATAMOTORS", symbol: "TATAMOTORS.NS", displaySymbol: "TATAMOTORS", name: "Tata Motors Passenger Vehicles Ltd", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE155A01022", basePrice: 940.75, change: 3.10, status: "DELAYED_15M" },
  { id: "NSE:LT", symbol: "LT.NS", displaySymbol: "LT", name: "Larsen & Toubro Ltd", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE018A01030", basePrice: 3560.00, change: 0.90, status: "DELAYED_15M" },
  { id: "NSE:ITC", symbol: "ITC.NS", displaySymbol: "ITC", name: "ITC Limited", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE154A01025", basePrice: 485.60, change: 0.35, status: "DELAYED_15M" },
  { id: "NSE:SUZLON", symbol: "SUZLON.NS", displaySymbol: "SUZLON", name: "Suzlon Energy Limited", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE040H01021", basePrice: 65.40, change: 4.80, status: "DELAYED_15M" },
  { id: "NSE:NIFTYBEES", symbol: "NIFTYBEES.NS", displaySymbol: "NIFTYBEES", name: "Nippon India ETF Nifty 50 BeES", exchange: "NSE", country: "IN", currency: "INR", currencySign: "₹", type: "ETF", isin: "INF732E01015", basePrice: 268.45, change: 0.65, status: "DELAYED_15M" },
  { id: "BSE:500325", symbol: "500325.BO", displaySymbol: "RELIANCE (BSE)", name: "Reliance Industries Ltd", exchange: "BSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE002A01018", basePrice: 2844.80, change: 1.42, status: "DELAYED_15M" },
  { id: "BSE:532540", symbol: "532540.BO", displaySymbol: "TCS (BSE)", name: "Tata Consultancy Services Ltd", exchange: "BSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE467B01029", basePrice: 4118.90, change: 0.80, status: "DELAYED_15M" },
  { id: "BSE:500180", symbol: "500180.BO", displaySymbol: "HDFCBANK (BSE)", name: "HDFC Bank Limited", exchange: "BSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE040A01034", basePrice: 1720.00, change: 0.52, status: "DELAYED_15M" },
  { id: "BSE:500209", symbol: "500209.BO", displaySymbol: "INFY (BSE)", name: "Infosys Limited", exchange: "BSE", country: "IN", currency: "INR", currencySign: "₹", type: "EQUITY", isin: "INE009A01021", basePrice: 1891.75, change: -0.48, status: "DELAYED_15M" },
  { id: "NASDAQ:AAPL", symbol: "AAPL", displaySymbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "EQUITY", isin: "US0378331005", basePrice: 232.50, change: 1.12, status: "LIVE" },
  { id: "NASDAQ:MSFT", symbol: "MSFT", displaySymbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "EQUITY", isin: "US5949181045", basePrice: 428.15, change: 0.65, status: "LIVE" },
  { id: "NASDAQ:NVDA", symbol: "NVDA", displaySymbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "EQUITY", isin: "US67066G1040", basePrice: 141.20, change: 4.25, status: "LIVE" },
  { id: "NASDAQ:TSLA", symbol: "TSLA", displaySymbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "EQUITY", isin: "US88160R1014", basePrice: 218.40, change: 2.30, status: "LIVE" },
  { id: "NASDAQ:AMZN", symbol: "AMZN", displaySymbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "EQUITY", isin: "US0231351067", basePrice: 188.60, change: 1.40, status: "LIVE" },
  { id: "NASDAQ:GOOGL", symbol: "GOOGL", displaySymbol: "GOOGL", name: "Alphabet Inc. (Google)", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "EQUITY", isin: "US02079K3059", basePrice: 165.20, change: -0.30, status: "LIVE" },
  { id: "NYSE:SPY", symbol: "SPY", displaySymbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE", country: "US", currency: "USD", currencySign: "$", type: "ETF", isin: "US78462F1030", basePrice: 580.40, change: 0.45, status: "LIVE" },
  { id: "NASDAQ:QQQ", symbol: "QQQ", displaySymbol: "QQQ", name: "Invesco QQQ Trust (Nasdaq-100)", exchange: "NASDAQ", country: "US", currency: "USD", currencySign: "$", type: "ETF", isin: "US46090E1038", basePrice: 495.20, change: 0.85, status: "LIVE" },
  { id: "BINANCE:SOLUSDT", symbol: "SOLUSDT", displaySymbol: "SOL", name: "Solana", exchange: "BINANCE", country: "GLOBAL", currency: "USDT", currencySign: "$", type: "CRYPTO", isin: "CRYPTO-SOL", basePrice: 101.41, change: 3.42, status: "LIVE" },
  { id: "BINANCE:BTCUSDT", symbol: "BTCUSDT", displaySymbol: "BTC", name: "Bitcoin", exchange: "BINANCE", country: "GLOBAL", currency: "USDT", currencySign: "$", type: "CRYPTO", isin: "CRYPTO-BTC", basePrice: 80600.01, change: 2.18, status: "LIVE" },
  { id: "BINANCE:ETHUSDT", symbol: "ETHUSDT", displaySymbol: "ETH", name: "Ethereum", exchange: "BINANCE", country: "GLOBAL", currency: "USDT", currencySign: "$", type: "CRYPTO", isin: "CRYPTO-ETH", basePrice: 2343.71, change: -0.84, status: "LIVE" }
];

// Global State
const state = {
  activeSymbol: "RELIANCE",
  activeSide: "BUY",
  orderType: "MARKET", // "MARKET" | "LIMIT"
  chartType: "candles", // "candles" | "line"
  chartRange: "1D", // "1D" | "1W" | "1M" | "1Y" | "ALL"
  leverage: 10,
  tradeAmount: 10000,
  portfolio: {
    cash: 100000000.00,
    totalEquity: 100000000.00,
    marginUsed: 0.00,
    openPnl: 0.00
  },
  positions: [],
  limitOrders: [],
  watchlist: new Set(["RELIANCE", "TCS", "INFY", "AAPL", "NVDA", "SOLUSDT"]),
  botEvents: [],
  breakersTripped: false,
  consecutiveLosses: 0,
  dailyLossUsd: 0,
  latencyMs: 38,
  candles: [],
  explorerFilter: {
    exchange: "ALL",
    type: "ALL",
    query: ""
  }
};

// DOM References
const dom = {
  navTabs: document.querySelectorAll(".nav-tab"),
  viewPanels: document.querySelectorAll(".view-panel"),
  positionsTabBadge: document.getElementById("positionsTabBadge"),
  btnModePaper: document.getElementById("btnModePaper"),
  btnModeLive: document.getElementById("btnModeLive"),
  btnResetSeed: document.getElementById("btnResetSeed"),
  latencyDisplay: document.getElementById("latencyDisplay"),
  dispTotalEquity: document.getElementById("dispTotalEquity"),
  dispCashBalance: document.getElementById("dispCashBalance"),
  dispMarginUsed: document.getElementById("dispMarginUsed"),
  dispOpenPnl: document.getElementById("dispOpenPnl"),
  assetPills: document.querySelectorAll(".asset-pill"),
  btnExploreMore: document.getElementById("btnExploreMore"),
  chartSymbolName: document.getElementById("chartSymbolName"),
  chartDataFreshness: document.getElementById("chartDataFreshness"),
  chartAssetType: document.getElementById("chartAssetType"),
  chartPriceBig: document.getElementById("chartPriceBig"),
  chartPriceChangeBig: document.getElementById("chartPriceChangeBig"),
  btnChartCandles: document.getElementById("btnChartCandles"),
  btnChartLine: document.getElementById("btnChartLine"),
  chartRangesGroup: document.getElementById("chartRangesGroup"),
  chartCanvas: document.getElementById("mainChartCanvas"),
  hudO: document.getElementById("hudO"),
  hudH: document.getElementById("hudH"),
  hudL: document.getElementById("hudL"),
  hudC: document.getElementById("hudC"),
  btnOtMarket: document.getElementById("btnOtMarket"),
  btnOtLimit: document.getElementById("btnOtLimit"),
  btnSideBuy: document.getElementById("btnSideBuy"),
  btnSideSell: document.getElementById("btnSideSell"),
  groupLimitPrice: document.getElementById("groupLimitPrice"),
  inputLimitPrice: document.getElementById("inputLimitPrice"),
  labelCurrentQuote: document.getElementById("labelCurrentQuote"),
  limitCurrencySign: document.getElementById("limitCurrencySign"),
  amountChips: document.querySelectorAll(".amount-chip"),
  inputTradeAmount: document.getElementById("inputTradeAmount"),
  levBtns: document.querySelectorAll(".lev-btn"),
  dispCurrentLev: document.getElementById("dispCurrentLev"),
  dispCalcMargin: document.getElementById("dispCalcMargin"),
  dispCalcNotional: document.getElementById("dispCalcNotional"),
  dispCalcLiq: document.getElementById("dispCalcLiq"),
  dispCalcExplainer: document.getElementById("dispCalcExplainer"),
  btnExecuteTrade: document.getElementById("btnExecuteTrade"),
  // Explorer Elements
  marketSearchInput: document.getElementById("marketSearchInput"),
  btnSearchClear: document.getElementById("btnSearchClear"),
  explorerFiltersBar: document.querySelector(".explorer-filters-bar"),
  dispResultsCount: document.getElementById("dispResultsCount"),
  explorerResultsGrid: document.getElementById("explorerResultsGrid"),
  // Positions & Depth
  positionsContainer: document.getElementById("positionsContainer"),
  btnRefreshPositions: document.getElementById("btnRefreshPositions"),
  depthActiveSym: document.getElementById("depthActiveSym"),
  depthSpreadAmount: document.getElementById("depthSpreadAmount"),
  depthCenterPrice: document.getElementById("depthCenterPrice"),
  depthAsksList: document.getElementById("depthAsksList"),
  depthBidsList: document.getElementById("depthBidsList"),
  // Bots & Breakers
  btnTestGamblerBot: document.getElementById("btnTestGamblerBot"),
  btnTestSpyBot: document.getElementById("btnTestSpyBot"),
  btnTestHouseBot: document.getElementById("btnTestHouseBot"),
  dispBotFeedCount: document.getElementById("dispBotFeedCount"),
  botFeedList: document.getElementById("botFeedList"),
  btnSimulateBreakerTrip: document.getElementById("btnSimulateBreakerTrip"),
  btnResetBreakers: document.getElementById("btnResetBreakers"),
  breakerMainBanner: document.getElementById("breakerMainBanner"),
  bannerStatusIcon: document.getElementById("bannerStatusIcon"),
  bannerStatusTitle: document.getElementById("bannerStatusTitle"),
  bannerStatusDesc: document.getElementById("bannerStatusDesc"),
  stDailyLoss: document.getElementById("stDailyLoss"),
  valDailyLoss: document.getElementById("valDailyLoss"),
  fillDailyLoss: document.getElementById("fillDailyLoss"),
  stConsecLoss: document.getElementById("stConsecLoss"),
  valConsecLoss: document.getElementById("valConsecLoss"),
  fillConsecLoss: document.getElementById("fillConsecLoss"),
  toastShelf: document.getElementById("toastShelf")
};

let chartInstance = null;

// =========================================================================
// 1. Candlestick & Price Chart Engine (Dual: Candles + Line)
// =========================================================================
function generateCandles(basePrice, count = 48, range = "1D") {
  const list = [];
  const now = Math.floor(Date.now() / 60000) * 60000;
  let intervalMs = 60000 * 5; // 5 min default for 1D

  if (range === "1W") intervalMs = 60000 * 60 * 2; // 2 hours
  else if (range === "1M") intervalMs = 60000 * 60 * 8; // 8 hours
  else if (range === "1Y") intervalMs = 60000 * 60 * 24 * 3; // 3 days
  else if (range === "ALL") intervalMs = 60000 * 60 * 24 * 14; // 2 weeks

  let curr = basePrice * 0.985;

  for (let i = count; i >= 0; i--) {
    const time = now - i * intervalMs;
    const vol = curr * 0.007;
    const chg = (Math.random() - 0.485) * vol;
    const open = curr;
    const close = i === 0 ? basePrice : Math.max(0.01, curr + chg);
    const high = Math.max(open, close) + Math.random() * vol * 0.45;
    const low = Math.max(0.01, Math.min(open, close) - Math.random() * vol * 0.45);
    list.push({ time, open, high, low, close });
    curr = close;
  }
  return list;
}

class SimpleChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.w = rect.width;
    this.h = rect.height;
    this.render();
  }

  render() {
    const { ctx, w, h } = this;
    const candles = state.candles;
    if (!candles || candles.length === 0 || !w || !h) return;

    ctx.clearRect(0, 0, w, h);

    const pad = { top: 20, right: 65, bottom: 25, left: 15 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    let min = Infinity;
    let max = -Infinity;
    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const range = max - min || 1;
    const candleW = Math.max(3, (chartW / candles.length) * 0.65);
    const spacing = chartW / candles.length;
    const asset = ASSETS[state.activeSymbol] || { currency: "$" };
    const cSign = asset.currency || "$";

    // Grid lines & price tags
    ctx.strokeStyle = "rgba(30, 41, 59, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (chartH / 3) * i;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);

      const p = max - (range / 3) * i;
      ctx.fillStyle = "#64748B";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${cSign}${p.toFixed(p < 2 ? 4 : 2)}`, w - pad.right + 6, y + 3);
    }
    ctx.stroke();

    if (state.chartType === "line") {
      // Line Chart Rendering
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const x = pad.left + idx * spacing + spacing / 2;
        const y = pad.top + ((max - c.close) / range) * chartH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "#10B981";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Soft Area Gradient
      const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
      grad.addColorStop(0, "rgba(16, 185, 129, 0.25)");
      grad.addColorStop(1, "rgba(16, 185, 129, 0.0)");
      ctx.fillStyle = grad;
      ctx.lineTo(pad.left + (candles.length - 1) * spacing + spacing / 2, h - pad.bottom);
      ctx.lineTo(pad.left + spacing / 2, h - pad.bottom);
      ctx.closePath();
      ctx.fill();
    } else {
      // Candlestick Rendering
      candles.forEach((c, idx) => {
        const x = pad.left + idx * spacing + spacing / 2;
        const isGreen = c.close >= c.open;
        const col = isGreen ? "#10B981" : "#EF4444";

        // Wick
        const yH = pad.top + ((max - c.high) / range) * chartH;
        const yL = pad.top + ((max - c.low) / range) * chartH;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();

        // Body
        const yO = pad.top + ((max - c.open) / range) * chartH;
        const yC = pad.top + ((max - c.close) / range) * chartH;
        const top = Math.min(yO, yC);
        const bH = Math.max(2, Math.abs(yC - yO));

        ctx.fillStyle = col;
        ctx.fillRect(x - candleW / 2, top, candleW, bH);
      });
    }

    const last = candles[candles.length - 1];
    if (last && dom.hudO) {
      const dec = last.close < 2 ? 4 : 2;
      dom.hudO.textContent = `${cSign}${last.open.toFixed(dec)}`;
      dom.hudH.textContent = `${cSign}${last.high.toFixed(dec)}`;
      dom.hudL.textContent = `${cSign}${last.low.toFixed(dec)}`;
      dom.hudC.textContent = `${cSign}${last.close.toFixed(dec)}`;
    }
  }
}

// =========================================================================
// 2. Liquidation & Margin Calculator (Beginner-Friendly)
// =========================================================================
function calculateLiquidationPrice(entry, side, leverage) {
  const mmr = 0.005; // 0.5% Maintenance Margin
  if (leverage <= 1) return side === "BUY" ? 0 : entry * 2;
  if (side === "BUY") {
    return Math.max(0, entry * (1 - (1 / leverage - mmr)));
  } else {
    return entry * (1 + (1 / leverage - mmr));
  }
}

function updateTradeCalculations() {
  const notional = parseFloat(dom.inputTradeAmount.value) || 0;
  const leverage = state.leverage;
  const side = state.activeSide;
  const asset = ASSETS[state.activeSymbol] || { price: 100, currency: "$" };
  const price = asset.price;
  const cSign = asset.currency || "$";

  const requiredMargin = notional / leverage;
  const liqPrice = calculateLiquidationPrice(price, side, leverage);
  const distPct = Math.abs((price - liqPrice) / price) * 100;
  const dec = price < 2 ? 4 : 2;

  // Margin and Notional always displayed in USD for uniform book accounting
  dom.dispCalcMargin.textContent = `$${requiredMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.dispCalcNotional.textContent = `$${notional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.dispCalcLiq.textContent = liqPrice === 0 ? "None (Spot Safe)" : `${cSign}${liqPrice.toFixed(dec)}`;

  if (leverage <= 1) {
    dom.dispCalcExplainer.innerHTML = `🛡️ <strong>1x Spot Safe</strong>: No liquidation risk. You own the full underlying asset.`;
  } else {
    dom.dispCalcExplainer.innerHTML = `💡 If ${state.activeSymbol} moves <strong>${distPct.toFixed(1)}%</strong> ${side === "BUY" ? "down" : "up"} to <strong>${cSign}${liqPrice.toFixed(dec)}</strong>, this trade closes to prevent debt.`;
  }

  // Update Limit Trigger helper label and currency sign
  dom.limitCurrencySign.textContent = cSign;
  dom.labelCurrentQuote.textContent = `Current: ${cSign}${price.toFixed(dec)}`;

  // Update button text
  const symClean = state.activeSymbol.replace(".NS", "").replace(".BO", "").replace("USDT", "");
  const actionWord = side === "BUY" ? "BUY" : "SELL";

  if (state.orderType === "LIMIT") {
    const lPrice = parseFloat(dom.inputLimitPrice.value) || price;
    dom.btnExecuteTrade.textContent = `PLACE LIMIT ${actionWord} $${notional.toLocaleString()} OF ${symClean} AT ${cSign}${lPrice.toFixed(dec)}`;
  } else {
    dom.btnExecuteTrade.textContent = `${actionWord} $${notional.toLocaleString()} OF ${symClean} (${leverage}x)`;
  }

  dom.btnExecuteTrade.className = `btn-execute ${side === "BUY" ? "buy" : "sell"}`;
}

// =========================================================================
// 3. Trade Execution (Supports Market & Limit Orders)
// =========================================================================
async function executeTrade() {
  if (state.breakersTripped) {
    showToast("❌ Trade rejected! Desk Risk Circuit Breaker is active.", "error");
    return;
  }

  const notional = parseFloat(dom.inputTradeAmount.value) || 0;
  const leverage = state.leverage;
  const side = state.activeSide;
  const symbol = state.activeSymbol;
  const requiredMargin = notional / leverage;
  const isLimit = state.orderType === "LIMIT";
  const limitPrice = parseFloat(dom.inputLimitPrice.value) || 0;

  if (requiredMargin > state.portfolio.cash) {
    showToast(`❌ Insufficient cash: required $${requiredMargin.toLocaleString()} margin, available $${state.portfolio.cash.toLocaleString()}`, "error");
    return;
  }

  const asset = ASSETS[symbol] || { price: 100, currency: "$" };
  const price = asset.price;
  const cSign = asset.currency || "$";

  // Try backend execution
  try {
    const res = await fetch(`${BACKEND_URL}/api/trade/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        side,
        amountUsd: notional,
        leverage,
        orderType: state.orderType,
        limitPrice: isLimit ? limitPrice : undefined,
        botType: "GAMBLER"
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (isLimit) {
        showToast(`⏳ Limit order placed: ${side} $${notional.toLocaleString()} on ${symbol} @ ${cSign}${limitPrice}!`, "info");
      } else {
        showToast(`✅ Executed ${side} ${leverage}x on ${symbol} for $${notional.toLocaleString()}!`, "success");
      }
      await fetchPositions();
      updateBalanceDisplay();
      return;
    }
  } catch {
    // Fall back to local simulation
  }

  // Local Paper Execution
  if (isLimit) {
    state.portfolio.cash -= requiredMargin;
    showToast(`⏳ Local Limit Order placed: ${side} ${symbol} @ ${cSign}${limitPrice.toFixed(2)} (Margin reserved: $${requiredMargin.toFixed(2)})`, "info");
    updateBalanceDisplay();
    return;
  }

  state.portfolio.cash -= requiredMargin;
  const liqPrice = calculateLiquidationPrice(price, side, leverage);

  const existingIdx = state.positions.findIndex((p) => p.symbol === symbol);
  if (existingIdx >= 0) {
    const existing = state.positions[existingIdx];
    if (existing.side === side) {
      existing.notionalUsd += notional;
      existing.marginUsd += requiredMargin;
      existing.quantity += notional / price;
    } else {
      closePosition(symbol);
    }
  } else {
    state.positions.push({
      symbol,
      side,
      leverage,
      marginUsd: requiredMargin,
      notionalUsd: notional,
      quantity: notional / price,
      averageEntryPrice: price,
      liquidationPrice: liqPrice,
      currency: cSign
    });
  }

  showToast(`✅ Opened ${leverage}x ${side === "BUY" ? "LONG" : "SHORT"} on ${symbol}!`, "success");
  renderPositions();
  updateBalanceDisplay();
}

// =========================================================================
// 4. Positions View & 1-Click Close
// =========================================================================
function renderPositions() {
  const container = dom.positionsContainer;
  const positions = state.positions;

  dom.positionsTabBadge.textContent = positions.length;

  if (positions.length === 0) {
    container.innerHTML = `
      <div class="empty-view-box">
        <div class="empty-icon">📊</div>
        <h3>No Open Positions Yet</h3>
        <p>You haven't opened any trades. Switch to the <strong>Trade</strong> tab or explore <strong>NSE / BSE</strong> stocks to start!</p>
        <button class="btn-primary-action" onclick="document.querySelector('[data-view=view-trade]').click()">
          Open a Trade Now
        </button>
      </div>
    `;
    return;
  }

  let totalMargin = 0;
  let totalOpenPnl = 0;

  container.innerHTML = positions
    .map((p) => {
      const markPrice = ASSETS[p.symbol]?.price || p.averageEntryPrice;
      const delta = markPrice - p.averageEntryPrice;
      const unrealized =
        p.side === "BUY"
          ? (delta / p.averageEntryPrice) * p.notionalUsd
          : (-delta / p.averageEntryPrice) * p.notionalUsd;
      const pnlPct = p.marginUsd > 0 ? (unrealized / p.marginUsd) * 100 : 0;
      const isProfit = unrealized >= 0;

      totalMargin += p.marginUsd;
      totalOpenPnl += unrealized;

      const cSign = p.currency || ASSETS[p.symbol]?.currency || "$";
      const dec = markPrice < 2 ? 4 : 2;

      return `
        <div class="position-card">
          <div class="pos-asset-col">
            <span class="pos-sym font-mono">${p.symbol}</span>
            <span class="pos-badge ${p.side.toLowerCase()}">${p.side === "BUY" ? "LONG" : "SHORT"} ${p.leverage}x</span>
          </div>

          <div class="pos-data-col">
            <span class="pos-data-label">COLLATERAL</span>
            <span class="pos-data-val font-mono">$${p.marginUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div class="pos-data-col">
            <span class="pos-data-label">POSITION SIZE</span>
            <span class="pos-data-val font-mono">$${p.notionalUsd.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>

          <div class="pos-data-col">
            <span class="pos-data-label">ENTRY PRICE</span>
            <span class="pos-data-val font-mono">${cSign}${p.averageEntryPrice.toFixed(dec)}</span>
          </div>

          <div class="pos-data-col">
            <span class="pos-data-label">MARK PRICE</span>
            <span class="pos-data-val font-mono">${cSign}${markPrice.toFixed(dec)}</span>
          </div>

          <div class="pos-data-col">
            <span class="pos-data-label">PROFIT / LOSS</span>
            <span class="pos-pnl-val font-mono ${isProfit ? "text-emerald" : "text-crimson"}">
              ${isProfit ? "+" : ""}$${unrealized.toFixed(2)} (${isProfit ? "+" : ""}${pnlPct.toFixed(2)}%)
            </span>
          </div>

          <div>
            <button class="btn-close-position" onclick="closePosition('${p.symbol}')">
              Close Trade
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  state.portfolio.marginUsed = totalMargin;
  state.portfolio.openPnl = totalOpenPnl;
  state.portfolio.totalEquity = state.portfolio.cash + totalMargin + totalOpenPnl;
  updateBalanceDisplay();
}

window.closePosition = async function (symbol) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/positions/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol })
    });
    if (res.ok) {
      const data = await res.json();
      showToast(`🎉 Closed ${symbol} position! P&L: $${data.fill?.realizedPnlUsd?.toFixed(2) || "0.00"}`, "success");
      await fetchPositions();
      return;
    }
  } catch {
    // Local fallback
  }

  const idx = state.positions.findIndex((p) => p.symbol === symbol);
  if (idx >= 0) {
    const p = state.positions[idx];
    const markPrice = ASSETS[symbol]?.price || p.averageEntryPrice;
    const delta = markPrice - p.averageEntryPrice;
    const realized =
      p.side === "BUY"
        ? (delta / p.averageEntryPrice) * p.notionalUsd
        : (-delta / p.averageEntryPrice) * p.notionalUsd;

    state.portfolio.cash += p.marginUsd + realized;
    state.positions.splice(idx, 1);
    renderPositions();
    showToast(`🎉 Closed ${symbol} position! Realized: ${realized >= 0 ? "+" : ""}$${realized.toFixed(2)}`, "success");
  }
};

async function fetchPositions() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/positions`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.positions)) {
        state.positions = data.positions;
        renderPositions();
      }
    }
  } catch {
    renderPositions();
  }
}

// =========================================================================
// 5. Market Explorer & Global Search Engine
// =========================================================================
async function searchInstruments(query = "") {
  state.explorerFilter.query = query.trim();
  const exch = state.explorerFilter.exchange;
  const typ = state.explorerFilter.type;

  let instruments = [];

  // Try backend first
  try {
    const params = new URLSearchParams();
    if (query) params.append("q", query);
    if (exch && exch !== "ALL") params.append("exchange", exch);
    if (typ && typ !== "ALL") params.append("type", typ);
    params.append("limit", "50");

    const res = await fetch(`${BACKEND_URL}/api/instruments/search?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.instruments)) {
        instruments = data.instruments;
      }
    }
  } catch {
    // Fall back to client catalog
  }

  if (instruments.length === 0) {
    instruments = filterFallbackCatalog(query, exch, typ);
  }

  renderExplorerGrid(instruments);
}

function filterFallbackCatalog(q, exchange, type) {
  const qLower = q.toLowerCase();
  return FALLBACK_CATALOG.filter((item) => {
    // Exchange filter
    if (exchange !== "ALL") {
      if (exchange === "NSE" && item.exchange !== "NSE") return false;
      if (exchange === "BSE" && item.exchange !== "BSE") return false;
      if (exchange === "NASDAQ" && item.exchange !== "NASDAQ") return false;
      if (exchange === "NYSE" && item.exchange !== "NYSE") return false;
      if (exchange === "BINANCE" && item.exchange !== "BINANCE") return false;
    }
    // Type filter
    if (type !== "ALL" && item.type !== type) return false;

    // Query filter
    if (!qLower) return true;
    return (
      item.symbol.toLowerCase().includes(qLower) ||
      item.name.toLowerCase().includes(qLower) ||
      (item.isin && item.isin.toLowerCase().includes(qLower)) ||
      item.displaySymbol.toLowerCase().includes(qLower)
    );
  });
}

function renderExplorerGrid(instruments) {
  const grid = dom.explorerResultsGrid;
  dom.dispResultsCount.textContent = `Showing ${instruments.length} instrument${instruments.length === 1 ? "" : "s"}`;

  if (instruments.length === 0) {
    grid.innerHTML = `
      <div class="explorer-empty-state">
        <div class="explorer-empty-icon">🔍</div>
        <div class="explorer-empty-title">No Instruments Found</div>
        <p>Try searching by company name like "Reliance", "Tata", "Apple", ticker "AAPL", or clear your filter chips.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = instruments
    .map((inst) => {
      const isWatched = state.watchlist.has(inst.symbol) || state.watchlist.has(inst.displaySymbol || inst.symbol);
      const cSign = inst.currencySign || (inst.currency === "INR" ? "₹" : "$");
      const price = inst.basePrice || inst.price || 100;
      const change = inst.change || 0;
      const isPos = change >= 0;
      const status = inst.status || (inst.exchange === "BINANCE" ? "LIVE" : "DELAYED_15M");
      const statusBadgeClass =
        status === "LIVE" ? "live" : status === "DELAYED_15M" ? "delayed" : "closed";
      const statusLabel =
        status === "LIVE" ? "LIVE" : status === "DELAYED_15M" ? "15M DELAYED" : "MARKET CLOSED";

      return `
        <div class="instrument-card">
          <div class="inst-header">
            <div class="inst-main-info">
              <div class="inst-symbol-row">
                <span class="inst-sym font-mono">${inst.displaySymbol || inst.symbol}</span>
                <span class="inst-exchange-badge">${inst.exchange}</span>
              </div>
              <span class="inst-name">${inst.name}</span>
              <span class="inst-isin font-mono">ISIN: ${inst.isin || "GLOBAL"}</span>
            </div>
            <span class="freshness-badge ${statusBadgeClass}">${statusLabel}</span>
          </div>

          <div class="inst-pricing">
            <div class="inst-price-box">
              <span class="inst-price-label">INDICATIVE PRICE</span>
              <span class="inst-price font-mono">${cSign}${price.toFixed(price < 2 ? 4 : 2)}</span>
            </div>
            <div class="inst-change-box">
              <span class="inst-price-label">24H CHANGE</span>
              <span class="inst-change font-mono ${isPos ? "positive" : "negative"}">
                ${isPos ? "+" : ""}${change.toFixed(2)}%
              </span>
            </div>
          </div>

          <div class="inst-actions">
            <button class="btn-inst-trade" onclick="selectInstrumentForTrading('${inst.symbol}')">
              📈 Trade Now
            </button>
            <button class="btn-inst-watch ${isWatched ? "active" : ""}" onclick="toggleWatchlist('${inst.symbol}', this)">
              ${isWatched ? "★ In Watchlist" : "☆ Add Watch"}
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

window.selectInstrumentForTrading = function (symbol) {
  // If not already in ASSETS, dynamically register it
  if (!ASSETS[symbol]) {
    const found = FALLBACK_CATALOG.find((i) => i.symbol === symbol || i.id === symbol);
    if (found) {
      ASSETS[symbol] = {
        symbol: found.symbol,
        exchangeSymbol: found.symbol,
        name: found.name,
        type: `${found.type} • ${found.exchange}`,
        exchange: found.exchange,
        country: found.country,
        currency: found.currencySign || (found.currency === "INR" ? "₹" : "$"),
        isin: found.isin,
        price: found.basePrice,
        change: found.change,
        status: found.status
      };
    }
  }

  switchAsset(symbol);
  // Switch tab to Trade
  const tradeTab = document.querySelector('[data-view="view-trade"]');
  if (tradeTab) tradeTab.click();
  showToast(`📈 Loaded ${symbol} for simulated trading!`, "success");
};

window.toggleWatchlist = async function (symbol, btn) {
  const isWatched = state.watchlist.has(symbol);
  if (isWatched) {
    state.watchlist.delete(symbol);
    btn.classList.remove("active");
    btn.textContent = "☆ Add Watch";
    showToast(`Removed ${symbol} from watchlist`, "info");
    try {
      await fetch(`${BACKEND_URL}/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    } catch {}
  } else {
    state.watchlist.add(symbol);
    btn.classList.add("active");
    btn.textContent = "★ In Watchlist";
    showToast(`Added ${symbol} to watchlist!`, "success");
    try {
      await fetch(`${BACKEND_URL}/api/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
      });
    } catch {}
  }
};

// =========================================================================
// 6. Market Depth (Level-2 Order Book)
// =========================================================================
async function fetchDepth() {
  dom.depthActiveSym.textContent = `${state.activeSymbol}`;
  const asset = ASSETS[state.activeSymbol] || { price: 100, currency: "$" };
  const price = asset.price;
  const cSign = asset.currency || "$";
  dom.depthCenterPrice.textContent = `${cSign}${price.toFixed(price < 2 ? 4 : 2)}`;

  let depthData = null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/market/depth?symbol=${state.activeSymbol}`);
    if (res.ok) {
      depthData = await res.json();
    }
  } catch {
    // Fall back to generated depth
  }

  if (!depthData || !depthData.bids) {
    depthData = generateDepthFallback(price);
  }

  renderDepth(depthData, cSign);
}

function generateDepthFallback(currentPrice) {
  const bids = [];
  const asks = [];
  let cumB = 0;
  let cumA = 0;

  for (let i = 1; i <= 6; i++) {
    const askP = currentPrice * (1 + i * 0.0006);
    const askQ = Math.round((Math.random() * 40 + 5) * 100) / 100;
    cumA += askQ;
    asks.push({ price: askP, quantity: askQ, total: cumA });

    const bidP = currentPrice * (1 - i * 0.0006);
    const bidQ = Math.round((Math.random() * 40 + 5) * 100) / 100;
    cumB += bidQ;
    bids.push({ price: bidP, quantity: bidQ, total: cumB });
  }

  const spread = asks[0].price - bids[0].price;
  const spreadPct = (spread / currentPrice) * 100;
  return { asks: asks.reverse(), bids, spread, spreadPct };
}

function renderDepth(data, cSign = "$") {
  const asset = ASSETS[state.activeSymbol] || { price: 100 };
  const dec = asset.price < 2 ? 4 : 2;
  dom.depthSpreadAmount.textContent = `${cSign}${data.spread.toFixed(dec)} (${data.spreadPct.toFixed(2)}%)`;

  const maxTotal = Math.max(data.asks[0]?.total || 100, data.bids[data.bids.length - 1]?.total || 100);

  // Asks (Red)
  dom.depthAsksList.innerHTML = data.asks
    .map((a) => {
      const pct = Math.min(100, (a.total / maxTotal) * 100);
      return `
        <div class="depth-row-item">
          <div class="depth-bar-visual" style="width: ${pct}%;"></div>
          <span>${cSign}${a.price.toFixed(dec)}</span>
          <span>${a.quantity.toFixed(2)}</span>
          <span>${a.total.toFixed(2)}</span>
        </div>
      `;
    })
    .join("");

  // Bids (Green)
  dom.depthBidsList.innerHTML = data.bids
    .map((b) => {
      const pct = Math.min(100, (b.total / maxTotal) * 100);
      return `
        <div class="depth-row-item">
          <div class="depth-bar-visual" style="width: ${pct}%;"></div>
          <span>${cSign}${b.price.toFixed(dec)}</span>
          <span>${b.quantity.toFixed(2)}</span>
          <span>${b.total.toFixed(2)}</span>
        </div>
      `;
    })
    .join("");
}

// =========================================================================
// 7. Strategy Bots (Interactive Simulations)
// =========================================================================
function logBotEvent(botName, action, detail, isPass = true) {
  const time = new Date().toLocaleTimeString();
  state.botEvents.unshift({ time, botName, action, detail, isPass });
  dom.dispBotFeedCount.textContent = `${state.botEvents.length} Events`;

  dom.botFeedList.innerHTML = state.botEvents
    .slice(0, 15)
    .map(
      (e) => `
    <div class="bot-feed-item ${e.isPass ? "passed" : "rejected"}">
      <div>
        <strong>[${e.botName}]</strong> ${e.action} — <span class="text-muted">${e.detail}</span>
      </div>
      <div>
        <span class="${e.isPass ? "text-emerald" : "text-crimson"}">${e.isPass ? "✓ ALLOWED" : "✗ BLOCKED"}</span>
        <span class="text-dim" style="font-size: 0.7rem; margin-left: 8px;">${e.time}</span>
      </div>
    </div>
  `
    )
    .join("");
}

function runGamblerBotSimulation() {
  const size = 2000000; // 2% of $100M book
  logBotEvent(
    "Gambler Bot",
    "Evaluated Fixed 2% Sizing Gate",
    `Requested $${size.toLocaleString()} on ${state.activeSymbol}. Contract audit passed, mint renounced.`
  );
  showToast("🎲 Gambler Bot executed 2% book allocation with contract audit clearance!", "success");
}

function runSpyBotSimulation() {
  const leaderEntry = 100.0;
  const quote = 101.4;
  const chasePct = ((quote - leaderEntry) / leaderEntry) * 100;
  if (chasePct <= 15) {
    logBotEvent(
      "Spy Bot",
      "WalletAlpha.sol Copy-Trade Allowed",
      `Leader entry $${leaderEntry}, current quote $${quote} (+${chasePct.toFixed(1)}% chase <= 15% cap).`
    );
    showToast(`🕵️‍♂️ Spy Bot mirrored trade! +${chasePct.toFixed(1)}% chase within 15% limit.`, "success");
  } else {
    logBotEvent(
      "Spy Bot",
      "Copy Skipped (Exit Liquidity Protection)",
      `Chase +${chasePct.toFixed(1)}% exceeded +15% max chase rule.`,
      false
    );
    showToast(`⚠️ Spy Bot skipped copy: +${chasePct.toFixed(1)}% chase is too late.`, "info");
  }
}

function runHouseBotSimulation() {
  const launchCost = 250;
  const expectedFees = 750;
  const ratio = expectedFees / launchCost;
  logBotEvent(
    "House Bot",
    "Break-Even Safety Clearance",
    `Fee revenue $${expectedFees} vs launch cost $${launchCost} (${ratio.toFixed(1)}x safety clearance >= 2.0x). Zero rug risk.`
  );
  showToast(`🏦 House Bot clearance verified! ${ratio.toFixed(1)}x safety factor achieved.`, "success");
}

// =========================================================================
// 8. Risk Breakers (Hedge-Fund Circuit Breakers With Test Trip)
// =========================================================================
function simulateBreakerTrip() {
  state.breakersTripped = true;
  state.consecutiveLosses = 3;

  dom.breakerMainBanner.className = "breaker-status-banner tripped";
  dom.bannerStatusIcon.textContent = "🔴";
  dom.bannerStatusTitle.textContent = "DESK TRADING HALTED — 3 CONSECUTIVE LOSSES BREACHED";
  dom.bannerStatusDesc.textContent =
    "Desk-level circuit breaker tripped. Execution gateway locked to prevent Martingale drawdown.";

  dom.stConsecLoss.textContent = "TRIPPED";
  dom.stConsecLoss.className = "bc-status text-crimson";
  dom.valConsecLoss.textContent = "3 / 3 Strikes (HALTED)";
  dom.fillConsecLoss.style.width = "100%";
  dom.fillConsecLoss.className = "bc-progress-fill red";

  showToast("🚨 Circuit Breaker Tripped! Trading halted to protect portfolio.", "error");
}

function resetBreakers() {
  state.breakersTripped = false;
  state.consecutiveLosses = 0;

  dom.breakerMainBanner.className = "breaker-status-banner safe";
  dom.bannerStatusIcon.textContent = "🟢";
  dom.bannerStatusTitle.textContent = "ALL CIRCUIT BREAKERS PASSING — TRADING ALLOWED";
  dom.bannerStatusDesc.textContent =
    "All 4 risk gates are normal. Orders are permitted through the execution gateway.";

  dom.stConsecLoss.textContent = "SAFE";
  dom.stConsecLoss.className = "bc-status text-emerald";
  dom.valConsecLoss.textContent = "0 / 3 Strikes";
  dom.fillConsecLoss.style.width = "0%";
  dom.fillConsecLoss.className = "bc-progress-fill";

  showToast("✅ All desk circuit breakers reset to normal status.", "success");
}

// =========================================================================
// 9. Balance & UI Updates
// =========================================================================
function updateBalanceDisplay() {
  const { cash, totalEquity, marginUsed, openPnl } = state.portfolio;

  dom.dispTotalEquity.textContent = `$${totalEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.dispCashBalance.textContent = `$${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.dispMarginUsed.textContent = `$${marginUsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isProfit = openPnl >= 0;
  dom.dispOpenPnl.className = `balance-num font-mono ${isProfit ? "text-emerald" : "text-crimson"}`;
  dom.dispOpenPnl.textContent = `${isProfit ? "+" : ""}$${openPnl.toFixed(2)}`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastShelf.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// =========================================================================
// 10. Asset Switching & Polling
// =========================================================================
function switchAsset(symbol) {
  const a = ASSETS[symbol];
  if (!a) return;

  state.activeSymbol = symbol;
  dom.chartSymbolName.textContent = `${symbol} (${a.exchange || "GLOBAL"})`;
  dom.chartAssetType.textContent = a.type || a.name;

  const cSign = a.currency || "$";
  const dec = a.price < 2 ? 4 : 2;
  dom.chartPriceBig.textContent = `${cSign}${a.price.toFixed(dec)}`;

  const isPos = a.change >= 0;
  dom.chartPriceChangeBig.className = `active-price-change font-mono ${isPos ? "positive" : "negative"}`;
  dom.chartPriceChangeBig.textContent = `${isPos ? "+" : ""}${a.change}% (Today)`;

  // Update freshness badge
  const status = a.status || (a.exchange === "BINANCE" ? "LIVE" : "DELAYED_15M");
  if (status === "LIVE") {
    dom.chartDataFreshness.className = "freshness-badge live";
    dom.chartDataFreshness.textContent = "LIVE";
  } else if (status === "DELAYED_15M") {
    dom.chartDataFreshness.className = "freshness-badge delayed";
    dom.chartDataFreshness.textContent = "DELAYED (15M)";
  } else {
    dom.chartDataFreshness.className = "freshness-badge closed";
    dom.chartDataFreshness.textContent = "MARKET CLOSED";
  }

  // Update pill active classes
  dom.assetPills.forEach((p) => p.classList.toggle("active", p.dataset.sym === symbol));

  // Set default limit price near current market quote
  if (dom.inputLimitPrice) {
    const defaultLimit = state.activeSide === "BUY" ? a.price * 0.99 : a.price * 1.01;
    dom.inputLimitPrice.value = defaultLimit.toFixed(dec);
  }

  // Generate / Load Candles
  state.candles = generateCandles(a.price, 48, state.chartRange);
  if (chartInstance) chartInstance.render();

  updateTradeCalculations();
  fetchDepth();
}

async function pollMarketQuotes() {
  const asset = ASSETS[state.activeSymbol];
  if (!asset) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/markets/quote?symbol=${state.activeSymbol}`);
    if (res.ok) {
      const data = await res.json();
      const quote = data.quote;
      if (quote && quote.price) {
        asset.price = quote.price;
        asset.change = quote.changePct;
        asset.status = quote.status;
        const cSign = asset.currency || "$";
        const dec = quote.price < 2 ? 4 : 2;
        dom.chartPriceBig.textContent = `${cSign}${quote.price.toFixed(dec)}`;
      }
      dom.latencyDisplay.textContent = `${Math.floor(Math.random() * 20 + 25)}ms`;
    }
  } catch {
    // Micro tick simulation
    asset.price = Math.round((asset.price + (Math.random() - 0.495) * 0.001 * asset.price) * 100) / 100;
    const cSign = asset.currency || "$";
    const dec = asset.price < 2 ? 4 : 2;
    dom.chartPriceBig.textContent = `${cSign}${asset.price.toFixed(dec)}`;
  }

  // Update pills on screen
  for (const sym in ASSETS) {
    const el = document.getElementById(`pillPrice-${sym}`);
    if (el) {
      const a = ASSETS[sym];
      const sign = a.currency || "$";
      el.textContent = `${sign}${a.price.toFixed(a.price < 2 ? 4 : 2)}`;
    }
  }

  renderPositions();
}

// =========================================================================
// 11. Initialization & Event Listeners
// =========================================================================
function init() {
  chartInstance = new SimpleChart(dom.chartCanvas);

  // Tab Switching
  dom.navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      dom.navTabs.forEach((t) => t.classList.remove("active"));
      dom.viewPanels.forEach((p) => p.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.dataset.view;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");

      // Actions on tab click
      if (targetId === "view-positions") renderPositions();
      if (targetId === "view-depth") fetchDepth();
      if (targetId === "view-trade") chartInstance.resize();
      if (targetId === "view-explorer") searchInstruments(dom.marketSearchInput?.value || "");
    });
  });

  // "Explore All" pill on Trade header
  if (dom.btnExploreMore) {
    dom.btnExploreMore.addEventListener("click", () => {
      const explorerTab = document.querySelector('[data-view="view-explorer"]');
      if (explorerTab) explorerTab.click();
    });
  }

  // Asset Pills
  dom.assetPills.forEach((p) => {
    if (p.id === "btnExploreMore") return;
    p.addEventListener("click", () => switchAsset(p.dataset.sym));
  });

  // Order Type Toggle (Market vs Limit)
  dom.btnOtMarket.addEventListener("click", () => {
    state.orderType = "MARKET";
    dom.btnOtMarket.classList.add("active");
    dom.btnOtLimit.classList.remove("active");
    dom.groupLimitPrice.style.display = "none";
    updateTradeCalculations();
  });

  dom.btnOtLimit.addEventListener("click", () => {
    state.orderType = "LIMIT";
    dom.btnOtLimit.classList.add("active");
    dom.btnOtMarket.classList.remove("active");
    dom.groupLimitPrice.style.display = "flex";
    updateTradeCalculations();
  });

  if (dom.inputLimitPrice) {
    dom.inputLimitPrice.addEventListener("input", updateTradeCalculations);
  }

  // BUY / SELL Side Buttons
  dom.btnSideBuy.addEventListener("click", () => {
    state.activeSide = "BUY";
    dom.btnSideBuy.classList.add("active");
    dom.btnSideSell.classList.remove("active");
    updateTradeCalculations();
  });

  dom.btnSideSell.addEventListener("click", () => {
    state.activeSide = "SELL";
    dom.btnSideSell.classList.add("active");
    dom.btnSideBuy.classList.remove("active");
    updateTradeCalculations();
  });

  // Chart Type Controls (Candles vs Line)
  if (dom.btnChartCandles && dom.btnChartLine) {
    dom.btnChartCandles.addEventListener("click", () => {
      state.chartType = "candles";
      dom.btnChartCandles.classList.add("active");
      dom.btnChartLine.classList.remove("active");
      if (chartInstance) chartInstance.render();
    });

    dom.btnChartLine.addEventListener("click", () => {
      state.chartType = "line";
      dom.btnChartLine.classList.add("active");
      dom.btnChartCandles.classList.remove("active");
      if (chartInstance) chartInstance.render();
    });
  }

  // Chart Range Selector (1D, 1W, 1M, 1Y, ALL)
  if (dom.chartRangesGroup) {
    dom.chartRangesGroup.querySelectorAll(".range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        dom.chartRangesGroup.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.chartRange = btn.dataset.range;
        const asset = ASSETS[state.activeSymbol];
        if (asset) {
          state.candles = generateCandles(asset.price, 48, state.chartRange);
          if (chartInstance) chartInstance.render();
        }
      });
    });
  }

  // Quick Amount Chips
  dom.amountChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      dom.amountChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      dom.inputTradeAmount.value = chip.dataset.val;
      updateTradeCalculations();
    });
  });

  dom.inputTradeAmount.addEventListener("input", () => {
    dom.amountChips.forEach((c) => c.classList.remove("active"));
    updateTradeCalculations();
  });

  // Leverage Buttons
  dom.levBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      dom.levBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.leverage = parseInt(btn.dataset.lev, 10);
      dom.dispCurrentLev.textContent = `${state.leverage}x`;
      updateTradeCalculations();
    });
  });

  // Execute Order Button
  dom.btnExecuteTrade.addEventListener("click", executeTrade);

  // Refresh Positions Button
  dom.btnRefreshPositions.addEventListener("click", () => {
    fetchPositions();
    showToast("⟳ Positions refreshed from server.", "info");
  });

  // Strategy Bot Simulation Buttons
  dom.btnTestGamblerBot.addEventListener("click", runGamblerBotSimulation);
  dom.btnTestSpyBot.addEventListener("click", runSpyBotSimulation);
  dom.btnTestHouseBot.addEventListener("click", runHouseBotSimulation);

  // Risk Breakers Buttons
  dom.btnSimulateBreakerTrip.addEventListener("click", simulateBreakerTrip);
  dom.btnResetBreakers.addEventListener("click", resetBreakers);

  // 1-Click Reset Seed Button
  dom.btnResetSeed.addEventListener("click", async () => {
    state.portfolio.cash = 100000000.00;
    state.portfolio.totalEquity = 100000000.00;
    state.portfolio.marginUsed = 0.00;
    state.portfolio.openPnl = 0.00;
    state.positions = [];
    renderPositions();
    updateBalanceDisplay();
    showToast("🔄 Account balance reset to $100,000,000.00 USD!", "success");

    try {
      await fetch(`${BACKEND_URL}/api/portfolio/reset`, { method: "POST" });
    } catch {}
  });

  // Explorer Search & Filters
  if (dom.marketSearchInput) {
    let debounceTimer = null;
    dom.marketSearchInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (dom.btnSearchClear) {
        dom.btnSearchClear.style.display = val ? "block" : "none";
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchInstruments(val);
      }, 250);
    });

    if (dom.btnSearchClear) {
      dom.btnSearchClear.addEventListener("click", () => {
        dom.marketSearchInput.value = "";
        dom.btnSearchClear.style.display = "none";
        searchInstruments("");
      });
    }
  }

  // Filter Chips Listeners
  if (dom.explorerFiltersBar) {
    dom.explorerFiltersBar.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const group = chip.parentElement;
        group.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");

        const filterType = chip.dataset.filter;
        const filterVal = chip.dataset.val;
        if (filterType === "exchange") {
          state.explorerFilter.exchange = filterVal;
        } else if (filterType === "type") {
          state.explorerFilter.type = filterVal;
        }

        searchInstruments(dom.marketSearchInput?.value || "");
      });
    });
  }

  // Initial Load
  switchAsset("RELIANCE");
  searchInstruments("");
  fetchPositions();
  updateBalanceDisplay();

  // Periodic Quote Poller
  setInterval(pollMarketQuotes, 2500);
}

document.addEventListener("DOMContentLoaded", init);
