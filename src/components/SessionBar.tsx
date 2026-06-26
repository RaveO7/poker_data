import { formatDuration } from '../lib/date'
import { computeSessionStats, getActiveSession } from '../lib/stats'
import type { PokerData } from '../types'
import { ActionButton, StatBox } from './ui'

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
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-felt to-felt-light p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold/80">Session en cours</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {active ? formatDuration(stats!.durationMs) : '—'}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {active ? 'Chronomètre actif' : 'Aucune session active'}
          </p>
        </div>

        <div className="flex gap-2">
          {active ? (
            <ActionButton label="Terminer la session" onClick={onEnd} variant="secondary" />
          ) : (
            <ActionButton label="Nouvelle session" onClick={onStart} variant="primary" />
          )}
        </div>
      </div>

      {active && stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Spins" value={stats.spinsPlayed} />
          <StatBox label="Finales" value={stats.spinsFinal} />
          <StatBox label="Victoires" value={stats.spinsWon} accent="green" />
          <StatBox
            label="Profit session"
            value={`${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(0)} €`}
            accent={stats.profit >= 0 ? 'green' : 'red'}
          />
        </div>
      )}
    </div>
  )
}
