import test from "node:test";
import assert from "node:assert/strict";
import { PaperBroker } from "../src/execution/PaperBroker.ts";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";

test("PaperBroker: initializes with $100,000,000 virtual seed capital default", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1_000_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const broker = new PaperBroker(100_000_000, desk);
  assert.equal(broker.getCashBalance(), 100_000_000);
});

test("PaperBroker: calculates liquidation price correctly across leverage tiers (1x to 100x)", () => {
  const entryPrice = 100.0;

  // 1x Spot Long -> Liquidation price is 0 (Cannot be liquidated unless stock goes to 0)
  const liq1x = PaperBroker.calculateLiquidationPrice(entryPrice, "BUY", 1);
  assert.equal(liq1x, 0);

  // 10x Long -> Liquidation price is entry * (1 - 1/10 + 0.005) = 100 * (1 - 0.1 + 0.005) = $90.50
  const liq10xLong = PaperBroker.calculateLiquidationPrice(entryPrice, "BUY", 10);
  assert.equal(Math.round(liq10xLong * 100) / 100, 90.5);

  // 10x Short -> Liquidation price is entry * (1 + 1/10 - 0.005) = 100 * (1 + 0.1 - 0.005) = $109.50
  const liq10xShort = PaperBroker.calculateLiquidationPrice(entryPrice, "SELL", 10);
  assert.equal(Math.round(liq10xShort * 100) / 100, 109.5);

  // 50x Long -> Liquidation price is entry * (1 - 1/50 + 0.005) = 100 * (1 - 0.02 + 0.005) = $98.50
  const liq50xLong = PaperBroker.calculateLiquidationPrice(entryPrice, "BUY", 50);
  assert.equal(Math.round(liq50xLong * 100) / 100, 98.5);

  // 100x Long -> Liquidation price is entry * (1 - 1/100 + 0.005) = 100 * (1 - 0.01 + 0.005) = $99.50
  const liq100xLong = PaperBroker.calculateLiquidationPrice(entryPrice, "BUY", 100);
  assert.equal(Math.round(liq100xLong * 100) / 100, 99.5);
});

test("PaperBroker: executes leveraged order requiring only fractional margin from $100M cash", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1_000_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const broker = new PaperBroker(100_000_000, desk);

  // Order $1,000,000 notional at 10x leverage -> only requires $100,000 margin!
  const fill = broker.executeOrder({
    id: "test-lev-1",
    botType: "GAMBLER",
    side: "BUY",
    symbol: "BTCUSDT",
    requestedAmountUsd: 1_000_000,
    quotePrice: 80_000,
    leverage: 10,
    requestTimestampMs: Date.now(),
    feed: {
      symbol: "BTCUSDT",
      currentPrice: 80_000,
      poolLiquidityUsd: 10_000_000,
      lastFeedTimestampMs: Date.now()
    }
  });

  assert.equal(fill.leverage, 10);
  assert.equal(fill.marginUsd, 100_000);
  assert.equal(fill.totalUsd, 1_000_000);

  // Cash should be deducted by margin ($100k) + fee ($500), leaving ~$99.89M
  assert.ok(broker.getCashBalance() < 99_900_000 && broker.getCashBalance() > 99_890_000);

  // Position should record leverage & liquidation price
  const pos = broker.getPosition("BTCUSDT");
  assert.ok(pos);
  assert.equal(pos.leverage, 10);
  assert.equal(pos.marginUsd, 100_000);
  assert.ok(pos.liquidationPrice > 72_000 && pos.liquidationPrice < 73_000);
});
