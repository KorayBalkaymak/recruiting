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
        <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF1" vertical={false} />
        <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#626D78" }} axisLine={{ stroke: "#E8EDF1" }} />
        <YAxis tick={{ fontSize: 11, fill: "#626D78" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E8EDF1" }}
          cursor={{ fill: "#FAFBFC" }}
        />
        <Bar dataKey="count" fill="#32CFDC" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
