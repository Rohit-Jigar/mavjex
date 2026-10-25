import type { OrderSide, BaseOrderRequest } from "../types.ts";
import type { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";

export interface Position {
  symbol: string;
  side: OrderSide;
  leverage: number;
  marginUsd: number;
  notionalUsd: number;
  quantity: number;
  averageEntryPrice: number;
  liquidationPrice: number;
  totalCostUsd: number;
}

export interface TradeFill {
  fillId: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  leverage: number;
  marginUsd: number;
  quantity: number;
  requestedPrice: number;
  fillPrice: number;
  liquidationPrice: number;
  slippagePct: number;
  feeUsd: number;
  totalUsd: number;
  timestampMs: number;
  realizedPnlUsd?: number;
  orderType?: "MARKET" | "LIMIT";
}

export interface LimitOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  amountUsd: number;
  limitPrice: number;
  leverage: number;
  reservedMarginUsd: number;
  timestampMs: number;
  status: "PENDING" | "FILLED" | "CANCELLED";
}

export class PaperBroker {
  private cashUsd: number;
  private readonly initialCashUsd: number;
  private readonly positions = new Map<string, Position>();
  private readonly fills: TradeFill[] = [];
  private readonly limitOrders = new Map<string, LimitOrder>();
  private readonly feeRatePct: number;
  private readonly slippageBps: number;
  private readonly deskEngine: DeskRiskEngine;

  constructor(
    initialCashUsd = 100_000_000,
    deskEngine: DeskRiskEngine,
    feeRatePct = 0.05,
    slippageBps = 3
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

  getLimitOrders(): readonly LimitOrder[] {
    return Array.from(this.limitOrders.values());
  }

  getPendingLimitOrders(): readonly LimitOrder[] {
    return Array.from(this.limitOrders.values()).filter((o) => o.status === "PENDING");
  }

  resetBalance(amountUsd = 100_000_000): void {
    this.cashUsd = amountUsd;
    this.positions.clear();
    this.fills.length = 0;
    this.limitOrders.clear();
    this.deskEngine.resetDailyCounters();
  }

  static calculateLiquidationPrice(entryPrice: number, side: OrderSide, leverage: number): number {
    const mmr = 0.005; // 0.5% maintenance margin rate
    if (leverage <= 1) {
      return side === "BUY" ? 0 : entryPrice * 2;
    }
    if (side === "BUY") {
      const liqPrice = entryPrice * (1 - (1 / leverage - mmr));
      return Math.max(0, liqPrice);
    } else {
      const liqPrice = entryPrice * (1 + (1 / leverage - mmr));
      return liqPrice;
    }
  }

  getPortfolioSummary(currentPrices: Map<string, number>): {
    cashUsd: number;
    marginUsedUsd: number;
    positionsValueUsd: number;
    totalEquityUsd: number;
    unrealizedPnlUsd: number;
    totalRealizedPnlUsd: number;
  } {
    let marginUsedUsd = 0;
    let unrealizedPnlUsd = 0;

    for (const pos of this.positions.values()) {
      marginUsedUsd += pos.marginUsd;
      const currentPrice = currentPrices.get(pos.symbol) || pos.averageEntryPrice;
      const priceDelta = currentPrice - pos.averageEntryPrice;
      const posUnrealized =
        pos.side === "BUY"
          ? (priceDelta / pos.averageEntryPrice) * pos.notionalUsd
          : (-priceDelta / pos.averageEntryPrice) * pos.notionalUsd;

      unrealizedPnlUsd += posUnrealized;
    }

    // Pending limit order reserved margin
    for (const lo of this.limitOrders.values()) {
      if (lo.status === "PENDING") {
        marginUsedUsd += lo.reservedMarginUsd;
      }
    }

    const totalEquityUsd = this.cashUsd + marginUsedUsd + unrealizedPnlUsd;
    const totalRealizedPnlUsd = totalEquityUsd - this.initialCashUsd - unrealizedPnlUsd;

    return {
      cashUsd: this.cashUsd,
      marginUsedUsd,
      positionsValueUsd: marginUsedUsd + unrealizedPnlUsd,
      totalEquityUsd,
      unrealizedPnlUsd,
      totalRealizedPnlUsd
    };
  }

  /**
   * Executes a market order in paper mode with leverage, margin reservations, slippage, and fee deductions.
   */
  executeOrder(order: BaseOrderRequest & { leverage?: number; orderType?: "MARKET" | "LIMIT" }): TradeFill {
    const leverage = Math.max(1, Math.min(100, order.leverage || 1));
    const notionalUsd = order.requestedAmountUsd;
    const requiredMarginUsd = notionalUsd / leverage;

    const slippageMultiplier =
      order.side === "BUY"
        ? 1 + this.slippageBps / 10_000
        : 1 - this.slippageBps / 10_000;

    const fillPrice = order.quotePrice * slippageMultiplier;
    const slippagePct = ((fillPrice - order.quotePrice) / order.quotePrice) * 100;
    const quantity = notionalUsd / fillPrice;
    const feeUsd = notionalUsd * (this.feeRatePct / 100);

    const existing = this.positions.get(order.symbol);
    if (existing && existing.side !== order.side) {
      // Opposite side order closes existing position
      const priceDelta = fillPrice - existing.averageEntryPrice;
      const realizedPnlUsd =
        existing.side === "BUY"
          ? (priceDelta / existing.averageEntryPrice) * existing.notionalUsd
          : (-priceDelta / existing.averageEntryPrice) * existing.notionalUsd;

      const returnedCash = existing.marginUsd + realizedPnlUsd - feeUsd;
      this.cashUsd += Math.max(0, returnedCash);
      this.deskEngine.updatePnl(realizedPnlUsd);
      this.positions.delete(order.symbol);

      const closeFill: TradeFill = {
        fillId: `close-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        leverage,
        marginUsd: existing.marginUsd,
        quantity: existing.quantity,
        requestedPrice: order.quotePrice,
        fillPrice,
        liquidationPrice: 0,
        slippagePct,
        feeUsd,
        totalUsd: existing.notionalUsd,
        timestampMs: Date.now(),
        realizedPnlUsd,
        orderType: order.orderType || "MARKET"
      };
      this.fills.push(closeFill);
      return closeFill;
    }

    // Opening or adding to same-side position
    const totalDeductionUsd = requiredMarginUsd + feeUsd;

    if (totalDeductionUsd > this.cashUsd) {
      throw new Error(
        `Insufficient paper margin: required $${totalDeductionUsd.toFixed(2)} ($${requiredMarginUsd.toFixed(2)} margin + $${feeUsd.toFixed(2)} fee), available cash $${this.cashUsd.toFixed(2)}`
      );
    }

    this.cashUsd -= totalDeductionUsd;

    const liquidationPrice = PaperBroker.calculateLiquidationPrice(fillPrice, order.side, leverage);

    if (existing && existing.side === order.side) {
      const newNotional = existing.notionalUsd + notionalUsd;
      const newMargin = existing.marginUsd + requiredMarginUsd;
      const newQty = existing.quantity + quantity;
      const newAvgEntry = newNotional / newQty;
      existing.notionalUsd = newNotional;
      existing.marginUsd = newMargin;
      existing.quantity = newQty;
      existing.averageEntryPrice = newAvgEntry;
      existing.liquidationPrice = PaperBroker.calculateLiquidationPrice(newAvgEntry, order.side, existing.leverage);
    } else {
      this.positions.set(order.symbol, {
        symbol: order.symbol,
        side: order.side,
        leverage,
        marginUsd: requiredMarginUsd,
        notionalUsd,
        quantity,
        averageEntryPrice: fillPrice,
        liquidationPrice,
        totalCostUsd: requiredMarginUsd
      });
    }

    const fill: TradeFill = {
      fillId: `fill-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: order.id,
      symbol: order.symbol,
      side: order.side,
      leverage,
      marginUsd: requiredMarginUsd,
      quantity,
      requestedPrice: order.quotePrice,
      fillPrice,
      liquidationPrice,
      slippagePct,
      feeUsd,
      totalUsd: notionalUsd,
      timestampMs: Date.now(),
      orderType: order.orderType || "MARKET"
    };

    this.fills.push(fill);
    return fill;
  }

  /**
   * Places a limit order with reserved margin.
   */
  placeLimitOrder(req: {
    id: string;
    symbol: string;
    side: OrderSide;
    amountUsd: number;
    limitPrice: number;
    leverage?: number;
  }): LimitOrder {
    const leverage = Math.max(1, Math.min(100, req.leverage || 1));
    const requiredMargin = req.amountUsd / leverage;

    if (requiredMargin > this.cashUsd) {
      throw new Error(`Insufficient cash for limit order margin: required $${requiredMargin.toFixed(2)}, available $${this.cashUsd.toFixed(2)}`);
    }

    this.cashUsd -= requiredMargin;

    const lo: LimitOrder = {
      id: req.id,
      symbol: req.symbol,
      side: req.side,
      amountUsd: req.amountUsd,
      limitPrice: req.limitPrice,
      leverage,
      reservedMarginUsd: requiredMargin,
      timestampMs: Date.now(),
      status: "PENDING"
    };

    this.limitOrders.set(lo.id, lo);
    return lo;
  }

  /**
   * Cancels a pending limit order and refunds the reserved margin.
   */
  cancelLimitOrder(orderId: string): LimitOrder {
    const lo = this.limitOrders.get(orderId);
    if (!lo) {
      throw new Error(`Limit order not found: ${orderId}`);
    }
    if (lo.status !== "PENDING") {
      throw new Error(`Cannot cancel limit order: status is already ${lo.status}`);
    }

    lo.status = "CANCELLED";
    this.cashUsd += lo.reservedMarginUsd;
    return lo;
  }

  /**
   * Evaluates pending limit orders against current market prices and executes triggered orders.
   */
  checkAndFillLimitOrders(currentPrices: Map<string, number>): TradeFill[] {
    const executedFills: TradeFill[] = [];

    for (const lo of this.limitOrders.values()) {
      if (lo.status !== "PENDING") continue;
      const currPrice = currentPrices.get(lo.symbol);
      if (!currPrice) continue;

      const shouldFill =
        (lo.side === "BUY" && currPrice <= lo.limitPrice) ||
        (lo.side === "SELL" && currPrice >= lo.limitPrice);

      if (shouldFill) {
        lo.status = "FILLED";
        // Refund reserved margin so executeOrder can apply formal deduction
        this.cashUsd += lo.reservedMarginUsd;

        const fill = this.executeOrder({
          id: lo.id,
          botType: "LIMIT_TRIGGER",
          side: lo.side,
          symbol: lo.symbol,
          requestedAmountUsd: lo.amountUsd,
          quotePrice: lo.limitPrice,
          requestTimestampMs: Date.now(),
          leverage: lo.leverage,
          orderType: "LIMIT",
          feed: {
            symbol: lo.symbol,
            currentPrice: currPrice,
            poolLiquidityUsd: 25_000_000,
            lastFeedTimestampMs: Date.now()
          }
        });

        executedFills.push(fill);
      }
    }

    return executedFills;
  }

  /**
   * Closes an active position at market price.
   */
  closePosition(symbol: string, currentPrice: number): TradeFill {
    const pos = this.positions.get(symbol);
    if (!pos) {
      throw new Error(`Cannot close position: no active position found for ${symbol}`);
    }

    const priceDelta = currentPrice - pos.averageEntryPrice;
    const realizedPnlUsd =
      pos.side === "BUY"
        ? (priceDelta / pos.averageEntryPrice) * pos.notionalUsd
        : (-priceDelta / pos.averageEntryPrice) * pos.notionalUsd;

    const returnedCash = pos.marginUsd + realizedPnlUsd;
    this.cashUsd += Math.max(0, returnedCash);

    this.deskEngine.updatePnl(realizedPnlUsd);
    this.positions.delete(symbol);

    const closeSide: OrderSide = pos.side === "BUY" ? "SELL" : "BUY";
    const fill: TradeFill = {
      fillId: `close-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: `close-${pos.symbol}`,
      symbol: pos.symbol,
      side: closeSide,
      leverage: pos.leverage,
      marginUsd: pos.marginUsd,
      quantity: pos.quantity,
      requestedPrice: currentPrice,
      fillPrice: currentPrice,
      liquidationPrice: 0,
      slippagePct: 0,
      feeUsd: 0,
      totalUsd: pos.notionalUsd,
      timestampMs: Date.now(),
      realizedPnlUsd,
      orderType: "MARKET"
    };

    this.fills.push(fill);
    return fill;
  }

  /**
   * Exports full broker state for session persistence.
   */
  exportState(): {
    cashUsd: number;
    positions: Position[];
    limitOrders: LimitOrder[];
    fills: TradeFill[];
  } {
    return {
      cashUsd: this.cashUsd,
      positions: Array.from(this.positions.values()),
      limitOrders: Array.from(this.limitOrders.values()),
      fills: [...this.fills]
    };
  }

  /**
   * Imports previously persisted broker state.
   */
  importState(state: {
    cashUsd: number;
    positions?: Position[];
    limitOrders?: LimitOrder[];
    fills?: TradeFill[];
  }): void {
    if (typeof state.cashUsd === "number") {
      this.cashUsd = state.cashUsd;
    }
    this.positions.clear();
    if (Array.isArray(state.positions)) {
      for (const p of state.positions) {
        this.positions.set(p.symbol, p);
      }
    }
    this.limitOrders.clear();
    if (Array.isArray(state.limitOrders)) {
      for (const lo of state.limitOrders) {
        this.limitOrders.set(lo.id, lo);
      }
    }
    this.fills.length = 0;
    if (Array.isArray(state.fills)) {
      this.fills.push(...state.fills);
    }
  }
}
