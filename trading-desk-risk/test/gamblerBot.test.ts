import test from "node:test";
import assert from "node:assert/strict";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";
import { GamblerBot } from "../src/bots/GamblerBot.ts";
import type { GamblerOrderRequest } from "../src/types.ts";

const setupTestEnv = () => {
  const deskEngine = new DeskRiskEngine({
    maxDailyLossUsd: 10_000,
    maxConsecutiveLosses: 5,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const gamblerBot = new GamblerBot(
    {
      totalBookCapitalUsd: 100_000, // $100k book
      maxBookPctPerTrade: 0.02,     // 2% = $2,000 max size
      maxTaxPct: 5                  // 5% max tax
    },
    deskEngine
  );

  return { deskEngine, gamblerBot };
};

const makeOrder = (overrides?: Partial<GamblerOrderRequest>): GamblerOrderRequest => {
  const now = Date.now();
  return {
    id: `gambler-ord-${Math.random()}`,
    botType: "GAMBLER",
    side: "BUY",
    symbol: "DEGEN/SOL",
    requestedAmountUsd: 1_500, // within $2,000 max
    quotePrice: 0.05,
    requestTimestampMs: now,
    feed: {
      symbol: "DEGEN/SOL",
      currentPrice: 0.05,
      poolLiquidityUsd: 100_000,
      lastFeedTimestampMs: now - 100
    },
    contractAudit: {
      isHoneypot: false,
      mintAuthorityRenounced: true,
      buyTaxPct: 1,
      sellTaxPct: 1,
      tradingEnabled: true
    },
    ...overrides
  };
};

test("Gambler Hard Rule: Fixed % size strictly enforced (stops Martingale / sizing up)", () => {
  const { gamblerBot } = setupTestEnv();

  // 1. Order within 2% of book ($1,500 <= $2,000) -> Allowed
  assert.equal(gamblerBot.evaluateOrder(makeOrder({ requestedAmountUsd: 1_500 })).allowed, true);

  // 2. Sized up order ($5,000 > $2,000 limit) -> REJECTED
  const oversizedDecision = gamblerBot.evaluateOrder(makeOrder({ requestedAmountUsd: 5_000 }));
  assert.equal(oversizedDecision.allowed, false);
  if (!oversizedDecision.allowed) {
    assert.equal(oversizedDecision.ruleViolated, "GamblerFixedPercentSizingGate");
    assert.match(oversizedDecision.reason, /exceeds strict max allowed \$2000\.00/);
    assert.match(oversizedDecision.reason, /Sizing up on losing streaks is forbidden/);
  }
});

test("Gambler Hard Rule: Contract Gates reject honeypots, mintable tokens, and paused trading", () => {
  const { gamblerBot } = setupTestEnv();

  // 1. Honeypot token -> REJECTED
  const honeypotDecision = gamblerBot.evaluateOrder(
    makeOrder({
      contractAudit: {
        isHoneypot: true,
        mintAuthorityRenounced: true,
        buyTaxPct: 0,
        sellTaxPct: 0,
        tradingEnabled: true
      }
    })
  );
  assert.equal(honeypotDecision.allowed, false);
  if (!honeypotDecision.allowed) {
    assert.equal(honeypotDecision.ruleViolated, "GamblerContractGate_Honeypot");
    assert.match(honeypotDecision.reason, /flagged token .* as a honeypot/);
  }

  // 2. Mint authority unrenounced -> REJECTED
  const mintDecision = gamblerBot.evaluateOrder(
    makeOrder({
      contractAudit: {
        isHoneypot: false,
        mintAuthorityRenounced: false,
        buyTaxPct: 0,
        sellTaxPct: 0,
        tradingEnabled: true
      }
    })
  );
  assert.equal(mintDecision.allowed, false);
  if (!mintDecision.allowed) {
    assert.equal(mintDecision.ruleViolated, "GamblerContractGate_MintAuthority");
    assert.match(mintDecision.reason, /Mint authority is not renounced/);
  }

  // 3. Trading disabled / paused -> REJECTED
  const pausedDecision = gamblerBot.evaluateOrder(
    makeOrder({
      contractAudit: {
        isHoneypot: false,
        mintAuthorityRenounced: true,
        buyTaxPct: 0,
        sellTaxPct: 0,
        tradingEnabled: false
      }
    })
  );
  assert.equal(pausedDecision.allowed, false);
  if (!pausedDecision.allowed) {
    assert.equal(pausedDecision.ruleViolated, "GamblerContractGate_TradingDisabled");
    assert.match(pausedDecision.reason, /Trading is not enabled or transfer is paused/);
  }

  // 4. Excessive sell tax (e.g. 15% > 5% max) -> REJECTED
  const taxDecision = gamblerBot.evaluateOrder(
    makeOrder({
      contractAudit: {
        isHoneypot: false,
        mintAuthorityRenounced: true,
        buyTaxPct: 1,
        sellTaxPct: 15,
        tradingEnabled: true
      }
    })
  );
  assert.equal(taxDecision.allowed, false);
  if (!taxDecision.allowed) {
    assert.equal(taxDecision.ruleViolated, "GamblerContractGate_ExcessiveTax");
    assert.match(taxDecision.reason, /exceed maximum allowed limit of 5%/);
  }
});
