import { fetchPokerData, savePokerData } from './api'
import { DEFAULT_DATA, type PokerData, type Settings } from '../types'

const STORAGE_KEY = 'poker-tracker-data'
const MIGRATED_KEY = 'poker-tracker-file-migrated'

function migrateSettings(raw: Record<string, unknown>): Settings {
  const legacy = raw as {
    spinBuyIn?: number
    tournamentBuyIn?: number
    spinWinGain?: number
    selectedSpinStake?: number
    selectedTournamentStake?: number
    selectedSpinMultiplier?: number
    spinWinMultiplier?: number
    sessionMaxDurationMin?: number
    sessionStopLoss?: number
    sessionStopWin?: number
    startingBankroll?: number
    monthlyProfitGoal?: number
    monthlyLossLimit?: number
    maxSpinsPerDay?: number
    bankrollGoal?: number
    customNoteTags?: string[]
    theme?: 'dark' | 'light'
  }

  return {
    selectedSpinStake: legacy.selectedSpinStake ?? legacy.spinBuyIn ?? DEFAULT_DATA.settings.selectedSpinStake,
    selectedTournamentStake:
      legacy.selectedTournamentStake ?? legacy.tournamentBuyIn ?? DEFAULT_DATA.settings.selectedTournamentStake,
    selectedSpinMultiplier:
      legacy.selectedSpinMultiplier ?? legacy.spinWinMultiplier ?? DEFAULT_DATA.settings.selectedSpinMultiplier,
    spinWinMultiplier:
      legacy.spinWinMultiplier ??
      (legacy.spinWinGain && legacy.spinBuyIn
        ? legacy.spinWinGain / legacy.spinBuyIn
        : DEFAULT_DATA.settings.spinWinMultiplier),
    sessionMaxDurationMin: legacy.sessionMaxDurationMin ?? DEFAULT_DATA.settings.sessionMaxDurationMin,
    sessionStopLoss: legacy.sessionStopLoss ?? DEFAULT_DATA.settings.sessionStopLoss,
    sessionStopWin: legacy.sessionStopWin ?? DEFAULT_DATA.settings.sessionStopWin,
    startingBankroll: legacy.startingBankroll ?? DEFAULT_DATA.settings.startingBankroll,
    monthlyProfitGoal: legacy.monthlyProfitGoal ?? DEFAULT_DATA.settings.monthlyProfitGoal,
    monthlyLossLimit: legacy.monthlyLossLimit ?? DEFAULT_DATA.settings.monthlyLossLimit,
    maxSpinsPerDay: legacy.maxSpinsPerDay ?? DEFAULT_DATA.settings.maxSpinsPerDay,
    bankrollGoal: legacy.bankrollGoal ?? DEFAULT_DATA.settings.bankrollGoal,
    customNoteTags: Array.isArray(legacy.customNoteTags)
      ? legacy.customNoteTags
      : DEFAULT_DATA.settings.customNoteTags,
    theme: legacy.theme === 'light' ? 'light' : DEFAULT_DATA.settings.theme,
  }
}

function normalizeData(raw: Partial<PokerData>): PokerData {
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    spins: Array.isArray(raw.spins) ? raw.spins : [],
    tournaments: Array.isArray(raw.tournaments) ? raw.tournaments : [],
    settings: migrateSettings((raw.settings ?? {}) as Record<string, unknown>),
  }
}

function loadLocalData(): PokerData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return normalizeData(JSON.parse(raw) as Partial<PokerData>)
  } catch {
    return null
  }
}

function shouldMigrateLocal(local: PokerData, file: PokerData): boolean {
  if (localStorage.getItem(MIGRATED_KEY) === 'done') return false
  const localCount = local.spins.length + local.tournaments.length + local.sessions.length
  const fileCount = file.spins.length + file.tournaments.length + file.sessions.length
  return localCount > fileCount
}

export async function loadData(): Promise<PokerData> {
  const fileData = normalizeData(await fetchPokerData())
  const localData = loadLocalData()

  if (localData && shouldMigrateLocal(localData, fileData)) {
    const merged = normalizeData({
      sessions: [...fileData.sessions, ...localData.sessions.filter((s) => !fileData.sessions.some((f) => f.id === s.id))],
      spins: [...fileData.spins, ...localData.spins.filter((s) => !fileData.spins.some((f) => f.id === s.id))],
      tournaments: [
        ...fileData.tournaments,
        ...localData.tournaments.filter((t) => !fileData.tournaments.some((f) => f.id === t.id)),
      ],
      settings: localData.settings,
    })
    await savePokerData(merged)
    localStorage.setItem(MIGRATED_KEY, 'done')
    localStorage.removeItem(STORAGE_KEY)
    return merged
  }

  localStorage.setItem(MIGRATED_KEY, 'done')
  return fileData
}

export async function persistData(data: PokerData): Promise<void> {
  await savePokerData(data)
}

export async function clearAllData(): Promise<PokerData> {
  localStorage.removeItem(STORAGE_KEY)
  const empty = structuredClone(DEFAULT_DATA)
  await savePokerData(empty)
  return empty
}

export async function importData(data: PokerData): Promise<PokerData> {
  const normalized = normalizeData(data)
  await savePokerData(normalized)
  return normalized
}

export function exportData(data: PokerData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `poker-tracker-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function parseImportedJson(text: string): PokerData {
  return normalizeData(JSON.parse(text) as Partial<PokerData>)
}
