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
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="status"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
        <Tooltip />
        {/* Matches the --primary brand pink (oklch(0.488 0.243 357) ~ #b20061) — a literal
            hex rather than var(--primary), since SVG fill attribute var() support is
            inconsistent across renderers. */}
        <Bar dataKey="count" fill="#b20061" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
