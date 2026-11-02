"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PipelineFunnelChart({
  data,
}: {
  data: { stage: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7EAEE" vertical={false} />
        <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#5B616E" }} axisLine={{ stroke: "#E7EAEE" }} />
        <YAxis tick={{ fontSize: 11, fill: "#5B616E" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E7EAEE" }}
          cursor={{ fill: "#F8FAFC" }}
        />
        <Bar dataKey="count" fill="#FF5500" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
