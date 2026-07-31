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
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(value: number) => formatMoney(value)}
          tick={{ fontSize: 10 }}
          width={90}
        />
        <Tooltip formatter={(value) => formatMoney(Number(value))} />
        <Bar dataKey="amountPaise" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
