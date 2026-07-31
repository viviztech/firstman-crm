"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LEAD_STATUS_BADGE, LEAD_STATUS_ORDER } from "@/lib/badges";

export function LeadsFunnelChart({ data }: { data: { status: string; count: number }[] }) {
  const countByStatus = new Map(data.map((row) => [row.status, row.count]));
  const chartData = LEAD_STATUS_ORDER.map((status) => ({
    status: LEAD_STATUS_BADGE[status].label,
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
        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
