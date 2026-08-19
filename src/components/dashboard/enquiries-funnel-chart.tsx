"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ENQUIRY_STATUS_BADGE, ENQUIRY_STATUS_ORDER } from "@/lib/badges";

export function EnquiriesFunnelChart({ data }: { data: { status: string; count: number }[] }) {
  const countByStatus = new Map(data.map((row) => [row.status, row.count]));
  const chartData = ENQUIRY_STATUS_ORDER.map((status) => ({
    status: ENQUIRY_STATUS_BADGE[status].label,
    count: countByStatus.get(status) ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <defs>
          {/* Matches the --primary brand pink (oklch(0.488 0.243 357) ~ #b20061) — a literal
              hex rather than var(--primary), since SVG fill attribute var() support is
              inconsistent across renderers. */}
          <linearGradient id="enquiriesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b20061" stopOpacity={1} />
            <stop offset="100%" stopColor="#b20061" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
          }}
        />
        <Bar dataKey="count" fill="url(#enquiriesGradient)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
