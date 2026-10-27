import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// The marketplace stores prices in AED internally (listings) and converts
// USD web prices to AED via the peg. This context lets the user pick a
// display currency; every displayed price is converted from AED using
// live rates (cached, refreshed every few hours).
//
// NOTE: no JSX is used here so the file can stay a plain .js module.

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const RATES_URL = "https://open.er-api.com/v6/latest/AED";

export const SUPPORTED_CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR", "AUD", "CAD", "INR", "JPY", "CNY"];

const SYMBOLS = {
  AED: "AED",
  USD: "$",
  EUR: "€",
  GBP: "£",
  SAR: "SAR",
  AUD: "A$",
  CAD: "C$",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
};

function detectDefault() {
  try {
    const code = new Intl.NumberFormat(navigator.language, { style: "currency" }).resolvedOptions().currency;
    if (code && SUPPORTED_CURRENCIES.includes(code)) return code;
  } catch {}
  return "AED";
}

// Safe localStorage helpers — storage can be blocked in sandboxed iframes,
// and a throw during render would crash the whole app to a white screen.
const safeGet = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key, value) => {
  try { localStorage.setItem(key, value); } catch {}
};

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => safeGet("app_currency") || detectDefault());
  const [rates, setRates] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let cached = null;
      try { cached = JSON.parse(safeGet("app_rates")); } catch {}
      if (cached && cached.ts && Date.now() - cached.ts < TTL_MS && cached.rates) {
        setRates(cached.rates);
        setReady(true);
        return;
      }
      try {
        const res = await fetch(RATES_URL);
        const json = await res.json();
        const r = json && json.rates;
        if (!cancelled && r) {
          setRates(r);
          safeSet("app_rates", JSON.stringify({ ts: Date.now(), rates: r }));
        }
      } catch {
        if (!cancelled && cached && cached.rates) setRates(cached.rates);
      }
      if (!cancelled) setReady(true);
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = (code) => {
    setCurrencyState(code);
    safeSet("app_currency", code);
  };

  const convertAED = useCallback((aed) => {
    const rate = currency === "AED" ? 1 : (rates && rates[currency]) || 1;
    return (Number(aed) || 0) * rate;
  }, [currency, rates]);

  const convertUSD = useCallback((usd) => convertAED((Number(usd) || 0) * 3.6725), [convertAED]);

  const formatValue = useCallback((val) => {
    const sym = SYMBOLS[currency] || currency;
    const num = Math.round(Number(val) || 0).toLocaleString();
    return sym === currency ? sym + " " + num : sym + num + " " + currency;
  }, [currency]);

  const formatFromAED = useCallback((aed) => formatValue(convertAED(aed)), [convertAED, formatValue]);
  const formatFromUSD = useCallback((usd) => formatValue(convertUSD(usd)), [convertUSD, formatValue]);

  const value = {
    currency,
    setCurrency,
    rates,
    ready,
    supported: SUPPORTED_CURRENCIES,
    convertAED,
    convertUSD,
    formatValue,
    formatFromAED,
    formatFromUSD,
  };

  return React.createElement(CurrencyContext.Provider, { value }, children);
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    const fmt = (aed) => "AED " + Math.round(Number(aed) || 0).toLocaleString();
    return {
      currency: "AED",
      setCurrency: () => {},
      rates: null,
      ready: true,
      supported: SUPPORTED_CURRENCIES,
      convertAED: (a) => Number(a) || 0,
      convertUSD: (u) => (Number(u) || 0) * 3.6725,
      formatValue: (v) => "AED " + Math.round(Number(v) || 0).toLocaleString(),
      formatFromAED: fmt,
      formatFromUSD: (u) => fmt((Number(u) || 0) * 3.6725),
    };
  }
  return ctx;
}