export interface Instrument {
  readonly id: string;                  // e.g. "NSE:RELIANCE", "BSE:500325", "NASDAQ:AAPL"
  readonly symbol: string;              // e.g. "RELIANCE", "500325", "AAPL"
  readonly exchangeSymbol: string;      // e.g. "RELIANCE.NS", "500325.BO", "AAPL"
  readonly name: string;                // e.g. "Reliance Industries Ltd."
  readonly exchange: "NSE" | "BSE" | "NASDAQ" | "NYSE" | "BINANCE";
  readonly country: "IN" | "US" | "GLOBAL";
  readonly currency: "INR" | "USD";
  readonly type: "EQUITY" | "ETF" | "CRYPTO";
  readonly isin?: string;
  readonly sector?: string;
  readonly marketCapTier?: "LARGE" | "MID" | "SMALL" | "MEGA";
  readonly tradingEligible: boolean;
  readonly basePrice: number;
}

export interface SearchOptions {
  query?: string;
  exchange?: string;
  type?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: Instrument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class InstrumentCatalog {
  private instruments: Instrument[] = [];
  private idIndex = new Map<string, Instrument>();
  private symbolIndex = new Map<string, Instrument[]>();

  constructor(customInstruments?: Instrument[]) {
    this.instruments = customInstruments || DEFAULT_INSTRUMENTS;
    this.buildIndexes();
  }

  private buildIndexes(): void {
    this.idIndex.clear();
    this.symbolIndex.clear();

    for (const inst of this.instruments) {
      this.idIndex.set(inst.id, inst);

      const symKey = inst.symbol.toUpperCase();
      const existing = this.symbolIndex.get(symKey) || [];
      existing.push(inst);
      this.symbolIndex.set(symKey, existing);
    }
  }

  getById(id: string): Instrument | undefined {
    return this.idIndex.get(id);
  }

  getBySymbol(symbol: string, exchange?: string): Instrument | undefined {
    const symKey = symbol.toUpperCase().replace(/\.(NS|BO)$/i, "");
    const list = this.symbolIndex.get(symKey);
    if (!list || list.length === 0) return undefined;
    if (exchange) {
      return list.find((i) => i.exchange.toUpperCase() === exchange.toUpperCase());
    }
    return list[0];
  }

  getExchanges(): string[] {
    const set = new Set<string>();
    for (const inst of this.instruments) {
      set.add(inst.exchange);
    }
    return Array.from(set);
  }

  getAll(): readonly Instrument[] {
    return this.instruments;
  }

  /**
   * Powerful fuzzy search by company name, ticker, exchange, ISIN, country, and sector.
   * Deterministic sorting: Exact Symbol > Symbol Prefix > Exact Name Word > Substring Match.
   */
  search(options: SearchOptions = {}): SearchResult {
    const { query = "", exchange, type, country, page = 1, limit = 20 } = options;
    const cleanQuery = query.trim().toUpperCase();

    let filtered = this.instruments.filter((inst) => {
      // Exchange filter
      if (exchange && exchange !== "ALL" && inst.exchange.toUpperCase() !== exchange.toUpperCase()) {
        return false;
      }
      // Type filter
      if (type && type !== "ALL" && inst.type.toUpperCase() !== type.toUpperCase()) {
        return false;
      }
      // Country filter
      if (country && country !== "ALL" && inst.country.toUpperCase() !== country.toUpperCase()) {
        return false;
      }
      return true;
    });

    if (cleanQuery) {
      const scored: Array<{ inst: Instrument; score: number }> = [];

      for (const inst of filtered) {
        const sym = inst.symbol.toUpperCase();
        const name = inst.name.toUpperCase();
        const isin = (inst.isin || "").toUpperCase();
        const exch = inst.exchange.toUpperCase();
        const sector = (inst.sector || "").toUpperCase();

        let score = 0;

        if (sym === cleanQuery) {
          score += 1000; // Exact symbol match
        } else if (sym.startsWith(cleanQuery)) {
          score += 500; // Symbol prefix match
        } else if (sym.includes(cleanQuery)) {
          score += 250; // Symbol substring match
        }

        if (name === cleanQuery) {
          score += 800; // Exact name match
        } else if (name.startsWith(cleanQuery)) {
          score += 400; // Name prefix
        } else {
          const words = name.split(/\s+/);
          if (words.some((w) => w === cleanQuery)) {
            score += 300; // Exact word in name (e.g. "Tata", "Reliance", "Apple")
          } else if (words.some((w) => w.startsWith(cleanQuery))) {
            score += 150; // Word prefix
          } else if (name.includes(cleanQuery)) {
            score += 100; // Partial name substring
          }
        }

        if (isin === cleanQuery) {
          score += 900; // Exact ISIN match
        } else if (isin.includes(cleanQuery)) {
          score += 200;
        }

        if (exch === cleanQuery) {
          score += 80;
        }

        if (sector.includes(cleanQuery)) {
          score += 50;
        }

        if (score > 0) {
          scored.push({ inst, score });
        }
      }

      scored.sort((a, b) => b.score - a.score || a.inst.name.localeCompare(b.inst.name));
      filtered = scored.map((s) => s.inst);
    } else {
      // Default alphabetical sorting by name
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages
    };
  }
}

// Comprehensive Universe of Indian (NSE & BSE) Equities, US Equities, and Cryptocurrencies
export const DEFAULT_INSTRUMENTS: Instrument[] = [
  // =========================================================================
  // 🇮🇳 INDIAN EQUITIES — NSE (National Stock Exchange of India)
  // =========================================================================
  {
    id: "NSE:RELIANCE",
    symbol: "RELIANCE",
    exchangeSymbol: "RELIANCE.NS",
    name: "Reliance Industries Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE002A01018",
    sector: "Energy / Telecommunications / Retail",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 2845.50
  },
  {
    id: "NSE:TCS",
    symbol: "TCS",
    exchangeSymbol: "TCS.NS",
    name: "Tata Consultancy Services Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE467B01029",
    sector: "Information Technology",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 4120.25
  },
  {
    id: "NSE:HDFCBANK",
    symbol: "HDFCBANK",
    exchangeSymbol: "HDFCBANK.NS",
    name: "HDFC Bank Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE040A01034",
    sector: "Financial Services / Banking",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 1685.10
  },
  {
    id: "NSE:INFY",
    symbol: "INFY",
    exchangeSymbol: "INFY.NS",
    name: "Infosys Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE009A01021",
    sector: "Information Technology",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1892.40
  },
  {
    id: "NSE:ICICIBANK",
    symbol: "ICICIBANK",
    exchangeSymbol: "ICICIBANK.NS",
    name: "ICICI Bank Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE090A01021",
    sector: "Financial Services / Banking",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1245.80
  },
  {
    id: "NSE:BHARTIARTL",
    symbol: "BHARTIARTL",
    exchangeSymbol: "BHARTIARTL.NS",
    name: "Bharti Airtel Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE397D01024",
    sector: "Telecommunications",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1712.30
  },
  {
    id: "NSE:SBIN",
    symbol: "SBIN",
    exchangeSymbol: "SBIN.NS",
    name: "State Bank of India",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE062A01020",
    sector: "Financial Services / Public Sector Banking",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 815.60
  },
  {
    id: "NSE:TATAMOTORS",
    symbol: "TATAMOTORS",
    exchangeSymbol: "TATAMOTORS.NS",
    name: "Tata Motors Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE155A01022",
    sector: "Automotive / Electric Vehicles",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 928.75
  },
  {
    id: "NSE:LT",
    symbol: "LT",
    exchangeSymbol: "LT.NS",
    name: "Larsen & Toubro Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE018A01030",
    sector: "Infrastructure / Capital Goods",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 3540.00
  },
  {
    id: "NSE:ITC",
    symbol: "ITC",
    exchangeSymbol: "ITC.NS",
    name: "ITC Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE154A01025",
    sector: "FMCG / Hotels / Paperboards",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 485.20
  },
  {
    id: "NSE:WIPRO",
    symbol: "WIPRO",
    exchangeSymbol: "WIPRO.NS",
    name: "Wipro Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE075A01022",
    sector: "Information Technology",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 562.40
  },
  {
    id: "NSE:HINDUNILVR",
    symbol: "HINDUNILVR",
    exchangeSymbol: "HINDUNILVR.NS",
    name: "Hindustan Unilever Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE030A01027",
    sector: "FMCG",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 2680.50
  },
  {
    id: "NSE:BAJFINANCE",
    symbol: "BAJFINANCE",
    exchangeSymbol: "BAJFINANCE.NS",
    name: "Bajaj Finance Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE296A01024",
    sector: "Financial Services / NBFC",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 7120.00
  },
  {
    id: "NSE:MARUTI",
    symbol: "MARUTI",
    exchangeSymbol: "MARUTI.NS",
    name: "Maruti Suzuki India Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE585B01010",
    sector: "Automotive",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 12350.00
  },
  {
    id: "NSE:ADANIENT",
    symbol: "ADANIENT",
    exchangeSymbol: "ADANIENT.NS",
    name: "Adani Enterprises Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE423A01024",
    sector: "Conglomerate / Energy & Logistics",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 3120.80
  },
  {
    id: "NSE:ZOMATO",
    symbol: "ZOMATO",
    exchangeSymbol: "ZOMATO.NS",
    name: "Zomato Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE758T01015",
    sector: "Consumer Internet / Quick Commerce",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 268.45
  },
  {
    id: "NSE:TATASTEEL",
    symbol: "TATASTEEL",
    exchangeSymbol: "TATASTEEL.NS",
    name: "Tata Steel Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE081A01020",
    sector: "Metals & Mining",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 154.30
  },
  {
    id: "NSE:SUNPHARMA",
    symbol: "SUNPHARMA",
    exchangeSymbol: "SUNPHARMA.NS",
    name: "Sun Pharmaceutical Industries Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE044A01036",
    sector: "Healthcare / Pharmaceuticals",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1895.00
  },
  {
    id: "NSE:KOTAKBANK",
    symbol: "KOTAKBANK",
    exchangeSymbol: "KOTAKBANK.NS",
    name: "Kotak Mahindra Bank Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE237A01028",
    sector: "Banking",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1780.25
  },
  {
    id: "NSE:NIFTYBEES",
    symbol: "NIFTYBEES",
    exchangeSymbol: "NIFTYBEES.NS",
    name: "Nippon India ETF Nifty 50 BeES",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "ETF",
    isin: "INF732E01015",
    sector: "Index ETF",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 272.50
  },
  {
    id: "NSE:TATAPOWER",
    symbol: "TATAPOWER",
    exchangeSymbol: "TATAPOWER.NS",
    name: "The Tata Power Company Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE245A01021",
    sector: "Power Generation / Renewable Energy",
    marketCapTier: "MID",
    tradingEligible: true,
    basePrice: 428.15
  },
  {
    id: "NSE:SUZLON",
    symbol: "SUZLON",
    exchangeSymbol: "SUZLON.NS",
    name: "Suzlon Energy Limited",
    exchange: "NSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE040H01021",
    sector: "Renewable Energy / Wind",
    marketCapTier: "MID",
    tradingEligible: true,
    basePrice: 68.40
  },

  // =========================================================================
  // 🇮🇳 INDIAN EQUITIES — BSE (BSE Ltd. / Bombay Stock Exchange)
  // =========================================================================
  {
    id: "BSE:500325",
    symbol: "500325",
    exchangeSymbol: "500325.BO",
    name: "Reliance Industries Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE002A01018",
    sector: "Energy / Telecommunications",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 2844.90
  },
  {
    id: "BSE:532540",
    symbol: "532540",
    exchangeSymbol: "532540.BO",
    name: "Tata Consultancy Services Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE467B01029",
    sector: "Information Technology",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 4119.80
  },
  {
    id: "BSE:500180",
    symbol: "500180",
    exchangeSymbol: "500180.BO",
    name: "HDFC Bank Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE040A01034",
    sector: "Banking",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 1684.95
  },
  {
    id: "BSE:500209",
    symbol: "500209",
    exchangeSymbol: "500209.BO",
    name: "Infosys Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE009A01021",
    sector: "Information Technology",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1891.80
  },
  {
    id: "BSE:532174",
    symbol: "532174",
    exchangeSymbol: "532174.BO",
    name: "ICICI Bank Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE090A01021",
    sector: "Banking",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1245.20
  },
  {
    id: "BSE:500570",
    symbol: "500570",
    exchangeSymbol: "500570.BO",
    name: "Tata Motors Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE155A01022",
    sector: "Automotive",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 928.10
  },
  {
    id: "BSE:500875",
    symbol: "500875",
    exchangeSymbol: "500875.BO",
    name: "ITC Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE154A01025",
    sector: "FMCG",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 485.05
  },
  {
    id: "BSE:500112",
    symbol: "500112",
    exchangeSymbol: "500112.BO",
    name: "State Bank of India (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE062A01020",
    sector: "Banking",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 815.15
  },
  {
    id: "BSE:532454",
    symbol: "532454",
    exchangeSymbol: "532454.BO",
    name: "Bharti Airtel Ltd. (BSE Listing)",
    exchange: "BSE",
    country: "IN",
    currency: "INR",
    type: "EQUITY",
    isin: "INE397D01024",
    sector: "Telecommunications",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 1711.90
  },

  // =========================================================================
  // 🇺🇸 US EQUITIES — NASDAQ & NYSE (Global Equities & ETFs)
  // =========================================================================
  {
    id: "NASDAQ:AAPL",
    symbol: "AAPL",
    exchangeSymbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "EQUITY",
    isin: "US0378331005",
    sector: "Consumer Electronics & Services",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 232.50
  },
  {
    id: "NASDAQ:MSFT",
    symbol: "MSFT",
    exchangeSymbol: "MSFT",
    name: "Microsoft Corporation",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "EQUITY",
    isin: "US5949181045",
    sector: "Software, Cloud & AI",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 428.50
  },
  {
    id: "NASDAQ:NVDA",
    symbol: "NVDA",
    exchangeSymbol: "NVDA",
    name: "NVIDIA Corporation",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "EQUITY",
    isin: "US67066G1040",
    sector: "Semiconductors & AI Hardware",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 141.20
  },
  {
    id: "NASDAQ:TSLA",
    symbol: "TSLA",
    exchangeSymbol: "TSLA",
    name: "Tesla, Inc.",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "EQUITY",
    isin: "US88160R1014",
    sector: "Automotive & Clean Energy",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 269.19
  },
  {
    id: "NASDAQ:AMZN",
    symbol: "AMZN",
    exchangeSymbol: "AMZN",
    name: "Amazon.com, Inc.",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "EQUITY",
    isin: "US0231351067",
    sector: "E-Commerce & Cloud Computing",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 187.80
  },
  {
    id: "NASDAQ:GOOGL",
    symbol: "GOOGL",
    exchangeSymbol: "GOOGL",
    name: "Alphabet Inc. (Class A)",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "EQUITY",
    isin: "US02079K3059",
    sector: "Internet & Digital Advertising",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 166.40
  },
  {
    id: "NYSE:SPY",
    symbol: "SPY",
    exchangeSymbol: "SPY",
    name: "SPDR S&P 500 ETF Trust",
    exchange: "NYSE",
    country: "US",
    currency: "USD",
    type: "ETF",
    isin: "US78462F1030",
    sector: "Index ETF",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 580.20
  },
  {
    id: "NASDAQ:QQQ",
    symbol: "QQQ",
    exchangeSymbol: "QQQ",
    name: "Invesco QQQ Trust (Nasdaq-100 ETF)",
    exchange: "NASDAQ",
    country: "US",
    currency: "USD",
    type: "ETF",
    isin: "US46090E1038",
    sector: "Tech ETF",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 492.10
  },

  // =========================================================================
  // ⚡ CRYPTOCURRENCIES — 24/7 Global Pairs
  // =========================================================================
  {
    id: "BINANCE:SOLUSDT",
    symbol: "SOLUSDT",
    exchangeSymbol: "SOLUSDT",
    name: "Solana / Tether USD",
    exchange: "BINANCE",
    country: "GLOBAL",
    currency: "USD",
    type: "CRYPTO",
    sector: "Layer 1 Smart Contracts",
    marketCapTier: "LARGE",
    tradingEligible: true,
    basePrice: 101.41
  },
  {
    id: "BINANCE:BTCUSDT",
    symbol: "BTCUSDT",
    exchangeSymbol: "BTCUSDT",
    name: "Bitcoin / Tether USD",
    exchange: "BINANCE",
    country: "GLOBAL",
    currency: "USD",
    type: "CRYPTO",
    sector: "Store of Value / Digital Gold",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 80600.01
  },
  {
    id: "BINANCE:ETHUSDT",
    symbol: "ETHUSDT",
    exchangeSymbol: "ETHUSDT",
    name: "Ethereum / Tether USD",
    exchange: "BINANCE",
    country: "GLOBAL",
    currency: "USD",
    type: "CRYPTO",
    sector: "Smart Contract Platform",
    marketCapTier: "MEGA",
    tradingEligible: true,
    basePrice: 2343.71
  }
];
