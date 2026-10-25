import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const possiblePaths = [
    path.resolve("D:/Treading View/.env"),
    path.resolve("D:/Treading View/trading-desk-risk/.env")
  ];

  const env = {};
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          // strip trailing comments
          if (v.includes("#") && (v.startsWith('"') || v.startsWith("'"))) {
            const quoteChar = v[0];
            const endQuote = v.indexOf(quoteChar, 1);
            if (endQuote > 0) {
              v = v.slice(1, endQuote);
            }
          } else {
            v = v.split("#")[0].trim().replace(/^["']|["']$/g, "");
          }
          env[k] = v;
        }
      }
    }
  }
  return env;
}

async function checkAlpaca() {
  const env = loadEnv();
  const key = env.ALPACA_API_KEY;
  const secret = env.ALPACA_SECRET_KEY;
  const endpoint = env.ALPACA_ENDPOINT || "https://paper-api.alpaca.markets";

  if (!key || !secret) {
    console.error("ALPACA_API_KEY or ALPACA_SECRET_KEY not found in .env");
    process.exit(1);
  }

  console.log(`Connecting to Alpaca endpoint: ${endpoint}`);
  console.log(`API Key ID: ${key.slice(0, 4)}...${key.slice(-4)} (length: ${key.length})`);

  try {
    const res = await fetch(`${endpoint}/v2/account`, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret
      }
    });

    const data = await res.json();
    if (!res.ok) {
      console.log(`❌ Alpaca Auth Failed (HTTP ${res.status}):`, data.message || data);
      return;
    }

    console.log("✅ ALPACA AUTHENTICATION SUCCESSFUL!");
    console.log("-----------------------------------------");
    console.log(`Account Status:   ${data.status}`);
    console.log(`Account Mode:     ${endpoint.includes("paper") ? "PAPER TRADING (Sandbox)" : "LIVE TRADING"}`);
    console.log(`Currency:         ${data.currency}`);
    console.log(`Cash Balance:     $${Number(data.cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    console.log(`Buying Power:     $${Number(data.buying_power).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    console.log(`Portfolio Value:  $${Number(data.portfolio_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
    console.log(`Daytrade Count:   ${data.daytrade_count}`);
    console.log("-----------------------------------------");
  } catch (err) {
    console.error("Connection error:", err.message);
  }
}

checkAlpaca();
