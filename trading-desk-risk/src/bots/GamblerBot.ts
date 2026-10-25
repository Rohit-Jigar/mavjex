import type { GamblerOrderRequest, GateDecision } from "../types.ts";
import type { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";

export interface GamblerConfig {
  readonly totalBookCapitalUsd: number;
  readonly maxBookPctPerTrade: number; // e.g. 0.02 = 2% of whole book
  readonly maxTaxPct: number;          // e.g. 5 = 5% max tax
}

export class GamblerBot {
  private readonly config: GamblerConfig;
  private readonly deskEngine: DeskRiskEngine;

  constructor(config: GamblerConfig, deskEngine: DeskRiskEngine) {
    this.config = config;
    this.deskEngine = deskEngine;
  }

  evaluateOrder(order: GamblerOrderRequest): GateDecision {
    // 1. Evaluate Desk-Level Circuit Breakers first
    const deskDecision = this.deskEngine.evaluateDeskGates(order);
    if (!deskDecision.allowed) {
      return deskDecision;
    }

    // 2. Hard Rule: Fixed % Sizing (Prevents sizing up / Martingale on losing streak)
    const maxAllowedSizeUsd = this.config.totalBookCapitalUsd * this.config.maxBookPctPerTrade;
    if (order.requestedAmountUsd > maxAllowedSizeUsd) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "GamblerFixedPercentSizingGate",
        reason: `Requested position size $${order.requestedAmountUsd.toFixed(2)} exceeds strict max allowed $${maxAllowedSizeUsd.toFixed(2)} (${(this.config.maxBookPctPerTrade * 100).toFixed(1)}% of book). Sizing up on losing streaks is forbidden.`,
        metadata: {
          requestedAmountUsd: order.requestedAmountUsd,
          maxAllowedSizeUsd,
          bookCapitalUsd: this.config.totalBookCapitalUsd
        }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    // 3. Hard Rule: Contract Gates (Honeypot, Mint authority, Tax limits)
    const { contractAudit } = order;

    if (contractAudit.isHoneypot) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "GamblerContractGate_Honeypot",
        reason: `Contract audit flagged token ${order.symbol} as a honeypot. Execution blocked.`,
        metadata: { symbol: order.symbol }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    if (!contractAudit.mintAuthorityRenounced) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "GamblerContractGate_MintAuthority",
        reason: `Mint authority is not renounced for ${order.symbol}. Unlimited dilution risk.`,
        metadata: { symbol: order.symbol }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    if (!contractAudit.tradingEnabled) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "GamblerContractGate_TradingDisabled",
        reason: `Trading is not enabled or transfer is paused for ${order.symbol}.`,
        metadata: { symbol: order.symbol }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    if (contractAudit.buyTaxPct > this.config.maxTaxPct || contractAudit.sellTaxPct > this.config.maxTaxPct) {
      const decision: GateDecision = {
        allowed: false,
        ruleViolated: "GamblerContractGate_ExcessiveTax",
        reason: `Contract taxes (Buy: ${contractAudit.buyTaxPct}%, Sell: ${contractAudit.sellTaxPct}%) exceed maximum allowed limit of ${this.config.maxTaxPct}%.`,
        metadata: { buyTaxPct: contractAudit.buyTaxPct, sellTaxPct: contractAudit.sellTaxPct, maxTax: this.config.maxTaxPct }
      };
      this.deskEngine.logger.record(order, decision);
      return decision;
    }

    const approvedDecision: GateDecision = {
      allowed: true,
      notes: `Gambler order passed contract gates and fixed % book size ($${order.requestedAmountUsd.toFixed(2)} <= $${maxAllowedSizeUsd.toFixed(2)})`
    };
    this.deskEngine.logger.record(order, approvedDecision);
    return approvedDecision;
  }
}
