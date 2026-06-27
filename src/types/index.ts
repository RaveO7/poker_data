export type SpinEventType = 'played' | 'final' | 'win'

export const SPIN_STAKES = [2, 5, 10] as const
export const SPIN_MULTIPLIERS = [2, 3, 4, 5] as const
export const SESSION_NOTE_PRESETS = ['focus', 'fatigué', 'tilt', 'normal'] as const
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
export type SpinMultiplier = (typeof SPIN_MULTIPLIERS)[number]
export type TournamentStake = (typeof TOURNAMENT_STAKES)[number]

export interface Session {
  id: string
  date: string
  startTime: string
  endTime?: string
  isActive: boolean
  note?: string
}

export interface SpinEvent {
  id: string
  sessionId: string
  date: string
  timestamp: string
  type: SpinEventType
  stake: number
  /** Multiplicateur de la roue (×2, ×3, …) — uniquement pour type === 'win'. */
  multiplier?: number
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
  /** Dernier multiplicateur choisi pour une victoire spin. */
  selectedSpinMultiplier: number
  /** Fallback pour les victoires sans multiplier (historique importé). */
  spinWinMultiplier: number
  /** Objectifs de session (0 = désactivé). */
  sessionMaxDurationMin: number
  sessionStopLoss: number
  sessionStopWin: number
  /** Bankroll au démarrage du suivi (point de départ de la courbe). */
  startingBankroll: number
  /** Objectifs mensuels / journaliers (0 = désactivé). */
  monthlyProfitGoal: number
  monthlyLossLimit: number
  maxSpinsPerDay: number
  /** Bankroll cible (0 = désactivé). */
  bankrollGoal: number
  /** Tags de notes personnalisés (en plus des presets). */
  customNoteTags: string[]
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
  selectedSpinMultiplier: 3,
  spinWinMultiplier: 3,
  sessionMaxDurationMin: 0,
  sessionStopLoss: 0,
  sessionStopWin: 0,
  startingBankroll: 900,
  monthlyProfitGoal: 0,
  monthlyLossLimit: 0,
  maxSpinsPerDay: 0,
  bankrollGoal: 0,
  customNoteTags: [],
}

export const DEFAULT_DATA: PokerData = {
  sessions: [],
  spins: [],
  tournaments: [],
  settings: DEFAULT_SETTINGS,
}

export const HISTORICAL_SPIN_STAKE = 5

export function getAllNoteTags(settings: Settings): string[] {
  const custom = settings.customNoteTags ?? []
  const presets = [...SESSION_NOTE_PRESETS]
  return [...presets, ...custom.filter((t) => !presets.includes(t as (typeof presets)[number]))]
}
