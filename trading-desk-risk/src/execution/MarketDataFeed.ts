import type { MarketFeedData } from "../types.ts";

export interface TickerSnapshot {
  readonly symbol: string;
  readonly price: number;
  readonly volume24hUsd: number;
  readonly poolLiquidityUsd: number;
  readonly timestampMs: number;
  readonly latencyMs: number;
}

export class MarketDataFeed {
  /**
   * Fetches real live market price for a crypto symbol (e.g. SOLUSDT, BTCUSDT, ETHUSDT) from Binance public endpoint.
   * Zero API key required.
   */
  async fetchLiveCrypto(symbol: string): Promise<MarketFeedData> {
    const startMs = Date.now();
    const formatted = symbol.replace(/[\/-]/g, "").toUpperCase();
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${formatted}`;

    try {
      const response = await fetch(url, { headers: { "User-Agent": "TradingDeskRisk/1.0" } });
      if (!response.ok) {
        throw new Error(`Exchange HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const latencyMs = Date.now() - startMs;
      const price = parseFloat(data.lastPrice);
      const volumeUsd = parseFloat(data.quoteVolume);
      // Derive a conservative pool/orderbook liquidity proxy (e.g. 5% of 24h volume or minimum $100k)
      const poolLiquidityUsd = Math.max(100_000, volumeUsd * 0.05);

      return {
        symbol,
        currentPrice: price,
        poolLiquidityUsd,
        lastFeedTimestampMs: data.closeTime || Date.now()
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch live crypto feed for ${symbol}: ${message}`);
    }
  }

  /**
   * Fetches real live equity price (e.g. AAPL, TSLA, NVDA, SPY) from public quote endpoints.
   */
  async fetchLiveStock(symbol: string): Promise<MarketFeedData> {
    const formatted = symbol.toUpperCase().trim();
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${formatted}?interval=1m&range=1d`;

    try {
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 TradingDesk/1.0" } });
      if (!response.ok) {
        throw new Error(`Stock API HTTP ${response.status}: ${response.statusText}`);
      }
      const json = await response.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== "number") {
        throw new Error(`Malformed quote response for ${symbol}`);
      }

      const price = meta.regularMarketPrice;
      const lastFeedTimestampMs = (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000;
      // High-liquid equity floor proxy
      const poolLiquidityUsd = 50_000_000;

      return {
        symbol: formatted,
        currentPrice: price,
        poolLiquidityUsd,
        lastFeedTimestampMs
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to fetch live stock feed for ${symbol}: ${message}`);
    }
  }
}
