import { useCallback, useEffect, useRef, useState } from 'react'
import type { PokerData, Session, Settings, SpinEventType } from '../types'
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

  const updateSession = useCallback(
    (id: string, updates: Pick<Session, 'date' | 'startTime' | 'endTime' | 'note'>) => {
      update((prev) => ({
        ...prev,
        sessions: prev.sessions.map((s) => {
          if (s.id !== id) return s
          const next: Session = { ...s, ...updates }
          if (updates.startTime && !updates.date) {
            next.date = updates.startTime.slice(0, 10)
          }
          return next
        }),
      }))
    },
    [update],
  )

  const undoLastAction = useCallback(() => {
    update((prev) => {
      const active = prev.sessions.find((s) => s.isActive)
      if (active) {
        const sessionSpins = prev.spins.filter((s) => s.sessionId === active.id)
        const sessionTournaments = prev.tournaments.filter((t) => t.sessionId === active.id)
        if (sessionSpins.length === 0 && sessionTournaments.length === 0) {
          return { ...prev, sessions: prev.sessions.filter((s) => s.id !== active.id) }
        }
      }

      const lastSpin = [...prev.spins].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      const inProgress = prev.tournaments.filter((t) => t.status === 'in_progress')
      const lastTournament = [...prev.tournaments]
        .filter((t) => t.status === 'completed' && t.endTime)
        .sort((a, b) => (b.endTime ?? '').localeCompare(a.endTime ?? ''))[0]

      const candidates: { kind: 'spin' | 'tournament' | 'in_progress'; time: string; id: string }[] =
        []
      if (lastSpin) candidates.push({ kind: 'spin', time: lastSpin.timestamp, id: lastSpin.id })
      if (lastTournament)
        candidates.push({ kind: 'tournament', time: lastTournament.endTime!, id: lastTournament.id })
      for (const t of inProgress) {
        candidates.push({ kind: 'in_progress', time: t.startTime, id: t.id })
      }

      if (candidates.length === 0) return prev

      candidates.sort((a, b) => b.time.localeCompare(a.time))
      const target = candidates[0]

      if (target.kind === 'spin') {
        return { ...prev, spins: prev.spins.filter((s) => s.id !== target.id) }
      }
      return { ...prev, tournaments: prev.tournaments.filter((t) => t.id !== target.id) }
    })
  }, [update])

  const addSpin = useCallback(
    (type: SpinEventType, multiplier?: number) => {
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
          ...(type === 'win' && multiplier != null ? { multiplier } : {}),
        }
        const settings =
          type === 'win' && multiplier != null
            ? { ...withSession.settings, selectedSpinMultiplier: multiplier }
            : withSession.settings
        return {
          ...withSession,
          settings,
          spins: [...withSession.spins, event],
        }
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
    if (saveTimer.current) clearTimeout(saveTimer.current)
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
    updateSession,
    undoLastAction,
    addSpin,
    startTournament,
    finishTournament,
    updateSettings,
    resetData,
    importFromFile,
  }
}
