import test from "node:test";
import assert from "node:assert/strict";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";
import { HouseBot } from "../src/bots/HouseBot.ts";
import type { HouseLaunchRequest } from "../src/types.ts";

const setupTestEnv = () => {
  const deskEngine = new DeskRiskEngine({
    maxDailyLossUsd: 10_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const houseBot = new HouseBot(
    {
      maxDailyLaunchBudgetUsd: 500, // $500 per day launch budget
      minSafetyFactor: 2.0          // 2x safety factor clearance
    },
    deskEngine
  );

  return { deskEngine, houseBot };
};

const makeLaunchRequest = (overrides?: Partial<HouseLaunchRequest>): HouseLaunchRequest => {
  const now = Date.now();
  return {
    id: `house-launch-${Math.random()}`,
    botType: "HOUSE",
    side: "BUY",
    symbol: "TOKEN/SOL",
    requestedAmountUsd: 50,
    quotePrice: 1.0,
    requestTimestampMs: now,
    feed: {
      symbol: "TOKEN/SOL",
      currentPrice: 1.0,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: now - 100
    },
    isHoldingOwnSupply: false,
    isSellingOwnSupply: false,
    estimatedLaunchCostUsd: 50, // costs $50 to launch
    feeRatePct: 1.0,            // 1% fee on volume
    expectedVolumeUsd: 15_000,  // expected fee revenue = 1% * $15k = $150 (3x cost > 2x required)
    ...overrides
  };
};

test("House Hard Rule 1: Never hold or sell own supply (Fees only, zero rug risk)", () => {
  const { houseBot } = setupTestEnv();

  // 1. Attempting to hold supply -> REJECTED
  const holdingSupplyDecision = houseBot.evaluateLaunch(
    makeLaunchRequest({ isHoldingOwnSupply: true })
  );
  assert.equal(holdingSupplyDecision.allowed, false);
  if (!holdingSupplyDecision.allowed) {
    assert.equal(holdingSupplyDecision.ruleViolated, "HouseSupplyIntegrityGate");
    assert.match(holdingSupplyDecision.reason, /strictly forbidden from holding or selling token supply/);
  }

  // 2. Attempting to sell own supply into buyers -> REJECTED
  const sellingSupplyDecision = houseBot.evaluateLaunch(
    makeLaunchRequest({ isSellingOwnSupply: true })
  );
  assert.equal(sellingSupplyDecision.allowed, false);
  if (!sellingSupplyDecision.allowed) {
    assert.equal(sellingSupplyDecision.ruleViolated, "HouseSupplyIntegrityGate");
    assert.match(sellingSupplyDecision.reason, /Income must be transactional fees only/);
  }
});

test("House Hard Rule 2: Break-even gate requires fee revenue >= 2x launch costs", () => {
  const { houseBot } = setupTestEnv();

  // Launch cost = $100. At 2x safety factor, requires $200 in expected fees.
  // 1. Low volume: expected fee = 1% of $10,000 = $100 (< $200 required) -> REJECTED
  const lowVolumeDecision = houseBot.evaluateLaunch(
    makeLaunchRequest({
      estimatedLaunchCostUsd: 100,
      feeRatePct: 1.0,
      expectedVolumeUsd: 10_000 // fee = $100
    })
  );
  assert.equal(lowVolumeDecision.allowed, false);
  if (!lowVolumeDecision.allowed) {
    assert.equal(lowVolumeDecision.ruleViolated, "HouseBreakEvenSafetyGate");
    assert.match(lowVolumeDecision.reason, /fails the 2\.0x safety factor requirement/);
  }

  // 2. Healthy volume: expected fee = 1% of $25,000 = $250 (>= $200 required) -> ALLOWED
  const healthyDecision = houseBot.evaluateLaunch(
    makeLaunchRequest({
      estimatedLaunchCostUsd: 100,
      feeRatePct: 1.0,
      expectedVolumeUsd: 25_000 // fee = $250 >= $200
    })
  );
  assert.equal(healthyDecision.allowed, true);
});

test("House Hard Rule 3: Daily launch budget hard stop halts further launches", () => {
  const { houseBot } = setupTestEnv();

  // Budget is $500/day
  // Launch 1: $200 cost -> Allowed (Remaining: $300)
  assert.equal(houseBot.evaluateLaunch(makeLaunchRequest({ estimatedLaunchCostUsd: 200, expectedVolumeUsd: 50_000 })).allowed, true);

  // Launch 2: $250 cost -> Allowed (Total spent: $450, Remaining: $50)
  assert.equal(houseBot.evaluateLaunch(makeLaunchRequest({ estimatedLaunchCostUsd: 250, expectedVolumeUsd: 60_000 })).allowed, true);

  // Launch 3: $100 cost -> $450 + $100 = $550 > $500 cap -> REJECTED
  const overBudgetDecision = houseBot.evaluateLaunch(
    makeLaunchRequest({ estimatedLaunchCostUsd: 100, expectedVolumeUsd: 30_000 })
  );
  assert.equal(overBudgetDecision.allowed, false);
  if (!overBudgetDecision.allowed) {
    assert.equal(overBudgetDecision.ruleViolated, "HouseDailyLaunchBudgetCap");
    assert.match(overBudgetDecision.reason, /Daily launch budget cap exceeded/);
  }
});
