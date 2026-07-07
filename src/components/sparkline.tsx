"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

import type { PricePoint } from "@/lib/types";

interface SparklineProps {
  data: PricePoint[];
  color: string;
}

export function Sparkline({ data, color }: SparklineProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-16 items-center justify-center text-xs text-muted">
        Not enough price history
      </div>
    );
  }

  const chartData = data.map((point) => ({
    time: point.timestamp,
    price: point.price,
  }));

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis domain={[0, 1]} hide />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--edge)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(value) => new Date(Number(value) * 1000).toLocaleString()}
            formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Yes"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
