export interface PokerData {
  sessions: unknown[]
  spins: unknown[]
  tournaments: unknown[]
  settings: {
    selectedSpinStake: number
    selectedTournamentStake: number
    spinWinMultiplier: number
  }
}

const HISTORICAL_DATE = '2026-06-25'
const SESSION_ID = 'historical-excel-import'
const HISTORICAL_SPIN_STAKE = 5
const HISTORICAL_SPINS = { played: 430, final: 283, win: 160 }

const DEFAULT_SETTINGS = {
  selectedSpinStake: 5,
  selectedTournamentStake: 5,
  spinWinMultiplier: 3,
}

function createSpinEvents(count: number, type: string, sessionId: string, date: string) {
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

  const tournaments = [
    { place: 2, winnings: 85 },
    { place: 60, winnings: 0 },
    { place: 95, winnings: 0 },
  ].map((t, i) => ({
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

  return { sessions: [session], spins, tournaments, settings: { ...DEFAULT_SETTINGS } }
}

export function createEmptyData(): PokerData {
  return { sessions: [], spins: [], tournaments: [], settings: { ...DEFAULT_SETTINGS } }
}

export function migrateSettings(raw: Record<string, unknown> = {}) {
  const legacy = raw as {
    spinBuyIn?: number
    tournamentBuyIn?: number
    spinWinGain?: number
    selectedSpinStake?: number
    selectedTournamentStake?: number
    spinWinMultiplier?: number
  }

  return {
    selectedSpinStake: legacy.selectedSpinStake ?? legacy.spinBuyIn ?? DEFAULT_SETTINGS.selectedSpinStake,
    selectedTournamentStake:
      legacy.selectedTournamentStake ?? legacy.tournamentBuyIn ?? DEFAULT_SETTINGS.selectedTournamentStake,
    spinWinMultiplier:
      legacy.spinWinMultiplier ??
      (legacy.spinWinGain && legacy.spinBuyIn
        ? legacy.spinWinGain / legacy.spinBuyIn
        : DEFAULT_SETTINGS.spinWinMultiplier),
  }
}

export function normalizeData(raw: Partial<PokerData>): PokerData {
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    spins: Array.isArray(raw.spins) ? raw.spins : [],
    tournaments: Array.isArray(raw.tournaments) ? raw.tournaments : [],
    settings: migrateSettings((raw.settings ?? {}) as Record<string, unknown>),
  }
}
