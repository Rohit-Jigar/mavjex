import type { SpyOrderRequest, GateDecision } from "../types.ts";
import type { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";

export interface SpyConfig {
  readonly maxChasePct: number;             // e.g. 15 = 15% max chase above leader entry
  readonly maxAllocationPerWalletUsd: number; // e.g. $1,000 max per wallet
  readonly consecutiveLossesToDemote: number; // e.g. 3
}

export interface WalletPerformance {
  consecutiveLosses: number;
  totalCopies: number;
  currentAllocatedUsd: number;
  isDemoted: boolean;
}

export class SpyBot {
  private readonly walletRegistry = new Map<string, WalletPerformance>();
  private readonly config: SpyConfig;
  private readonly deskEngine: DeskRiskEngine;

  constructor(config: SpyConfig, deskEngine: DeskRiskEngine) {
    this.config = config;
    this.deskEngine = deskEngine;
  }

  getWalletStats(wallet: string): WalletPerformance {
    let stats = this.walletRegistry.get(wallet);
    if (!stats) {
      stats = {
        consecutiveLosses: 0,
        totalCopies: 0,
        currentAllocatedUsd: 0,
        isDemoted: false
      };
      this.walletRegistry.set(wallet, stats);
    }
    return stats;
  }

  recordCopyTradeResult(wallet: string, realizedPnlUsd: number, returnedAllocationUsd: number): void {
    const stats = this.getWalletStats(wallet);
    stats.currentAllocatedUsd = Math.max(0, stats.currentAllocatedUsd - returnedAllocationUsd);

    if (realizedPnlUsd < 0) {
      stats.consecutiveLosses += 1;
      if (stats.consecutiveLosses >= this.config.consecutiveLossesToDemote) {
        stats.isDemoted = true;
      }
    } else if (realizedPnlUsd > 0) {
      stats.consecutiveLosses = 0;
    }
  }

  evaluateCopyTrade(order: SpyOrderRequest): GateDecision {
    // 1. Evaluate Desk-Level Circuit Breakers
    const deskDecision = this.deskEngine.evaluateDeskGates(order);
    if (!deskDecision.allowed) {
      return deskDecision;
    }

    const walletStats = this.getWalletStats(order.leaderWallet);

    // 2. Hard Rule: Demote wallet after N consecutive losses
    if (walletStats.isDemoted) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "SpyWalletDemotionGate",
        reason: `Leader wallet ${order.leaderWallet} is demoted/blacklisted after ${walletStats.consecutiveLosses} consecutive losing copies. Copy trade rejected.`,
        metadata: {
          wallet: order.leaderWallet,
          consecutiveLosses: walletStats.consecutiveLosses
        }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    // 3. Hard Rule: Mirror Exits, not only entries
    if (order.isLeaderExit) {
      if (order.side !== "SELL") {
        const decision: GateDecision = {
          allowed: false,
          ruleViolated: "SpyMirrorExitIntegrityGate",
          reason: `Leader wallet ${order.leaderWallet} is exiting/selling. Cannot buy into leader's exit liquidity.`,
          metadata: { wallet: order.leaderWallet }
        };
        this.deskEngine.logger.record(order, decision);
        return decision;
      }
      // An exit order is approved immediately
      const approvedExit: GateDecision = {
        allowed: true,
        notes: `Mirrored exit for wallet ${order.leaderWallet}. Clearing position.`
      };
      this.deskEngine.logger.record(order, approvedExit);
      return approvedExit;
    }

    // 4. Hard Rule: Max Chase Gate
    // If fill would be more than 15% above the leader's entry, skip the trade.
    // Log wallet + lag.
    const priceDiff = order.quotePrice - order.leaderEntryPrice;
    const rawChasePct = (priceDiff / order.leaderEntryPrice) * 100;
    const chasePct = Math.round(rawChasePct * 10000) / 10000;
    const lagMs = order.requestTimestampMs - order.leaderEntryTimestampMs;

    if (chasePct > this.config.maxChasePct) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "SpyMaxChaseGate",
        reason: `Copy quote $${order.quotePrice.toFixed(4)} is +${chasePct.toFixed(1)}% above leader entry $${order.leaderEntryPrice.toFixed(4)} (max allowed +${this.config.maxChasePct}%). Order skipped to prevent becoming exit liquidity.`,
        metadata: {
          wallet: order.leaderWallet,
          leaderEntry: order.leaderEntryPrice,
          copyQuote: order.quotePrice,
          chasePct,
          maxChasePct: this.config.maxChasePct,
          lagMs,
          lagSeconds: (lagMs / 1000).toFixed(2)
        }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    // 5. Hard Rule: Cap Allocation per Wallet
    if (walletStats.currentAllocatedUsd + order.requestedAmountUsd > this.config.maxAllocationPerWalletUsd) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "SpyPerWalletAllocationCap",
        reason: `Allocation limit for wallet ${order.leaderWallet} exceeded ($${walletStats.currentAllocatedUsd.toFixed(2)} active + $${order.requestedAmountUsd.toFixed(2)} > $${this.config.maxAllocationPerWalletUsd.toFixed(2)} cap).`,
        metadata: {
          wallet: order.leaderWallet,
          currentAllocatedUsd: walletStats.currentAllocatedUsd,
          requestedAmountUsd: order.requestedAmountUsd,
          maxAllocationPerWalletUsd: this.config.maxAllocationPerWalletUsd
        }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    // Approved: Update allocation
    walletStats.currentAllocatedUsd += order.requestedAmountUsd;
    walletStats.totalCopies += 1;

    const approvedDecision: GateDecision = {
      allowed: true,
      notes: `Spy copy approved for wallet ${order.leaderWallet} (chase +${chasePct.toFixed(1)}% <= ${this.config.maxChasePct}%, lag ${(lagMs / 1000).toFixed(2)}s)`
    };
    this.deskEngine.logger.record(order, approvedDecision);
    return approvedDecision;
  }
}
