import { DeskRiskEngine } from "./src/desk/DeskRiskEngine.ts";
import { GamblerBot } from "./src/bots/GamblerBot.ts";
import { HouseBot } from "./src/bots/HouseBot.ts";
import { SpyBot } from "./src/bots/SpyBot.ts";

console.log("===============================================================================");
console.log("   TRADING DESK RISK ENGINE: EXECUTION GATES & CIRCUIT BREAKERS");
console.log("===============================================================================\n");

// Initialize Desk
const desk = new DeskRiskEngine({
  maxDailyLossUsd: 2_000,
  maxConsecutiveLosses: 3,
  minLiquidityUsd: 15_000,
  maxLiquidityDropPct: 35,
  maxFeedLagMs: 2_500
});

const gambler = new GamblerBot({ totalBookCapitalUsd: 100_000, maxBookPctPerTrade: 0.02, maxTaxPct: 5 }, desk);
const house = new HouseBot({ maxDailyLaunchBudgetUsd: 600, minSafetyFactor: 2.0 }, desk);
const spy = new SpyBot({ maxChasePct: 15, maxAllocationPerWalletUsd: 1_000, consecutiveLossesToDemote: 3 }, desk);

console.log("1. TESTING SPY BOT (Wallet Copying)");
console.log("-------------------------------------");
const spyOrder = {
  id: "spy-demo-01",
  botType: "SPY" as const,
  side: "BUY" as const,
  symbol: "MEME/SOL",
  requestedAmountUsd: 300,
  quotePrice: 0.0016, // +60% chase
  requestTimestampMs: Date.now(),
  leaderWallet: "AlphaWhale.sol",
  leaderEntryPrice: 0.0010,
  leaderEntryTimestampMs: Date.now() - 40_000, // 40 seconds lag
  isLeaderExit: false,
  feed: {
    symbol: "MEME/SOL",
    currentPrice: 0.0016,
    poolLiquidityUsd: 120_000,
    lastFeedTimestampMs: Date.now() - 300
  }
};

const spyDecision = spy.evaluateCopyTrade(spyOrder);
console.log(`Order: BUY $300 at $0.0016 (Leader entered at $0.0010, 40s ago)`);
console.log(`Gate Decision: ${spyDecision.allowed ? "APPROVED" : "BLOCKED"}`);
if (!spyDecision.allowed) {
  console.log(`Rule Tripped: ${spyDecision.ruleViolated}`);
  console.log(`Reason: ${spyDecision.reason}`);
}

console.log("\n2. TESTING GAMBLER BOT (Fixed % Sizing & Contract Gates)");
console.log("---------------------------------------------------------");
const gamblerOversized = {
  id: "gambler-demo-01",
  botType: "GAMBLER" as const,
  side: "BUY" as const,
  symbol: "PEPE2/SOL",
  requestedAmountUsd: 7_500, // 7.5% of book, cap is 2% = $2,000
  quotePrice: 0.000045,
  requestTimestampMs: Date.now(),
  feed: {
    symbol: "PEPE2/SOL",
    currentPrice: 0.000045,
    poolLiquidityUsd: 80_000,
    lastFeedTimestampMs: Date.now() - 200
  },
  contractAudit: {
    isHoneypot: false,
    mintAuthorityRenounced: true,
    buyTaxPct: 1,
    sellTaxPct: 1,
    tradingEnabled: true
  }
};
const gamblerDecision = gambler.evaluateOrder(gamblerOversized);
console.log(`Order: BUY $7,500 on $100k book (Cap is 2% = $2,000)`);
console.log(`Gate Decision: ${gamblerDecision.allowed ? "APPROVED" : "BLOCKED"}`);
if (!gamblerDecision.allowed) {
  console.log(`Rule Tripped: ${gamblerDecision.ruleViolated}`);
  console.log(`Reason: ${gamblerDecision.reason}`);
}

console.log("\n3. TESTING HOUSE BOT (Supply Integrity & Break-Even Gate)");
console.log("----------------------------------------------------------");
const houseRuggingAttempt = {
  id: "house-demo-01",
  botType: "HOUSE" as const,
  side: "BUY" as const,
  symbol: "LAUNCH/SOL",
  requestedAmountUsd: 100,
  quotePrice: 1.0,
  requestTimestampMs: Date.now(),
  feed: {
    symbol: "LAUNCH/SOL",
    currentPrice: 1.0,
    poolLiquidityUsd: 50_000,
    lastFeedTimestampMs: Date.now() - 100
  },
  isHoldingOwnSupply: true, // Forbidden!
  isSellingOwnSupply: true,
  estimatedLaunchCostUsd: 50,
  feeRatePct: 1.0,
  expectedVolumeUsd: 20_000
};
const houseDecision = house.evaluateLaunch(houseRuggingAttempt);
console.log(`Launch Request: Holding & selling own token supply`);
console.log(`Gate Decision: ${houseDecision.allowed ? "APPROVED" : "BLOCKED"}`);
if (!houseDecision.allowed) {
  console.log(`Rule Tripped: ${houseDecision.ruleViolated}`);
  console.log(`Reason: ${houseDecision.reason}`);
}

console.log("\n4. TESTING DESK-LEVEL CIRCUIT BREAKER (Feed-Lag Breaker)");
console.log("---------------------------------------------------------");
const staleOrder = {
  ...spyOrder,
  quotePrice: 0.0011, // only 10% chase (would normally pass spy gate)
  feed: {
    ...spyOrder.feed,
    lastFeedTimestampMs: Date.now() - 6_000 // 6 seconds stale! (max allowed 2.5s)
  }
};
const staleDecision = spy.evaluateCopyTrade(staleOrder);
console.log(`Order with 6.0s Stale Data Feed`);
console.log(`Gate Decision: ${staleDecision.allowed ? "APPROVED" : "BLOCKED"}`);
if (!staleDecision.allowed) {
  console.log(`Circuit Breaker Tripped: ${staleDecision.ruleViolated}`);
  console.log(`Reason: ${staleDecision.reason}`);
}

console.log("\n===============================================================================");
console.log("All risk gates active. No trade executes without passing every hard rule.");
console.log("===============================================================================\n");
