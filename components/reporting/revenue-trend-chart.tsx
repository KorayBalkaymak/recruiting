"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function RevenueTrendChart({
  data,
}: {
  data: { month: string; revenue: number; margin: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7EAEE" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5B616E" }} axisLine={{ stroke: "#E7EAEE" }} />
        <YAxis
          tick={{ fontSize: 11, fill: "#5B616E" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          width={70}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E7EAEE" }}
        />
        <Line type="monotone" dataKey="revenue" name="Umsatz" stroke="#FF5500" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="margin" name="Deckungsbeitrag" stroke="#16A34A" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
