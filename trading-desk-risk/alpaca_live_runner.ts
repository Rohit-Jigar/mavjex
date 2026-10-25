import fs from "node:fs";
import path from "node:path";
import { AlpacaBroker } from "./src/execution/AlpacaBroker.ts";
import { DeskRiskEngine } from "./src/desk/DeskRiskEngine.ts";
import { LiveGateway } from "./src/execution/LiveGateway.ts";
import { PaperBroker } from "./src/execution/PaperBroker.ts";
import { GamblerBot } from "./src/bots/GamblerBot.ts";
import type { GamblerOrderRequest } from "./src/types.ts";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const paths = [
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
          env[k] = v;
        }
      }
    }
  }
  return env;
}

async function main() {
  console.log("===============================================================================");
  console.log("      ALPACA BROKERAGE INTEGRATION & LIVE RISK GATE VERIFICATION");
  console.log("===============================================================================\n");

  const env = loadEnv();
  const apiKey = env.ALPACA_API_KEY;
  const apiSecret = env.ALPACA_SECRET_KEY;
  const endpoint = env.ALPACA_ENDPOINT || "https://paper-api.alpaca.markets";

  if (!apiKey || !apiSecret) {
    console.error("❌ Missing ALPACA_API_KEY or ALPACA_SECRET_KEY in .env");
    process.exit(1);
  }

  // 1. Initialize Broker
  const alpaca = new AlpacaBroker(apiKey, apiSecret, endpoint);

  // 2. Query Live Account
  console.log("1. QUERYING LIVE ALPACA ACCOUNT");
  console.log("-----------------------------------------");
  const account = await alpaca.getAccount();
  const clock = await alpaca.getClock();

  console.log(`Account Status:   ${account.status}`);
  console.log(`Endpoint:         ${endpoint}`);
  console.log(`Mode:             ${endpoint.includes("paper") ? "PAPER TRADING (Sandbox)" : "LIVE TRADING"}`);
  console.log(`Cash Balance:     $${Number(account.cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log(`Buying Power:     $${Number(account.buying_power).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log(`Portfolio Value:  $${Number(account.portfolio_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
  console.log(`Market Status:    ${clock.is_open ? "🟢 OPEN" : "🔴 CLOSED"}`);
  if (!clock.is_open) {
    console.log(`Next Market Open: ${clock.next_open}`);
  }

  // 3. Query Open Positions
  console.log("\n2. OPEN POSITIONS IN ALPACA");
  console.log("-----------------------------------------");
  const positions = await alpaca.getPositions();
  if (positions.length === 0) {
    console.log("No open positions currently in your Alpaca account.");
  } else {
    for (const p of positions) {
      console.log(`* ${p.symbol}: ${p.qty} shares @ $${p.avg_entry_price} (Current: $${p.current_price}, PnL: $${p.unrealized_pl})`);
    }
  }

  // 4. Initialize Desk Risk Engine & Live Gateway
  console.log("\n3. INITIALIZING DESK RISK ENGINE GATES");
  console.log("-----------------------------------------");
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1_000,
    maxConsecutiveLosses: 3,
    minLiquidityUsd: 20_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const paperBroker = new PaperBroker(Number(account.cash), desk);
  const liveGateway = new LiveGateway("ALPACA_LIVE", paperBroker, desk, alpaca);
  const gambler = new GamblerBot({
    totalBookCapitalUsd: Number(account.portfolio_value),
    maxBookPctPerTrade: 0.02, // 2% max per trade
    maxTaxPct: 5
  }, desk);

  console.log(`Book Capital Gate:    $${Number(account.portfolio_value).toLocaleString()} (Max trade: $${(Number(account.portfolio_value) * 0.02).toFixed(2)})`);
  console.log(`Daily Loss Breaker:   $1,000.00 cap`);
  console.log(`Feed Staleness Gate:  5.00s max`);

  // 5. Test Live Gate Evaluation
  console.log("\n4. ORDER PATH VERIFICATION");
  console.log("-----------------------------------------");
  const testOrder: GamblerOrderRequest = {
    id: `alpaca-test-${Date.now()}`,
    botType: "GAMBLER",
    side: "BUY",
    symbol: "AAPL",
    requestedAmountUsd: 500, // $500 <= $2,000 max
    quotePrice: 347.73,
    requestTimestampMs: Date.now(),
    feed: {
      symbol: "AAPL",
      currentPrice: 347.73,
      poolLiquidityUsd: 50_000_000,
      lastFeedTimestampMs: clock.is_open ? Date.now() - 500 : Date.now() - 60_000 // if market closed, feed is stale!
    },
    contractAudit: {
      isHoneypot: false,
      mintAuthorityRenounced: true,
      buyTaxPct: 0,
      sellTaxPct: 0,
      tradingEnabled: true
    }
  };

  const decision = gambler.evaluateOrder(testOrder);
  console.log(`Candidate Order: BUY $500 AAPL`);
  console.log(`Risk Gate Verdict: ${decision.allowed ? "APPROVED" : "BLOCKED"}`);
  if (!decision.allowed) {
    console.log(`Reason: [${decision.ruleViolated}] ${decision.reason}`);
  } else {
    console.log(`Notes: ${decision.notes}`);
  }

  console.log("\n===============================================================================");
  console.log("Alpaca is authenticated and linked. Risk engine protects every dispatch.");
  console.log("===============================================================================\n");
}

main().catch(console.error);
