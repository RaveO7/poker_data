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

  return {
    date,
    spinsPlayed: played,
    spinsFinal: final,
    spinsWon: won,
    tournamentsPlayed: dayTournaments.length,
    tournamentsWon: dayTournaments.filter((t) => t.winnings > 0).length,
    durationMs,
    profit: spinProfit + tournamentProfit,
  }
}

export function computeSessionStats(data: PokerData, session: Session): SessionStats {
  const sessionSpins = data.spins.filter((s) => s.sessionId === session.id)
  const sessionTournaments = data.tournaments.filter((t) => t.sessionId === session.id)

  const played = sessionSpins.filter((s) => s.type === 'played').length
  const final = sessionSpins.filter((s) => s.type === 'final').length
  const won = sessionSpins.filter((s) => s.type === 'win').length

  const spinProfit = computeSpinProfitFromEvents(sessionSpins, data.settings)
  const tournamentProfit = computeTournamentProfit(sessionTournaments)

  return {
    session,
    spinsPlayed: played,
    spinsFinal: final,
    spinsWon: won,
    tournamentsPlayed: sessionTournaments.length,
    tournamentsWon: sessionTournaments.filter((t) => t.winnings > 0).length,
    durationMs: sessionDurationMs(session),
    profit: spinProfit + tournamentProfit,
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

  return {
    played,
    final,
    won,
    tournaments,
    tournamentsWon,
    durationMs,
    spinProfit,
    tournamentProfit,
    profit: spinProfit + tournamentProfit,
    profitPerHour: profitPerHour(spinProfit + tournamentProfit, durationMs),
    spinRoi: spinRoi(data.spins, data.settings),
    finalRate: played > 0 ? (final / played) * 100 : 0,
    winRate: played > 0 ? (won / played) * 100 : 0,
  }
}
