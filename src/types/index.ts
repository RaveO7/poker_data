export type SpinEventType = 'played' | 'final' | 'win'

export const SPIN_STAKES = [2, 5, 10] as const
export const TOURNAMENT_STAKES = [1, 3, 5, 10] as const
export const TOURNAMENT_TICKET_VALUE = 0

export interface StakeOption {
  value: number
  label: string
}

export const TOURNAMENT_STAKE_OPTIONS: StakeOption[] = [
  { value: TOURNAMENT_TICKET_VALUE, label: 'Ticket' },
  { value: 1, label: '1 €' },
  { value: 3, label: '3 €' },
  { value: 5, label: '5 €' },
  { value: 10, label: '10 €' },
]

export function formatTournamentEntry(buyIn: number): string {
  return buyIn === TOURNAMENT_TICKET_VALUE ? 'Ticket (gratuit)' : `${buyIn} €`
}

export type SpinStake = (typeof SPIN_STAKES)[number]
export type TournamentStake = (typeof TOURNAMENT_STAKES)[number]

export interface Session {
  id: string
  date: string
  startTime: string
  endTime?: string
  isActive: boolean
}

export interface SpinEvent {
  id: string
  sessionId: string
  date: string
  timestamp: string
  type: SpinEventType
  stake: number
}

export interface Tournament {
  id: string
  sessionId: string
  date: string
  startTime: string
  endTime?: string
  status: 'in_progress' | 'completed'
  buyIn: number
  place?: number
  winnings: number
}

export interface Settings {
  selectedSpinStake: number
  selectedTournamentStake: number
  spinWinMultiplier: number
}

export interface PokerData {
  sessions: Session[]
  spins: SpinEvent[]
  tournaments: Tournament[]
  settings: Settings
}

export interface DayStats {
  date: string
  spinsPlayed: number
  spinsFinal: number
  spinsWon: number
  tournamentsPlayed: number
  tournamentsWon: number
  durationMs: number
  profit: number
}

export interface SessionStats {
  session: Session
  spinsPlayed: number
  spinsFinal: number
  spinsWon: number
  tournamentsPlayed: number
  tournamentsWon: number
  durationMs: number
  profit: number
}

export const DEFAULT_SETTINGS: Settings = {
  selectedSpinStake: 5,
  selectedTournamentStake: 5,
  spinWinMultiplier: 3,
}

export const DEFAULT_DATA: PokerData = {
  sessions: [],
  spins: [],
  tournaments: [],
  settings: DEFAULT_SETTINGS,
}

export const HISTORICAL_SPIN_STAKE = 5
