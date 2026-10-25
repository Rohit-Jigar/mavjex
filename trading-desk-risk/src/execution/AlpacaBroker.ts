export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  buying_power: string;
  pattern_day_trader: boolean;
}

export interface AlpacaClock {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  qty: string;
  avg_entry_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

export interface AlpacaOrderRequest {
  symbol: string;
  qty?: number;
  notional?: number; // e.g. dollar amount for fractional shares/crypto
  side: "buy" | "sell";
  type: "market" | "limit";
  time_in_force: "day" | "gtc" | "ioc";
  limit_price?: number;
}

export interface AlpacaOrderResponse {
  id: string;
  client_order_id: string;
  created_at: string;
  symbol: string;
  qty?: string;
  notional?: string;
  side: string;
  type: string;
  time_in_force: string;
  status: string;
  filled_qty?: string;
  filled_avg_price?: string;
}

export class AlpacaBroker {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly endpoint: string;

  constructor(apiKey: string, apiSecret: string, endpoint = "https://paper-api.alpaca.markets") {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.endpoint = endpoint.replace(/\/$/, "");
  }

  private getHeaders(): Record<string, string> {
    return {
      "APCA-API-KEY-ID": this.apiKey,
      "APCA-API-SECRET-KEY": this.apiSecret,
      "Content-Type": "application/json"
    };
  }

  async getAccount(): Promise<AlpacaAccount> {
    const res = await fetch(`${this.endpoint}/v2/account`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca getAccount error (${res.status}): ${err}`);
    }
    return (await res.json()) as AlpacaAccount;
  }

  async getClock(): Promise<AlpacaClock> {
    const res = await fetch(`${this.endpoint}/v2/clock`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca getClock error (${res.status}): ${err}`);
    }
    return (await res.json()) as AlpacaClock;
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    const res = await fetch(`${this.endpoint}/v2/positions`, {
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca getPositions error (${res.status}): ${err}`);
    }
    return (await res.json()) as AlpacaPosition[];
  }

  async submitOrder(order: AlpacaOrderRequest): Promise<AlpacaOrderResponse> {
    const res = await fetch(`${this.endpoint}/v2/orders`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca submitOrder error (${res.status}): ${err}`);
    }
    return (await res.json()) as AlpacaOrderResponse;
  }

  async cancelAllOrders(): Promise<void> {
    const res = await fetch(`${this.endpoint}/v2/orders`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Alpaca cancelAllOrders error (${res.status}): ${err}`);
    }
  }
}
