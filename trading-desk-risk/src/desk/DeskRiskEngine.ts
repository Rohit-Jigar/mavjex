import type { AnyOrderRequest, GateDecision } from "../types.ts";
import {
  type CircuitBreaker,
  DailyLossCapBreaker,
  ConsecutiveLossBreaker,
  LiquidityDropBreaker,
  FeedLagBreaker,
  type DeskState
} from "./CircuitBreakers.ts";
import { AuditLogger } from "./AuditLogger.ts";

export interface DeskRiskEngineConfig {
  maxDailyLossUsd: number;
  maxConsecutiveLosses: number;
  minLiquidityUsd: number;
  maxLiquidityDropPct: number;
  maxFeedLagMs: number;
}

export class DeskRiskEngine {
  private readonly state: DeskState = {
    dailyRealizedPnlUsd: 0,
    dailyUnrealizedPnlUsd: 0,
    consecutiveLosses: 0,
    lastKnownLiquidityBySymbol: new Map<string, number>()
  };

  private readonly breakers: CircuitBreaker[];
  readonly logger = new AuditLogger();

  constructor(config: DeskRiskEngineConfig) {
    this.breakers = [
      new DailyLossCapBreaker(config.maxDailyLossUsd, () => this.state),
      new ConsecutiveLossBreaker(config.maxConsecutiveLosses, () => this.state),
      new LiquidityDropBreaker(config.minLiquidityUsd, config.maxLiquidityDropPct, () => this.state),
      new FeedLagBreaker(config.maxFeedLagMs)
    ];
  }

  getState(): Readonly<DeskState> {
    return { ...this.state };
  }

  updatePnl(tradePnlUsd: number): void {
    this.state.dailyRealizedPnlUsd += tradePnlUsd;
    if (tradePnlUsd < 0) {
      this.state.consecutiveLosses += 1;
    } else if (tradePnlUsd > 0) {
      this.state.consecutiveLosses = 0;
    }
  }

  recordLiquidity(symbol: string, liquidityUsd: number): void {
    this.state.lastKnownLiquidityBySymbol.set(symbol, liquidityUsd);
  }

  resetDailyCounters(): void {
    this.state.dailyRealizedPnlUsd = 0;
    this.state.dailyUnrealizedPnlUsd = 0;
    this.state.consecutiveLosses = 0;
  }

  /**
   * Evaluates desk-level circuit breakers on an order request.
   * If any breaker trips, the order is blocked immediately.
   */
  evaluateDeskGates(order: AnyOrderRequest): GateDecision {
    for (const breaker of this.breakers) {
      const decision = breaker.check(order);
      if (!decision.allowed) {
        this.logger.record(order, decision);
        return decision;
      }
    }

    // Update liquidity snapshot if passed
    this.recordLiquidity(order.symbol, order.feed.poolLiquidityUsd);
    return { allowed: true };
  }
}
