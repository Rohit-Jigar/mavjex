import type { AnyOrderRequest, GateDecision } from "../types.ts";
import type { DeskRiskEngine } from "../desk/DeskRiskEngine.ts";
import { PaperBroker, type TradeFill } from "./PaperBroker.ts";
import { AlpacaBroker, type AlpacaOrderResponse } from "./AlpacaBroker.ts";

export type ExecutionMode = "PAPER" | "ALPACA_LIVE";

export class LiveGateway {
  private readonly mode: ExecutionMode;
  private readonly paperBroker: PaperBroker;
  private readonly deskEngine: DeskRiskEngine;
  private readonly alpacaBroker?: AlpacaBroker;

  constructor(
    mode: ExecutionMode,
    paperBroker: PaperBroker,
    deskEngine: DeskRiskEngine,
    alpacaBroker?: AlpacaBroker
  ) {
    this.mode = mode;
    this.paperBroker = paperBroker;
    this.deskEngine = deskEngine;
    this.alpacaBroker = alpacaBroker;
  }

  getMode(): ExecutionMode {
    return this.mode;
  }

  getPaperBroker(): PaperBroker {
    return this.paperBroker;
  }

  getAlpacaBroker(): AlpacaBroker | undefined {
    return this.alpacaBroker;
  }

  /**
   * Routes an approved order to execution.
   */
  async routeOrder(
    order: AnyOrderRequest,
    gateDecision: GateDecision
  ): Promise<{ fill?: TradeFill; alpacaOrder?: AlpacaOrderResponse }> {
    if (!gateDecision.allowed) {
      throw new Error(`Cannot execute rejected order ${order.id}: ${gateDecision.reason}`);
    }

    if (this.mode === "PAPER") {
      const fill = this.paperBroker.executeOrder(order);
      return { fill };
    }

    // ALPACA_LIVE mode
    if (!this.alpacaBroker) {
      throw new Error(
        "ALPACA_LIVE execution blocked (fail-closed): AlpacaBroker instance is not configured. Check your ALPACA_API_KEY and ALPACA_SECRET_KEY."
      );
    }

    const alpacaOrder = await this.alpacaBroker.submitOrder({
      symbol: order.symbol,
      notional: order.requestedAmountUsd,
      side: order.side === "BUY" ? "buy" : "sell",
      type: "market",
      time_in_force: "gtc"
    });

    return { alpacaOrder };
  }
}
