'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

interface WeekData {
  semaine: string
  total: number
  critiques: number
}

interface InfractionsChartProps {
  data: WeekData[]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl px-4 py-3 shadow-xl">
      <p className="text-xs text-[#8B949E] mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name === 'total' ? 'Total' : 'Critiques'} : {entry.value}
        </p>
      ))}
    </div>
  )
}

export default function InfractionsChart({ data }: InfractionsChartProps) {
  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-[#8B949E] text-sm">
        Aucune donnée disponible
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#30363D" strokeDasharray="3 3" />
        <XAxis
          dataKey="semaine"
          tick={{ fill: '#8B949E', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8B949E', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#21262D', radius: 4 }} />
        <Bar dataKey="total" name="total" fill="#F59E0B" radius={[4, 4, 0, 0]} animationDuration={800} />
        <Bar dataKey="critiques" name="critiques" fill="#EF4444" radius={[4, 4, 0, 0]} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  )
}
