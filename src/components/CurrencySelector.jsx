import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrency } from "@/lib/currency";

// Compact currency switcher for the navbar. Controls the global display
// currency used across every price in the app.
export default function CurrencySelector({ className = "" }) {
  const { currency, setCurrency, supported, ready } = useCurrency();
  return (
    <Select value={currency} onValueChange={setCurrency} disabled={!ready}>
      <SelectTrigger className={`h-9 w-[78px] rounded-lg text-xs font-medium ${className}`} aria-label="Display currency">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supported.map((c) => (
          <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}