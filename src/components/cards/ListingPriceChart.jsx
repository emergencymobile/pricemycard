import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useCurrency } from "@/lib/currency";

// Daily asking-price trend for a single listing. Renders only once there are
// at least two snapshots, so it appears as the history builds over time.
export default function ListingPriceChart({ data }) {
  const { convertAED, formatValue } = useCurrency();
  if (!data || data.length < 2) return null;

  const chartData = [...data]
    .filter((d) => d.date && d.price != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, price: convertAED(d.price) }));

  if (chartData.length < 2) return null;

  return (
    <div className="bg-secondary rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">Price History</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" minTickGap={24} />
            <YAxis
              tick={{ fontSize: 10 }}
              stroke="hsl(var(--muted-foreground))"
              width={52}
              tickFormatter={(v) => Math.round(Number(v)).toLocaleString()}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [formatValue(v), "Price"]}
            />
            <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Daily snapshots of this listing's asking price.</p>
    </div>
  );
}