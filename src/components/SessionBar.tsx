import { formatDuration } from '../lib/date'
import { computeSessionStats, getActiveSession } from '../lib/stats'
import type { PokerData } from '../types'
import { StatBox } from './ui'

interface SessionBarProps {
  data: PokerData
  tick: number
  onStart: () => void
  onEnd: () => void
}

export function SessionBar({ data, tick, onStart, onEnd }: SessionBarProps) {
  const active = getActiveSession(data)
  void tick

  const stats = active ? computeSessionStats(data, active) : null

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 border-b border-gold/30 bg-felt-dark/95 shadow-lg backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-gold/80">Session en cours</p>
            <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">
              {active ? formatDuration(stats!.durationMs) : '—'}
            </p>
            <p className="text-xs text-white/50 sm:text-sm">
              {active ? 'Chronomètre actif' : 'Aucune session active'}
            </p>
          </div>

          <div className="shrink-0">
            {active ? (
              <button
                type="button"
                onClick={onEnd}
                className="rounded-xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:px-5 sm:text-base"
              >
                Terminer
              </button>
            ) : (
              <button
                type="button"
                onClick={onStart}
                className="rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-felt-dark transition hover:bg-gold-light sm:px-5 sm:text-base"
              >
                Nouvelle session
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="h-[88px] sm:h-[92px]" aria-hidden />

      {active && stats && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Spins" value={stats.spinsPlayed} />
            <StatBox label="Finales" value={stats.spinsFinal} />
            <StatBox label="Victoires" value={stats.spinsWon} accent="green" />
            <StatBox
              label="Profit session"
              value={`${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)} €`}
              accent={stats.profit >= 0 ? 'green' : 'red'}
            />
          </div>
        </div>
      )}
    </>
  )
}
