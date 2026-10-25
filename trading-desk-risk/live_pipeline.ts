import { TradingRunner } from "./src/execution/TradingRunner.ts";

console.log("===============================================================================");
console.log("   LIVE MARKET DATA PIPELINE & DESK RISK EXECUTION GATEWAY");
console.log("   Mode: PAPER BROKER (Real-Time Live Market Ticks, Virtual Balance)");
console.log("===============================================================================\n");

async function main() {
  const runner = new TradingRunner({
    initialPaperCashUsd: 10_000,
    cryptoSymbols: ["SOLUSDT", "BTCUSDT", "ETHUSDT"],
    stockSymbols: ["AAPL", "NVDA", "SPY"]
  });

  console.log("1. STREAMING LIVE CRYPTO FEEDS & RUNNING RISK GATES");
  console.log("-----------------------------------------------------");
  for (const sym of ["SOLUSDT", "BTCUSDT", "ETHUSDT"]) {
    try {
      await runner.runLiveCycle(sym, "crypto");
    } catch (err: unknown) {
      console.error(`Error processing ${sym}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\n2. STREAMING LIVE STOCK FEEDS & RUNNING RISK GATES");
  console.log("-----------------------------------------------------");
  for (const sym of ["AAPL", "NVDA", "SPY"]) {
    try {
      await runner.runLiveCycle(sym, "stock");
    } catch (err: unknown) {
      console.error(`Error processing ${sym}:`, err instanceof Error ? err.message : err);
    }
  }

  await runner.printSummary();
}

main().catch(console.error);
