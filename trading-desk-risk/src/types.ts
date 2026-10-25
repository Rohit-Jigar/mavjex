/**
 * Domain types for Desk-Level Risk Gates & Bot Execution Rules.
 */

export type BotType = "GAMBLER" | "HOUSE" | "SPY";

export type OrderSide = "BUY" | "SELL";

export interface TokenContractAudit {
  readonly isHoneypot: boolean;
  readonly mintAuthorityRenounced: boolean;
  readonly buyTaxPct: number;
  readonly sellTaxPct: number;
  readonly tradingEnabled: boolean;
}

export interface MarketFeedData {
  readonly symbol: string;
  readonly currentPrice: number;
  readonly poolLiquidityUsd: number;
  readonly lastFeedTimestampMs: number;
}

export interface BaseOrderRequest {
  readonly id: string;
  readonly botType: BotType;
  readonly side: OrderSide;
  readonly symbol: string;
  readonly requestedAmountUsd: number;
  readonly quotePrice: number;
  readonly requestTimestampMs: number;
  readonly feed: MarketFeedData;
}

export interface GamblerOrderRequest extends BaseOrderRequest {
  readonly botType: "GAMBLER";
  readonly contractAudit: TokenContractAudit;
}

export interface HouseLaunchRequest extends BaseOrderRequest {
  readonly botType: "HOUSE";
  readonly isHoldingOwnSupply: boolean;
  readonly isSellingOwnSupply: boolean;
  readonly estimatedLaunchCostUsd: number;
  readonly feeRatePct: number;
  readonly expectedVolumeUsd: number;
}

export interface SpyOrderRequest extends BaseOrderRequest {
  readonly botType: "SPY";
  readonly leaderWallet: string;
  readonly leaderEntryPrice: number;
  readonly leaderEntryTimestampMs: number;
  readonly isLeaderExit: boolean;
}

export type AnyOrderRequest = GamblerOrderRequest | HouseLaunchRequest | SpyOrderRequest;

export type GateDecision =
  | {
      readonly allowed: true;
      readonly adjustedAmountUsd?: number;
      readonly notes?: string;
    }
  | {
      readonly allowed: false;
      readonly ruleViolated: string;
      readonly reason: string;
      readonly metadata?: Record<string, unknown>;
    };

export interface AuditLogEntry {
  readonly timestampMs: number;
  readonly orderId: string;
  readonly botType: BotType;
  readonly action: "APPROVED" | "REJECTED" | "TRIPPED";
  readonly rule: string;
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}
