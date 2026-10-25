import test from "node:test";
import assert from "node:assert/strict";
import { DeskRiskEngine } from "../src/desk/DeskRiskEngine.ts";
import { PaperBroker } from "../src/execution/PaperBroker.ts";
import { LiveGateway } from "../src/execution/LiveGateway.ts";
import type { GamblerOrderRequest } from "../src/types.ts";

test("Live Execution Gateway: executes in PAPER mode with virtual cash & updates desk PnL", () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1_000,
    maxConsecutiveLosses: 3,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const broker = new PaperBroker(10_000, desk);
  const gateway = new LiveGateway("PAPER", broker, desk);

  assert.equal(broker.getCashBalance(), 10_000);

  const buyOrder: GamblerOrderRequest = {
    id: "ord-test-buy",
    botType: "GAMBLER",
    side: "BUY",
    symbol: "SOLUSDT",
    requestedAmountUsd: 500,
    quotePrice: 100.0,
    requestTimestampMs: Date.now(),
    feed: {
      symbol: "SOLUSDT",
      currentPrice: 100.0,
      poolLiquidityUsd: 1_000_000,
      lastFeedTimestampMs: Date.now() - 100
    },
    contractAudit: {
      isHoneypot: false,
      mintAuthorityRenounced: true,
      buyTaxPct: 0,
      sellTaxPct: 0,
      tradingEnabled: true
    }
  };

  // Route BUY order
  gateway.routeOrder(buyOrder, { allowed: true });
  assert.equal(broker.getPositions().length, 1);
  const solPos = broker.getPosition("SOLUSDT");
  assert.ok(solPos);
  assert.equal(solPos.quantity > 0, true);

  // Cash should have dropped by ~$500 + fee
  assert.ok(broker.getCashBalance() < 9_505 && broker.getCashBalance() > 9_490);

  // Route SELL order at profit ($110) closing the entire position
  const sellOrder: GamblerOrderRequest = {
    ...buyOrder,
    id: "ord-test-sell",
    side: "SELL",
    requestedAmountUsd: 1000, // covers entire position
    quotePrice: 110.0
  };

  gateway.routeOrder(sellOrder, { allowed: true });
  // Position should be closed
  assert.equal(broker.getPosition("SOLUSDT"), undefined);
  // Realized profit should be positive
  assert.ok(broker.getCashBalance() > 10_000);
});

test("Live Execution Gateway: fails-closed if ALPACA_LIVE mode selected without verified credentials", async () => {
  const desk = new DeskRiskEngine({
    maxDailyLossUsd: 1_000,
    maxConsecutiveLosses: 3,
    minLiquidityUsd: 10_000,
    maxLiquidityDropPct: 35,
    maxFeedLagMs: 5_000
  });

  const broker = new PaperBroker(10_000, desk);
  // Configure without AlpacaBroker instance
  const liveGateway = new LiveGateway("ALPACA_LIVE", broker, desk);

  const order: GamblerOrderRequest = {
    id: "ord-unauthorized-live",
    botType: "GAMBLER",
    side: "BUY",
    symbol: "BTCUSDT",
    requestedAmountUsd: 100,
    quotePrice: 80_000,
    requestTimestampMs: Date.now(),
    feed: {
      symbol: "BTCUSDT",
      currentPrice: 80_000,
      poolLiquidityUsd: 10_000_000,
      lastFeedTimestampMs: Date.now()
    },
    contractAudit: {
      isHoneypot: false,
      mintAuthorityRenounced: true,
      buyTaxPct: 0,
      sellTaxPct: 0,
      tradingEnabled: true
    }
  };

  await assert.rejects(
    async () => {
      await liveGateway.routeOrder(order, { allowed: true });
    },
    {
      message: /ALPACA_LIVE execution blocked \(fail-closed\): AlpacaBroker instance is not configured/
    }
  );
});
