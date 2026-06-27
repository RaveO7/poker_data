import type { ReactNode } from 'react'
import { formatDuration, formatMoney } from '../lib/date'
import {
  checkSessionGoals,
  formatPaceInterval,
  formatProfitPerHour,
  formatSpinsPerHour,
  getActiveSessionPace,
  profitPerHour,
} from '../lib/analytics'
import { computeSessionStats, getActiveSession } from '../lib/stats'
import { getAllNoteTags, type PokerData } from '../types'
import { ActionButton, StatBox } from './ui'

interface SessionBarProps {
  data: PokerData
  tick: number
  onStart: () => void
  onEnd: () => void
  onUndo: () => void
  onSetNote: (sessionId: string, note: string) => void
}

export function SessionBar({ data, tick, onStart, onEnd, onUndo, onSetNote }: SessionBarProps) {
  const active = getActiveSession(data)
  void tick

  const stats = active ? computeSessionStats(data, active) : null
  const pace = getActiveSessionPace(data)
  const alerts =
    active && stats ? checkSessionGoals(data.settings, stats.durationMs, stats.profit) : null
  const pph = stats ? profitPerHour(stats.profit, stats.durationMs) : null

  const activeSessionEmpty =
    active != null &&
    !data.spins.some((s) => s.sessionId === active.id) &&
    !data.tournaments.some((t) => t.sessionId === active.id)

  const hasUndo =
    activeSessionEmpty || data.spins.length > 0 || data.tournaments.length > 0

  const activeNote = active?.note?.trim().toLowerCase()
  const noteTags = getAllNoteTags(data.settings)

  return (
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-r from-felt to-felt-light p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold/80">Session en cours</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-white">
            {active ? formatDuration(stats!.durationMs) : '—'}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {active ? (
              <>
                {formatProfitPerHour(pph)}
                {pace?.spinsPerHour != null && (
                  <span className="ml-2">· {formatSpinsPerHour(pace.spinsPerHour)}</span>
                )}
              </>
            ) : (
              'Aucune session active'
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20"
            >
              ↩ Annuler
            </button>
          )}
          {active ? (
            <ActionButton label="Terminer la session" onClick={onEnd} variant="secondary" />
          ) : (
            <ActionButton label="Nouvelle session" onClick={onStart} variant="primary" />
          )}
        </div>
      </div>

      {active && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-white/50">Contexte de session</p>
          <div className="flex flex-wrap gap-2">
            {noteTags.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSetNote(active.id, preset)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition ${
                  activeNote === preset.toLowerCase()
                    ? 'bg-gold text-felt-dark ring-2 ring-gold-light'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      )}

      {alerts &&
        (alerts.maxDurationReached || alerts.stopLossReached || alerts.stopWinReached) && (
          <div className="mt-4 space-y-2">
            {alerts.maxDurationReached && (
              <AlertBanner variant="warning">
                Durée max atteinte ({data.settings.sessionMaxDurationMin} min) — pensez à terminer la
                session.
              </AlertBanner>
            )}
            {alerts.stopLossReached && (
              <AlertBanner variant="danger">
                Stop-loss atteint ({data.settings.sessionStopLoss} €) — objectif de perte max
                dépassé.
              </AlertBanner>
            )}
            {alerts.stopWinReached && (
              <AlertBanner variant="success">
                Stop-win atteint (+{data.settings.sessionStopWin} €) — objectif de gain atteint !
              </AlertBanner>
            )}
          </div>
        )}

      {active && stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatBox label="Spins" value={stats.spinsPlayed} />
          <StatBox label="Finales" value={stats.spinsFinal} />
          <StatBox label="Victoires" value={stats.spinsWon} accent="green" />
          <StatBox
            label="Profit session"
            value={formatMoney(stats.profit)}
            accent={stats.profit >= 0 ? 'green' : 'red'}
          />
          <StatBox label="€ / heure" value={formatProfitPerHour(pph)} accent="blue" />
          <StatBox
            label="Rythme"
            value={formatSpinsPerHour(pace?.spinsPerHour ?? null)}
            accent="blue"
          />
        </div>
      )}

      {active && pace && pace.avgSecondsBetweenSpins != null && (
        <p className="mt-3 text-center text-xs text-white/40">
          Temps moyen entre deux spins : {formatPaceInterval(pace.avgSecondsBetweenSpins)}
        </p>
      )}
    </div>
  )
}

function AlertBanner({
  children,
  variant,
}: {
  children: ReactNode
  variant: 'warning' | 'danger' | 'success'
}) {
  const classes = {
    warning: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    danger: 'border-red-500/40 bg-red-500/15 text-red-200',
    success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
  }
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm font-medium ${classes[variant]}`}>
      {children}
    </p>
  )
}
