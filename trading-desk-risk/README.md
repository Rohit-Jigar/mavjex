# Trading Desk Risk Engine: Execution Gates & Circuit Breakers

A zero-dependency risk engine that treats **risk as a hard gate in the order path with failing test suites behind it**, rather than a cosmetic slider or preference.

## The Bot Failure-Mode Matrix

| Bot | Edge | How it dies | Blast Radius | Hard Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Gambler** | Reads direction | Losing streak, sized up | Whole book | **Fixed % size**, contract gates (honeypot, mint, tax) |
| **House** | Fee on volume | Costs > fees; selling own supply | Capital + Reputation | **Fees only** (never hold/sell supply), 2.0x break-even launch budget |
| **Spy** | Copies wallets | Latency, exit liquidity | Per-wallet | **Max chase (+15%)**, mirror exits, 3-strike wallet demotion |

## Desk-Level Circuit Breakers

Above all three bots sits an umbrella desk layer monitoring every order:

1. **Daily Loss Cap Breaker**: Halts all new entries if aggregate daily loss exceeds the dollar/percentage cap.
2. **Consecutive-Loss Breaker**: Trips desk-wide cooldown when $N$ consecutive losses occur across any bots.
3. **Liquidity-Drop Breaker**: Rejects trades if pool liquidity falls below the safe floor or experiences a sudden percentage drain.
4. **Feed-Lag Breaker**: Rejects entries when market feed timestamps are older than $N$ seconds.

## Running Tests

Every rule and circuit breaker has an automated test that fails the build if it stops firing:

```bash
node --experimental-strip-types --test "trading-desk-risk/test/*.test.ts"
```

## Running the Demo

```bash
node --experimental-strip-types trading-desk-risk/demo.ts
```
