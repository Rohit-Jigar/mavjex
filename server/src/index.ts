import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DeskRiskEngine } from "../../trading-desk-risk/src/desk/DeskRiskEngine.ts";
import { GamblerBot } from "../../trading-desk-risk/src/bots/GamblerBot.ts";
import { SpyBot } from "../../trading-desk-risk/src/bots/SpyBot.ts";
import { HouseBot } from "../../trading-desk-risk/src/bots/HouseBot.ts";
import { MarketDataFeed } from "../../trading-desk-risk/src/execution/MarketDataFeed.ts";
import { PaperBroker, type TradeFill } from "../../trading-desk-risk/src/execution/PaperBroker.ts";
import { AlpacaBroker } from "../../trading-desk-risk/src/execution/AlpacaBroker.ts";
import type { GamblerOrderRequest, SpyOrderRequest, HouseLaunchRequest } from "../../trading-desk-risk/src/types.ts";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  const paths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve("D:/Treading View/.env"),
    path.resolve("D:/Treading View/trading-desk-risk/.env")
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if (v.includes("#") && (v.startsWith('"') || v.startsWith("'"))) {
            const q = v[0];
            const end = v.indexOf(q, 1);
            if (end > 0) v = v.slice(1, end);
          } else {
            v = v.split("#")[0].trim().replace(/^["']|["']$/g, "");
          }
          if (!env[k]) env[k] = v;
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const PORT = parseInt(process.env.PORT || env.PORT || "3001", 10);

// Initialize Risk & Execution Layer with $100M Seed Balance
const deskEngine = new DeskRiskEngine({
  maxDailyLossUsd: 1_000_000, // Scaled for $100M seed desk
  maxConsecutiveLosses: 3,
  minLiquidityUsd: 20_000,
  maxLiquidityDropPct: 35,
  maxFeedLagMs: 5_000
});

const paperBroker = new PaperBroker(100_000_000, deskEngine);
const feed = new MarketDataFeed();

let alpacaBroker: AlpacaBroker | null = null;
if (env.ALPACA_API_KEY && env.ALPACA_SECRET_KEY) {
  alpacaBroker = new AlpacaBroker(
    env.ALPACA_API_KEY,
    env.ALPACA_SECRET_KEY,
    env.ALPACA_ENDPOINT || "https://paper-api.alpaca.markets"
  );
}

const gamblerBot = new GamblerBot({ totalBookCapitalUsd: 100_000_000, maxBookPctPerTrade: 0.05, maxTaxPct: 5 }, deskEngine);
const spyBot = new SpyBot({ maxChasePct: 15, maxAllocationPerWalletUsd: 2_000_000, consecutiveLossesToDemote: 3 }, deskEngine);
const houseBot = new HouseBot({ maxDailyLaunchBudgetUsd: 50_000, minSafetyFactor: 2.0 }, deskEngine);

const recentTrades: Array<TradeFill & { botType: string; status: string; reason?: string }> = [];

// Helper: Generate Candlesticks
function generateCandlestickHistory(basePrice: number, count = 48) {
  const candles = [];
  const now = Math.floor(Date.now() / 60000) * 60000;
  let current = basePrice * 0.96;

  for (let i = count; i >= 0; i--) {
    const time = now - i * 60000;
    const volatility = current * 0.004;
    const change = (Math.random() - 0.48) * volatility;
    const open = current;
    const close = i === 0 ? basePrice : current + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 50000 + 10000);

    candles.push({ time: Math.floor(time / 1000), open, high, low, close, volume });
    current = close;
  }
  return candles;
}

// Helper: Generate Level-2 Order Book Depth
function generateOrderBook(currentPrice: number) {
  const bids = [];
  const asks = [];
  let cumBidQty = 0;
  let cumAskQty = 0;

  for (let i = 1; i <= 8; i++) {
    const bidPrice = Math.round(currentPrice * (1 - i * 0.0006) * 10000) / 10000;
    const bidQty = Math.round((Math.random() * 45 + 5) * 100) / 100;
    cumBidQty += bidQty;
    bids.push({
      price: bidPrice,
      quantity: bidQty,
      total: Math.round(cumBidQty * 100) / 100
    });

    const askPrice = Math.round(currentPrice * (1 + i * 0.0006) * 10000) / 10000;
    const askQty = Math.round((Math.random() * 45 + 5) * 100) / 100;
    cumAskQty += askQty;
    asks.push({
      price: askPrice,
      quantity: askQty,
      total: Math.round(cumAskQty * 100) / 100
    });
  }

  return {
    bids,
    asks: asks.reverse(),
    spread: Math.round((asks[asks.length - 1].price - bids[0].price) * 10000) / 10000,
    spreadPct: Math.round(((asks[asks.length - 1].price - bids[0].price) / currentPrice) * 10000) / 100
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  const sendJson = (statusCode: number, data: unknown) => {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  try {
    // 1. Health
    if (pathname === "/api/health" || pathname === "/health") {
      sendJson(200, {
        status: "OK",
        app: "MavJex Paper-Trading Risk Gateway",
        mode: alpacaBroker ? "ALPACA_CONNECTED" : "LOCAL_PAPER_BROKER",
        paperSeedUsd: 100_000_000,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 2. Account Information (Dual Mode: Paper $100M or Live Alpaca)
    if (pathname === "/api/account") {
      const mode = (url.searchParams.get("mode") || "PAPER").toUpperCase();

      if (mode === "ALPACA") {
        if (!alpacaBroker) {
          sendJson(200, {
            provider: "ALPACA",
            status: "DISCONNECTED",
            message: "Alpaca API credentials not active. Please check .env settings.",
            currency: "USD",
            cash: 0,
            buyingPower: 0,
            portfolioValue: 0,
            marketIsOpen: false
          });
          return;
        }

        try {
          const alpacaAcc = await alpacaBroker.getAccount();
          const clock = await alpacaBroker.getClock();
          sendJson(200, {
            provider: "ALPACA",
            status: alpacaAcc.status,
            currency: alpacaAcc.currency,
            cash: parseFloat(alpacaAcc.cash),
            buyingPower: parseFloat(alpacaAcc.buying_power),
            portfolioValue: parseFloat(alpacaAcc.portfolio_value),
            marketIsOpen: clock.is_open,
            nextMarketOpen: clock.next_open
          });
          return;
        } catch (e: unknown) {
          console.error("Alpaca fetch failed, falling back to paper:", e);
        }
      }

      // Default: $100M Seed Paper Broker
      const summary = paperBroker.getPortfolioSummary(new Map());
      sendJson(200, {
        provider: "INTERNAL_PAPER",
        status: "ACTIVE",
        currency: "USD",
        cash: summary.cashUsd,
        marginUsed: summary.marginUsedUsd,
        buyingPower: summary.cashUsd * 100, // Max 100x leverage capability
        portfolioValue: summary.totalEquityUsd,
        unrealizedPnl: summary.unrealizedPnlUsd,
        realizedPnl: summary.totalRealizedPnlUsd,
        seedAmountUsd: 100_000_000,
        marketIsOpen: true
      });
      return;
    }

    // 3. Reset Paper Wallet to $100,000,000
    if (pathname === "/api/paper/reset" && req.method === "POST") {
      paperBroker.resetBalance(100_000_000);
      sendJson(200, {
        status: "RESET_SUCCESS",
        message: "Paper wallet reset to $100,000,000 USD virtual seed capital.",
        cash: paperBroker.getCashBalance()
      });
      return;
    }

    // 4. Active Leveraged Positions
    if (pathname === "/api/positions") {
      const positions = paperBroker.getPositions();
      const enriched = await Promise.all(
        positions.map(async (pos) => {
          const isStock = ["AAPL", "NVDA", "SPY", "TSLA", "MSFT"].includes(pos.symbol.toUpperCase());
          const feedData = isStock ? await feed.fetchLiveStock(pos.symbol) : await feed.fetchLiveCrypto(pos.symbol);
          const currentPrice = feedData.currentPrice;
          const delta = currentPrice - pos.averageEntryPrice;
          const unrealizedPnlUsd =
            pos.side === "BUY"
              ? (delta / pos.averageEntryPrice) * pos.notionalUsd
              : (-delta / pos.averageEntryPrice) * pos.notionalUsd;
          const unrealizedPnlPct = (unrealizedPnlUsd / pos.marginUsd) * 100;
          const distanceToLiqPct =
            pos.liquidationPrice > 0
              ? (Math.abs(currentPrice - pos.liquidationPrice) / currentPrice) * 100
              : 100;

          return {
            symbol: pos.symbol,
            side: pos.side,
            leverage: pos.leverage,
            marginUsd: pos.marginUsd,
            notionalUsd: pos.notionalUsd,
            quantity: pos.quantity,
            averageEntryPrice: pos.averageEntryPrice,
            currentPrice,
            liquidationPrice: pos.liquidationPrice,
            unrealizedPnlUsd,
            unrealizedPnlPct,
            distanceToLiqPct
          };
        })
      );
      sendJson(200, { positions: enriched });
      return;
    }

    // 5. Close Position
    if (pathname === "/api/positions/close" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const { symbol } = payload;
          if (!symbol) {
            sendJson(400, { error: "Missing required field: symbol" });
            return;
          }

          const isStock = ["AAPL", "NVDA", "SPY", "TSLA", "MSFT"].includes(symbol.toUpperCase());
          const feedData = isStock ? await feed.fetchLiveStock(symbol) : await feed.fetchLiveCrypto(symbol);
          const fill = paperBroker.closePosition(symbol, feedData.currentPrice);

          recentTrades.push({
            ...fill,
            botType: "MANUAL_CLOSE",
            status: "FILLED"
          });

          sendJson(200, {
            status: "POSITION_CLOSED",
            fill,
            cashBalance: paperBroker.getCashBalance()
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          sendJson(500, { error: msg });
        }
      });
      return;
    }

    // 6. Live Quote
    if (pathname === "/api/market/quote") {
      const symbol = url.searchParams.get("symbol") || "SOLUSDT";
      const isStock = ["AAPL", "NVDA", "SPY", "TSLA", "MSFT"].includes(symbol.toUpperCase());
      const feedData = isStock ? await feed.fetchLiveStock(symbol) : await feed.fetchLiveCrypto(symbol);
      const lagMs = Date.now() - feedData.lastFeedTimestampMs;

      sendJson(200, {
        ...feedData,
        lagMs,
        isStale: lagMs > 5000,
        type: isStock ? "stock" : "crypto"
      });
      return;
    }

    // 7. Market Depth (Simulated Level 2 Order Book)
    if (pathname === "/api/market/depth") {
      const symbol = url.searchParams.get("symbol") || "SOLUSDT";
      const isStock = ["AAPL", "NVDA", "SPY", "TSLA", "MSFT"].includes(symbol.toUpperCase());
      const feedData = isStock ? await feed.fetchLiveStock(symbol) : await feed.fetchLiveCrypto(symbol);
      const depth = generateOrderBook(feedData.currentPrice);

      sendJson(200, {
        symbol,
        currentPrice: feedData.currentPrice,
        ...depth
      });
      return;
    }

    // 8. Candlesticks for Charting
    if (pathname === "/api/market/candles") {
      const symbol = url.searchParams.get("symbol") || "SOLUSDT";
      const isStock = ["AAPL", "NVDA", "SPY", "TSLA", "MSFT"].includes(symbol.toUpperCase());
      const feedData = isStock ? await feed.fetchLiveStock(symbol) : await feed.fetchLiveCrypto(symbol);
      const candles = generateCandlestickHistory(feedData.currentPrice, 60);

      sendJson(200, {
        symbol,
        currentPrice: feedData.currentPrice,
        candles
      });
      return;
    }

    // 9. Risk Circuit Breakers State
    if (pathname === "/api/risk/status") {
      const state = deskEngine.getState();
      sendJson(200, {
        dailyRealizedPnlUsd: state.dailyRealizedPnlUsd,
        consecutiveLosses: state.consecutiveLosses,
        maxDailyLossUsd: 1_000_000,
        maxConsecutiveLosses: 3,
        minLiquidityUsd: 20_000,
        maxFeedLagMs: 5_000,
        recentRejections: deskEngine.logger.getEntries().filter((l) => l.action === "REJECTED").slice(-10)
      });
      return;
    }

    // 10. Recent Trades
    if (pathname === "/api/trades") {
      sendJson(200, {
        trades: recentTrades.slice(-25).reverse()
      });
      return;
    }

    // 11. Order Execution Gate (Supports Leverage 1x-100x & Dual Modes)
    if (pathname === "/api/trade/order" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body || "{}");
          const {
            symbol,
            side = "BUY",
            amountUsd = 1000,
            botType = "GAMBLER",
            leverage = 1,
            mode = "PAPER",
            leaderWallet,
            leaderEntryPrice,
            isLeaderExit
          } = payload;

          const parsedLeverage = Math.max(1, Math.min(100, Number(leverage) || 1));
          const isStock = ["AAPL", "NVDA", "SPY", "TSLA", "MSFT"].includes(symbol.toUpperCase());
          const feedData = isStock ? await feed.fetchLiveStock(symbol) : await feed.fetchLiveCrypto(symbol);
          const now = Date.now();

          // Handle Live Alpaca Execution if requested
          if (mode === "ALPACA" && alpacaBroker) {
            try {
              const qty = Math.max(1, Math.floor(amountUsd / feedData.currentPrice));
              const alpacaOrder = await alpacaBroker.createOrder({
                symbol,
                qty,
                side: side.toLowerCase() as "buy" | "sell",
                type: "market",
                time_in_force: "day"
              });

              sendJson(200, {
                status: "FILLED_ALPACA",
                fill: alpacaOrder,
                mode: "ALPACA"
              });
              return;
            } catch (alpacaErr: unknown) {
              const msg = alpacaErr instanceof Error ? alpacaErr.message : String(alpacaErr);
              sendJson(400, { error: `Alpaca order rejected: ${msg}` });
              return;
            }
          }

          let decision;

          if (botType === "SPY") {
            const spyOrder: SpyOrderRequest = {
              id: `ord-spy-${now}`,
              botType: "SPY",
              side,
              symbol,
              requestedAmountUsd: amountUsd,
              quotePrice: feedData.currentPrice,
              requestTimestampMs: now,
              leaderWallet: leaderWallet || "WalletAlpha.sol",
              leaderEntryPrice: leaderEntryPrice || feedData.currentPrice * 0.98,
              leaderEntryTimestampMs: now - 3500,
              isLeaderExit: Boolean(isLeaderExit),
              feed: feedData
            };
            decision = spyBot.evaluateCopyTrade(spyOrder);
          } else {
            const gamblerOrder: GamblerOrderRequest = {
              id: `ord-gambler-${now}`,
              botType: "GAMBLER",
              side,
              symbol,
              requestedAmountUsd: amountUsd,
              quotePrice: feedData.currentPrice,
              requestTimestampMs: now,
              feed: feedData,
              contractAudit: {
                isHoneypot: false,
                mintAuthorityRenounced: true,
                buyTaxPct: 0,
                sellTaxPct: 0,
                tradingEnabled: true
              }
            };
            decision = gamblerBot.evaluateOrder(gamblerOrder);
          }

          if (!decision.allowed) {
            recentTrades.push({
              fillId: `reject-${now}`,
              orderId: `ord-${now}`,
              symbol,
              side,
              leverage: parsedLeverage,
              marginUsd: amountUsd / parsedLeverage,
              quantity: 0,
              requestedPrice: feedData.currentPrice,
              fillPrice: feedData.currentPrice,
              liquidationPrice: 0,
              slippagePct: 0,
              feeUsd: 0,
              totalUsd: amountUsd,
              timestampMs: now,
              botType,
              status: "REJECTED_BY_RISK_GATE",
              reason: decision.reason
            });

            sendJson(400, {
              status: "REJECTED",
              ruleViolated: decision.ruleViolated,
              reason: decision.reason,
              metadata: decision.metadata
            });
            return;
          }

          // Execute on Paper Broker with Leverage
          const fill = paperBroker.executeOrder({
            id: `ord-${now}`,
            botType,
            side,
            symbol,
            requestedAmountUsd: amountUsd,
            quotePrice: feedData.currentPrice,
            requestTimestampMs: now,
            feed: feedData,
            leverage: parsedLeverage
          });

          const recordedTrade = {
            ...fill,
            botType,
            status: "FILLED"
          };
          recentTrades.push(recordedTrade);

          sendJson(200, {
            status: "FILLED",
            fill: recordedTrade,
            notes: decision.notes
          });
        } catch (orderErr: unknown) {
          const msg = orderErr instanceof Error ? orderErr.message : String(orderErr);
          sendJson(500, { error: msg });
        }
      });
      return;
    }

    sendJson(404, { error: "Endpoint not found" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    sendJson(500, { error: msg });
  }
});

server.listen(PORT, () => {
  console.log(`\n===============================================================`);
  console.log(`  🚀 MAVJEX BACKEND SERVICE RUNNING ON http://localhost:${PORT}`);
  console.log(`  Simulate. Analyze. Evolve.`);
  console.log(`  Paper Seed Balance: $100,000,000 USD`);
  console.log(`  Connected: ${alpacaBroker ? "Alpaca Live Paper Account" : "Local Risk & Paper Engine"}`);
  console.log(`===============================================================\n`);
});
