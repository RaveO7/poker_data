import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getBankrollCurve, getCurrentBankroll } from '../lib/analytics'
import { formatMoney } from '../lib/date'
import type { PokerData } from '../types'
import { Card } from './ui'

interface BankrollChartProps {
  data: PokerData
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const bankroll = payload.find((p) => p.dataKey === 'bankroll')?.value ?? 0
  const profit = payload.find((p) => p.dataKey === 'profit')?.value ?? 0

  return (
    <div className="rounded-lg border border-white/20 bg-felt-dark/95 px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-gold-light">{label}</p>
      {profit !== 0 && <p className="text-white/70">Jour : {formatMoney(profit)}</p>}
      <p className="text-gold-light">
        Bankroll : <span className="font-bold">{bankroll.toFixed(0)} €</span>
      </p>
    </div>
  )
}

export function BankrollChart({ data }: BankrollChartProps) {
  const points = useMemo(() => getBankrollCurve(data), [data])
  const current = getCurrentBankroll(data)

  return (
    <Card title="💰 Courbe bankroll">
      <p className="mb-4 text-xs text-white/40">
        Départ {data.settings.startingBankroll ?? 900} € · Actuelle{' '}
        <span className="text-gold-light">{current.toFixed(0)} €</span>
      </p>
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              interval={points.length > 8 ? 'preserveStartEnd' : 0}
              angle={points.length > 5 ? -25 : 0}
              textAnchor={points.length > 5 ? 'end' : 'middle'}
              height={points.length > 5 ? 60 : 30}
            />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="bankroll"
              name="Bankroll"
              stroke="#d4af37"
              strokeWidth={2}
              dot={{ r: 3, fill: '#d4af37' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
