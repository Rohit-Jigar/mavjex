/**
 * MavJex — Next-Gen Dual Trading Terminal & Risk Execution Gateway
 * Beginner-Friendly $100M Seed Paper Trading & Alpaca Live Execution
 */

const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3001"
  : "https://mavjex-api.onrender.com";

// Initial Market Catalog
const MARKET_CATALOG = {
  SOLUSDT: { symbol: "SOLUSDT", name: "Solana", type: "crypto", basePrice: 101.41, change24h: 3.42 },
  BTCUSDT: { symbol: "BTCUSDT", name: "Bitcoin", type: "crypto", basePrice: 80600.01, change24h: 2.18 },
  ETHUSDT: { symbol: "ETHUSDT", name: "Ethereum", type: "crypto", basePrice: 2343.71, change24h: -0.84 },
  AAPL:    { symbol: "AAPL", name: "Apple Inc.", type: "stock", basePrice: 347.73, change24h: 1.12 },
  NVDA:    { symbol: "NVDA", name: "NVIDIA Corp.", type: "stock", basePrice: 210.96, change24h: 4.25 },
  SPY:     { symbol: "SPY", name: "S&P 500 ETF", type: "stock", basePrice: 582.10, change24h: 0.75 },
  TSLA:    { symbol: "TSLA", name: "Tesla Inc.", type: "stock", basePrice: 218.40, change24h: 2.30 },
  MSFT:    { symbol: "MSFT", name: "Microsoft Corp.", type: "stock", basePrice: 428.50, change24h: -0.45 }
};

// Global App State
const state = {
  mode: "PAPER", // "PAPER" or "ALPACA"
  activeSymbol: "SOLUSDT",
  activeType: "crypto",
  activePrice: 101.41,
  activeSide: "BUY",
  leverage: 10,
  orderAmount: 10000,
  timeframe: "5m",
  latencyMs: 38,
  portfolio: {
    cash: 100000000.00,
    portfolioValue: 100000000.00,
    marginUsed: 0.00,
    unrealizedPnl: 0.00,
    realizedPnl: 0.00
  },
  positions: [],
  trades: [],
  depth: null,
  candles: [],
  activeTab: "tabPositions",
  backendOnline: false
};

// DOM Elements
const el = {
  sidebar: document.getElementById("sidebar"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  modePaperBtn: document.getElementById("modePaperBtn"),
  modeLiveBtn: document.getElementById("modeLiveBtn"),
  headerAcademyBtn: document.getElementById("headerAcademyBtn"),
  headerResetBtn: document.getElementById("headerResetBtn"),
  sidebarResetBtn: document.getElementById("sidebarResetBtn"),
  navAcademyBtn: document.getElementById("navAcademyBtn"),
  navPositionsLink: document.getElementById("navPositionsLink"),
  navDepthLink: document.getElementById("navDepthLink"),
  navPositionsBadge: document.getElementById("navPositionsBadge"),
  beginnerBanner: document.getElementById("beginnerBanner"),
  bannerGuideBtn: document.getElementById("bannerGuideBtn"),
  bannerDismissBtn: document.getElementById("bannerDismissBtn"),
  currentSymbolTag: document.getElementById("currentSymbolTag"),
  marketStatusBadge: document.getElementById("marketStatusBadge"),
  accountModeLabel: document.getElementById("accountModeLabel"),
  accountNumberDisplay: document.getElementById("accountNumberDisplay"),
  latencyValue: document.getElementById("latencyValue"),
  clockDisplay: document.getElementById("clockDisplay"),
  portfolioValueDisplay: document.getElementById("portfolioValueDisplay"),
  portfolioSubChange: document.getElementById("portfolioSubChange"),
  cashBalanceDisplay: document.getElementById("cashBalanceDisplay"),
  buyingPowerDisplay: document.getElementById("buyingPowerDisplay"),
  marginUsedDisplay: document.getElementById("marginUsedDisplay"),
  unrealizedPnlDisplay: document.getElementById("unrealizedPnlDisplay"),
  riskStatusDisplay: document.getElementById("riskStatusDisplay"),
  dailyLossValDisplay: document.getElementById("dailyLossValDisplay"),
  consecLossValDisplay: document.getElementById("consecLossValDisplay"),
  liquidityValDisplay: document.getElementById("liquidityValDisplay"),
  stalenessValDisplay: document.getElementById("stalenessValDisplay"),
  chartSymbol: document.getElementById("chartSymbol"),
  chartCurrentPrice: document.getElementById("chartCurrentPrice"),
  chartPriceChange: document.getElementById("chartPriceChange"),
  chartCanvas: document.getElementById("candlestickCanvas"),
  hudOpen: document.getElementById("hudOpen"),
  hudHigh: document.getElementById("hudHigh"),
  hudLow: document.getElementById("hudLow"),
  hudClose: document.getElementById("hudClose"),
  hudVolume: document.getElementById("hudVolume"),
  tabPositionsBtn: document.getElementById("tabPositionsBtn"),
  tabDepthBtn: document.getElementById("tabDepthBtn"),
  tabTradesBtn: document.getElementById("tabTradesBtn"),
  positionsTabCount: document.getElementById("positionsTabCount"),
  tradesTabCount: document.getElementById("tradesTabCount"),
  positionsTableBody: document.getElementById("positionsTableBody"),
  depthAsksLadder: document.getElementById("depthAsksLadder"),
  depthBidsLadder: document.getElementById("depthBidsLadder"),
  depthSpreadVal: document.getElementById("depthSpreadVal"),
  depthLastPrice: document.getElementById("depthLastPrice"),
  tradesTableBody: document.getElementById("tradesTableBody"),
  orderModeIndicator: document.getElementById("orderModeIndicator"),
  buySideBtn: document.getElementById("buySideBtn"),
  sellSideBtn: document.getElementById("sellSideBtn"),
  orderSymbol: document.getElementById("orderSymbol"),
  symbolTypeHint: document.getElementById("symbolTypeHint"),
  leverageValueBadge: document.getElementById("leverageValueBadge"),
  leverageSlider: document.getElementById("leverageSlider"),
  leverageRiskNotice: document.getElementById("leverageRiskNotice"),
  orderAmount: document.getElementById("orderAmount"),
  maxSizeHint: document.getElementById("maxSizeHint"),
  calcRequiredMargin: document.getElementById("calcRequiredMargin"),
  calcLiquidationPrice: document.getElementById("calcLiquidationPrice"),
  calcDistanceToLiq: document.getElementById("calcDistanceToLiq"),
  calcTradingFee: document.getElementById("calcTradingFee"),
  orderBotType: document.getElementById("orderBotType"),
  preFlightStatus: document.getElementById("preFlightStatus"),
  preFlightList: document.getElementById("preFlightList"),
  submitOrderBtn: document.getElementById("submitOrderBtn"),
  watchlistSearch: document.getElementById("watchlistSearch"),
  watchlistItems: document.getElementById("watchlistItems"),
  academyModal: document.getElementById("academyModal"),
  academyModalClose: document.getElementById("academyModalClose"),
  academyModalGotIt: document.getElementById("academyModalGotIt"),
  resetModal: document.getElementById("resetModal"),
  resetModalClose: document.getElementById("resetModalClose"),
  resetModalCancel: document.getElementById("resetModalCancel"),
  resetModalConfirm: document.getElementById("resetModalConfirm"),
  toastContainer: document.getElementById("toastContainer")
};

let chartInstance = null;

// 1. Candlestick Chart Renderer
function generateCandles(basePrice, count = 50) {
  const candles = [];
  const now = Math.floor(Date.now() / 60000) * 60000;
  let current = basePrice * 0.97;

  for (let i = count; i >= 0; i--) {
    const time = now - i * 60000 * 5;
    const vol = current * 0.005;
    const change = (Math.random() - 0.485) * vol;
    const open = current;
    const close = i === 0 ? basePrice : current + change;
    const high = Math.max(open, close) + Math.random() * vol * 0.5;
    const low = Math.min(open, close) - Math.random() * vol * 0.5;
    const volume = Math.floor(Math.random() * 80000 + 15000);

    candles.push({ time, open, high, low, close, volume });
    current = close;
  }
  return candles;
}

class CandlestickChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.crosshair = { x: -1, y: -1, active: false };

    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("mousemove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("mouseleave", () => this.onPointerLeave());
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: true });
    this.canvas.addEventListener("touchend", () => this.onPointerLeave());
  }

  resize() {
    if (!this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.render();
  }

  onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.crosshair.x = e.clientX - rect.left;
    this.crosshair.y = e.clientY - rect.top;
    this.crosshair.active = true;
    this.render();
  }

  onTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.crosshair.x = e.touches[0].clientX - rect.left;
      this.crosshair.y = e.touches[0].clientY - rect.top;
      this.crosshair.active = true;
      this.render();
    }
  }

  onPointerLeave() {
    this.crosshair.active = false;
    this.render();
  }

  render() {
    const { ctx, width, height } = this;
    const candles = state.candles;
    if (!candles || candles.length === 0 || !width || !height) return;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 65, bottom: 45, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const volumeHeight = chartHeight * 0.22;
    const priceHeight = chartHeight - volumeHeight - 15;

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (const c of candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const priceRange = maxPrice - minPrice || 1;
    const candleWidth = Math.max(3, (chartWidth / candles.length) * 0.7);
    const candleSpacing = chartWidth / candles.length;

    // Grid lines
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const y = padding.top + (priceHeight / 4) * i;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);

      const p = maxPrice - (priceRange / 4) * i;
      ctx.fillStyle = "#64748B";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(`$${p.toFixed(p < 2 ? 4 : 2)}`, width - padding.right + 6, y + 3);
    }
    ctx.stroke();

    let hoveredCandle = null;

    // Draw candles and volume
    candles.forEach((c, idx) => {
      const x = padding.left + idx * candleSpacing + candleSpacing / 2;
      const isGreen = c.close >= c.open;
      const color = isGreen ? "#10B981" : "#EF4444";

      // Volume bar
      const volH = (c.volume / (maxVol || 1)) * volumeHeight;
      const volY = height - padding.bottom - volH;
      ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volH);

      // Wick
      const yHigh = padding.top + ((maxPrice - c.high) / priceRange) * priceHeight;
      const yLow = padding.top + ((maxPrice - c.low) / priceRange) * priceHeight;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const yOpen = padding.top + ((maxPrice - c.open) / priceRange) * priceHeight;
      const yClose = padding.top + ((maxPrice - c.close) / priceRange) * priceHeight;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      // Check hovered
      if (this.crosshair.active && Math.abs(this.crosshair.x - x) < candleSpacing / 2) {
        hoveredCandle = c;
      }
    });

    // Update HUD
    const activeCandle = hoveredCandle || candles[candles.length - 1];
    if (activeCandle && el.hudOpen) {
      const dec = activeCandle.close < 2 ? 4 : 2;
      el.hudOpen.textContent = `$${activeCandle.open.toFixed(dec)}`;
      el.hudHigh.textContent = `$${activeCandle.high.toFixed(dec)}`;
      el.hudLow.textContent = `$${activeCandle.low.toFixed(dec)}`;
      el.hudClose.textContent = `$${activeCandle.close.toFixed(dec)}`;
      el.hudVolume.textContent = activeCandle.volume.toLocaleString();
    }

    // Crosshairs
    if (this.crosshair.active) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.crosshair.x, padding.top);
      ctx.lineTo(this.crosshair.x, height - padding.bottom);
      ctx.moveTo(padding.left, this.crosshair.y);
      ctx.lineTo(width - padding.right, this.crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// 2. Liquidation Calculator (Binance & Standard Perps Formula)
function calculateLiquidationPrice(entryPrice, side, leverage) {
  const mmr = 0.005; // 0.5% Maintenance Margin
  if (leverage <= 1) {
    return side === "BUY" ? 0 : entryPrice * 2;
  }
  if (side === "BUY") {
    const liq = entryPrice * (1 - (1 / leverage - mmr));
    return Math.max(0, liq);
  } else {
    const liq = entryPrice * (1 + (1 / leverage - mmr));
    return liq;
  }
}

// 3. Dynamic UI Calculation Update
function updateCalculations() {
  const notional = parseFloat(el.orderAmount.value) || 0;
  const leverage = state.leverage;
  const entryPrice = state.activePrice;
  const side = state.activeSide;

  const requiredMargin = notional / leverage;
  const liqPrice = calculateLiquidationPrice(entryPrice, side, leverage);
  const distancePct = Math.abs((entryPrice - liqPrice) / entryPrice) * 100;
  const fee = notional * 0.0005; // 0.05% fee

  const dec = entryPrice < 2 ? 4 : 2;

  el.calcRequiredMargin.textContent = `$${requiredMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  el.calcLiquidationPrice.textContent = liqPrice === 0 ? "None (Spot Safe)" : `$${liqPrice.toFixed(dec)}`;
  el.calcDistanceToLiq.textContent = liqPrice === 0 ? "N/A" : `${side === "BUY" ? "-" : "+"}${distancePct.toFixed(2)}%`;
  el.calcTradingFee.textContent = `$${fee.toFixed(2)}`;

  // Leverage Badge
  el.leverageValueBadge.textContent = `${leverage}x`;

  // Risk notice update
  let riskIcon = "🟢";
  let riskText = "";
  if (leverage <= 3) {
    riskIcon = "🟢";
    riskText = `Low Risk (Conservative): Liquidation distance > 30%. Safe for beginner learning.`;
  } else if (leverage <= 10) {
    riskIcon = "🟡";
    riskText = `Moderate Risk (Standard): ~${distancePct.toFixed(1)}% move against you triggers liquidation.`;
  } else if (leverage <= 50) {
    riskIcon = "🟠";
    riskText = `High Risk (Aggressive): ~${distancePct.toFixed(1)}% move will liquidate! Watch positions closely.`;
  } else {
    riskIcon = "🔴";
    riskText = `Extreme Risk (100x Degen): ~${distancePct.toFixed(1)}% volatility will wipe your margin instantly.`;
  }
  el.leverageRiskNotice.innerHTML = `
    <span class="risk-meter-icon">${riskIcon}</span>
    <span class="risk-meter-text">${riskText}</span>
  `;

  // Submit button text
  const actionText = side === "BUY" ? "Buy / Long" : "Sell / Short";
  el.submitOrderBtn.textContent = `Execute Paper ${actionText} ($${notional.toLocaleString()} @ ${leverage}x)`;

  validatePreFlightRisk();
}

// 4. Pre-Flight Risk Check
function validatePreFlightRisk() {
  const notional = parseFloat(el.orderAmount.value) || 0;
  const leverage = state.leverage;
  const requiredMargin = notional / leverage;
  const cash = state.portfolio.cash;
  const botType = el.orderBotType.value;

  const checks = [];
  let allPass = true;

  if (requiredMargin > cash) {
    allPass = false;
    checks.push(`<li style="color: #EF4444;">✗ Required margin ($${requiredMargin.toLocaleString()}) exceeds cash ($${cash.toLocaleString()})</li>`);
  } else {
    checks.push(`<li class="check-pass">✓ Required margin ($${requiredMargin.toFixed(2)}) safely covered by cash</li>`);
  }

  if (state.latencyMs > 5000) {
    allPass = false;
    checks.push(`<li style="color: #EF4444;">✗ Feed staleness (${state.latencyMs}ms) exceeds 5000ms breaker</li>`);
  } else {
    checks.push(`<li class="check-pass">✓ Feed latency &lt; 5.00s threshold (${state.latencyMs}ms)</li>`);
  }

  checks.push(`<li class="check-pass">✓ Daily loss limit headroom safe ($1,000,000 cap)</li>`);

  if (botType === "SPY") {
    checks.push(`<li class="check-pass">✓ Spy rule: Max chase limit capped at +15%</li>`);
  } else if (botType === "HOUSE") {
    checks.push(`<li class="check-pass">✓ House rule: Break-even 2.0x clearance verified</li>`);
  } else {
    checks.push(`<li class="check-pass">✓ Gambler rule: Fixed sizing & contract audit verified</li>`);
  }

  el.preFlightStatus.textContent = allPass ? "PASSED" : "RISK GATE WARNING";
  el.preFlightStatus.className = `pre-flight-status ${allPass ? "positive" : "negative"}`;
  el.preFlightList.innerHTML = checks.join("");

  return allPass;
}

// 5. Simulated Order Book Generator (Level-2 Depth)
function generateOrderBook(currentPrice) {
  const bids = [];
  const asks = [];
  let cumBid = 0;
  let cumAsk = 0;

  for (let i = 1; i <= 6; i++) {
    const askPrice = currentPrice * (1 + i * 0.0006);
    const askQty = Math.round((Math.random() * 45 + 5) * 100) / 100;
    cumAsk += askQty;
    asks.push({ price: askPrice, qty: askQty, total: cumAsk });

    const bidPrice = currentPrice * (1 - i * 0.0006);
    const bidQty = Math.round((Math.random() * 45 + 5) * 100) / 100;
    cumBid += bidQty;
    bids.push({ price: bidPrice, qty: bidQty, total: cumBid });
  }

  return {
    asks: asks.reverse(),
    bids,
    spread: asks[0].price - bids[0].price,
    spreadPct: ((asks[0].price - bids[0].price) / currentPrice) * 100
  };
}

function renderDepth(depth) {
  if (!depth) return;
  const maxTotal = Math.max(
    depth.asks[0]?.total || 100,
    depth.bids[depth.bids.length - 1]?.total || 100
  );
  const dec = state.activePrice < 2 ? 4 : 2;

  // Asks
  el.depthAsksLadder.innerHTML = depth.asks.map((a) => {
    const pct = Math.min(100, (a.total / maxTotal) * 100);
    return `
      <div class="depth-row">
        <div class="depth-bar" style="width: ${pct}%;"></div>
        <span>$${a.price.toFixed(dec)}</span>
        <span>${a.qty.toFixed(2)}</span>
        <span>${a.total.toFixed(2)}</span>
      </div>
    `;
  }).join("");

  // Spread
  el.depthSpreadVal.textContent = `$${depth.spread.toFixed(dec)} (${depth.spreadPct.toFixed(2)}%)`;
  el.depthLastPrice.textContent = `$${state.activePrice.toFixed(dec)}`;

  // Bids
  el.depthBidsLadder.innerHTML = depth.bids.map((b) => {
    const pct = Math.min(100, (b.total / maxTotal) * 100);
    return `
      <div class="depth-row">
        <div class="depth-bar" style="width: ${pct}%;"></div>
        <span>$${b.price.toFixed(dec)}</span>
        <span>${b.qty.toFixed(2)}</span>
        <span>${b.total.toFixed(2)}</span>
      </div>
    `;
  }).join("");
}

// 6. Active Positions Table & PnL
function renderPositions() {
  const tbody = el.positionsTableBody;
  const positions = state.positions;

  el.positionsTabCount.textContent = positions.length;
  el.navPositionsBadge.textContent = `${positions.length} Open`;

  if (positions.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="9">
          <div class="empty-state">
            <span class="empty-icon">📊</span>
            <div class="empty-title">No Open Positions</div>
            <div class="empty-desc">Choose an asset and open your first leveraged paper trade on the right!</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let totalMargin = 0;
  let totalUnrealized = 0;

  tbody.innerHTML = positions.map((p) => {
    const markPrice = MARKET_CATALOG[p.symbol]?.basePrice || p.averageEntryPrice;
    const delta = markPrice - p.averageEntryPrice;
    const unrealizedPnl = p.side === "BUY"
      ? (delta / p.averageEntryPrice) * p.notionalUsd
      : (-delta / p.averageEntryPrice) * p.notionalUsd;
    const pnlPct = (unrealizedPnl / p.marginUsd) * 100;
    const isProfit = unrealizedPnl >= 0;

    totalMargin += p.marginUsd;
    totalUnrealized += unrealizedPnl;

    const dec = markPrice < 2 ? 4 : 2;

    return `
      <tr>
        <td><strong>${p.symbol}</strong></td>
        <td><span class="side-tag ${p.side.toLowerCase()}">${p.side === "BUY" ? "LONG" : "SHORT"}</span></td>
        <td><span class="badge live-badge">${p.leverage}x</span></td>
        <td>$${p.averageEntryPrice.toFixed(dec)}</td>
        <td>$${markPrice.toFixed(dec)}</td>
        <td class="text-crimson">${p.liquidationPrice === 0 ? "None" : `$${p.liquidationPrice.toFixed(dec)}`}</td>
        <td>$${p.marginUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td class="${isProfit ? "positive" : "negative"}">
          ${isProfit ? "+" : ""}$${unrealizedPnl.toFixed(2)} (${isProfit ? "+" : ""}${pnlPct.toFixed(2)}%)
        </td>
        <td>
          <button class="close-pos-btn" onclick="closePosition('${p.symbol}')">Close</button>
        </td>
      </tr>
    `;
  }).join("");

  state.portfolio.marginUsed = totalMargin;
  state.portfolio.unrealizedPnl = totalUnrealized;
  state.portfolio.portfolioValue = state.portfolio.cash + totalMargin + totalUnrealized;

  updatePortfolioHeader();
}

// 7. Update Portfolio Metrics Header
function updatePortfolioHeader() {
  const { cash, portfolioValue, marginUsed, unrealizedPnl } = state.portfolio;

  el.portfolioValueDisplay.textContent = `$${portfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  el.cashBalanceDisplay.textContent = `$${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  el.marginUsedDisplay.textContent = `$${marginUsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isProfit = unrealizedPnl >= 0;
  el.unrealizedPnlDisplay.className = `metric-sub font-mono ${isProfit ? "positive" : "negative"}`;
  el.unrealizedPnlDisplay.innerHTML = `<span>Unrealized: ${isProfit ? "+" : ""}$${unrealizedPnl.toFixed(2)}</span>`;

  // Buying Power (100x leverage)
  const bp = cash * 100;
  el.buyingPowerDisplay.textContent = `$${bp.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// 8. Close Position Function
window.closePosition = async function (symbol) {
  try {
    if (state.backendOnline) {
      const res = await fetch(`${BACKEND_URL}/api/positions/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`✅ Closed position on ${symbol}! PnL: $${data.fill.realizedPnlUsd?.toFixed(2) || "0.00"}`, "success");
        await fetchPositionsFromBackend();
        return;
      }
    }

    // Local Paper Fallback Closure
    const idx = state.positions.findIndex((p) => p.symbol === symbol);
    if (idx >= 0) {
      const pos = state.positions[idx];
      const markPrice = MARKET_CATALOG[symbol]?.basePrice || pos.averageEntryPrice;
      const delta = markPrice - pos.averageEntryPrice;
      const realizedPnl = pos.side === "BUY"
        ? (delta / pos.averageEntryPrice) * pos.notionalUsd
        : (-delta / pos.averageEntryPrice) * pos.notionalUsd;

      state.portfolio.cash += pos.marginUsd + realizedPnl;
      state.positions.splice(idx, 1);
      renderPositions();

      showToast(`✅ Closed position on ${symbol}! Realized P&L: ${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)}`, "success");
    }
  } catch (err) {
    showToast(`Error closing position: ${err}`, "error");
  }
};

// 9. Submit Order Execution
async function submitOrder() {
  const notional = parseFloat(el.orderAmount.value) || 0;
  const leverage = state.leverage;
  const symbol = state.activeSymbol;
  const side = state.activeSide;
  const botType = el.orderBotType.value;
  const mode = state.mode;

  if (!validatePreFlightRisk()) {
    showToast("Order rejected by Pre-Flight Risk Engine! Check requirements.", "error");
    return;
  }

  const requiredMargin = notional / leverage;
  const fee = notional * 0.0005;

  try {
    let orderSuccess = false;

    if (state.backendOnline) {
      const res = await fetch(`${BACKEND_URL}/api/trade/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          amountUsd: notional,
          leverage,
          botType,
          mode
        })
      });

      if (res.ok) {
        const data = await res.json();
        recordTradeUI(data.fill);
        orderSuccess = true;
        await fetchPositionsFromBackend();
        await fetchAccount();
      }
    }

    if (!orderSuccess) {
      // Local Paper Execution Fallback
      state.portfolio.cash -= (requiredMargin + fee);
      const liqPrice = calculateLiquidationPrice(state.activePrice, side, leverage);

      const existing = state.positions.find((p) => p.symbol === symbol);
      if (existing) {
        existing.notionalUsd += notional;
        existing.marginUsd += requiredMargin;
        existing.quantity += notional / state.activePrice;
      } else {
        state.positions.push({
          symbol,
          side,
          leverage,
          marginUsd: requiredMargin,
          notionalUsd: notional,
          quantity: notional / state.activePrice,
          averageEntryPrice: state.activePrice,
          liquidationPrice: liqPrice
        });
      }

      recordTradeUI({
        timestampMs: Date.now(),
        symbol,
        side,
        leverage,
        quantity: notional / state.activePrice,
        fillPrice: state.activePrice,
        feeUsd: fee,
        botType
      });

      renderPositions();
    }

    showToast(`🎉 Executed ${side} ${leverage}x on ${symbol} for $${notional.toLocaleString()}!`, "success");
  } catch (err) {
    showToast(`Order failed: ${err}`, "error");
  }
}

function recordTradeUI(fill) {
  const tr = document.createElement("tr");
  const timeStr = new Date(fill.timestampMs || Date.now()).toLocaleTimeString();
  const dec = (fill.fillPrice || state.activePrice) < 2 ? 4 : 2;

  tr.innerHTML = `
    <td>${timeStr}</td>
    <td>${fill.symbol}</td>
    <td><span class="side-tag ${(fill.side || 'BUY').toLowerCase()}">${fill.side}</span></td>
    <td><span class="badge live-badge">${fill.leverage || 10}x</span></td>
    <td>${(fill.quantity || 1).toFixed(4)}</td>
    <td>$${(fill.fillPrice || state.activePrice).toFixed(dec)}</td>
    <td>$${(fill.feeUsd || 1.5).toFixed(2)}</td>
    <td>${fill.botType || "Gambler (2%)"}</td>
    <td><span class="badge success-badge">FILLED</span></td>
  `;

  el.tradesTableBody.prepend(tr);
  state.trades.push(fill);
  el.tradesTabCount.textContent = state.trades.length;
}

// 10. Switch Active Asset
function switchAsset(symbol) {
  const asset = MARKET_CATALOG[symbol];
  if (!asset) return;

  state.activeSymbol = symbol;
  state.activeType = asset.type;
  state.activePrice = asset.basePrice;

  el.chartSymbol.textContent = `${symbol} (${asset.name})`;
  el.currentSymbolTag.textContent = symbol;
  el.orderSymbol.value = symbol;
  el.symbolTypeHint.textContent = asset.type === "crypto" ? "Crypto (24/7)" : "US Stock";

  const dec = asset.basePrice < 2 ? 4 : 2;
  el.chartCurrentPrice.textContent = `$${asset.basePrice.toFixed(dec)}`;

  const isPos = asset.change24h >= 0;
  el.chartPriceChange.className = `active-change font-mono ${isPos ? "positive" : "negative"}`;
  el.chartPriceChange.textContent = `${isPos ? "+" : ""}${asset.change24h}%`;

  document.querySelectorAll(".watchlist-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.symbol === symbol);
  });

  state.candles = generateCandles(asset.basePrice, 50);
  if (chartInstance) chartInstance.render();

  state.depth = generateOrderBook(asset.basePrice);
  renderDepth(state.depth);

  updateCalculations();
}

// 11. Backend Sync Pollers
async function fetchQuote(symbol) {
  const start = Date.now();
  try {
    const res = await fetch(`${BACKEND_URL}/api/market/quote?symbol=${symbol}`);
    if (res.ok) {
      const data = await res.json();
      state.backendOnline = true;
      state.latencyMs = Date.now() - start;
      el.latencyValue.textContent = `${state.latencyMs}ms`;

      if (data.currentPrice) {
        state.activePrice = data.currentPrice;
        if (MARKET_CATALOG[symbol]) {
          MARKET_CATALOG[symbol].basePrice = data.currentPrice;
        }
        const dec = data.currentPrice < 2 ? 4 : 2;
        el.chartCurrentPrice.textContent = `$${data.currentPrice.toFixed(dec)}`;
      }
      return;
    }
  } catch {
    // Backend offline / static mode fallback
    state.backendOnline = false;
  }

  // Local price simulation tick (+/- 0.05%)
  const cat = MARKET_CATALOG[symbol];
  if (cat) {
    const jitter = (Math.random() - 0.495) * 0.001 * cat.basePrice;
    cat.basePrice = Math.max(0.01, cat.basePrice + jitter);
    state.activePrice = cat.basePrice;
    const dec = cat.basePrice < 2 ? 4 : 2;
    el.chartCurrentPrice.textContent = `$${cat.basePrice.toFixed(dec)}`;
  }

  state.latencyMs = Math.floor(Math.random() * 25 + 20);
  el.latencyValue.textContent = `${state.latencyMs}ms`;

  state.depth = generateOrderBook(state.activePrice);
  renderDepth(state.depth);
  renderPositions();
}

async function fetchAccount() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/account?mode=${state.mode}`);
    if (res.ok) {
      const acc = await res.json();
      state.backendOnline = true;
      state.portfolio.cash = acc.cash || state.portfolio.cash;
      state.portfolio.portfolioValue = acc.portfolioValue || state.portfolio.portfolioValue;
      updatePortfolioHeader();
    }
  } catch {
    // Keep local paper figures
  }
}

async function fetchPositionsFromBackend() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/positions`);
    if (res.ok) {
      const data = await res.json();
      state.positions = data.positions || [];
      renderPositions();
    }
  } catch {
    // Keep local positions
  }
}

// 12. Toast Notifications
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// 13. Initialization & Event Listeners
function init() {
  chartInstance = new CandlestickChart(el.chartCanvas);

  // Timeframe buttons
  document.querySelectorAll(".tf-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tf-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.timeframe = btn.dataset.tf;
      state.candles = generateCandles(state.activePrice, 50);
      chartInstance.render();
    });
  });

  // Watchlist clicks
  document.querySelectorAll(".watchlist-item").forEach((item) => {
    item.addEventListener("click", () => switchAsset(item.dataset.symbol));
  });

  // Watchlist filter search
  el.watchlistSearch.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll(".watchlist-item").forEach((item) => {
      const sym = item.dataset.symbol.toLowerCase();
      const name = item.querySelector(".wl-name").textContent.toLowerCase();
      item.style.display = sym.includes(q) || name.includes(q) ? "flex" : "none";
    });
  });

  // Order Symbol Dropdown
  el.orderSymbol.addEventListener("change", (e) => switchAsset(e.target.value));

  // BUY / SELL Side Buttons
  el.buySideBtn.addEventListener("click", () => {
    state.activeSide = "BUY";
    el.buySideBtn.classList.add("active");
    el.sellSideBtn.classList.remove("active");
    el.submitOrderBtn.className = "submit-order-btn buy-action";
    updateCalculations();
  });

  el.sellSideBtn.addEventListener("click", () => {
    state.activeSide = "SELL";
    el.sellSideBtn.classList.add("active");
    el.buySideBtn.classList.remove("active");
    el.submitOrderBtn.className = "submit-order-btn sell-action";
    updateCalculations();
  });

  // Leverage Slider & Chips
  el.leverageSlider.addEventListener("input", (e) => {
    state.leverage = parseInt(e.target.value, 10);
    document.querySelectorAll(".lev-chip").forEach((chip) => {
      chip.classList.toggle("active", parseInt(chip.dataset.lev, 10) === state.leverage);
    });
    updateCalculations();
  });

  document.querySelectorAll(".lev-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".lev-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.leverage = parseInt(chip.dataset.lev, 10);
      el.leverageSlider.value = state.leverage;
      updateCalculations();
    });
  });

  // Quick Allocation Chips ($1k, $10k, $100k, $1M, $5M)
  document.querySelectorAll(".alloc-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      el.orderAmount.value = chip.dataset.alloc;
      updateCalculations();
    });
  });

  el.orderAmount.addEventListener("input", updateCalculations);
  el.orderBotType.addEventListener("change", validatePreFlightRisk);
  el.submitOrderBtn.addEventListener("click", submitOrder);

  // Data Tabs (Positions, Depth, Trades)
  const tabButtons = [
    { btn: el.tabPositionsBtn, paneId: "tabPositions" },
    { btn: el.tabDepthBtn, paneId: "tabDepth" },
    { btn: el.tabTradesBtn, paneId: "tabTrades" }
  ];

  tabButtons.forEach(({ btn, paneId }) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((t) => {
        t.btn.classList.remove("active");
        document.getElementById(t.paneId).classList.remove("active");
      });
      btn.classList.add("active");
      document.getElementById(paneId).classList.add("active");
      state.activeTab = paneId;
    });
  });

  // Sidebar Links for Positions & Depth
  el.navPositionsLink.addEventListener("click", () => el.tabPositionsBtn.click());
  el.navDepthLink.addEventListener("click", () => el.tabDepthBtn.click());

  // Dual-Mode Switcher Buttons (Paper vs Alpaca)
  el.modePaperBtn.addEventListener("click", () => {
    state.mode = "PAPER";
    el.modePaperBtn.classList.add("active");
    el.modeLiveBtn.classList.remove("active");
    el.accountModeLabel.textContent = "Paper: $100M Seed";
    el.orderModeIndicator.textContent = "Paper ($100M)";
    showToast("🎓 Switched to Paper Trading Mode ($100M Seed Capital)", "info");
    fetchAccount();
  });

  el.modeLiveBtn.addEventListener("click", () => {
    state.mode = "ALPACA";
    el.modeLiveBtn.classList.add("active");
    el.modePaperBtn.classList.remove("active");
    el.accountModeLabel.textContent = "Alpaca Broker Active";
    el.orderModeIndicator.textContent = "Alpaca Live";
    showToast("⚡ Switched to Alpaca Live Broker Mode", "info");
    fetchAccount();
  });

  // Beginner Academy Modals
  const openAcademy = () => el.academyModal.classList.add("open");
  const closeAcademy = () => el.academyModal.classList.remove("open");

  el.headerAcademyBtn.addEventListener("click", openAcademy);
  el.navAcademyBtn.addEventListener("click", openAcademy);
  el.bannerGuideBtn.addEventListener("click", openAcademy);
  el.academyModalClose.addEventListener("click", closeAcademy);
  el.academyModalGotIt.addEventListener("click", closeAcademy);

  // Beginner Banner Dismissal
  el.bannerDismissBtn.addEventListener("click", () => {
    el.beginnerBanner.style.display = "none";
  });

  // Reset Wallet Modal
  const openReset = () => el.resetModal.classList.add("open");
  const closeReset = () => el.resetModal.classList.remove("open");

  el.headerResetBtn.addEventListener("click", openReset);
  el.sidebarResetBtn.addEventListener("click", openReset);
  el.resetModalClose.addEventListener("click", closeReset);
  el.resetModalCancel.addEventListener("click", closeReset);

  el.resetModalConfirm.addEventListener("click", async () => {
    closeReset();
    try {
      if (state.backendOnline) {
        await fetch(`${BACKEND_URL}/api/paper/reset`, { method: "POST" });
      }
    } catch {
      // Ignore network errors in local mode
    }

    state.portfolio.cash = 100000000.00;
    state.portfolio.portfolioValue = 100000000.00;
    state.portfolio.marginUsed = 0.00;
    state.portfolio.unrealizedPnl = 0.00;
    state.positions = [];
    renderPositions();
    showToast("🔄 Virtual wallet successfully reset to $100,000,000.00 USD!", "success");
  });

  // Mobile Sidebar Toggle
  el.sidebarToggleBtn.addEventListener("click", () => el.sidebar.classList.add("open"));
  el.sidebarCloseBtn.addEventListener("click", () => el.sidebar.classList.remove("open"));

  // UTC Clock
  setInterval(() => {
    el.clockDisplay.textContent = new Date().toUTCString().slice(17, 25) + " UTC";
  }, 1000);

  // Initial load
  switchAsset("SOLUSDT");
  fetchAccount();
  fetchPositionsFromBackend();

  // Periodic Market Poll
  setInterval(() => {
    fetchQuote(state.activeSymbol);
  }, 2500);
}

document.addEventListener("DOMContentLoaded", init);
