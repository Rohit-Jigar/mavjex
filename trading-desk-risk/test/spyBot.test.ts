import test from "node:test";
import assert from "node:assert/strict";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";
import { SpyBot } from "../src/bots/SpyBot.ts";
import type { SpyOrderRequest } from "../src/types.ts";

const setupTestEnv = () => {
  const deskEngine = new DeskRiskEngine({
    maxDailyLossUsd: 10_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const spyBot = new SpyBot(
    {
      maxChasePct: 15, // 15% max chase
      maxAllocationPerWalletUsd: 1_000,
      consecutiveLossesToDemote: 3
    },
    deskEngine
  );

  return { deskEngine, spyBot };
};

test("Spy Hard Rule: copy skipped when leader is too far ahead", () => {
  const { deskEngine, spyBot } = setupTestEnv();

  const leaderEntryTime = Date.now() - 40_000; // 40 seconds lag
  const copyRequestTime = Date.now();

  // GIVEN leader entry = $0.0010, max chase = 15%
  // WHEN copy quote = $0.0013 (+30% chase)
  const order: SpyOrderRequest = {
    id: "spy-ord-chase-01",
    botType: "SPY",
    side: "BUY",
    symbol: "MEME/SOL",
    requestedAmountUsd: 200,
    quotePrice: 0.0013,
    requestTimestampMs: copyRequestTime,
    leaderWallet: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    leaderEntryPrice: 0.0010,
    leaderEntryTimestampMs: leaderEntryTime,
    isLeaderExit: false,
    feed: {
      symbol: "MEME/SOL",
      currentPrice: 0.0013,
      poolLiquidityUsd: 100_000,
      lastFeedTimestampMs: copyRequestTime - 200
    }
  };

  const decision = spyBot.evaluateCopyTrade(order);

  // EXPECT order skipped, wallet + lag logged
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.equal(decision.ruleViolated, "SpyMaxChaseGate");
    assert.match(decision.reason, /max allowed \+15%/);
    assert.match(decision.reason, /Order skipped to prevent becoming exit liquidity/);

    // Verify metadata contains wallet and lag
    assert.equal(decision.metadata?.wallet, "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
    assert.equal(decision.metadata?.leaderEntry, 0.0010);
    assert.equal(decision.metadata?.copyQuote, 0.0013);
    assert.equal(decision.metadata?.chasePct, 30);
    assert.equal(decision.metadata?.lagMs, 40_000);
  }

  // Verify Audit Log entry
  const lastLog = deskEngine.logger.getLastEntry();
  assert.ok(lastLog);
  assert.equal(lastLog.action, "REJECTED");
  assert.equal(lastLog.rule, "SpyMaxChaseGate");
  assert.equal(lastLog.metadata?.wallet, "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU");
});

test("Spy Hard Rule: copy allowed when quote is within max chase limit", () => {
  const { spyBot } = setupTestEnv();

  const now = Date.now();
  // Leader entry = $0.0010, copy quote = $0.0011 (+10% chase <= 15% max)
  const order: SpyOrderRequest = {
    id: "spy-ord-pass-01",
    botType: "SPY",
    side: "BUY",
    symbol: "MEME/SOL",
    requestedAmountUsd: 250,
    quotePrice: 0.0011,
    requestTimestampMs: now,
    leaderWallet: "LeaderWalletA",
    leaderEntryPrice: 0.0010,
    leaderEntryTimestampMs: now - 1_500, // 1.5s lag
    isLeaderExit: false,
    feed: {
      symbol: "MEME/SOL",
      currentPrice: 0.0011,
      poolLiquidityUsd: 80_000,
      lastFeedTimestampMs: now - 100
    }
  };

  const decision = spyBot.evaluateCopyTrade(order);
  assert.equal(decision.allowed, true);
});

test("Spy Hard Rule: mirror exits immediately and block buys into leader exit", () => {
  const { spyBot } = setupTestEnv();
  const now = Date.now();

  // 1. Leader exits -> Mirror exit (SELL) is approved immediately
  const exitOrder: SpyOrderRequest = {
    id: "spy-ord-exit-01",
    botType: "SPY",
    side: "SELL",
    symbol: "MEME/SOL",
    requestedAmountUsd: 250,
    quotePrice: 0.0015,
    requestTimestampMs: now,
    leaderWallet: "LeaderWalletA",
    leaderEntryPrice: 0.0010,
    leaderEntryTimestampMs: now - 60_000,
    isLeaderExit: true,
    feed: {
      symbol: "MEME/SOL",
      currentPrice: 0.0015,
      poolLiquidityUsd: 80_000,
      lastFeedTimestampMs: now - 100
    }
  };
  const exitDecision = spyBot.evaluateCopyTrade(exitOrder);
  assert.equal(exitDecision.allowed, true);

  // 2. Leader is exiting, but copier tries to BUY -> Strictly rejected
  const erroneousBuyOrder: SpyOrderRequest = {
    ...exitOrder,
    id: "spy-ord-buy-during-exit",
    side: "BUY"
  };
  const buyDecision = spyBot.evaluateCopyTrade(erroneousBuyOrder);
  assert.equal(buyDecision.allowed, false);
  if (!buyDecision.allowed) {
    assert.equal(buyDecision.ruleViolated, "SpyMirrorExitIntegrityGate");
    assert.match(buyDecision.reason, /Cannot buy into leader's exit liquidity/);
  }
});

test("Spy Hard Rule: demote wallet after three losing copies in a row", () => {
  const { spyBot } = setupTestEnv();
  const wallet = "BadLeaderWallet";
  const now = Date.now();

  const makeOrder = (): SpyOrderRequest => ({
    id: `spy-test-${Math.random()}`,
    botType: "SPY",
    side: "BUY",
    symbol: "MEME/SOL",
    requestedAmountUsd: 100,
    quotePrice: 0.0010,
    requestTimestampMs: now,
    leaderWallet: wallet,
    leaderEntryPrice: 0.0010,
    leaderEntryTimestampMs: now - 100,
    isLeaderExit: false,
    feed: {
      symbol: "MEME/SOL",
      currentPrice: 0.0010,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: now
    }
  });

  // Trade 1 loses
  assert.equal(spyBot.evaluateCopyTrade(makeOrder()).allowed, true);
  spyBot.recordCopyTradeResult(wallet, -50, 100);

  // Trade 2 loses
  assert.equal(spyBot.evaluateCopyTrade(makeOrder()).allowed, true);
  spyBot.recordCopyTradeResult(wallet, -30, 100);

  // Trade 3 loses -> hits 3rd strike!
  assert.equal(spyBot.evaluateCopyTrade(makeOrder()).allowed, true);
  spyBot.recordCopyTradeResult(wallet, -20, 100);

  // Trade 4 must be BLOCKED because wallet is demoted
  const decision = spyBot.evaluateCopyTrade(makeOrder());
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.equal(decision.ruleViolated, "SpyWalletDemotionGate");
    assert.match(decision.reason, /is demoted\/blacklisted after 3 consecutive losing copies/);
  }
});

test("Spy Hard Rule: cap allocation per wallet", () => {
  const { spyBot } = setupTestEnv();
  const wallet = "WhaleLeader";
  const now = Date.now();

  const makeOrder = (amountUsd: number): SpyOrderRequest => ({
    id: `spy-alloc-${Math.random()}`,
    botType: "SPY",
    side: "BUY",
    symbol: "MEME/SOL",
    requestedAmountUsd: amountUsd,
    quotePrice: 0.0010,
    requestTimestampMs: now,
    leaderWallet: wallet,
    leaderEntryPrice: 0.0010,
    leaderEntryTimestampMs: now - 100,
    isLeaderExit: false,
    feed: {
      symbol: "MEME/SOL",
      currentPrice: 0.0010,
      poolLiquidityUsd: 50_000,
      lastFeedTimestampMs: now
    }
  });

  // First copy $800 -> allowed (cap is $1,000)
  assert.equal(spyBot.evaluateCopyTrade(makeOrder(800)).allowed, true);

  // Second copy $300 -> 800 + 300 = $1,100 > $1,000 cap -> REJECTED
  const decision = spyBot.evaluateCopyTrade(makeOrder(300));
  assert.equal(decision.allowed, false);
  if (!decision.allowed) {
    assert.equal(decision.ruleViolated, "SpyPerWalletAllocationCap");
    assert.match(decision.reason, /Allocation limit for wallet WhaleLeader exceeded/);
  }
});
