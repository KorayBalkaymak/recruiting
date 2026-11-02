"use client";

import { formatCurrency } from "@/lib/utils";

const RADIUS = 60;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function RevenueDonutChart({
  candidateShare,
  marginShare,
  currency,
}: {
  candidateShare: number;
  marginShare: number;
  currency: string;
}) {
  const total = candidateShare + marginShare || 1;
  const candidateFraction = candidateShare / total;
  const candidateDash = candidateFraction * CIRCUMFERENCE;

  return (
    <div className="flex items-center gap-5">
      <svg width="150" height="150" viewBox="0 0 150 150" className="shrink-0 -rotate-90">
        <circle
          cx="75"
          cy="75"
          r={RADIUS}
          fill="none"
          stroke="#FFEDE3"
          strokeWidth={STROKE}
        />
        <circle
          cx="75"
          cy="75"
          r={RADIUS}
          fill="none"
          stroke="#FF5500"
          strokeWidth={STROKE}
          strokeDasharray={`${candidateDash} ${CIRCUMFERENCE - candidateDash}`}
          strokeLinecap="butt"
        />
      </svg>
      <div className="flex flex-col gap-3 text-sm">
        <LegendRow color="#FF5500" label="Kandidaten-Stundensatz" value={formatCurrency(candidateShare, currency)} />
        <LegendRow color="#FFEDE3" textColor="#FF5500" label="Unternehmensdeckung" value={formatCurrency(marginShare, currency)} />
      </div>
    </div>
  );
}

function LegendRow({
  color,
  textColor,
  label,
  value,
}: {
  color: string;
  textColor?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-ink-muted">{label}</span>
      <span className="font-medium" style={{ color: textColor ?? "#16181D" }}>
        {value}
      </span>
    </div>
  );
}
