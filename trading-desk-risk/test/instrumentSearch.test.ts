import test from "node:test";
import assert from "node:assert/strict";
import { InstrumentCatalog, DEFAULT_INSTRUMENTS } from "../src/execution/InstrumentCatalog.ts";
import { PaperBroker } from "../src/execution/PaperBroker.ts";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";

test("InstrumentCatalog: indexes full instrument universe", () => {
  const catalog = new InstrumentCatalog();
  const all = catalog.getAll();
  assert.ok(all.length >= 30, `Expected at least 30 instruments, got ${all.length}`);

  const exchanges = catalog.getExchanges();
  assert.ok(exchanges.includes("NSE"), "Must include NSE");
  assert.ok(exchanges.includes("BSE"), "Must include BSE");
  assert.ok(exchanges.includes("NASDAQ"), "Must include NASDAQ");
  assert.ok(exchanges.includes("BINANCE"), "Must include BINANCE");
});

test("InstrumentCatalog: searches by company name and partial name", () => {
  const catalog = new InstrumentCatalog();

  // Exact company name
  const exactReliance = catalog.search({ query: "Reliance Industries Limited" });
  assert.ok(exactReliance.items.length > 0);
  assert.equal(exactReliance.items[0].symbol, "RELIANCE");

  // Partial name: "Tata"
  const tataResults = catalog.search({ query: "Tata" });
  assert.ok(tataResults.items.length >= 3, "Expected multiple Tata companies");
  const tataSymbols = tataResults.items.map((i) => i.symbol);
  assert.ok(tataSymbols.includes("TCS"));
  assert.ok(tataSymbols.includes("TATAMOTORS"));
});

test("InstrumentCatalog: searches by ticker, ISIN, and exchange", () => {
  const catalog = new InstrumentCatalog();

  // Search by ticker: AAPL
  const apple = catalog.search({ query: "AAPL" });
  assert.ok(apple.items.length > 0);
  assert.equal(apple.items[0].symbol, "AAPL");
  assert.equal(apple.items[0].exchange, "NASDAQ");

  // Search by ISIN
  const isinResult = catalog.search({ query: "INE002A01018" });
  assert.ok(isinResult.items.length >= 1);
  assert.ok(isinResult.items.some((i) => i.symbol === "RELIANCE"));

  // Search by Exchange Filter
  const nseOnly = catalog.search({ exchange: "NSE" });
  assert.ok(nseOnly.items.every((i) => i.exchange === "NSE"));

  const bseOnly = catalog.search({ exchange: "BSE" });
  assert.ok(bseOnly.items.every((i) => i.exchange === "BSE"));
});

test("InstrumentCatalog: distinguishes exchange-specific symbols for same company on NSE vs BSE", () => {
  const catalog = new InstrumentCatalog();

  const nseRel = catalog.getBySymbol("RELIANCE", "NSE");
  assert.ok(nseRel);
  assert.equal(nseRel.exchange, "NSE");
  assert.equal(nseRel.exchangeSymbol, "RELIANCE.NS");
  assert.equal(nseRel.currency, "INR");

  const bseRel = catalog.getBySymbol("500325", "BSE");
  assert.ok(bseRel);
  assert.equal(bseRel.exchange, "BSE");
  assert.equal(bseRel.exchangeSymbol, "500325.BO");
  assert.equal(bseRel.currency, "INR");
});

test("PaperBroker: places, cancels, and triggers Limit Orders", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1000000,
    maxConsecutiveLosses: 3,
    minLiquidityUsd: 20000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5000
  });
  const broker = new PaperBroker(100000, desk);

  // 1. Place Buy Limit Order at $95 (when quote is $100)
  const order = broker.placeLimitOrder({
    id: "lim-1",
    symbol: "SOLUSDT",
    side: "BUY",
    amountUsd: 1000,
    limitPrice: 95.0,
    leverage: 10
  });

  assert.equal(order.status, "PENDING");
  assert.equal(order.reservedMarginUsd, 100);
  assert.equal(broker.getCashBalance(), 99900); // 100 reserved

  // 2. Price remains at $98 -> Should NOT fill
  const noFills = broker.checkAndFillLimitOrders(new Map([["SOLUSDT", 98.0]]));
  assert.equal(noFills.length, 0);
  assert.equal(order.status, "PENDING");

  // 3. Price drops to $94 -> Should trigger & fill!
  const fills = broker.checkAndFillLimitOrders(new Map([["SOLUSDT", 94.0]]));
  assert.equal(fills.length, 1);
  assert.equal(fills[0].symbol, "SOLUSDT");
  assert.equal(order.status, "FILLED");

  // Position should now exist
  const pos = broker.getPosition("SOLUSDT");
  assert.ok(pos);
  assert.equal(pos.side, "BUY");

  // 4. Test Limit Order Cancellation
  const order2 = broker.placeLimitOrder({
    id: "lim-2",
    symbol: "BTCUSDT",
    side: "BUY",
    amountUsd: 2000,
    limitPrice: 70000,
    leverage: 10
  });
  assert.equal(order2.reservedMarginUsd, 200);

  const cancelled = broker.cancelLimitOrder("lim-2");
  assert.equal(cancelled.status, "CANCELLED");
  // Reserved margin refunded
  assert.ok(broker.getCashBalance() > 99000);
});

test("PaperBroker: exports and imports persistent portfolio state", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1000000,
    maxConsecutiveLosses: 3,
    minLiquidityUsd: 20000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5000
  });
  const broker = new PaperBroker(50000000, desk);

  // Open a position
  broker.executeOrder({
    id: "ord-test",
    botType: "GAMBLER",
    side: "BUY",
    symbol: "RELIANCE",
    requestedAmountUsd: 10000,
    quotePrice: 2800,
    requestTimestampMs: Date.now(),
    leverage: 5,
    feed: { symbol: "RELIANCE", currentPrice: 2800, poolLiquidityUsd: 50000000, lastFeedTimestampMs: Date.now() }
  });

  const state = broker.exportState();
  assert.equal(state.positions.length, 1);
  assert.equal(state.positions[0].symbol, "RELIANCE");

  // New broker instance loading state
  const broker2 = new PaperBroker(100000000, desk);
  broker2.importState(state);

  assert.equal(broker2.getCashBalance(), state.cashUsd);
  assert.equal(broker2.getPositions().length, 1);
  assert.equal(broker2.getPosition("RELIANCE")?.symbol, "RELIANCE");
});
