import type { DayStats, PokerData, Session, SessionStats, Settings, SpinEvent } from '../types'
import { profitPerHour, spinRoi } from './analytics'
import { HISTORICAL_SPIN_STAKE } from '../types'

function sessionDurationMs(session: Session, now = Date.now()): number {
  const start = new Date(session.startTime).getTime()
  const end = session.endTime ? new Date(session.endTime).getTime() : now
  return Math.max(0, end - start)
}

export function getSpinStake(spin: SpinEvent): number {
  return spin.stake ?? HISTORICAL_SPIN_STAKE
}

export function getSpinWinMultiplier(spin: SpinEvent, settings: Settings): number {
  return spin.multiplier ?? settings.spinWinMultiplier
}

export function computeSpinProfitFromEvents(spins: SpinEvent[], settings: Settings): number {
  let profit = 0
  for (const spin of spins) {
    const stake = getSpinStake(spin)
    if (spin.type === 'played') profit -= stake
    if (spin.type === 'win') profit += stake * getSpinWinMultiplier(spin, settings)
  }
  return profit
}

export function computeTournamentProfit(tournaments: PokerData['tournaments']): number {
  return tournaments
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.winnings - t.buyIn, 0)
}

export function getSessionComputedProfit(data: PokerData, session: Session): number {
  const sessionSpins = data.spins.filter((s) => s.sessionId === session.id)
  const sessionTournaments = data.tournaments.filter((t) => t.sessionId === session.id)
  return (
    computeSpinProfitFromEvents(sessionSpins, data.settings) +
    computeTournamentProfit(sessionTournaments)
  )
}

export function getSessionProfit(data: PokerData, session: Session): number {
  if (session.profitOverride != null) return session.profitOverride
  return getSessionComputedProfit(data, session)
}

export function getTotalProfit(data: PokerData): number {
  return data.sessions.reduce((sum, s) => sum + getSessionProfit(data, s), 0)
}

export function getTodayCounts(data: PokerData, date = new Date().toISOString().slice(0, 10)) {
  const todaySpins = data.spins.filter((s) => s.date === date)
  const todayTournaments = data.tournaments.filter((t) => t.date === date)

  return {
    played: todaySpins.filter((s) => s.type === 'played').length,
    final: todaySpins.filter((s) => s.type === 'final').length,
    won: todaySpins.filter((s) => s.type === 'win').length,
    tournaments: todayTournaments.length,
    tournamentsWon: todayTournaments.filter((t) => t.status === 'completed' && t.winnings > 0).length,
  }
}

export function getActiveSession(data: PokerData): Session | undefined {
  return data.sessions.find((s) => s.isActive)
}

export function computeDayStats(data: PokerData, date: string): DayStats {
  const daySpins = data.spins.filter((s) => s.date === date)
  const dayTournaments = data.tournaments.filter((t) => t.date === date)
  const daySessions = data.sessions.filter((s) => s.date === date)

  const played = daySpins.filter((s) => s.type === 'played').length
  const final = daySpins.filter((s) => s.type === 'final').length
  const won = daySpins.filter((s) => s.type === 'win').length

  const spinProfit = computeSpinProfitFromEvents(daySpins, data.settings)
  const tournamentProfit = computeTournamentProfit(dayTournaments)

  const durationMs = daySessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)

  const profit =
    daySessions.length > 0
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

export function computeSessionStats(data: PokerData, session: Session): SessionStats {
  const sessionSpins = data.spins.filter((s) => s.sessionId === session.id)
  const sessionTournaments = data.tournaments.filter((t) => t.sessionId === session.id)

  const played = sessionSpins.filter((s) => s.type === 'played').length
  const final = sessionSpins.filter((s) => s.type === 'final').length
  const won = sessionSpins.filter((s) => s.type === 'win').length

  return {
    session,
    spinsPlayed: played,
    spinsFinal: final,
    spinsWon: won,
    tournamentsPlayed: sessionTournaments.length,
    tournamentsWon: sessionTournaments.filter((t) => t.winnings > 0).length,
    durationMs: sessionDurationMs(session),
    profit: getSessionProfit(data, session),
  }
}

export function getAllDayStats(data: PokerData): DayStats[] {
  const dates = new Set<string>()
  data.spins.forEach((s) => dates.add(s.date))
  data.tournaments.forEach((t) => dates.add(t.date))
  data.sessions.forEach((s) => dates.add(s.date))

  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => computeDayStats(data, date))
}

export function getRecentSessions(data: PokerData, limit = 10): SessionStats[] {
  return [...data.sessions]
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, limit)
    .map((session) => computeSessionStats(data, session))
}

export function getGlobalStats(data: PokerData) {
  const played = data.spins.filter((s) => s.type === 'played').length
  const final = data.spins.filter((s) => s.type === 'final').length
  const won = data.spins.filter((s) => s.type === 'win').length
  const tournaments = data.tournaments.length
  const tournamentsWon = data.tournaments.filter((t) => t.winnings > 0).length

  const spinProfit = computeSpinProfitFromEvents(data.spins, data.settings)
  const tournamentProfit = computeTournamentProfit(data.tournaments)
  const durationMs = data.sessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)
  const profit = getTotalProfit(data)

  return {
    played,
    final,
    won,
    tournaments,
    tournamentsWon,
    durationMs,
    spinProfit,
    tournamentProfit,
    profit,
    profitPerHour: profitPerHour(profit, durationMs),
    spinRoi: spinRoi(data.spins, data.settings),
    finalRate: played > 0 ? (final / played) * 100 : 0,
    winRate: played > 0 ? (won / played) * 100 : 0,
  }
}

export interface SessionSpinCounts {
  played: number
  final: number
  won: number
}

export function rebuildSessionSpins(
  data: PokerData,
  sessionId: string,
  counts: SessionSpinCounts,
): SpinEvent[] {
  const session = data.sessions.find((s) => s.id === sessionId)
  if (!session) return data.spins

  const existing = data.spins.filter((s) => s.sessionId === sessionId)
  const otherSpins = data.spins.filter((s) => s.sessionId !== sessionId)

  const stake =
    existing.length > 0 ? getSpinStake(existing[0]) : data.settings.selectedSpinStake
  const multiplier =
    existing.find((s) => s.type === 'win')?.multiplier ?? data.settings.selectedSpinMultiplier

  const startMs = new Date(session.startTime).getTime()
  const endMs = session.endTime ? new Date(session.endTime).getTime() : Date.now()
  const date = session.date
  const total = counts.played + counts.final + counts.won
  let idx = 0

  const timestamp = (): string => {
    const ms =
      total <= 1 ? startMs : startMs + Math.floor((idx / total) * Math.max(0, endMs - startMs))
    idx += 1
    return new Date(ms).toISOString()
  }

  const newSpins: SpinEvent[] = []
  for (let i = 0; i < counts.played; i++) {
    newSpins.push({
      id: crypto.randomUUID(),
      sessionId,
      date,
      timestamp: timestamp(),
      type: 'played',
      stake,
    })
  }
  for (let i = 0; i < counts.final; i++) {
    newSpins.push({
      id: crypto.randomUUID(),
      sessionId,
      date,
      timestamp: timestamp(),
      type: 'final',
      stake,
    })
  }
  for (let i = 0; i < counts.won; i++) {
    newSpins.push({
      id: crypto.randomUUID(),
      sessionId,
      date,
      timestamp: timestamp(),
      type: 'win',
      stake,
      multiplier,
    })
  }

  newSpins.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return [...otherSpins, ...newSpins]
}
