import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LegendPayload,
} from 'recharts'
import { formatMoney } from '../lib/date'
import {
  CHART_PERIOD_LABELS,
  getChartData,
  getChartSummary,
  type ChartPeriod,
} from '../lib/chartData'
import type { PokerData } from '../types'
import { Card } from './ui'

interface ChartsPanelProps {
  data: PokerData
}

const PERIODS: ChartPeriod[] = ['session', 'day', 'week', 'month']

const COLORS = {
  played: '#94a3b8',
  final: '#38bdf8',
  won: '#34d399',
  profit: '#d4af37',
}

type SeriesKey = 'played' | 'final' | 'won' | 'profit'

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string; dataKey: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-white/20 bg-felt-dark/95 px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-semibold text-gold-light">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name} :{' '}
          <span className="font-bold">
            {entry.dataKey === 'profit' ? formatMoney(entry.value) : entry.value}
          </span>
        </p>
      ))}
    </div>
  )
}

export function ChartsPanel({ data }: ChartsPanelProps) {
  const [period, setPeriod] = useState<ChartPeriod>('session')
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(new Set())

  const chartData = useMemo(() => getChartData(data, period), [data, period])
  const summary = useMemo(() => getChartSummary(chartData), [chartData])

  const hasData = chartData.length > 0

  const toggleSeries = (key: SeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleLegendClick = (entry: LegendPayload) => {
    const key = entry.dataKey
    if (key === 'played' || key === 'final' || key === 'won' || key === 'profit') {
      toggleSeries(key)
    }
  }

  const legendFormatter = (value: string, entry: LegendPayload) => {
    const key = entry.dataKey
    const hidden =
      key === 'played' || key === 'final' || key === 'won' || key === 'profit'
        ? hiddenSeries.has(key)
        : false
    return (
      <span
        style={{
          color: hidden ? '#6b7280' : '#e8f0eb',
          textDecoration: hidden ? 'line-through' : 'none',
          cursor: 'pointer',
        }}
      >
        {value}
      </span>
    )
  }

  return (
    <Card title="📈 Graphiques">
      <div className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              period === p
                ? 'bg-gold text-felt-dark'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {CHART_PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-white/40">
        Cliquez sur la légende pour masquer / afficher une série
      </p>

      {!hasData ? (
        <p className="py-12 text-center text-white/50">
          Pas encore de données à afficher. Jouez quelques spins pour voir vos graphiques.
        </p>
      ) : (
        <>
          <div className="h-72 w-full sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  interval={chartData.length > 8 ? 'preserveStartEnd' : 0}
                  angle={chartData.length > 5 ? -25 : 0}
                  textAnchor={chartData.length > 5 ? 'end' : 'middle'}
                  height={chartData.length > 5 ? 60 : 30}
                />
                <YAxis
                  yAxisId="count"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="profit"
                  orientation="right"
                  tick={{ fill: '#d4af37', fontSize: 11 }}
                  tickFormatter={(v) => `${v}€`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#e8f0eb', fontSize: 12, cursor: 'pointer' }}
                  onClick={handleLegendClick}
                  formatter={legendFormatter}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="played"
                  name="Parties jouées"
                  stroke={COLORS.played}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={hiddenSeries.has('played')}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="final"
                  name="Finales"
                  stroke={COLORS.final}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={hiddenSeries.has('final')}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="won"
                  name="Victoires"
                  stroke={COLORS.won}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={hiddenSeries.has('won')}
                />
                <Line
                  yAxisId="profit"
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke={COLORS.profit}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  hide={hiddenSeries.has('profit')}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-6">
            <SummaryItem label="Périodes" value={summary.periods} />
            <SummaryItem label="Parties" value={summary.played} />
            <SummaryItem label="Finales" value={summary.final} color={COLORS.final} />
            <SummaryItem label="Victoires" value={summary.won} color={COLORS.won} />
            <SummaryItem
              label="Taux victoire"
              value={`${summary.winRate.toFixed(1)}%`}
              color={COLORS.won}
            />
            <SummaryItem
              label="Profit total"
              value={formatMoney(summary.profit)}
              color={COLORS.profit}
            />
          </div>
        </>
      )}
    </Card>
  )
}

function SummaryItem({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-lg font-bold tabular-nums" style={{ color: color ?? '#fff' }}>
        {value}
      </p>
    </div>
  )
}
