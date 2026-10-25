import test from "node:test";
import assert from "node:assert/strict";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";
import type { GamblerOrderRequest } from "../src/types.ts";

const mockOrder = (overrides?: Partial<GamblerOrderRequest>): GamblerOrderRequest => {
  const now = Date.now();
  return {
    id: "ord-test-01",
    botType: "GAMBLER",
    side: "BUY",
    symbol: "SOL/MEME",
    requestedAmountUsd: 100,
    quotePrice: 0.0010,
    requestTimestampMs: now,
    feed: {
      symbol: "SOL/MEME",
      currentPrice: 0.0010,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: now - 500 // 500ms old feed
    },
    contractAudit: {
      isHoneypot: false,
      mintAuthorityRenounced: true,
      buyTaxPct: 0,
      sellTaxPct: 0,
      tradingEnabled: true
    },
    ...overrides
  };
};

test("Desk Breaker: Daily Loss Cap halts entries when breached", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 30,
    maxFeedLagMs: 3_000
  });

  // Normal state: order passes
  const initialDecision = desk.evaluateDeskGates(mockOrder());
  assert.equal(initialDecision.allowed, true);

  // Take $1,050 in losses today
  desk.updatePnl(-1050);

  // Breaker must trip
  const trippedDecision = desk.evaluateDeskGates(mockOrder());
  assert.equal(trippedDecision.allowed, false);
  if (!trippedDecision.allowed) {
    assert.equal(trippedDecision.ruleViolated, "DailyLossCapBreaker");
    assert.match(trippedDecision.reason, /Daily loss limit reached/);
  }
});

test("Desk Breaker: Consecutive Loss Breaker halts entries when streak hits threshold", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 10_000,
    maxConsecutiveLosses: 3,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 30,
    maxFeedLagMs: 3_000
  });

  desk.updatePnl(-10); // Loss 1
  desk.updatePnl(-15); // Loss 2
  assert.equal(desk.evaluateDeskGates(mockOrder()).allowed, true);

  desk.updatePnl(-20); // Loss 3 -> hits limit!
  const tripped = desk.evaluateDeskGates(mockOrder());
  assert.equal(tripped.allowed, false);
  if (!tripped.allowed) {
    assert.equal(tripped.ruleViolated, "ConsecutiveLossBreaker");
    assert.match(tripped.reason, /Consecutive loss breaker tripped/);
  }

  // Winning trade resets consecutive losses
  desk.updatePnl(100);
  assert.equal(desk.evaluateDeskGates(mockOrder()).allowed, true);
});

test("Desk Breaker: Liquidity-Drop Breaker halts on low floor or sudden drain", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 10_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 20_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 3_000
  });

  // 1. Below floor ($15,000 < $20,000)
  const lowFloorOrder = mockOrder({
    feed: {
      symbol: "SOL/MEME",
      currentPrice: 0.0010,
      poolLiquidityUsd: 15_000,
      lastFeedTimestampMs: Date.now()
    }
  });
  const lowFloorDecision = desk.evaluateDeskGates(lowFloorOrder);
  assert.equal(lowFloorDecision.allowed, false);
  if (!lowFloorDecision.allowed) {
    assert.equal(lowFloorDecision.ruleViolated, "LiquidityDropBreaker");
    assert.match(lowFloorDecision.reason, /below minimum safe threshold/);
  }

  // 2. Sudden pool drain: start at $100,000, plunge to $50,000 (50% drop > 35%)
  desk.recordLiquidity("SOL/DRAIN", 100_000);
  const drainedOrder = mockOrder({
    symbol: "SOL/DRAIN",
    feed: {
      symbol: "SOL/DRAIN",
      currentPrice: 0.0010,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: Date.now()
    }
  });
  const drainedDecision = desk.evaluateDeskGates(drainedOrder);
  assert.equal(drainedDecision.allowed, false);
  if (!drainedDecision.allowed) {
    assert.equal(drainedDecision.ruleViolated, "LiquidityDropBreaker");
    assert.match(drainedDecision.reason, /Sudden liquidity drain detected/);
  }
});

test("Desk Breaker: Feed-Lag Breaker stops entries when data is more than N seconds stale", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 10_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 30,
    maxFeedLagMs: 2_000 // 2 seconds max staleness
  });

  const now = Date.now();

  // Fresh feed: 300ms old -> PASS
  const freshOrder = mockOrder({
    requestTimestampMs: now,
    feed: {
      symbol: "SOL/MEME",
      currentPrice: 0.0010,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: now - 300
    }
  });
  assert.equal(desk.evaluateDeskGates(freshOrder).allowed, true);

  // Stale feed: 4,000ms old (4 seconds lag) -> TRIP
  const staleOrder = mockOrder({
    requestTimestampMs: now,
    feed: {
      symbol: "SOL/MEME",
      currentPrice: 0.0010,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: now - 4000
    }
  });
  const staleDecision = desk.evaluateDeskGates(staleOrder);
  assert.equal(staleDecision.allowed, false);
  if (!staleDecision.allowed) {
    assert.equal(staleDecision.ruleViolated, "FeedLagBreaker");
    assert.match(staleDecision.reason, /Market feed is stale/);
  }
});
