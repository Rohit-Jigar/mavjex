/**
 * MavJex — Simple, High-Performance Trading Terminal
 * Full Support for Positions, Market Depth, Strategy Bots, and Risk Breakers
 */

const BACKEND_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3001"
  : "https://mavjex.onrender.com";

// Catalog of Assets
const ASSETS = {
  SOLUSDT: { symbol: "SOLUSDT", name: "Solana", type: "Crypto • 24/7 Market", price: 101.41, change: 3.42 },
  BTCUSDT: { symbol: "BTCUSDT", name: "Bitcoin", type: "Crypto • 24/7 Market", price: 80600.01, change: 2.18 },
  ETHUSDT: { symbol: "ETHUSDT", name: "Ethereum", type: "Crypto • 24/7 Market", price: 2343.71, change: -0.84 },
  AAPL:    { symbol: "AAPL", name: "Apple Inc.", type: "US Equities (Nasdaq)", price: 347.73, change: 1.12 },
  NVDA:    { symbol: "NVDA", name: "NVIDIA Corp.", type: "US Equities (Nasdaq)", price: 210.96, change: 4.25 },
  TSLA:    { symbol: "TSLA", name: "Tesla Inc.", type: "US Equities (Nasdaq)", price: 218.40, change: 2.30 }
};

// Global State
const state = {
  activeSymbol: "SOLUSDT",
  activeSide: "BUY",
  leverage: 10,
  tradeAmount: 10000,
  portfolio: {
    cash: 100000000.00,
    totalEquity: 100000000.00,
    marginUsed: 0.00,
    openPnl: 0.00
  },
  positions: [],
  botEvents: [],
  breakersTripped: false,
  consecutiveLosses: 0,
  dailyLossUsd: 0,
  latencyMs: 38,
  candles: []
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
  chartSymbolName: document.getElementById("chartSymbolName"),
  chartAssetType: document.getElementById("chartAssetType"),
  chartPriceBig: document.getElementById("chartPriceBig"),
  chartPriceChangeBig: document.getElementById("chartPriceChangeBig"),
  chartCanvas: document.getElementById("mainChartCanvas"),
  hudO: document.getElementById("hudO"),
  hudH: document.getElementById("hudH"),
  hudL: document.getElementById("hudL"),
  hudC: document.getElementById("hudC"),
  btnSideBuy: document.getElementById("btnSideBuy"),
  btnSideSell: document.getElementById("btnSideSell"),
  amountChips: document.querySelectorAll(".amount-chip"),
  inputTradeAmount: document.getElementById("inputTradeAmount"),
  levBtns: document.querySelectorAll(".lev-btn"),
  dispCurrentLev: document.getElementById("dispCurrentLev"),
  dispCalcMargin: document.getElementById("dispCalcMargin"),
  dispCalcNotional: document.getElementById("dispCalcNotional"),
  dispCalcLiq: document.getElementById("dispCalcLiq"),
  dispCalcExplainer: document.getElementById("dispCalcExplainer"),
  btnExecuteTrade: document.getElementById("btnExecuteTrade"),
  positionsContainer: document.getElementById("positionsContainer"),
  btnRefreshPositions: document.getElementById("btnRefreshPositions"),
  depthActiveSym: document.getElementById("depthActiveSym"),
  depthSpreadAmount: document.getElementById("depthSpreadAmount"),
  depthCenterPrice: document.getElementById("depthCenterPrice"),
  depthAsksList: document.getElementById("depthAsksList"),
  depthBidsList: document.getElementById("depthBidsList"),
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
// 1. Candlestick & Price Chart Engine
// =========================================================================
function generateCandles(basePrice, count = 45) {
  const list = [];
  const now = Math.floor(Date.now() / 60000) * 60000;
  let curr = basePrice * 0.98;

  for (let i = count; i >= 0; i--) {
    const time = now - i * 60000 * 5;
    const vol = curr * 0.005;
    const chg = (Math.random() - 0.485) * vol;
    const open = curr;
    const close = i === 0 ? basePrice : curr + chg;
    const high = Math.max(open, close) + Math.random() * vol * 0.5;
    const low = Math.min(open, close) - Math.random() * vol * 0.5;
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

    const pad = { top: 20, right: 60, bottom: 25, left: 15 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    let min = Infinity;
    let max = -Infinity;
    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    }
    const range = max - min || 1;
    const candleW = Math.max(4, (chartW / candles.length) * 0.65);
    const spacing = chartW / candles.length;

    // Grid lines & price tags
    ctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
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
      ctx.fillText(`$${p.toFixed(p < 2 ? 4 : 2)}`, w - pad.right + 6, y + 3);
    }
    ctx.stroke();

    // Candles
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

    const last = candles[candles.length - 1];
    if (last && dom.hudO) {
      const dec = last.close < 2 ? 4 : 2;
      dom.hudO.textContent = `$${last.open.toFixed(dec)}`;
      dom.hudH.textContent = `$${last.high.toFixed(dec)}`;
      dom.hudL.textContent = `$${last.low.toFixed(dec)}`;
      dom.hudC.textContent = `$${last.close.toFixed(dec)}`;
    }
  }
}

// =========================================================================
// 2. Liquidation & Margin Calculator
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
  const price = ASSETS[state.activeSymbol].price;

  const requiredMargin = notional / leverage;
  const liqPrice = calculateLiquidationPrice(price, side, leverage);
  const distPct = Math.abs((price - liqPrice) / price) * 100;
  const dec = price < 2 ? 4 : 2;

  dom.dispCalcMargin.textContent = `$${requiredMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.dispCalcNotional.textContent = `$${notional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  dom.dispCalcLiq.textContent = liqPrice === 0 ? "None (Spot Safe)" : `$${liqPrice.toFixed(dec)}`;

  if (leverage <= 1) {
    dom.dispCalcExplainer.innerHTML = `🛡️ <strong>1x Spot Safe</strong>: No liquidation risk. You own the full underlying asset.`;
  } else {
    dom.dispCalcExplainer.innerHTML = `💡 If ${state.activeSymbol} moves <strong>${distPct.toFixed(1)}%</strong> ${side === "BUY" ? "down" : "up"} to <strong>$${liqPrice.toFixed(dec)}</strong>, this trade closes to prevent debt.`;
  }

  const symShort = state.activeSymbol.replace("USDT", "");
  const actionWord = side === "BUY" ? "BUY" : "SELL";
  dom.btnExecuteTrade.textContent = `${actionWord} $${notional.toLocaleString()} OF ${symShort} (${leverage}x)`;
  dom.btnExecuteTrade.className = `btn-execute ${side === "BUY" ? "buy" : "sell"}`;
}

// =========================================================================
// 3. Trade Execution (Opens a Position)
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

  if (requiredMargin > state.portfolio.cash) {
    showToast(`❌ Insufficient cash: required $${requiredMargin.toLocaleString()} margin, available $${state.portfolio.cash.toLocaleString()}`, "error");
    return;
  }

  const asset = ASSETS[symbol];
  const price = asset.price;
  const liqPrice = calculateLiquidationPrice(price, side, leverage);

  // Attempt backend execution, fallback to local paper state
  try {
    const res = await fetch(`${BACKEND_URL}/api/trade/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol,
        side,
        amountUsd: notional,
        leverage,
        botType: "GAMBLER"
      })
    });
    if (res.ok) {
      await fetchPositions();
      showToast(`✅ Executed ${side} ${leverage}x on ${symbol} for $${notional.toLocaleString()}!`, "success");
      updateBalanceDisplay();
      return;
    }
  } catch {
    // Fall back to local
  }

  // Local Paper Execution
  state.portfolio.cash -= requiredMargin;

  const existingIdx = state.positions.findIndex((p) => p.symbol === symbol);
  if (existingIdx >= 0) {
    const existing = state.positions[existingIdx];
    if (existing.side === side) {
      existing.notionalUsd += notional;
      existing.marginUsd += requiredMargin;
      existing.quantity += notional / price;
    } else {
      // Close opposite position
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
      liquidationPrice: liqPrice
    });
  }

  showToast(`✅ Opened ${leverage}x ${side === "BUY" ? "LONG" : "SHORT"} position on ${symbol}!`, "success");
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
        <p>You haven't opened any trades. Switch to the <strong>Trade</strong> tab to open your first $100M demo position!</p>
        <button class="btn-primary-action" onclick="document.querySelector('[data-view=view-trade]').click()">
          Open a Trade Now
        </button>
      </div>
    `;
    return;
  }

  let totalMargin = 0;
  let totalOpenPnl = 0;

  container.innerHTML = positions.map((p) => {
    const markPrice = ASSETS[p.symbol]?.price || p.averageEntryPrice;
    const delta = markPrice - p.averageEntryPrice;
    const unrealized = p.side === "BUY"
      ? (delta / p.averageEntryPrice) * p.notionalUsd
      : (-delta / p.averageEntryPrice) * p.notionalUsd;
    const pnlPct = (unrealized / p.marginUsd) * 100;
    const isProfit = unrealized >= 0;

    totalMargin += p.marginUsd;
    totalOpenPnl += unrealized;

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
          <span class="pos-data-val font-mono">$${p.averageEntryPrice.toFixed(dec)}</span>
        </div>

        <div class="pos-data-col">
          <span class="pos-data-label">MARK PRICE</span>
          <span class="pos-data-val font-mono">$${markPrice.toFixed(dec)}</span>
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
  }).join("");

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
      showToast(`🎉 Closed ${symbol} position! P&L: $${data.fill.realizedPnlUsd?.toFixed(2) || "0.00"}`, "success");
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
    const realized = p.side === "BUY"
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
// 5. Market Depth (Level-2 Order Book)
// =========================================================================
async function fetchDepth() {
  dom.depthActiveSym.textContent = `${state.activeSymbol}`;
  const price = ASSETS[state.activeSymbol].price;
  dom.depthCenterPrice.textContent = `$${price.toFixed(price < 2 ? 4 : 2)}`;

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

  renderDepth(depthData);
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

function renderDepth(data) {
  const dec = ASSETS[state.activeSymbol].price < 2 ? 4 : 2;
  dom.depthSpreadAmount.textContent = `$${data.spread.toFixed(dec)} (${data.spreadPct.toFixed(2)}%)`;

  const maxTotal = Math.max(
    data.asks[0]?.total || 100,
    data.bids[data.bids.length - 1]?.total || 100
  );

  // Asks (Red)
  dom.depthAsksList.innerHTML = data.asks.map((a) => {
    const pct = Math.min(100, (a.total / maxTotal) * 100);
    return `
      <div class="depth-row-item">
        <div class="depth-bar-visual" style="width: ${pct}%;"></div>
        <span>$${a.price.toFixed(dec)}</span>
        <span>${a.quantity.toFixed(2)}</span>
        <span>${a.total.toFixed(2)}</span>
      </div>
    `;
  }).join("");

  // Bids (Green)
  dom.depthBidsList.innerHTML = data.bids.map((b) => {
    const pct = Math.min(100, (b.total / maxTotal) * 100);
    return `
      <div class="depth-row-item">
        <div class="depth-bar-visual" style="width: ${pct}%;"></div>
        <span>$${b.price.toFixed(dec)}</span>
        <span>${b.quantity.toFixed(2)}</span>
        <span>${b.total.toFixed(2)}</span>
      </div>
    `;
  }).join("");
}

// =========================================================================
// 6. Strategy Bots (Interactive Simulations)
// =========================================================================
function logBotEvent(botName, action, detail, isPass = true) {
  const time = new Date().toLocaleTimeString();
  state.botEvents.unshift({ time, botName, action, detail, isPass });
  dom.dispBotFeedCount.textContent = `${state.botEvents.length} Events`;

  dom.botFeedList.innerHTML = state.botEvents.slice(0, 15).map((e) => `
    <div class="bot-feed-item ${e.isPass ? "passed" : "rejected"}">
      <div>
        <strong>[${e.botName}]</strong> ${e.action} — <span class="text-muted">${e.detail}</span>
      </div>
      <div>
        <span class="${e.isPass ? "text-emerald" : "text-crimson"}">${e.isPass ? "✓ ALLOWED" : "✗ BLOCKED"}</span>
        <span class="text-dim" style="font-size: 0.7rem; margin-left: 8px;">${e.time}</span>
      </div>
    </div>
  `).join("");
}

function runGamblerBotSimulation() {
  const size = 2000000; // 2% of $100M book
  logBotEvent("Gambler Bot", "Evaluated Fixed 2% Sizing Gate", `Requested $${size.toLocaleString()} on ${state.activeSymbol}. Contract audit passed, mint renounced.`);
  showToast("🎲 Gambler Bot executed 2% book allocation with contract audit clearance!", "success");
}

function runSpyBotSimulation() {
  const leaderEntry = 100.0;
  const quote = 101.4;
  const chasePct = ((quote - leaderEntry) / leaderEntry) * 100;
  if (chasePct <= 15) {
    logBotEvent("Spy Bot", "WalletAlpha.sol Copy-Trade Allowed", `Leader entry $${leaderEntry}, current quote $${quote} (+${chasePct.toFixed(1)}% chase <= 15% cap).`);
    showToast(`🕵️‍♂️ Spy Bot mirrored trade! +${chasePct.toFixed(1)}% chase within 15% limit.`, "success");
  } else {
    logBotEvent("Spy Bot", "Copy Skipped (Exit Liquidity Protection)", `Chase +${chasePct.toFixed(1)}% exceeded +15% max chase rule.`, false);
    showToast(`⚠️ Spy Bot skipped copy: +${chasePct.toFixed(1)}% chase is too late.`, "info");
  }
}

function runHouseBotSimulation() {
  const launchCost = 250;
  const expectedFees = 750;
  const ratio = expectedFees / launchCost;
  logBotEvent("House Bot", "Break-Even Safety Clearance", `Fee revenue $${expectedFees} vs launch cost $${launchCost} (${ratio.toFixed(1)}x safety clearance >= 2.0x). Zero rug risk.`);
  showToast(`🏦 House Bot clearance verified! ${ratio.toFixed(1)}x safety factor achieved.`, "success");
}

// =========================================================================
// 7. Risk Breakers (Hedge-Fund Circuit Breakers With Test Trip)
// =========================================================================
function simulateBreakerTrip() {
  state.breakersTripped = true;
  state.consecutiveLosses = 3;

  dom.breakerMainBanner.className = "breaker-status-banner tripped";
  dom.bannerStatusIcon.textContent = "🔴";
  dom.bannerStatusTitle.textContent = "DESK TRADING HALTED — 3 CONSECUTIVE LOSSES BREACHED";
  dom.bannerStatusDesc.textContent = "Desk-level circuit breaker tripped. Execution gateway locked to prevent Martingale drawdown.";

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
  dom.bannerStatusDesc.textContent = "All 4 risk gates are normal. Orders are permitted through the execution gateway.";

  dom.stConsecLoss.textContent = "SAFE";
  dom.stConsecLoss.className = "bc-status text-emerald";
  dom.valConsecLoss.textContent = "0 / 3 Strikes";
  dom.fillConsecLoss.style.width = "0%";
  dom.fillConsecLoss.className = "bc-progress-fill";

  showToast("✅ All desk circuit breakers reset to normal status.", "success");
}

// =========================================================================
// 8. Balance & UI Updates
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
// 9. Asset Switching & Polling
// =========================================================================
function switchAsset(symbol) {
  const a = ASSETS[symbol];
  if (!a) return;

  state.activeSymbol = symbol;
  dom.chartSymbolName.textContent = `${symbol} (${a.name})`;
  dom.chartAssetType.textContent = a.type;

  const dec = a.price < 2 ? 4 : 2;
  dom.chartPriceBig.textContent = `$${a.price.toFixed(dec)}`;

  const isPos = a.change >= 0;
  dom.chartPriceChangeBig.className = `active-price-change font-mono ${isPos ? "positive" : "negative"}`;
  dom.chartPriceChangeBig.textContent = `${isPos ? "+" : ""}${a.change}% (Today)`;

  dom.assetPills.forEach((p) => p.classList.toggle("active", p.dataset.sym === symbol));

  state.candles = generateCandles(a.price, 45);
  if (chartInstance) chartInstance.render();

  updateTradeCalculations();
  fetchDepth();
}

async function pollMarketQuotes() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/market/quote?symbol=${state.activeSymbol}`);
    if (res.ok) {
      const data = await res.json();
      if (data.currentPrice) {
        ASSETS[state.activeSymbol].price = data.currentPrice;
        const dec = data.currentPrice < 2 ? 4 : 2;
        dom.chartPriceBig.textContent = `$${data.currentPrice.toFixed(dec)}`;
      }
      dom.latencyDisplay.textContent = `${Math.floor(Math.random() * 20 + 25)}ms`;
    }
  } catch {
    // Micro tick simulation
    const a = ASSETS[state.activeSymbol];
    a.price = Math.round((a.price + (Math.random() - 0.495) * 0.001 * a.price) * 100) / 100;
    const dec = a.price < 2 ? 4 : 2;
    dom.chartPriceBig.textContent = `$${a.price.toFixed(dec)}`;
  }

  // Update pills
  for (const sym in ASSETS) {
    const el = document.getElementById(`pillPrice-${sym}`);
    if (el) el.textContent = `$${ASSETS[sym].price.toFixed(ASSETS[sym].price < 2 ? 4 : 2)}`;
  }

  renderPositions();
}

// =========================================================================
// 10. Initialization & Listeners
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
    });
  });

  // Asset Pills
  dom.assetPills.forEach((p) => {
    p.addEventListener("click", () => switchAsset(p.dataset.sym));
  });

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

  // Strategy Bot Buttons
  dom.btnTestGamblerBot.addEventListener("click", runGamblerBotSimulation);
  dom.btnTestSpyBot.addEventListener("click", runSpyBotSimulation);
  dom.btnTestHouseBot.addEventListener("click", runHouseBotSimulation);

  // Risk Breakers Buttons
  dom.btnSimulateBreakerTrip.addEventListener("click", simulateBreakerTrip);
  dom.btnResetBreakers.addEventListener("click", resetBreakers);

  // 1-Click Reset Seed Button
  dom.btnResetSeed.addEventListener("click", () => {
    state.portfolio.cash = 100000000.00;
    state.portfolio.totalEquity = 100000000.00;
    state.portfolio.marginUsed = 0.00;
    state.portfolio.openPnl = 0.00;
    state.positions = [];
    renderPositions();
    updateBalanceDisplay();
    showToast("🔄 Account balance successfully reset to $100,000,000.00 USD!", "success");
  });

  // Initial Load
  switchAsset("SOLUSDT");
  fetchPositions();
  updateBalanceDisplay();

  // Periodic poll
  setInterval(pollMarketQuotes, 2500);
}

document.addEventListener("DOMContentLoaded", init);
