"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

export function RevenueChart({
  thisMonthPaise,
  lastMonthPaise,
}: {
  thisMonthPaise: number;
  lastMonthPaise: number;
}) {
  const data = [
    { label: "Last month", amountPaise: lastMonthPaise },
    { label: "This month", amountPaise: thisMonthPaise },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity={1} />
            <stop offset="100%" stopColor="#16a34a" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(value: number) => formatMoney(value)}
          tick={{ fontSize: 10 }}
          width={90}
        />
        <Tooltip
          formatter={(value) => formatMoney(Number(value))}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
          }}
        />
        <Bar dataKey="amountPaise" fill="url(#revenueGradient)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
