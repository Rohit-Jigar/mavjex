import type { OrderSide, BaseOrderRequest } from "../types.ts";
import type { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";

export interface Position {
  symbol: string;
  quantity: number;
  averageEntryPrice: number;
  totalCostUsd: number;
}

export interface TradeFill {
  fillId: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  requestedPrice: number;
  fillPrice: number;
  slippagePct: number;
  feeUsd: number;
  totalUsd: number;
  timestampMs: number;
  realizedPnlUsd?: number;
}

export class PaperBroker {
  private cashUsd: number;
  private readonly initialCashUsd: number;
  private readonly positions = new Map<string, Position>();
  private readonly fills: TradeFill[] = [];
  private readonly feeRatePct: number;
  private readonly slippageBps: number; // e.g. 5 bps = 0.05%
  private readonly deskEngine: DeskRiskEngine;

  constructor(
    initialCashUsd: number,
    deskEngine: DeskRiskEngine,
    feeRatePct = 0.1, // 0.1% taker fee
    slippageBps = 5
  ) {
    this.cashUsd = initialCashUsd;
    this.initialCashUsd = initialCashUsd;
    this.deskEngine = deskEngine;
    this.feeRatePct = feeRatePct;
    this.slippageBps = slippageBps;
  }

  getCashBalance(): number {
    return this.cashUsd;
  }

  getPositions(): readonly Position[] {
    return Array.from(this.positions.values());
  }

  getPosition(symbol: string): Position | undefined {
    return this.positions.get(symbol);
  }

  getFills(): readonly TradeFill[] {
    return [...this.fills];
  }

  getPortfolioSummary(currentPrices: Map<string, number>): {
    cashUsd: number;
    positionsValueUsd: number;
    totalEquityUsd: number;
    unrealizedPnlUsd: number;
    totalRealizedPnlUsd: number;
  } {
    let positionsValueUsd = 0;
    let unrealizedPnlUsd = 0;

    for (const pos of this.positions.values()) {
      const currentPrice = currentPrices.get(pos.symbol) || pos.averageEntryPrice;
      const currentVal = pos.quantity * currentPrice;
      positionsValueUsd += currentVal;
      unrealizedPnlUsd += currentVal - pos.totalCostUsd;
    }

    const totalEquityUsd = this.cashUsd + positionsValueUsd;
    const totalRealizedPnlUsd = totalEquityUsd - this.initialCashUsd - unrealizedPnlUsd;

    return {
      cashUsd: this.cashUsd,
      positionsValueUsd,
      totalEquityUsd,
      unrealizedPnlUsd,
      totalRealizedPnlUsd
    };
  }

  /**
   * Executes an order in paper mode with realistic slippage and fees.
   */
  executeOrder(order: BaseOrderRequest): TradeFill {
    const slippageMultiplier =
      order.side === "BUY"
        ? 1 + this.slippageBps / 10_000
        : 1 - this.slippageBps / 10_000;

    const fillPrice = order.quotePrice * slippageMultiplier;
    const slippagePct = ((fillPrice - order.quotePrice) / order.quotePrice) * 100;
    const quantity = order.requestedAmountUsd / fillPrice;
    const notionalUsd = quantity * fillPrice;
    const feeUsd = notionalUsd * (this.feeRatePct / 100);

    let realizedPnlUsd: number | undefined;

    if (order.side === "BUY") {
      const totalCost = notionalUsd + feeUsd;
      if (totalCost > this.cashUsd) {
        throw new Error(
          `Insufficient paper funds: required $${totalCost.toFixed(2)}, available cash $${this.cashUsd.toFixed(2)}`
        );
      }
      this.cashUsd -= totalCost;

      const existing = this.positions.get(order.symbol);
      if (existing) {
        const newQty = existing.quantity + quantity;
        const newTotalCost = existing.totalCostUsd + notionalUsd;
        existing.quantity = newQty;
        existing.totalCostUsd = newTotalCost;
        existing.averageEntryPrice = newTotalCost / newQty;
      } else {
        this.positions.set(order.symbol, {
          symbol: order.symbol,
          quantity,
          averageEntryPrice: fillPrice,
          totalCostUsd: notionalUsd
        });
      }
    } else {
      // SELL / EXIT
      const existing = this.positions.get(order.symbol);
      if (!existing || existing.quantity <= 0) {
        throw new Error(`Cannot execute paper SELL: no active position for ${order.symbol}`);
      }

      const sellQty = Math.min(existing.quantity, quantity);
      const proceeds = sellQty * fillPrice - feeUsd;
      const costBasis = (sellQty / existing.quantity) * existing.totalCostUsd;
      realizedPnlUsd = proceeds - costBasis;

      this.cashUsd += proceeds;
      existing.quantity -= sellQty;
      existing.totalCostUsd -= costBasis;

      if (existing.quantity <= 0.000001) {
        this.positions.delete(order.symbol);
      }

      // Propagate realized trade PnL back to desk risk engine
      this.deskEngine.updatePnl(realizedPnlUsd);
    }

    const fill: TradeFill = {
      fillId: `fill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity,
      requestedPrice: order.quotePrice,
      fillPrice,
      slippagePct,
      feeUsd,
      totalUsd: notionalUsd,
      timestampMs: Date.now(),
      realizedPnlUsd
    };

    this.fills.push(fill);
    return fill;
  }
}
