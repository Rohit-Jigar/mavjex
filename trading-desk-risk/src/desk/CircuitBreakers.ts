import type { AnyOrderRequest, GateDecision } from "../types.ts";

export interface CircuitBreaker {
  readonly name: string;
  check(order: AnyOrderRequest): GateDecision;
}

export interface DeskState {
  dailyRealizedPnlUsd: number;
  dailyUnrealizedPnlUsd: number;
  consecutiveLosses: number;
  lastKnownLiquidityBySymbol: Map<string, number>;
}

/**
 * Breaker 1: Daily Loss Cap
 * Halts desk operations when aggregate daily loss hits threshold.
 */
export class DailyLossCapBreaker implements CircuitBreaker {
  readonly name = "DailyLossCapBreaker";
  private readonly maxDailyLossUsd: number;
  private readonly getDeskState: () => DeskState;

  constructor(maxDailyLossUsd: number, getDeskState: () => DeskState) {
    this.maxDailyLossUsd = maxDailyLossUsd;
    this.getDeskState = getDeskState;
  }

  check(order: AnyOrderRequest): GateDecision {
    const state = this.getDeskState();
    const totalDailyLoss = -(state.dailyRealizedPnlUsd + Math.min(0, state.dailyUnrealizedPnlUsd));

    if (totalDailyLoss >= this.maxDailyLossUsd) {
      return {
        allowed: false,
        ruleViolated: this.name,
        reason: `Daily loss limit reached ($${totalDailyLoss.toFixed(2)} >= $${this.maxDailyLossUsd.toFixed(2)}). All new entries halted.`,
        metadata: { totalDailyLoss, maxDailyLossUsd: this.maxDailyLossUsd }
      };
    }

    return { allowed: true };
  }
}

/**
 * Breaker 2: Consecutive-Loss Breaker
 * Halts desk when consecutive loss streak exceeds safety threshold.
 */
export class ConsecutiveLossBreaker implements CircuitBreaker {
  readonly name = "ConsecutiveLossBreaker";
  private readonly maxConsecutiveLosses: number;
  private readonly getDeskState: () => DeskState;

  constructor(maxConsecutiveLosses: number, getDeskState: () => DeskState) {
    this.maxConsecutiveLosses = maxConsecutiveLosses;
    this.getDeskState = getDeskState;
  }

  check(order: AnyOrderRequest): GateDecision {
    const state = this.getDeskState();
    if (state.consecutiveLosses >= this.maxConsecutiveLosses) {
      return {
        allowed: false,
        ruleViolated: this.name,
        reason: `Consecutive loss breaker tripped (${state.consecutiveLosses} >= ${this.maxConsecutiveLosses} losing trades). Desk cooling down.`,
        metadata: { consecutiveLosses: state.consecutiveLosses, limit: this.maxConsecutiveLosses }
      };
    }

    return { allowed: true };
  }
}

/**
 * Breaker 3: Liquidity-Drop Breaker
 * Stops orders if pool liquidity is below absolute threshold or drops sharply.
 */
export class LiquidityDropBreaker implements CircuitBreaker {
  readonly name = "LiquidityDropBreaker";
  private readonly minLiquidityUsd: number;
  private readonly maxDropPct: number;
  private readonly getDeskState: () => DeskState;

  constructor(minLiquidityUsd: number, maxDropPct: number, getDeskState: () => DeskState) {
    this.minLiquidityUsd = minLiquidityUsd;
    this.maxDropPct = maxDropPct;
    this.getDeskState = getDeskState;
  }

  check(order: AnyOrderRequest): GateDecision {
    const currentLiquidity = order.feed.poolLiquidityUsd;

    // Check minimum absolute floor
    if (currentLiquidity < this.minLiquidityUsd) {
      return {
        allowed: false,
        ruleViolated: this.name,
        reason: `Pool liquidity ($${currentLiquidity.toFixed(2)}) is below minimum safe threshold ($${this.minLiquidityUsd.toFixed(2)}).`,
        metadata: { currentLiquidity, minLiquidityUsd: this.minLiquidityUsd }
      };
    }

    // Check sudden drop against previous recorded liquidity
    const state = this.getDeskState();
    const prevLiquidity = state.lastKnownLiquidityBySymbol.get(order.symbol);
    if (prevLiquidity !== undefined && prevLiquidity > 0) {
      const dropPct = ((prevLiquidity - currentLiquidity) / prevLiquidity) * 100;
      if (dropPct >= this.maxDropPct) {
        return {
          allowed: false,
          ruleViolated: this.name,
          reason: `Sudden liquidity drain detected (${dropPct.toFixed(1)}% drop from $${prevLiquidity.toFixed(2)} to $${currentLiquidity.toFixed(2)}). Entry blocked.`,
          metadata: { prevLiquidity, currentLiquidity, dropPct }
        };
      }
    }

    return { allowed: true };
  }
}

/**
 * Breaker 4: Feed-Lag Breaker
 * Stops new entries when market data or signal feed is older than N seconds.
 */
export class FeedLagBreaker implements CircuitBreaker {
  readonly name = "FeedLagBreaker";
  private readonly maxLagMs: number;

  constructor(maxLagMs: number) {
    this.maxLagMs = maxLagMs;
  }

  check(order: AnyOrderRequest): GateDecision {
    const lagMs = order.requestTimestampMs - order.feed.lastFeedTimestampMs;

    if (lagMs > this.maxLagMs) {
      return {
        allowed: false,
        ruleViolated: this.name,
        reason: `Market feed is stale by ${(lagMs / 1000).toFixed(2)}s (max allowed ${(this.maxLagMs / 1000).toFixed(2)}s). New entry rejected.`,
        metadata: { lagMs, maxLagMs: this.maxLagMs }
      };
    }

    return { allowed: true };
  }
}
