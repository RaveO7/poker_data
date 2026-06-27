import {
  computeSpinProfitFromEvents,
  computeTournamentProfit,
  getSessionProfit,
  getSpinStake,
} from './stats'
import type { DayStats, PokerData, Session } from '../types'
import { SPIN_STAKES } from '../types'

export type HistoryDateRange = 'all' | '7d' | '30d' | '90d'
export type HistoryTypeFilter = 'all' | 'spin' | 'tournament'
export type HistoryStakeFilter = 'all' | number

export interface HistoryFilterState {
  dateRange: HistoryDateRange
  type: HistoryTypeFilter
  stake: HistoryStakeFilter
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilterState = {
  dateRange: 'all',
  type: 'all',
  stake: 'all',
}

export const DATE_RANGE_LABELS: Record<HistoryDateRange, string> = {
  all: 'Tout',
  '7d': '7 jours',
  '30d': '30 jours',
  '90d': '90 jours',
}

export const TYPE_FILTER_LABELS: Record<HistoryTypeFilter, string> = {
  all: 'Tout',
  spin: 'Spins',
  tournament: 'Tournois',
}

function cutoffKey(range: HistoryDateRange): string | null {
  if (range === 'all') return null
  const days = { '7d': 7, '30d': 30, '90d': 90 }[range]
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function sessionDurationMs(session: Session, now = Date.now()): number {
  const start = new Date(session.startTime).getTime()
  const end = session.endTime ? new Date(session.endTime).getTime() : now
  return Math.max(0, end - start)
}

function passesDate(date: string, cutoff: string | null): boolean {
  return cutoff == null || date >= cutoff
}

function filterSpinsForStake(
  spins: PokerData['spins'],
  stake: HistoryStakeFilter,
): PokerData['spins'] {
  if (stake === 'all') return spins
  return spins.filter((s) => getSpinStake(s) === stake)
}

export function getAvailableStakes(data: PokerData): number[] {
  const stakes = new Set<number>([...SPIN_STAKES])
  data.spins.forEach((s) => stakes.add(getSpinStake(s)))
  return [...stakes].sort((a, b) => a - b)
}

export function filterSessions(data: PokerData, filters: HistoryFilterState): Session[] {
  const cutoff = cutoffKey(filters.dateRange)

  return data.sessions.filter((session) => {
    if (!passesDate(session.date, cutoff)) return false

    const spins = filterSpinsForStake(
      data.spins.filter((s) => s.sessionId === session.id),
      filters.stake,
    )
    const tournaments = data.tournaments.filter((t) => t.sessionId === session.id)

    if (filters.type === 'spin' && spins.length === 0) return false
    if (filters.type === 'tournament' && tournaments.length === 0) return false
    if (filters.stake !== 'all' && filters.type !== 'tournament' && spins.length === 0) return false

    return true
  })
}

export function getFilteredDayStats(
  data: PokerData,
  filters: HistoryFilterState,
): DayStats[] {
  const cutoff = cutoffKey(filters.dateRange)
  const dates = new Set<string>()

  if (filters.type !== 'tournament') {
    data.spins.forEach((s) => {
      if (passesDate(s.date, cutoff)) {
        if (filters.stake === 'all' || getSpinStake(s) === filters.stake) dates.add(s.date)
      }
    })
  }

  if (filters.type !== 'spin') {
    data.tournaments.forEach((t) => {
      if (passesDate(t.date, cutoff)) dates.add(t.date)
    })
  }

  data.sessions.forEach((s) => {
    if (passesDate(s.date, cutoff)) dates.add(s.date)
  })

  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => computeFilteredDayStats(data, date, filters, cutoff))
    .filter((d) => d.spinsPlayed > 0 || d.tournamentsPlayed > 0 || d.durationMs > 0)
}

function computeFilteredDayStats(
  data: PokerData,
  date: string,
  filters: HistoryFilterState,
  cutoff: string | null,
): DayStats {
  if (!passesDate(date, cutoff)) {
    return {
      date,
      spinsPlayed: 0,
      spinsFinal: 0,
      spinsWon: 0,
      tournamentsPlayed: 0,
      tournamentsWon: 0,
      durationMs: 0,
      profit: 0,
    }
  }

  const daySpins =
    filters.type === 'tournament'
      ? []
      : filterSpinsForStake(
          data.spins.filter((s) => s.date === date),
          filters.stake,
        )

  const dayTournaments =
    filters.type === 'spin' ? [] : data.tournaments.filter((t) => t.date === date)

  const daySessions = data.sessions.filter((s) => s.date === date)

  const played = daySpins.filter((s) => s.type === 'played').length
  const final = daySpins.filter((s) => s.type === 'final').length
  const won = daySpins.filter((s) => s.type === 'win').length

  const spinProfit = computeSpinProfitFromEvents(daySpins, data.settings)
  const tournamentProfit = computeTournamentProfit(dayTournaments)
  const durationMs = daySessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)

  const useSessionProfit = filters.type === 'all' && filters.stake === 'all'
  const profit = useSessionProfit
    ? daySessions.reduce((sum, s) => sum + getSessionProfit(data, s), 0)
    : spinProfit + tournamentProfit

  return {
    date,
    spinsPlayed: played,
    spinsFinal: final,
    spinsWon: won,
    tournamentsPlayed: dayTournaments.length,
    tournamentsWon: dayTournaments.filter((t) => t.winnings > 0).length,
    durationMs,
    profit,
  }
}

export function computeSessionStatsFiltered(
  data: PokerData,
  session: Session,
  filters: HistoryFilterState,
) {
  const spins =
    filters.type === 'tournament'
      ? []
      : filterSpinsForStake(
          data.spins.filter((s) => s.sessionId === session.id),
          filters.stake,
        )
  const tournaments =
    filters.type === 'spin'
      ? []
      : data.tournaments.filter((t) => t.sessionId === session.id)

  const played = spins.filter((s) => s.type === 'played').length
  const final = spins.filter((s) => s.type === 'final').length
  const won = spins.filter((s) => s.type === 'win').length
  const unfiltered = filters.type === 'all' && filters.stake === 'all'
  const profit = unfiltered
    ? getSessionProfit(data, session)
    : computeSpinProfitFromEvents(spins, data.settings) + computeTournamentProfit(tournaments)

  return {
    session,
    spinsPlayed: played,
    spinsFinal: final,
    spinsWon: won,
    tournamentsPlayed: tournaments.length,
    tournamentsWon: tournaments.filter((t) => t.winnings > 0).length,
    durationMs: sessionDurationMs(session),
    profit,
  }
}
