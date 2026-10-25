import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DeskRiskEngine } from "../../trading-desk-risk/src/desk/DeskRiskEngine.ts";
import { GamblerBot } from "../../trading-desk-risk/src/bots/GamblerBot.ts";
import { SpyBot } from "../../trading-desk-risk/src/bots/SpyBot.ts";
import { HouseBot } from "../../trading-desk-risk/src/bots/HouseBot.ts";
import { MarketDataFeed } from "../../trading-desk-risk/src/execution/MarketDataFeed.ts";
import { InstrumentCatalog, type Instrument } from "../../trading-desk-risk/src/execution/InstrumentCatalog.ts";
import { MarketDataService } from "../../trading-desk-risk/src/execution/MarketDataService.ts";
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
  maxDailyLossUsd: 1_000_000,
  maxConsecutiveLosses: 3,
  minLiquidityUsd: 20_000,
  maxLiquidityDropPct: 35,
  maxFeedLagMs: 5_000
});

const paperBroker = new PaperBroker(100_000_000, deskEngine);
const catalog = new InstrumentCatalog();
const marketDataService = new MarketDataService();
const feed = new MarketDataFeed();

// Session Persistence
const PORTFOLIO_FILE = path.resolve(process.cwd(), ".paper-portfolio.json");
function loadPersistedState() {
  try {
    if (fs.existsSync(PORTFOLIO_FILE)) {
      const raw = fs.readFileSync(PORTFOLIO_FILE, "utf8");
      const parsed = JSON.parse(raw);
      paperBroker.importState(parsed);
      console.log(`[Persistence] Loaded portfolio state from ${PORTFOLIO_FILE}`);
    }
  } catch (e) {
    console.warn("[Persistence] Could not load state:", e);
  }
}
function savePersistedState() {
  try {
    const s = paperBroker.exportState();
    fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(s, null, 2), "utf8");
  } catch (e) {
    console.warn("[Persistence] Could not save state:", e);
  }
}
loadPersistedState();

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
const watchlist = new Set<string>(["RELIANCE", "TCS", "INFY", "AAPL", "NVDA", "SOLUSDT", "BTCUSDT"]);

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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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

    // 2. Global Instrument Search (Supports NSE, BSE, US, Crypto, ISIN, Name)
    if (pathname === "/api/instruments/search") {
      const q = url.searchParams.get("q") || "";
      const exchange = url.searchParams.get("exchange") || undefined;
      const type = url.searchParams.get("type") || undefined;
      const country = url.searchParams.get("country") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const limit = parseInt(url.searchParams.get("limit") || "20", 10);

      const result = catalog.search({
        query: q,
        exchange,
        type,
        country,
        page,
        limit
      });

      sendJson(200, result);
      return;
    }

    // 3. Supported Exchanges
    if (pathname === "/api/instruments/exchanges") {
      sendJson(200, { exchanges: catalog.getExchanges() });
      return;
    }

    // 4. Instrument Details
    if (pathname.startsWith("/api/instruments/")) {
      const idOrSym = decodeURIComponent(pathname.replace("/api/instruments/", ""));
      const inst = catalog.getById(idOrSym) || catalog.getBySymbol(idOrSym);
      if (!inst) {
        sendJson(404, { error: `Instrument not found for identifier: ${idOrSym}` });
        return;
      }
      sendJson(200, inst);
      return;
    }

    // 5. Watchlist Management
    if (pathname === "/api/watchlist") {
      if (req.method === "GET") {
        const items = Array.from(watchlist)
          .map((sym) => catalog.getBySymbol(sym))
          .filter(Boolean);
        sendJson(200, { watchlist: items });
        return;
      }

      if (req.method === "POST") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const p = JSON.parse(body || "{}");
            if (p.symbol) {
              watchlist.add(p.symbol.toUpperCase());
            }
            sendJson(200, { status: "ADDED", watchlist: Array.from(watchlist) });
          } catch (e: unknown) {
            sendJson(400, { error: String(e) });
          }
        });
        return;
      }

      if (req.method === "DELETE") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          try {
            const p = JSON.parse(body || "{}");
            if (p.symbol) {
              watchlist.delete(p.symbol.toUpperCase());
            }
            sendJson(200, { status: "REMOVED", watchlist: Array.from(watchlist) });
          } catch (e: unknown) {
            sendJson(400, { error: String(e) });
          }
        });
        return;
      }
    }

    // 6. Live / Normalized Quote
    if (pathname === "/api/market/quote" || pathname === "/api/markets/quote") {
      const sym = url.searchParams.get("symbol") || url.searchParams.get("instrument_id") || "SOLUSDT";
      const exch = url.searchParams.get("exchange") || undefined;
      const inst = catalog.getBySymbol(sym, exch) || catalog.getById(sym) || {
        id: `CUSTOM:${sym}`,
        symbol: sym,
        exchangeSymbol: sym,
        name: sym,
        exchange: (sym.includes("USDT") ? "BINANCE" : "NASDAQ") as any,
        country: "GLOBAL" as any,
        currency: "USD" as any,
        type: "EQUITY" as any,
        tradingEligible: true,
        basePrice: 100.0
      };

      const quote = await marketDataService.getQuote(inst);
      sendJson(200, quote);
      return;
    }

    // 7. Historical Candlesticks
    if (pathname === "/api/market/candles" || pathname === "/api/markets/history") {
      const sym = url.searchParams.get("symbol") || "SOLUSDT";
      const range = url.searchParams.get("range") || "1D";
      const inst = catalog.getBySymbol(sym) || catalog.getById(sym) || {
        id: `CUSTOM:${sym}`,
        symbol: sym,
        exchangeSymbol: sym,
        name: sym,
        exchange: "BINANCE" as any,
        country: "GLOBAL" as any,
        currency: "USD" as any,
        type: "CRYPTO" as any,
        tradingEligible: true,
        basePrice: 100.0
      };

      const candles = await marketDataService.getHistory(inst, range);
      sendJson(200, { symbol: sym, range, candles });
      return;
    }

    // 8. Market Depth (Simulated Level 2 Order Book)
    if (pathname === "/api/market/depth") {
      const symbol = url.searchParams.get("symbol") || "SOLUSDT";
      const inst = catalog.getBySymbol(symbol) || catalog.getById(symbol);
      const quote = inst ? await marketDataService.getQuote(inst) : { price: 100 };
      const depth = generateOrderBook(quote.price);

      sendJson(200, {
        symbol,
        currentPrice: quote.price,
        ...depth
      });
      return;
    }

    // 9. Account Information (Dual Mode: Paper $100M or Live Alpaca)
    if (pathname === "/api/account" || pathname === "/api/portfolio") {
      const mode = (url.searchParams.get("mode") || "PAPER").toUpperCase();

      if (mode === "ALPACA" && alpacaBroker) {
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
        buyingPower: summary.cashUsd * 100,
        portfolioValue: summary.totalEquityUsd,
        unrealizedPnl: summary.unrealizedPnlUsd,
        realizedPnl: summary.totalRealizedPnlUsd,
        seedAmountUsd: 100_000_000,
        marketIsOpen: true
      });
      return;
    }

    // 10. Active Leveraged Positions
    if (pathname === "/api/positions") {
      const positions = paperBroker.getPositions();
      const enriched = await Promise.all(
        positions.map(async (pos) => {
          const inst = catalog.getBySymbol(pos.symbol) || catalog.getById(pos.symbol);
          let currentPrice = pos.averageEntryPrice;
          if (inst) {
            const q = await marketDataService.getQuote(inst);
            currentPrice = q.price;
          }
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

    // 11. Close Position
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

          const inst = catalog.getBySymbol(symbol) || catalog.getById(symbol);
          const currentPrice = inst ? (await marketDataService.getQuote(inst)).price : 100;
          const fill = paperBroker.closePosition(symbol, currentPrice);

          recentTrades.push({
            ...fill,
            botType: "MANUAL_CLOSE",
            status: "FILLED"
          });

          savePersistedState();

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

    // 12. Limit Orders
    if (pathname === "/api/orders/limit") {
      if (req.method === "GET") {
        sendJson(200, { limitOrders: paperBroker.getLimitOrders() });
        return;
      }
    }

    if (pathname === "/api/orders/limit/cancel" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const p = JSON.parse(body || "{}");
          const cancelled = paperBroker.cancelLimitOrder(p.orderId);
          savePersistedState();
          sendJson(200, { status: "CANCELLED", order: cancelled });
        } catch (err: unknown) {
          sendJson(400, { error: String(err) });
        }
      });
      return;
    }

    // 13. Order Execution Gate (Supports Market & Limit Orders)
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
            orderType = "MARKET",
            limitPrice,
            leaderWallet,
            leaderEntryPrice,
            isLeaderExit
          } = payload;

          const parsedLeverage = Math.max(1, Math.min(100, Number(leverage) || 1));
          const inst = catalog.getBySymbol(symbol) || catalog.getById(symbol);
          const quote = inst ? await marketDataService.getQuote(inst) : { price: 100 };
          const now = Date.now();

          // Handle Limit Orders
          if (orderType === "LIMIT") {
            const parsedLimit = Number(limitPrice);
            if (!parsedLimit || parsedLimit <= 0) {
              sendJson(400, { error: "Invalid or missing limitPrice for LIMIT order" });
              return;
            }

            const limitOrder = paperBroker.placeLimitOrder({
              id: `limit-${now}`,
              symbol,
              side,
              amountUsd,
              limitPrice: parsedLimit,
              leverage: parsedLeverage
            });

            savePersistedState();
            sendJson(200, { status: "LIMIT_ORDER_PLACED", order: limitOrder });
            return;
          }

          // Handle Live Alpaca Execution
          if (mode === "ALPACA" && alpacaBroker) {
            try {
              const qty = Math.max(1, Math.floor(amountUsd / quote.price));
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

          // Evaluate Risk Bot Rule
          const feedData = {
            symbol,
            currentPrice: quote.price,
            poolLiquidityUsd: 25_000_000,
            lastFeedTimestampMs: now
          };

          let decision;
          if (botType === "SPY") {
            const spyOrder: SpyOrderRequest = {
              id: `ord-spy-${now}`,
              botType: "SPY",
              side,
              symbol,
              requestedAmountUsd: amountUsd,
              quotePrice: quote.price,
              requestTimestampMs: now,
              leaderWallet: leaderWallet || "WalletAlpha.sol",
              leaderEntryPrice: leaderEntryPrice || quote.price * 0.98,
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
              quotePrice: quote.price,
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
            sendJson(400, {
              status: "REJECTED",
              ruleViolated: decision.ruleViolated,
              reason: decision.reason
            });
            return;
          }

          // Execute on Paper Broker
          const fill = paperBroker.executeOrder({
            id: `ord-${now}`,
            botType,
            side,
            symbol,
            requestedAmountUsd: amountUsd,
            quotePrice: quote.price,
            requestTimestampMs: now,
            feed: feedData,
            leverage: parsedLeverage,
            orderType: "MARKET"
          });

          const recordedTrade = {
            ...fill,
            botType,
            status: "FILLED"
          };
          recentTrades.push(recordedTrade);
          savePersistedState();

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

    // 14. Reset Paper Wallet
    if (pathname === "/api/paper/reset" && req.method === "POST") {
      paperBroker.resetBalance(100_000_000);
      savePersistedState();
      sendJson(200, {
        status: "RESET_SUCCESS",
        message: "Paper wallet reset to $100,000,000 USD virtual seed capital.",
        cash: paperBroker.getCashBalance()
      });
      return;
    }

    // 15. Risk Circuit Breakers State
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

    // 16. Recent Trades
    if (pathname === "/api/trades") {
      sendJson(200, { trades: recentTrades.slice(-25).reverse() });
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
  console.log(`  Paper Seed Balance: $100,000,000 USD (Persistent)`);
  console.log(`  Instruments Indexed: ${catalog.getAll().length} (NSE, BSE, US, Crypto)`);
  console.log(`  Connected: ${alpacaBroker ? "Alpaca Live Paper Account" : "Local Risk & Paper Engine"}`);
  console.log(`===============================================================\n`);
});
