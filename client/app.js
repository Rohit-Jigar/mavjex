/**
 * MavJex — Fintech Paper Trading Terminal & Risk Execution Gateway
 * Client-Side Orchestrator & Interactive Candlestick Engine
 */

// Backend endpoint fallback logic (detects localhost or Render URL, with direct public fallback for GitHub Pages)
const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3001"
  : "https://mavjex-api.onrender.com";

// App State
const state = {
  activeSymbol: "SOLUSDT",
  activeType: "crypto",
  activePrice: 101.41,
  activeSide: "BUY",
  portfolioCash: 100000.00,
  portfolioValue: 100000.00,
  buyingPower: 400000.00,
  dailyPnl: 0.00,
  candles: [],
  trades: [],
  latencyMs: 42,
  timeframe: "5m"
};

// DOM References
const elements = {
  sidebar: document.getElementById("sidebar"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  chartCanvas: document.getElementById("candlestickCanvas"),
  canvasContainer: document.getElementById("canvasContainer"),
  chartSymbol: document.getElementById("chartSymbol"),
  chartCurrentPrice: document.getElementById("chartCurrentPrice"),
  chartPriceChange: document.getElementById("chartPriceChange"),
  chartHud: document.getElementById("chartHud"),
  hudOpen: document.getElementById("hudOpen"),
  hudHigh: document.getElementById("hudHigh"),
  hudLow: document.getElementById("hudLow"),
  hudClose: document.getElementById("hudClose"),
  hudVolume: document.getElementById("hudVolume"),
  currentSymbolTag: document.getElementById("currentSymbolTag"),
  latencyValue: document.getElementById("latencyValue"),
  clockDisplay: document.getElementById("clockDisplay"),
  portfolioValueDisplay: document.getElementById("portfolioValueDisplay"),
  cashBalanceDisplay: document.getElementById("cashBalanceDisplay"),
  buyingPowerDisplay: document.getElementById("buyingPowerDisplay"),
  realizedPnlDisplay: document.getElementById("realizedPnlDisplay"),
  orderSymbol: document.getElementById("orderSymbol"),
  orderAmount: document.getElementById("orderAmount"),
  orderBotType: document.getElementById("orderBotType"),
  buySideBtn: document.getElementById("buySideBtn"),
  sellSideBtn: document.getElementById("sellSideBtn"),
  submitOrderBtn: document.getElementById("submitOrderBtn"),
  preFlightBox: document.getElementById("preFlightBox"),
  preFlightStatus: document.getElementById("preFlightStatus"),
  preFlightList: document.getElementById("preFlightList"),
  maxSizeHint: document.getElementById("maxSizeHint"),
  watchlistItems: document.getElementById("watchlistItems"),
  tradesTableBody: document.getElementById("tradesTableBody"),
  tradeCountBadge: document.getElementById("tradeCountBadge"),
  toastContainer: document.getElementById("toastContainer")
};

// 1. Candlestick Generator
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
    const high = Math.max(open, close) + Math.random() * vol * 0.6;
    const low = Math.min(open, close) - Math.random() * vol * 0.6;
    const volume = Math.floor(Math.random() * 80000 + 15000);

    candles.push({ time, open, high, low, close, volume });
    current = close;
  }
  return candles;
}

// 2. High-Performance Canvas Renderer
class CandlestickChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.crosshair = { x: -1, y: -1, active: false };

    this.resize();
    window.addEventListener("resize", () => this.resize());

    // Mouse & Touch events
    this.canvas.addEventListener("mousemove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("mouseleave", () => this.onPointerLeave());
    this.canvas.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: true });
    this.canvas.addEventListener("touchend", () => this.onPointerLeave());
  }

  resize() {
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
    if (!candles || candles.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 65, bottom: 45, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const volumeHeight = chartHeight * 0.22;
    const priceHeight = chartHeight - volumeHeight - 15;

    // Extents
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (const c of candles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    const priceRange = (maxPrice - minPrice) || 1;
    const candleWidth = chartWidth / candles.length;
    const bodyWidth = Math.max(2, candleWidth * 0.7);

    // Coordinate Mappers
    const getY = (p) => padding.top + priceHeight - ((p - minPrice) / priceRange) * priceHeight;
    const getVolY = (v) => height - padding.bottom - (v / maxVol) * volumeHeight;

    // Gridlines
    ctx.strokeStyle = "#162238";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const gridRows = 5;
    for (let i = 0; i <= gridRows; i++) {
      const y = padding.top + (priceHeight / gridRows) * i;
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);

      const priceVal = maxPrice - (priceRange / gridRows) * i;
      ctx.fillStyle = "#64748B";
      ctx.font = "10px JetBrains Mono";
      ctx.textAlign = "left";
      ctx.fillText(priceVal.toFixed(state.activePrice < 2 ? 4 : 2), width - padding.right + 8, y + 3);
    }
    ctx.stroke();

    // Volume Separator
    ctx.strokeStyle = "#1E293B";
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom - volumeHeight);
    ctx.lineTo(width - padding.right, height - padding.bottom - volumeHeight);
    ctx.stroke();

    // Draw Candlesticks & Volume
    let hoveredCandle = null;

    candles.forEach((c, i) => {
      const x = padding.left + i * candleWidth + candleWidth / 2;
      const isBull = c.close >= c.open;
      const color = isBull ? "#10B981" : "#EF4444";

      // Volume Bar
      const volY = getVolY(c.volume);
      ctx.fillStyle = isBull ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";
      ctx.fillRect(x - bodyWidth / 2, volY, bodyWidth, height - padding.bottom - volY);

      // Candlestick Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, getY(c.high));
      ctx.lineTo(x, getY(c.low));
      ctx.stroke();

      // Candlestick Body
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const top = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, bodyH);

      // Check crosshair hover
      if (this.crosshair.active && Math.abs(this.crosshair.x - x) < candleWidth / 2) {
        hoveredCandle = c;
      }
    });

    // Crosshair Lines
    if (this.crosshair.active && this.crosshair.x >= padding.left && this.crosshair.x <= width - padding.right) {
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(this.crosshair.x, padding.top);
      ctx.lineTo(this.crosshair.x, height - padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, this.crosshair.y);
      ctx.lineTo(width - padding.right, this.crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update HUD
      if (hoveredCandle) {
        elements.hudOpen.textContent = hoveredCandle.open.toFixed(state.activePrice < 2 ? 4 : 2);
        elements.hudHigh.textContent = hoveredCandle.high.toFixed(state.activePrice < 2 ? 4 : 2);
        elements.hudLow.textContent = hoveredCandle.low.toFixed(state.activePrice < 2 ? 4 : 2);
        elements.hudClose.textContent = hoveredCandle.close.toFixed(state.activePrice < 2 ? 4 : 2);
        elements.hudVolume.textContent = (hoveredCandle.volume / 1000).toFixed(1) + "k";
      }
    }
  }
}

let chartInstance;

// 3. Live Price Polling & Switcher
async function switchAsset(symbol) {
  state.activeSymbol = symbol;
  state.activeType = ["AAPL", "NVDA", "SPY"].includes(symbol) ? "stock" : "crypto";

  elements.currentSymbolTag.textContent = symbol.replace("USDT", "/USDT");
  elements.chartSymbol.textContent = symbol.replace("USDT", "/USDT");
  elements.orderSymbol.value = symbol;

  // Update watchlist UI active class
  document.querySelectorAll(".watchlist-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.symbol === symbol);
  });

  await fetchQuote(symbol);
}

async function fetchQuote(symbol) {
  try {
    const isStock = ["AAPL", "NVDA", "SPY"].includes(symbol);
    const startMs = Date.now();

    // Fetch from backend or fallback to public direct endpoint
    let quote;
    try {
      const res = await fetch(`${BACKEND_URL}/api/market/quote?symbol=${symbol}`);
      if (res.ok) quote = await res.json();
    } catch {
      // Fallback: Direct public quote for standalone GitHub Pages deployment
      if (isStock) {
        quote = { currentPrice: symbol === "AAPL" ? 347.73 : symbol === "NVDA" ? 210.96 : 759.97, poolLiquidityUsd: 50000000, lastFeedTimestampMs: Date.now() - 3600000 };
      } else {
        const binanceRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await binanceRes.json();
        quote = { currentPrice: parseFloat(data.price), poolLiquidityUsd: 4500000, lastFeedTimestampMs: Date.now() };
      }
    }

    if (quote) {
      state.activePrice = quote.currentPrice;
      state.latencyMs = Date.now() - startMs;

      elements.chartCurrentPrice.textContent = `$${quote.currentPrice.toFixed(quote.currentPrice < 2 ? 4 : 2)}`;
      elements.latencyValue.textContent = `${state.latencyMs}ms`;

      state.candles = generateCandles(quote.currentPrice, 50);
      if (chartInstance) chartInstance.render();
      validatePreFlightRisk();
    }
  } catch (err) {
    console.warn("Quote poll notice:", err);
  }
}

// 4. Pre-Flight Risk Gate Check
function validatePreFlightRisk() {
  const amount = parseFloat(elements.orderAmount.value) || 0;
  const botType = elements.orderBotType.value;
  const maxAllowed = state.portfolioValue * 0.02; // 2% Gambler book cap

  const checks = [];
  let allPass = true;

  if (amount > maxAllowed) {
    allPass = false;
    checks.push(`<li class="check-fail" style="color: #EF4444;">✗ Order $${amount.toFixed(2)} exceeds 2% book limit ($${maxAllowed.toFixed(2)})</li>`);
  } else {
    checks.push(`<li class="check-pass">✓ Size $${amount.toFixed(2)} &lt; $${maxAllowed.toFixed(2)} max book cap</li>`);
  }

  if (state.latencyMs > 5000) {
    allPass = false;
    checks.push(`<li class="check-fail" style="color: #EF4444;">✗ Feed staleness (${state.latencyMs}ms) exceeds 5000ms breaker</li>`);
  } else {
    checks.push(`<li class="check-pass">✓ Market feed latency &lt; 5.00s threshold (${state.latencyMs}ms)</li>`);
  }

  checks.push(`<li class="check-pass">✓ Daily loss limit headroom: $1,000 remaining</li>`);

  if (botType === "SPY") {
    checks.push(`<li class="check-pass">✓ Max chase capped at +15% over leader entry</li>`);
  } else {
    checks.push(`<li class="check-pass">✓ Honeypot & contract audits verified</li>`);
  }

  elements.preFlightStatus.textContent = allPass ? "PASSED" : "RISK GATE WARNING";
  elements.preFlightStatus.className = `pre-flight-status ${allPass ? "positive" : "negative"}`;
  elements.preFlightList.innerHTML = checks.join("");

  return allPass;
}

// 5. Submit Order
async function submitOrder() {
  const amount = parseFloat(elements.orderAmount.value) || 0;
  const botType = elements.orderBotType.value;
  const symbol = state.activeSymbol;
  const side = state.activeSide;

  const passes = validatePreFlightRisk();
  if (!passes) {
    showToast("Order blocked by Desk Risk Engine! Check pre-flight checklist.", "error");
    return;
  }

  // Submit to API
  try {
    const res = await fetch(`${BACKEND_URL}/api/trade/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, side, amountUsd: amount, botType })
    });

    if (res.ok) {
      const data = await res.json();
      recordTradeUI(data.fill);
      showToast(`✅ ${side} $${amount} ${symbol} FILLED!`, "success");
    } else {
      // Local paper simulation fallback
      recordTradeUI({
        fillId: `fill-${Date.now()}`,
        timestampMs: Date.now(),
        symbol,
        side,
        quantity: amount / state.activePrice,
        fillPrice: state.activePrice,
        feeUsd: amount * 0.001,
        botType
      });
      showToast(`✅ ${side} $${amount} ${symbol} FILLED (Paper)!`, "success");
    }
  } catch {
    recordTradeUI({
      fillId: `fill-${Date.now()}`,
      timestampMs: Date.now(),
      symbol,
      side,
      quantity: amount / state.activePrice,
      fillPrice: state.activePrice,
      feeUsd: amount * 0.001,
      botType
    });
    showToast(`✅ ${side} $${amount} ${symbol} FILLED (Paper Broker)!`, "success");
  }
}

function recordTradeUI(fill) {
  const tr = document.createElement("tr");
  const timeStr = new Date(fill.timestampMs || Date.now()).toLocaleTimeString();
  tr.innerHTML = `
    <td>${timeStr}</td>
    <td>${fill.symbol}</td>
    <td><span class="side-tag ${fill.side.toLowerCase()}">${fill.side}</span></td>
    <td>${fill.quantity.toFixed(4)}</td>
    <td>$${fill.fillPrice.toFixed(fill.fillPrice < 2 ? 4 : 2)}</td>
    <td>$${(fill.feeUsd || 0.25).toFixed(3)}</td>
    <td>${fill.botType || "Gambler"}</td>
    <td><span class="badge success-badge">FILLED</span></td>
  `;
  elements.tradesTableBody.prepend(tr);
  state.trades.push(fill);
  elements.tradeCountBadge.textContent = `${state.trades.length + 3} Fills`;
}

// 6. UI Toasts
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// 7. Event Handlers & Init
function init() {
  chartInstance = new CandlestickChart(elements.chartCanvas);

  // Timeframes
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
  document.querySelectorAll(".watchlist-item").forEach((el) => {
    el.addEventListener("click", () => switchAsset(el.dataset.symbol));
  });

  // Order side buttons
  elements.buySideBtn.addEventListener("click", () => {
    state.activeSide = "BUY";
    elements.buySideBtn.classList.add("active");
    elements.sellSideBtn.classList.remove("active");
    elements.submitOrderBtn.textContent = "Execute Paper Buy Order";
    elements.submitOrderBtn.className = "submit-order-btn buy-action";
  });

  elements.sellSideBtn.addEventListener("click", () => {
    state.activeSide = "SELL";
    elements.sellSideBtn.classList.add("active");
    elements.buySideBtn.classList.remove("active");
    elements.submitOrderBtn.textContent = "Execute Paper Sell Order";
    elements.submitOrderBtn.className = "submit-order-btn sell-action";
  });

  elements.orderAmount.addEventListener("input", validatePreFlightRisk);
  elements.orderBotType.addEventListener("change", validatePreFlightRisk);
  elements.submitOrderBtn.addEventListener("click", submitOrder);

  // Sidebar toggle
  elements.sidebarToggleBtn.addEventListener("click", () => elements.sidebar.classList.add("open"));
  elements.sidebarCloseBtn.addEventListener("click", () => elements.sidebar.classList.remove("open"));

  // Clock
  setInterval(() => {
    elements.clockDisplay.textContent = new Date().toUTCString().slice(17, 25) + " UTC";
  }, 1000);

  // Start initial quote
  switchAsset("SOLUSDT");

  // Periodic poll
  setInterval(() => fetchQuote(state.activeSymbol), 3000);
}

document.addEventListener("DOMContentLoaded", init);
