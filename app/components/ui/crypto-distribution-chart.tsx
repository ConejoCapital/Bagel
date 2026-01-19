"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Bagel brand colors
const BAGEL_ORANGE = "#FF6B35"
const BAGEL_SESAME = "#FFD23F"
const BAGEL_DARK = "#2D2D2A"

const cryptoData = [
  { name: "SOL", value: 45, color: BAGEL_ORANGE },
  { name: "USDC", value: 25, color: BAGEL_SESAME },
  { name: "USDT", value: 20, color: "#E85A2A" },
  { name: "Other", value: 10, color: BAGEL_DARK },
]

function CustomTooltip({
  active,
  payload,
}: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[#E0E0E0] bg-white p-3 shadow-md">
        <p className="text-sm font-medium text-[#2D2D2A]">{payload[0].name}</p>
        <p className="text-sm" style={{ color: payload[0].payload.color }}>
          {payload[0].value}%
        </p>
      </div>
    )
  }
  return null
}

export function CryptoDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Distribution</CardTitle>
        <CardDescription>Crypto assets used for payroll</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cryptoData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {cryptoData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => <span className="text-[#2D2D2A]/60 text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
