/**
 * Currency conversion using the free Frankfurter API (https://www.frankfurter.app).
 * Rates are cached for 1 hour to avoid hammering the API.
 */

export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP";

const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

interface RateCache {
  rates: Record<string, number>;
  fetchedAt: number;
}

let _cache: RateCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.rates;
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP",
    );
    if (!res.ok) throw new Error("Frankfurter API error");
    const data = await res.json();
    _cache = { rates: data.rates as Record<string, number>, fetchedAt: now };
    return _cache.rates;
  } catch {
    // Fallback approximate rates (updated 2025)
    return { USD: 0.012, EUR: 0.011, GBP: 0.0095 };
  }
}

/**
 * Convert an INR amount (in paise) to the target currency.
 * Returns a formatted string like "₹299", "$3.58", "€3.29", "£2.84"
 */
export async function convertFromINR(
  paise: number,
  to: SupportedCurrency,
): Promise<string> {
  if (paise === 0) return "Free";
  const inr = paise / 100;

  if (to === "INR") {
    return `₹${inr.toLocaleString("en-IN")}`;
  }

  const rates = await getRates();
  const rate = rates[to];
  if (!rate) return `₹${inr.toLocaleString("en-IN")}`;

  const converted = inr * rate;
  const symbol = CURRENCY_SYMBOLS[to];

  // Format: USD/GBP 2 decimals, EUR 2 decimals
  return `${symbol}${converted.toFixed(2)}`;
}

/**
 * Synchronous conversion using cached rates only (returns null if no cache).
 */
export function convertFromINRSync(
  paise: number,
  to: SupportedCurrency,
): string | null {
  if (paise === 0) return "Free";
  if (!_cache) return null;

  const inr = paise / 100;
  if (to === "INR") return `₹${inr.toLocaleString("en-IN")}`;

  const rate = _cache.rates[to];
  if (!rate) return null;

  const converted = inr * rate;
  return `${CURRENCY_SYMBOLS[to]}${converted.toFixed(2)}`;
}

export { CURRENCY_SYMBOLS };
