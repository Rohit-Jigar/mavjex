import { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";
import { GamblerBot } from "../bots/GamblerBot.ts";
import { SpyBot } from "../bots/SpyBot.ts";
import { HouseBot } from "../bots/HouseBot.ts";
import { MarketDataFeed } from "./MarketDataFeed.ts";
import { PaperBroker } from "./PaperBroker.ts";
import { LiveGateway } from "./LiveGateway.ts";
import type { GamblerOrderRequest, SpyOrderRequest } from "../types.ts";

export interface RunnerOptions {
  initialPaperCashUsd: number;
  cryptoSymbols: string[];
  stockSymbols: string[];
}

export class TradingRunner {
  private readonly feed = new MarketDataFeed();
  private readonly deskEngine: DeskRiskEngine;
  private readonly gambler: GamblerBot;
  private readonly spy: SpyBot;
  private readonly house: HouseBot;
  private readonly gateway: LiveGateway;
  private readonly paperBroker: PaperBroker;

  constructor(options: RunnerOptions) {
    this.deskEngine = new DeskRiskEngine({
      maxDailyLossUsd: 1_000,
      maxConsecutiveLosses: 3,
      minLiquidityUsd: 20_000,
      maxLiquidityDropPct: 35,
      maxFeedLagMs: 5_000 // 5 seconds max feed staleness
    });

    this.paperBroker = new PaperBroker(options.initialPaperCashUsd, this.deskEngine);
    this.gateway = new LiveGateway("PAPER", this.paperBroker, this.deskEngine);

    this.gambler = new GamblerBot(
      {
        totalBookCapitalUsd: options.initialPaperCashUsd,
        maxBookPctPerTrade: 0.05, // 5% max size per trade
        maxTaxPct: 5
      },
      this.deskEngine
    );

    this.spy = new SpyBot(
      {
        maxChasePct: 15,
        maxAllocationPerWalletUsd: 2_000,
        consecutiveLossesToDemote: 3
      },
      this.deskEngine
    );

    this.house = new HouseBot(
      {
        maxDailyLaunchBudgetUsd: 500,
        minSafetyFactor: 2.0
      },
      this.deskEngine
    );
  }

  async runLiveCycle(symbol: string, type: "crypto" | "stock"): Promise<void> {
    const feedData =
      type === "crypto"
        ? await this.feed.fetchLiveCrypto(symbol)
        : await this.feed.fetchLiveStock(symbol);

    const now = Date.now();
    const lagMs = now - feedData.lastFeedTimestampMs;

    console.log(
      `[LIVE FEED] ${feedData.symbol.padEnd(8)} | Price: $${feedData.currentPrice.toFixed(
        type === "crypto" ? 4 : 2
      )} | Feed Lag: ${lagMs}ms | Est. Liquidity: $${(feedData.poolLiquidityUsd / 1_000).toFixed(0)}k`
    );

    // 1. Evaluate a Gambler Order (directional entry)
    const gamblerOrder: GamblerOrderRequest = {
      id: `ord-gambler-${Date.now()}`,
      botType: "GAMBLER",
      side: "BUY",
      symbol: feedData.symbol,
      requestedAmountUsd: 250,
      quotePrice: feedData.currentPrice,
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

    const decision = this.gambler.evaluateOrder(gamblerOrder);
    if (decision.allowed) {
      const fill = await this.gateway.routeOrder(gamblerOrder, decision);
      console.log(
        `   └─ ✅ EXECUTED (Paper): BUY ${fill.quantity.toFixed(4)} ${fill.symbol} @ $${fill.fillPrice.toFixed(
          4
        )} (Total: $${fill.totalUsd.toFixed(2)}, Fee: $${fill.feeUsd.toFixed(3)})`
      );
    } else {
      console.log(`   └─ ❌ REJECTED by Risk Gate: [${decision.ruleViolated}] ${decision.reason}`);
    }
  }

  async printSummary(): Promise<void> {
    const summary = this.paperBroker.getPortfolioSummary(new Map());
    console.log("\n=======================================================");
    console.log("            PORTFOLIO RISK & EQUITY SUMMARY            ");
    console.log("=======================================================");
    console.log(`Cash Balance:      $${summary.cashUsd.toFixed(2)}`);
    console.log(`Open Positions:    ${this.paperBroker.getPositions().length} asset(s)`);
    for (const pos of this.paperBroker.getPositions()) {
      console.log(
        `  * ${pos.symbol}: ${pos.quantity.toFixed(4)} units @ avg entry $${pos.averageEntryPrice.toFixed(4)}`
      );
    }
    console.log(`Total Portfolio:   $${summary.totalEquityUsd.toFixed(2)}`);
    console.log(`Realized PnL:      $${summary.totalRealizedPnlUsd.toFixed(2)}`);
    console.log("=======================================================\n");
  }
}
