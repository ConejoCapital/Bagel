"use client"

import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const payrollData = [
  { month: "Jan", amount: 145000, transactions: 42 },
  { month: "Feb", amount: 152000, transactions: 45 },
  { month: "Mar", amount: 148000, transactions: 43 },
  { month: "Apr", amount: 163000, transactions: 48 },
  { month: "May", amount: 171000, transactions: 52 },
  { month: "Jun", amount: 168000, transactions: 51 },
  { month: "Jul", amount: 175000, transactions: 54 },
  { month: "Aug", amount: 182000, transactions: 56 },
]

// Bagel brand colors
const BAGEL_ORANGE = "#FF6B35"
const BAGEL_DARK = "#2D2D2A"

function CustomTooltip({
  active,
  payload,
  label,
}: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-[#E0E0E0] bg-white p-3 shadow-md">
        <p className="text-sm font-medium text-[#2D2D2A]">{label}</p>
        <p className="text-sm" style={{ color: BAGEL_ORANGE }}>${payload[0].value.toLocaleString()}</p>
      </div>
    )
  }
  return null
}

export function PayrollChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Volume</CardTitle>
        <CardDescription>Monthly crypto payroll disbursements (USD equivalent)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={payrollData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="payrollGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BAGEL_ORANGE} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={BAGEL_ORANGE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis
                dataKey="month"
                stroke={BAGEL_DARK}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                opacity={0.6}
              />
              <YAxis
                stroke={BAGEL_DARK}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value / 1000}k`}
                opacity={0.6}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={BAGEL_ORANGE}
                strokeWidth={2}
                fill="url(#payrollGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
