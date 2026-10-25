import type { HouseLaunchRequest, GateDecision } from "../types.ts";
import type { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";

export interface HouseConfig {
  readonly maxDailyLaunchBudgetUsd: number;
  readonly minSafetyFactor: number; // e.g. 2.0
}

export class HouseBot {
  private dailySpentLaunchBudgetUsd = 0;
  private readonly config: HouseConfig;
  private readonly deskEngine: DeskRiskEngine;

  constructor(config: HouseConfig, deskEngine: DeskRiskEngine) {
    this.config = config;
    this.deskEngine = deskEngine;
  }

  getDailySpentBudget(): number {
    return this.dailySpentLaunchBudgetUsd;
  }

  resetDailyBudget(): void {
    this.dailySpentLaunchBudgetUsd = 0;
  }

  evaluateLaunch(request: HouseLaunchRequest): GateDecision {
    // 1. Evaluate Desk-Level Circuit Breakers
    const deskDecision = this.deskEngine.evaluateDeskGates(request);
    if (!deskDecision.allowed) {
      return deskDecision;
    }

    // 2. Hard Rule 1: Never hold or sell own supply (Fees only)
    if (request.isHoldingOwnSupply || request.isSellingOwnSupply) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "HouseSupplyIntegrityGate",
        reason: "House bot is strictly forbidden from holding or selling token supply. Income must be transactional fees only to eliminate rug/reputational risk.",
        metadata: {
          isHoldingOwnSupply: request.isHoldingOwnSupply,
          isSellingOwnSupply: request.isSellingOwnSupply
        }
      };
      this.deskEngine.logger.record(request, decision);
      return decision;
    }

    // 3. Hard Rule 2: Break-even gate with Safety Factor of 2
    // fee_rate * expected_volume >= 2 * cost_per_launch
    const expectedFeeRevenueUsd = (request.feeRatePct / 100) * request.expectedVolumeUsd;
    const requiredBreakEvenUsd = request.estimatedLaunchCostUsd * this.config.minSafetyFactor;

    if (expectedFeeRevenueUsd < requiredBreakEvenUsd) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "HouseBreakEvenSafetyGate",
        reason: `Expected fee revenue ($${expectedFeeRevenueUsd.toFixed(2)}) fails the 2.0x safety factor requirement over launch costs ($${request.estimatedLaunchCostUsd.toFixed(2)} cost requires $${requiredBreakEvenUsd.toFixed(2)} in expected fees).`,
        metadata: {
          expectedFeeRevenueUsd,
          requiredBreakEvenUsd,
          costPerLaunch: request.estimatedLaunchCostUsd,
          safetyFactor: this.config.minSafetyFactor
        }
      };
      this.deskEngine.logger.record(request, decision);
      return decision;
    }

    // 4. Hard Rule 3: Per-day launch budget hard stop
    if (this.dailySpentLaunchBudgetUsd + request.estimatedLaunchCostUsd > this.config.maxDailyLaunchBudgetUsd) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "HouseDailyLaunchBudgetCap",
        reason: `Daily launch budget cap exceeded ($${this.dailySpentLaunchBudgetUsd.toFixed(2)} spent + $${request.estimatedLaunchCostUsd.toFixed(2)} > $${this.config.maxDailyLaunchBudgetUsd.toFixed(2)} max).`,
        metadata: {
          dailySpent: this.dailySpentLaunchBudgetUsd,
          requestedCost: request.estimatedLaunchCostUsd,
          budgetCap: this.config.maxDailyLaunchBudgetUsd
        }
      };
      this.deskEngine.logger.record(request, decision);
      return decision;
    }

    // Approved: Deduct from budget
    this.dailySpentLaunchBudgetUsd += request.estimatedLaunchCostUsd;

    const approvedDecision: GateDecision = {
      allowed: true,
      notes: `House launch approved (Fees only, $${expectedFeeRevenueUsd.toFixed(2)} expected fees >= $${requiredBreakEvenUsd.toFixed(2)} cost clearance)`
    };
    this.deskEngine.logger.record(request, approvedDecision);
    return approvedDecision;
  }
}
