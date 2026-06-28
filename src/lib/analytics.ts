import { formatDate } from './date'
import {
  computeSessionStats,
  computeSpinProfitFromEvents,
  computeTournamentProfit,
  getAllDayStats,
  getSessionProfit,
  getSpinStake,
  getSpinWinMultiplier,
} from './stats'
import type { PokerData, Settings, SpinEvent, Tournament, SessionDevice } from '../types'
import { DEVICE_LABELS, SESSION_DEVICES, SPIN_MULTIPLIERS, SPIN_STAKES } from '../types'

export function profitPerHour(profit: number, durationMs: number): number | null {
  if (durationMs <= 0) return null
  return profit / (durationMs / 3_600_000)
}

export function spinRoi(spins: SpinEvent[], settings: Settings): number | null {
  const invested = spins
    .filter((s) => s.type === 'played')
    .reduce((sum, s) => sum + getSpinStake(s), 0)
  if (invested <= 0) return null
  return (computeSpinProfitFromEvents(spins, settings) / invested) * 100
}

export interface StakeStats {
  stake: number
  played: number
  final: number
  won: number
  profit: number
  roi: number | null
  winRate: number
  finalRate: number
}

export function getStatsByStake(data: PokerData): StakeStats[] {
  const stakes = new Set<number>([...SPIN_STAKES])
  data.spins.forEach((s) => stakes.add(getSpinStake(s)))

  return [...stakes]
    .sort((a, b) => a - b)
    .map((stake) => {
      const spins = data.spins.filter((s) => getSpinStake(s) === stake)
      const played = spins.filter((s) => s.type === 'played').length
      const final = spins.filter((s) => s.type === 'final').length
      const won = spins.filter((s) => s.type === 'win').length
      const profit = computeSpinProfitFromEvents(spins, data.settings)
      return {
        stake,
        played,
        final,
        won,
        profit,
        roi: spinRoi(spins, data.settings),
        winRate: played > 0 ? (won / played) * 100 : 0,
        finalRate: played > 0 ? (final / played) * 100 : 0,
      }
    })
    .filter((s) => s.played > 0 || s.won > 0)
}

export interface MultiplierStats {
  multiplier: number
  count: number
  totalGain: number
}

export function getMultiplierDistribution(data: PokerData): MultiplierStats[] {
  const wins = data.spins.filter((s) => s.type === 'win')
  const map = new Map<number, MultiplierStats>()

  for (const mult of SPIN_MULTIPLIERS) {
    map.set(mult, { multiplier: mult, count: 0, totalGain: 0 })
  }

  for (const spin of wins) {
    const mult = getSpinWinMultiplier(spin, data.settings)
    const entry = map.get(mult) ?? { multiplier: mult, count: 0, totalGain: 0 }
    entry.count += 1
    entry.totalGain += getSpinStake(spin) * mult
    map.set(mult, entry)
  }

  return [...map.values()].filter((m) => m.count > 0).sort((a, b) => a.multiplier - b.multiplier)
}

export interface BuyInStats {
  buyIn: number
  label: string
  count: number
  itmCount: number
  itmRate: number
  profit: number
  avgPlace: number | null
}

export interface TournamentAnalytics {
  total: number
  completed: number
  itmCount: number
  itmRate: number
  avgPlace: number | null
  profit: number
  roi: number | null
  byBuyIn: BuyInStats[]
}

function buyInLabel(buyIn: number): string {
  return buyIn === 0 ? 'Ticket' : `${buyIn} €`
}

export function getTournamentAnalytics(data: PokerData): TournamentAnalytics {
  const completed = data.tournaments.filter((t) => t.status === 'completed')
  const itm = completed.filter((t) => t.winnings > 0)
  const profit = computeTournamentProfit(data.tournaments)
  const totalBuyIn = completed.reduce((s, t) => s + t.buyIn, 0)
  const places = completed.filter((t) => t.place != null).map((t) => t.place!)

  const buyIns = new Set<number>()
  data.tournaments.forEach((t) => buyIns.add(t.buyIn))

  const byBuyIn: BuyInStats[] = [...buyIns].sort((a, b) => a - b).map((buyIn) => {
    const group = data.tournaments.filter((t) => t.buyIn === buyIn)
    const done = group.filter((t) => t.status === 'completed')
    const itmGroup = done.filter((t) => t.winnings > 0)
    const groupPlaces = done.filter((t) => t.place != null).map((t) => t.place!)
    return {
      buyIn,
      label: buyInLabel(buyIn),
      count: group.length,
      itmCount: itmGroup.length,
      itmRate: done.length > 0 ? (itmGroup.length / done.length) * 100 : 0,
      profit: computeTournamentProfit(group),
      avgPlace: groupPlaces.length > 0 ? groupPlaces.reduce((a, b) => a + b, 0) / groupPlaces.length : null,
    }
  })

  return {
    total: data.tournaments.length,
    completed: completed.length,
    itmCount: itm.length,
    itmRate: completed.length > 0 ? (itm.length / completed.length) * 100 : 0,
    avgPlace: places.length > 0 ? places.reduce((a, b) => a + b, 0) / places.length : null,
    profit,
    roi: totalBuyIn > 0 ? (profit / totalBuyIn) * 100 : null,
    byBuyIn: byBuyIn.filter((b) => b.count > 0),
  }
}

export interface VarianceStats {
  longestLosingStreak: number
  biggestDownswing: number
  worstSessionProfit: number
  bestSessionProfit: number
}

type TimedEvent =
  | { kind: 'spin'; time: string; spin: SpinEvent }
  | { kind: 'tournament'; time: string; tournament: Tournament }

function allTimedEvents(data: PokerData): TimedEvent[] {
  const events: TimedEvent[] = [
    ...data.spins.map((spin) => ({ kind: 'spin' as const, time: spin.timestamp, spin })),
    ...data.tournaments
      .filter((t) => t.status === 'completed' && t.endTime)
      .map((tournament) => ({
        kind: 'tournament' as const,
        time: tournament.endTime!,
        tournament,
      })),
  ]
  return events.sort((a, b) => a.time.localeCompare(b.time))
}

function eventProfit(event: TimedEvent, settings: Settings): number {
  if (event.kind === 'spin') {
    const stake = getSpinStake(event.spin)
    if (event.spin.type === 'played') return -stake
    if (event.spin.type === 'win') return stake * getSpinWinMultiplier(event.spin, settings)
    return 0
  }
  return event.tournament.winnings - event.tournament.buyIn
}

export function getVarianceStats(data: PokerData): VarianceStats {
  const sortedSpins = [...data.spins].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  let streak = 0
  let longestStreak = 0
  for (const spin of sortedSpins) {
    if (spin.type === 'played') {
      streak += 1
      longestStreak = Math.max(longestStreak, streak)
    } else if (spin.type === 'win') {
      streak = 0
    }
  }

  let cumulative = 0
  let peak = 0
  let maxDrawdown = 0
  for (const event of allTimedEvents(data)) {
    cumulative += eventProfit(event, data.settings)
    peak = Math.max(peak, cumulative)
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative)
  }

  const sessionProfits = data.sessions.map((s) => computeSessionStats(data, s).profit)
  return {
    longestLosingStreak: longestStreak,
    biggestDownswing: maxDrawdown,
    worstSessionProfit: sessionProfits.length > 0 ? Math.min(...sessionProfits) : 0,
    bestSessionProfit: sessionProfits.length > 0 ? Math.max(...sessionProfits) : 0,
  }
}

export interface PeriodSnapshot {
  profit: number
  played: number
  won: number
  durationMs: number
  profitPerHour: number | null
}

export interface PeriodComparison {
  currentLabel: string
  previousLabel: string
  current: PeriodSnapshot
  previous: PeriodSnapshot
  profitDelta: number
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekRange(start: Date): string {
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`
  return `${fmt(start)}–${fmt(end)}`
}

function snapshotForDateRange(data: PokerData, start: Date, end: Date): PeriodSnapshot {
  const startKey = start.toISOString().slice(0, 10)
  const endKey = end.toISOString().slice(0, 10)

  const spins = data.spins.filter((s) => s.date >= startKey && s.date <= endKey)
  const sessions = data.sessions.filter((s) => s.date >= startKey && s.date <= endKey)

  const played = spins.filter((s) => s.type === 'played').length
  const won = spins.filter((s) => s.type === 'win').length
  const profit = sessions.reduce((sum, s) => sum + getSessionProfit(data, s), 0)

  const durationMs = sessions.reduce((sum, s) => {
    const startMs = new Date(s.startTime).getTime()
    const endMs = s.endTime ? new Date(s.endTime).getTime() : Date.now()
    return sum + Math.max(0, endMs - startMs)
  }, 0)

  return { profit, played, won, durationMs, profitPerHour: profitPerHour(profit, durationMs) }
}

export function getWeekComparison(data: PokerData): PeriodComparison {
  const now = new Date()
  const thisWeekStart = getWeekStart(now)
  const thisWeekEnd = new Date(thisWeekStart)
  thisWeekEnd.setDate(thisWeekStart.getDate() + 6)

  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1)
  const lastWeekStart = getWeekStart(lastWeekEnd)

  const current = snapshotForDateRange(data, thisWeekStart, thisWeekEnd)
  const previous = snapshotForDateRange(data, lastWeekStart, lastWeekEnd)

  return {
    currentLabel: `Cette semaine (${formatWeekRange(thisWeekStart)})`,
    previousLabel: `Semaine préc. (${formatWeekRange(lastWeekStart)})`,
    current,
    previous,
    profitDelta: current.profit - previous.profit,
  }
}

export interface BankrollPoint {
  key: string
  label: string
  profit: number
  bankroll: number
}

export function getCurrentBankroll(data: PokerData): number {
  const start = data.settings.startingBankroll ?? 900
  const days = getAllDayStats(data)
  const profit = days.reduce((sum, d) => sum + d.profit, 0)
  return start + profit
}

export function getBankrollCurve(data: PokerData): BankrollPoint[] {
  const start = data.settings.startingBankroll ?? 900
  const days = getAllDayStats(data).sort((a, b) => a.date.localeCompare(b.date))

  if (days.length === 0) {
    return [{ key: 'start', label: 'Départ', profit: 0, bankroll: start }]
  }

  const points: BankrollPoint[] = [{ key: 'start', label: 'Départ', profit: 0, bankroll: start }]
  let profitCumulative = 0

  for (const day of days) {
    profitCumulative += day.profit
    points.push({
      key: day.date,
      label: formatDate(day.date),
      profit: day.profit,
      bankroll: start + profitCumulative,
    })
  }

  return points
}

export interface SessionGoalAlerts {
  maxDurationReached: boolean
  stopLossReached: boolean
  stopWinReached: boolean
}

export function checkSessionGoals(
  settings: Settings,
  durationMs: number,
  profit: number,
): SessionGoalAlerts {
  const maxMin = settings.sessionMaxDurationMin ?? 0
  const stopLoss = settings.sessionStopLoss ?? 0
  const stopWin = settings.sessionStopWin ?? 0

  return {
    maxDurationReached: maxMin > 0 && durationMs >= maxMin * 60_000,
    stopLossReached: stopLoss > 0 && profit <= -stopLoss,
    stopWinReached: stopWin > 0 && profit >= stopWin,
  }
}

export function formatProfitPerHour(value: number | null): string {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(1)} €/h`
}

const MAX_GAP_BETWEEN_SPINS_SEC = 20 * 60

export interface PaceStats {
  spinsPlayed: number
  durationMs: number
  spinsPerHour: number | null
  avgSecondsBetweenSpins: number | null
}

export function formatSpinsPerHour(value: number | null): string {
  if (value == null) return '—'
  return `${value.toFixed(1)} spins/h`
}

export function formatPaceInterval(seconds: number | null): string {
  if (seconds == null) return '—'
  if (seconds < 60) return `${Math.round(seconds)} s`
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  return sec > 0 ? `${min} min ${sec} s` : `${min} min`
}

function averageSecondsBetweenPlays(playedSpins: SpinEvent[]): number | null {
  if (playedSpins.length < 2) return null
  const sorted = [...playedSpins].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  let total = 0
  let count = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap =
      (new Date(sorted[i].timestamp).getTime() - new Date(sorted[i - 1].timestamp).getTime()) / 1000
    if (gap > 0 && gap <= MAX_GAP_BETWEEN_SPINS_SEC) {
      total += gap
      count += 1
    }
  }
  return count > 0 ? total / count : null
}

export function computePaceStats(spins: SpinEvent[], durationMs: number): PaceStats {
  const playedSpins = spins.filter((s) => s.type === 'played')
  const spinsPerHour =
    durationMs > 0 && playedSpins.length > 0
      ? playedSpins.length / (durationMs / 3_600_000)
      : null
  return {
    spinsPlayed: playedSpins.length,
    durationMs,
    spinsPerHour,
    avgSecondsBetweenSpins: averageSecondsBetweenPlays(playedSpins),
  }
}

function sessionDurationMs(session: PokerData['sessions'][0], now = Date.now()): number {
  const start = new Date(session.startTime).getTime()
  const end = session.endTime ? new Date(session.endTime).getTime() : now
  return Math.max(0, end - start)
}

export function getActiveSessionPace(data: PokerData): PaceStats | null {
  const active = data.sessions.find((s) => s.isActive)
  if (!active) return null
  const spins = data.spins.filter((s) => s.sessionId === active.id)
  return computePaceStats(spins, sessionDurationMs(active))
}

export function getTodayPace(data: PokerData): PaceStats {
  const today = new Date().toISOString().slice(0, 10)
  const spins = data.spins.filter((s) => s.date === today)
  const sessions = data.sessions.filter((s) => s.date === today)
  const durationMs = sessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)
  return computePaceStats(spins, durationMs)
}

export function getGlobalPace(data: PokerData): PaceStats {
  const durationMs = data.sessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)
  return computePaceStats(data.spins, durationMs)
}

export interface NoteStats {
  note: string
  sessions: number
  played: number
  won: number
  profit: number
  durationMs: number
  winRate: number
  roi: number | null
  profitPerHour: number | null
  spinsPerHour: number | null
}

function normalizeNote(note?: string): string {
  const trimmed = note?.trim()
  return trimmed ? trimmed.toLowerCase() : 'Sans note'
}

export function getStatsByNote(data: PokerData): NoteStats[] {
  const groups = new Map<string, string[]>()

  for (const session of data.sessions) {
    const label = normalizeNote(session.note)
    const ids = groups.get(label) ?? []
    ids.push(session.id)
    groups.set(label, ids)
  }

  return [...groups.entries()]
    .map(([note, sessionIds]) => {
      const spins = data.spins.filter((s) => sessionIds.includes(s.sessionId))
      const tournaments = data.tournaments.filter((t) => sessionIds.includes(t.sessionId))
      const sessions = data.sessions.filter((s) => sessionIds.includes(s.id))
      const played = spins.filter((s) => s.type === 'played').length
      const won = spins.filter((s) => s.type === 'win').length
      const profit =
        computeSpinProfitFromEvents(spins, data.settings) + computeTournamentProfit(tournaments)
      const durationMs = sessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)
      const pace = computePaceStats(spins, durationMs)
      return {
        note,
        sessions: sessions.length,
        played,
        won,
        profit,
        durationMs,
        winRate: played > 0 ? (won / played) * 100 : 0,
        roi: spinRoi(spins, data.settings),
        profitPerHour: profitPerHour(profit, durationMs),
        spinsPerHour: pace.spinsPerHour,
      }
    })
    .filter((n) => n.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions)
}

export interface DeviceStats {
  device: SessionDevice | 'unknown'
  label: string
  sessions: number
  played: number
  won: number
  profit: number
  durationMs: number
  winRate: number
  roi: number | null
  profitPerHour: number | null
  spinsPerHour: number | null
}

export function getStatsByDevice(data: PokerData): DeviceStats[] {
  const groups = new Map<SessionDevice | 'unknown', string[]>()

  for (const session of data.sessions) {
    const key = session.device ?? 'unknown'
    const ids = groups.get(key) ?? []
    ids.push(session.id)
    groups.set(key, ids)
  }

  const order: (SessionDevice | 'unknown')[] = [...SESSION_DEVICES, 'unknown']

  return order
    .filter((key) => groups.has(key))
    .map((key) => {
      const sessionIds = groups.get(key)!
      const spins = data.spins.filter((s) => sessionIds.includes(s.sessionId))
      const tournaments = data.tournaments.filter((t) => sessionIds.includes(t.sessionId))
      const sessions = data.sessions.filter((s) => sessionIds.includes(s.id))
      const played = spins.filter((s) => s.type === 'played').length
      const won = spins.filter((s) => s.type === 'win').length
      const profit =
        computeSpinProfitFromEvents(spins, data.settings) + computeTournamentProfit(tournaments)
      const durationMs = sessions.reduce((sum, s) => sum + sessionDurationMs(s), 0)
      const pace = computePaceStats(spins, durationMs)
      return {
        device: key,
        label: key === 'unknown' ? 'Non renseigné' : DEVICE_LABELS[key],
        sessions: sessions.length,
        played,
        won,
        profit,
        durationMs,
        winRate: played > 0 ? (won / played) * 100 : 0,
        roi: spinRoi(spins, data.settings),
        profitPerHour: profitPerHour(profit, durationMs),
        spinsPerHour: pace.spinsPerHour,
      }
    })
    .filter((d) => d.sessions > 0)
}

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]

function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(date = new Date()): string {
  return `${MONTH_NAMES_FR[date.getMonth()]} ${date.getFullYear()}`
}

export interface MonthlyGoalsProgress {
  monthLabel: string
  monthProfit: number
  spinsToday: number
  profitGoal: number
  lossLimit: number
  maxSpinsPerDay: number
  profitGoalEnabled: boolean
  lossLimitEnabled: boolean
  maxSpinsEnabled: boolean
  profitGoalPercent: number | null
  lossLimitPercent: number | null
  spinsTodayPercent: number | null
  profitGoalReached: boolean
  lossLimitReached: boolean
  spinsLimitReached: boolean
}

export function getMonthlyGoalsProgress(data: PokerData, date = new Date()): MonthlyGoalsProgress {
  const monthKey = currentMonthKey(date)
  const todayKey = date.toISOString().slice(0, 10)
  const { settings } = data

  const monthSessions = data.sessions.filter((s) => s.date.startsWith(monthKey))
  const monthProfit = monthSessions.reduce((sum, s) => sum + getSessionProfit(data, s), 0)

  const spinsToday = data.spins.filter((s) => s.date === todayKey && s.type === 'played').length

  const profitGoal = settings.monthlyProfitGoal ?? 0
  const lossLimit = settings.monthlyLossLimit ?? 0
  const maxSpins = settings.maxSpinsPerDay ?? 0

  const profitGoalEnabled = profitGoal > 0
  const lossLimitEnabled = lossLimit > 0
  const maxSpinsEnabled = maxSpins > 0

  const profitGoalPercent =
    profitGoalEnabled && monthProfit > 0
      ? Math.min(100, (monthProfit / profitGoal) * 100)
      : profitGoalEnabled
        ? 0
        : null

  const lossLimitPercent =
    lossLimitEnabled && monthProfit < 0
      ? Math.min(100, (Math.abs(monthProfit) / lossLimit) * 100)
      : lossLimitEnabled
        ? 0
        : null

  const spinsTodayPercent = maxSpinsEnabled ? Math.min(100, (spinsToday / maxSpins) * 100) : null

  return {
    monthLabel: formatMonthLabel(date),
    monthProfit,
    spinsToday,
    profitGoal,
    lossLimit,
    maxSpinsPerDay: maxSpins,
    profitGoalEnabled,
    lossLimitEnabled,
    maxSpinsEnabled,
    profitGoalPercent,
    lossLimitPercent,
    spinsTodayPercent,
    profitGoalReached: profitGoalEnabled && monthProfit >= profitGoal,
    lossLimitReached: lossLimitEnabled && monthProfit <= -lossLimit,
    spinsLimitReached: maxSpinsEnabled && spinsToday >= maxSpins,
  }
}

export function hasMonthlyGoals(settings: Settings): boolean {
  return (
    (settings.monthlyProfitGoal ?? 0) > 0 ||
    (settings.monthlyLossLimit ?? 0) > 0 ||
    (settings.maxSpinsPerDay ?? 0) > 0 ||
    (settings.bankrollGoal ?? 0) > 0
  )
}

export function getMonthComparison(data: PokerData, date = new Date()): PeriodComparison {
  const thisMonthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  const thisMonthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  const lastMonthStart = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const lastMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0)

  const current = snapshotForDateRange(data, thisMonthStart, thisMonthEnd)
  const previous = snapshotForDateRange(data, lastMonthStart, lastMonthEnd)

  const fmt = (d: Date) => `${MONTH_NAMES_FR[d.getMonth()]} ${d.getFullYear()}`

  return {
    currentLabel: `Ce mois (${fmt(thisMonthStart)})`,
    previousLabel: `Mois préc. (${fmt(lastMonthStart)})`,
    current,
    previous,
    profitDelta: current.profit - previous.profit,
  }
}

export interface HourlyStats {
  hour: number
  label: string
  played: number
  won: number
  profit: number
  winRate: number
}

export function getHourlyStats(data: PokerData): HourlyStats[] {
  const buckets = new Map<number, SpinEvent[]>()
  for (const spin of data.spins) {
    const hour = new Date(spin.timestamp).getHours()
    const group = buckets.get(hour) ?? []
    group.push(spin)
    buckets.set(hour, group)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, spins]) => {
      const played = spins.filter((s) => s.type === 'played').length
      const won = spins.filter((s) => s.type === 'win').length
      const profit = computeSpinProfitFromEvents(spins, data.settings)
      return {
        hour,
        label: `${String(hour).padStart(2, '0')}h–${String((hour + 1) % 24).padStart(2, '0')}h`,
        played,
        won,
        profit,
        winRate: played > 0 ? (won / played) * 100 : 0,
      }
    })
    .filter((h) => h.played > 0)
}

export interface SessionDurationInsight {
  sessionId: string
  date: string
  durationMin: number
  profit: number
  profitPerHour: number | null
  note?: string
}

export interface DurationCorrelationSummary {
  sessions: SessionDurationInsight[]
  bestProfitPerHour: SessionDurationInsight | null
  avgDurationMin: number
  longSessionsNegative: number
}

export function getSessionDurationInsights(data: PokerData): DurationCorrelationSummary {
  const sessions = data.sessions
    .filter((s) => !s.isActive && s.endTime)
    .map((session) => {
      const stats = computeSessionStats(data, session)
      const durationMin = stats.durationMs / 60_000
      return {
        sessionId: session.id,
        date: session.date,
        durationMin,
        profit: stats.profit,
        profitPerHour: profitPerHour(stats.profit, stats.durationMs),
        note: session.note,
      }
    })
    .filter((s) => s.durationMin >= 5)

  const withPph = sessions.filter((s) => s.profitPerHour != null)
  const bestProfitPerHour =
    withPph.length > 0
      ? withPph.reduce((best, s) => ((s.profitPerHour ?? 0) > (best.profitPerHour ?? 0) ? s : best))
      : null

  const avgDurationMin =
    sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.durationMin, 0) / sessions.length : 0

  const longSessionsNegative = sessions.filter((s) => s.durationMin >= 90 && s.profit < 0).length

  return { sessions, bestProfitPerHour, avgDurationMin, longSessionsNegative }
}

export function getTournamentAbi(data: PokerData, monthOnly = false): number | null {
  const monthKey = currentMonthKey()
  const tournaments = data.tournaments.filter(
    (t) => !monthOnly || t.date.startsWith(monthKey),
  )
  if (tournaments.length === 0) return null
  return tournaments.reduce((sum, t) => sum + t.buyIn, 0) / tournaments.length
}

export interface BankrollGoalProgress {
  current: number
  goal: number
  percent: number
  remaining: number
  reached: boolean
}

export function getBankrollGoalProgress(data: PokerData): BankrollGoalProgress | null {
  const goal = data.settings.bankrollGoal ?? 0
  if (goal <= 0) return null
  const current = getCurrentBankroll(data)
  const percent = Math.min(100, (current / goal) * 100)
  return {
    current,
    goal,
    percent,
    remaining: Math.max(0, goal - current),
    reached: current >= goal,
  }
}

export interface MonthSimulation {
  monthLabel: string
  monthProfit: number
  profitGoal: number
  remaining: number
  playedThisMonth: number
  profitPerSpin: number | null
  spinsNeeded: number | null
  daysLeft: number
  message: string
}

export function getMonthSimulation(data: PokerData, date = new Date()): MonthSimulation | null {
  const profitGoal = data.settings.monthlyProfitGoal ?? 0
  if (profitGoal <= 0) return null

  const monthKey = currentMonthKey(date)
  const monthSpins = data.spins.filter((s) => s.date.startsWith(monthKey))
  const monthSessions = data.sessions.filter((s) => s.date.startsWith(monthKey))
  const monthProfit = monthSessions.reduce((sum, s) => sum + getSessionProfit(data, s), 0)

  const played = monthSpins.filter((s) => s.type === 'played').length
  const remaining = profitGoal - monthProfit

  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const daysLeft = lastDay - date.getDate()

  let profitPerSpin: number | null = null
  let spinsNeeded: number | null = null
  let message: string

  if (remaining <= 0) {
    message = 'Objectif de profit mensuel déjà atteint.'
  } else if (played < 5) {
    message = `Pas assez de spins ce mois (${played}) pour estimer le rythme.`
  } else {
    profitPerSpin = monthProfit / played
    if (profitPerSpin <= 0) {
      message = `Rythme actuel négatif (${profitPerSpin.toFixed(2)} €/spin) — impossible d'estimer.`
    } else {
      spinsNeeded = Math.ceil(remaining / profitPerSpin)
      message = `Au rythme actuel (+${profitPerSpin.toFixed(2)} €/spin), environ ${spinsNeeded} spins restants pour +${remaining.toFixed(0)} €.`
    }
  }

  return {
    monthLabel: formatMonthLabel(date),
    monthProfit,
    profitGoal,
    remaining,
    playedThisMonth: played,
    profitPerSpin,
    spinsNeeded,
    daysLeft,
    message,
  }
}
