"use client"

import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from "recharts"

const data = [
  {
    name: "Jan",
    total: 234,
  },
  {
    name: "Fev",
    total: 345,
  },
  {
    name: "Mar",
    total: 267,
  },
  {
    name: "Abr",
    total: 389,
  },
  {
    name: "Mai",
    total: 423,
  },
  {
    name: "Jun",
    total: 478,
  },
  {
    name: "Jul",
    total: 389,
  },
]

interface DataPoint {
  name: string
  total: number
}

export function Overview() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${value}`}
        />
        <Tooltip />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
