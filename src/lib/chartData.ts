import { formatDate } from './date'
import type { PokerData, SpinEvent } from '../types'

export type ChartPeriod = 'session' | 'day' | 'week' | 'month'

export interface ChartDataPoint {
  key: string
  label: string
  played: number
  final: number
  won: number
}

const MONTH_NAMES = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
]

function parseDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`)
}

function countSpins(spins: SpinEvent[]) {
  return {
    played: spins.filter((s) => s.type === 'played').length,
    final: spins.filter((s) => s.type === 'final').length,
    won: spins.filter((s) => s.type === 'win').length,
  }
}

function getWeekStartKey(dateKey: string): string {
  const d = parseDate(dateKey)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function formatWeekLabel(weekStartKey: string): string {
  const monday = parseDate(weekStartKey)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
  return `${fmt(monday)}–${fmt(sunday)}`
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
}

function formatSessionLabel(session: PokerData['sessions'][0], index: number): string {
  if (session.id === 'historical-excel-import') return 'Import Excel'
  const d = new Date(session.startTime)
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `S${index + 1} · ${formatDate(session.date)} ${time}`
}

function groupSpinsByKey(
  spins: SpinEvent[],
  keyFn: (spin: SpinEvent) => string,
): Map<string, SpinEvent[]> {
  const map = new Map<string, SpinEvent[]>()
  for (const spin of spins) {
    const key = keyFn(spin)
    const group = map.get(key) ?? []
    group.push(spin)
    map.set(key, group)
  }
  return map
}

function mapToChartPoints(
  entries: [string, SpinEvent[]][],
  labelFn: (key: string, spins: SpinEvent[]) => string,
): ChartDataPoint[] {
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => ({
      key,
      label: labelFn(key, group),
      ...countSpins(group),
    }))
}

export function getChartData(data: PokerData, period: ChartPeriod): ChartDataPoint[] {
  const { spins, sessions } = data

  if (spins.length === 0) return []

  switch (period) {
    case 'day':
      return mapToChartPoints([...groupSpinsByKey(spins, (s) => s.date)], (key) =>
        formatDate(key),
      )

    case 'week':
      return mapToChartPoints([...groupSpinsByKey(spins, (s) => getWeekStartKey(s.date))], (key) =>
        formatWeekLabel(key),
      )

    case 'month':
      return mapToChartPoints([...groupSpinsByKey(spins, (s) => s.date.slice(0, 7))], (key) =>
        formatMonthLabel(key),
      )

    case 'session': {
      const sessionOrder = [...sessions]
        .filter((s) => spins.some((sp) => sp.sessionId === s.id))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      return sessionOrder.map((session, index) => {
        const sessionSpins = spins.filter((s) => s.sessionId === session.id)
        return {
          key: session.id,
          label: formatSessionLabel(session, index),
          ...countSpins(sessionSpins),
        }
      })
    }
  }
}

export function getChartSummary(points: ChartDataPoint[]) {
  const totals = points.reduce(
    (acc, p) => ({
      played: acc.played + p.played,
      final: acc.final + p.final,
      won: acc.won + p.won,
    }),
    { played: 0, final: 0, won: 0 },
  )

  return {
    ...totals,
    periods: points.length,
    finalRate: totals.played > 0 ? (totals.final / totals.played) * 100 : 0,
    winRate: totals.played > 0 ? (totals.won / totals.played) * 100 : 0,
  }
}

export const CHART_PERIOD_LABELS: Record<ChartPeriod, string> = {
  session: 'Session',
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
}
