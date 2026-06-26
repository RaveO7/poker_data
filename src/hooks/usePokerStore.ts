import { useCallback, useEffect, useRef, useState } from 'react'
import type { PokerData, Settings, SpinEventType } from '../types'
import { clearAllData, importData, loadData, persistData } from '../lib/storage'
import { todayKey } from '../lib/date'

function createId(): string {
  return crypto.randomUUID()
}

function ensureActiveSession(data: PokerData): PokerData {
  if (data.sessions.some((s) => s.isActive)) return data

  const session = {
    id: createId(),
    date: todayKey(),
    startTime: new Date().toISOString(),
    isActive: true,
  }

  return { ...data, sessions: [session, ...data.sessions] }
}

export function usePokerStore() {
  const [data, setData] = useState<PokerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPersisted = useRef<string | null>(null)

  const refreshData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadData()
      lastPersisted.current = JSON.stringify(loaded)
      setData(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  useEffect(() => {
    if (!data) return

    const serialized = JSON.stringify(data)
    if (serialized === lastPersisted.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void persistData(data)
        .then(() => {
          lastPersisted.current = serialized
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Erreur de sauvegarde')
        })
    }, 300)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [data])

  useEffect(() => {
    const active = data?.sessions.find((s) => s.isActive)
    if (!active) return

    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [data?.sessions])

  const update = useCallback((updater: (prev: PokerData) => PokerData) => {
    setData((prev) => (prev ? updater(prev) : prev))
  }, [])

  const startSession = useCallback(() => {
    update((prev) => {
      const ended = prev.sessions.map((s) =>
        s.isActive ? { ...s, isActive: false, endTime: new Date().toISOString() } : s,
      )
      const session = {
        id: createId(),
        date: todayKey(),
        startTime: new Date().toISOString(),
        isActive: true,
      }
      return { ...prev, sessions: [session, ...ended] }
    })
  }, [update])

  const endSession = useCallback(() => {
    update((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) =>
        s.isActive ? { ...s, isActive: false, endTime: new Date().toISOString() } : s,
      ),
    }))
  }, [update])

  const addSpin = useCallback(
    (type: SpinEventType) => {
      update((prev) => {
        const withSession = ensureActiveSession(prev)
        const session = withSession.sessions.find((s) => s.isActive)!
        const event = {
          id: createId(),
          sessionId: session.id,
          date: todayKey(),
          timestamp: new Date().toISOString(),
          type,
          stake: withSession.settings.selectedSpinStake,
        }
        return { ...withSession, spins: [...withSession.spins, event] }
      })
    },
    [update],
  )

  const startTournament = useCallback(() => {
    update((prev) => {
      const withSession = ensureActiveSession(prev)
      const session = withSession.sessions.find((s) => s.isActive)!
      const tournament = {
        id: createId(),
        sessionId: session.id,
        date: todayKey(),
        startTime: new Date().toISOString(),
        status: 'in_progress' as const,
        buyIn: withSession.settings.selectedTournamentStake,
        winnings: 0,
      }
      return { ...withSession, tournaments: [...withSession.tournaments, tournament] }
    })
  }, [update])

  const finishTournament = useCallback(
    (id: string, place: number, winnings: number) => {
      update((prev) => ({
        ...prev,
        tournaments: prev.tournaments.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'completed' as const,
                place,
                winnings,
                endTime: new Date().toISOString(),
              }
            : t,
        ),
      }))
    },
    [update],
  )

  const updateSettings = useCallback(
    (settings: Partial<Settings>) => {
      update((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...settings },
      }))
    },
    [update],
  )

  const resetData = useCallback(async () => {
    if (!window.confirm('Supprimer toutes les données ? Cette action est irréversible.')) return
    try {
      const empty = await clearAllData()
      lastPersisted.current = JSON.stringify(empty)
      setData(empty)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de réinitialisation')
    }
  }, [])

  const importFromFile = useCallback(async (json: PokerData) => {
    try {
      const imported = await importData(json)
      lastPersisted.current = JSON.stringify(imported)
      setData(imported)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'import")
    }
  }, [])

  return {
    data,
    loading,
    error,
    tick,
    refreshData,
    startSession,
    endSession,
    addSpin,
    startTournament,
    finishTournament,
    updateSettings,
    resetData,
    importFromFile,
  }
}
