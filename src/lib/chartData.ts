import { formatDate } from './date'
import {
  computeSessionStats,
  computeSpinProfitFromEvents,
  computeTournamentProfit,
} from './stats'
import type { PokerData, SpinEvent, Tournament } from '../types'

export type ChartPeriod = 'session' | 'day' | 'week' | 'month'

export interface ChartDataPoint {
  key: string
  label: string
  played: number
  final: number
  won: number
  profit: number
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

function profitForSpinsAndTournaments(
  spins: SpinEvent[],
  tournaments: Tournament[],
  settings: PokerData['settings'],
): number {
  return computeSpinProfitFromEvents(spins, settings) + computeTournamentProfit(tournaments)
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

export function getChartData(data: PokerData, period: ChartPeriod): ChartDataPoint[] {
  const { spins, tournaments, sessions, settings } = data

  if (spins.length === 0 && tournaments.length === 0) return []

  switch (period) {
    case 'day': {
      const dates = new Set<string>()
      spins.forEach((s) => dates.add(s.date))
      tournaments.forEach((t) => dates.add(t.date))
      return [...dates]
        .sort((a, b) => a.localeCompare(b))
        .map((date) => {
          const daySpins = spins.filter((s) => s.date === date)
          const dayTournaments = tournaments.filter((t) => t.date === date)
          return {
            key: date,
            label: formatDate(date),
            ...countSpins(daySpins),
            profit: profitForSpinsAndTournaments(daySpins, dayTournaments, settings),
          }
        })
    }

    case 'week': {
      const keys = new Set<string>()
      spins.forEach((s) => keys.add(getWeekStartKey(s.date)))
      tournaments.forEach((t) => keys.add(getWeekStartKey(t.date)))
      return [...keys]
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
          const weekSpins = spins.filter((s) => getWeekStartKey(s.date) === key)
          const weekTournaments = tournaments.filter((t) => getWeekStartKey(t.date) === key)
          return {
            key,
            label: formatWeekLabel(key),
            ...countSpins(weekSpins),
            profit: profitForSpinsAndTournaments(weekSpins, weekTournaments, settings),
          }
        })
    }

    case 'month': {
      const keys = new Set<string>()
      spins.forEach((s) => keys.add(s.date.slice(0, 7)))
      tournaments.forEach((t) => keys.add(t.date.slice(0, 7)))
      return [...keys]
        .sort((a, b) => a.localeCompare(b))
        .map((key) => {
          const monthSpins = spins.filter((s) => s.date.slice(0, 7) === key)
          const monthTournaments = tournaments.filter((t) => t.date.slice(0, 7) === key)
          return {
            key,
            label: formatMonthLabel(key),
            ...countSpins(monthSpins),
            profit: profitForSpinsAndTournaments(monthSpins, monthTournaments, settings),
          }
        })
    }

    case 'session': {
      const sessionOrder = [...sessions]
        .filter(
          (s) =>
            spins.some((sp) => sp.sessionId === s.id) ||
            tournaments.some((t) => t.sessionId === s.id),
        )
        .sort((a, b) => a.startTime.localeCompare(b.startTime))

      return sessionOrder.map((session, index) => {
        const sessionSpins = spins.filter((s) => s.sessionId === session.id)
        return {
          key: session.id,
          label: formatSessionLabel(session, index),
          ...countSpins(sessionSpins),
          profit: computeSessionStats(data, session).profit,
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
      profit: acc.profit + p.profit,
    }),
    { played: 0, final: 0, won: 0, profit: 0 },
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
