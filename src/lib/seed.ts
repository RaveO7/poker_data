import type { PokerData, SpinEvent, SpinEventType } from '../types'
import { DEFAULT_SETTINGS, HISTORICAL_SPIN_STAKE } from '../types'

const HISTORICAL_DATE = '2026-06-25'
const SESSION_ID = 'historical-excel-import'

const HISTORICAL_SPINS = { played: 430, final: 283, win: 160 }

const HISTORICAL_TOURNAMENTS = [
  { place: 2, winnings: 85 },
  { place: 60, winnings: 0 },
  { place: 95, winnings: 0 },
] as const

function createSpinEvents(
  count: number,
  type: SpinEventType,
  sessionId: string,
  date: string,
): SpinEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `hist-${type}-${i}`,
    sessionId,
    date,
    timestamp: `${date}T12:00:${String(i % 60).padStart(2, '0')}.000Z`,
    type,
    stake: HISTORICAL_SPIN_STAKE,
  }))
}

export function createHistoricalSeed(): PokerData {
  const session = {
    id: SESSION_ID,
    date: HISTORICAL_DATE,
    startTime: `${HISTORICAL_DATE}T10:00:00.000Z`,
    endTime: `${HISTORICAL_DATE}T22:00:00.000Z`,
    isActive: false,
  }

  const spins = [
    ...createSpinEvents(HISTORICAL_SPINS.played, 'played', SESSION_ID, HISTORICAL_DATE),
    ...createSpinEvents(HISTORICAL_SPINS.final, 'final', SESSION_ID, HISTORICAL_DATE),
    ...createSpinEvents(HISTORICAL_SPINS.win, 'win', SESSION_ID, HISTORICAL_DATE),
  ]

  const tournaments = HISTORICAL_TOURNAMENTS.map((t, i) => ({
    id: `hist-tournament-${i}`,
    sessionId: SESSION_ID,
    date: HISTORICAL_DATE,
    startTime: `${HISTORICAL_DATE}T${14 + i}:00:00.000Z`,
    endTime: `${HISTORICAL_DATE}T${16 + i}:00:00.000Z`,
    status: 'completed' as const,
    buyIn: 5,
    place: t.place,
    winnings: t.winnings,
  }))

  return {
    sessions: [session],
    spins,
    tournaments,
    settings: { ...DEFAULT_SETTINGS },
  }
}

export function mergeHistoricalData(existing: PokerData): PokerData {
  const historical = createHistoricalSeed()

  const alreadyImported = existing.spins.some((s) => s.id.startsWith('hist-'))
  if (alreadyImported) return existing

  return {
    sessions: [...historical.sessions, ...existing.sessions],
    spins: [...historical.spins, ...existing.spins],
    tournaments: [...historical.tournaments, ...existing.tournaments],
    settings: { ...existing.settings, selectedSpinStake: 5, selectedTournamentStake: 5 },
  }
}
