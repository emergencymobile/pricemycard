import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useCurrency } from "@/lib/currency";

// Simple sold-price-over-time chart. Expects an array of { date, price }.
export default function PriceTrendChart({ data, average }) {
  const { convertUSD, convertAED, formatValue } = useCurrency();
  if (!data || data.length < 2) return null;
  const chartData = [...data]
    .filter((d) => d.date && d.price_usd)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ date: d.date, price: convertUSD(d.price_usd) }));

  if (chartData.length < 2) return null;
  const avg = average != null ? convertAED(average) : chartData.reduce((a, b) => a + b.price, 0) / chartData.length;

  return (
    <div className="bg-secondary rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">Price Trend (Sold)</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" minTickGap={24} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={48} tickFormatter={(v) => Number(v).toLocaleString()} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [formatValue(v), "Price"]}
            />
            <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            <ReferenceLine y={avg} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: "avg", fontSize: 9, fill: "hsl(var(--muted-foreground))", position: "right" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Each point is a completed sale. Trend reflects filtered sold data only.</p>
    </div>
  );
}