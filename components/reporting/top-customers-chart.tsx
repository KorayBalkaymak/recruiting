"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TopCustomersChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7EAEE" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#5B616E" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#16181D" }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E7EAEE" }} cursor={{ fill: "#F8FAFC" }} />
        <Bar dataKey="count" fill="#FF5500" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
