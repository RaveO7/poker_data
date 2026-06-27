import { useState } from 'react'
import {
  formatDate,
  formatDuration,
  formatMoney,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../lib/date'
import { formatProfitPerHour, profitPerHour } from '../lib/analytics'
import {
  computeSessionStatsFiltered,
  filterSessions,
  type HistoryFilterState,
} from '../lib/historyFilters'
import type { Session } from '../types'
import type { PokerData } from '../types'
import { Card } from './ui'

interface SessionHistoryProps {
  data: PokerData
  filters: HistoryFilterState
  onUpdateSession: (
    id: string,
    updates: Partial<Pick<Session, 'date' | 'startTime' | 'endTime' | 'note'>>,
  ) => void
}

interface EditForm {
  startTime: string
  endTime: string
  note: string
}

function sessionDurationPreview(session: Session, startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime()
  const end = session.isActive
    ? Date.now()
    : endTime
      ? new Date(endTime).getTime()
      : Date.now()
  return Math.max(0, end - start)
}

export function SessionHistory({ data, filters, onUpdateSession }: SessionHistoryProps) {
  const sessions = filterSessions(data, filters)
    .map((session) => computeSessionStatsFiltered(data, session, filters))
    .sort((a, b) => b.session.startTime.localeCompare(a.session.startTime))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm>({ startTime: '', endTime: '', note: '' })

  const startEdit = (session: Session) => {
    setEditingId(session.id)
    setForm({
      startTime: toDatetimeLocalValue(session.startTime),
      endTime: session.endTime ? toDatetimeLocalValue(session.endTime) : '',
      note: session.note ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ startTime: '', endTime: '', note: '' })
  }

  const saveEdit = (session: Session) => {
    const startIso = fromDatetimeLocalValue(form.startTime)
    const endIso = form.endTime ? fromDatetimeLocalValue(form.endTime) : undefined

    if (!session.isActive && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      alert('La fin doit être après le début.')
      return
    }

    onUpdateSession(session.id, {
      date: startIso.slice(0, 10),
      startTime: startIso,
      note: form.note.trim() || undefined,
      ...(endIso ? { endTime: endIso } : {}),
    })
    cancelEdit()
  }

  if (sessions.length === 0) {
    return (
      <Card title="🕐 Historique des sessions">
        <p className="text-center text-white/50">Aucune session ne correspond aux filtres.</p>
      </Card>
    )
  }

  return (
    <Card title="🕐 Historique des sessions">
      <div className="space-y-3">
        {sessions.map((s) => {
          const isHistorical = s.session.id === 'historical-excel-import'
          const isEditing = editingId === s.session.id
          const previewMs = isEditing
            ? sessionDurationPreview(s.session, form.startTime, form.endTime)
            : s.durationMs

          return (
            <div
              key={s.session.id}
              className="rounded-xl bg-black/20 px-4 py-3"
            >
              {isEditing ? (
                <div className="space-y-3">
                  <p className="font-medium">{formatDate(s.session.date)}</p>
                  <label className="block text-sm">
                    <span className="text-white/60">Début</span>
                    <input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                    />
                  </label>
                  {!s.session.isActive && (
                    <label className="block text-sm">
                      <span className="text-white/60">Fin</span>
                      <input
                        type="datetime-local"
                        value={form.endTime}
                        onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                      />
                    </label>
                  )}
                  <p className="text-sm text-white/50">
                    Durée : {formatDuration(previewMs)}
                  </p>
                  <label className="block text-sm">
                    <span className="text-white/60">Note (optionnel)</span>
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="ex: focus, fatigué, tilt…"
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(s.session)}
                      className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-felt-dark hover:bg-gold-light"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {isHistorical ? 'Import Excel (historique)' : formatDate(s.session.date)}
                      {s.session.isActive && (
                        <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                          En cours
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-white/50">
                      {s.spinsPlayed} spins · {s.tournamentsPlayed} tournois ·{' '}
                      {formatDuration(s.durationMs)}
                      {formatProfitPerHour(profitPerHour(s.profit, s.durationMs)) !== '—' && (
                        <span className="ml-1 text-sky-400/80">
                          · {formatProfitPerHour(profitPerHour(s.profit, s.durationMs))}
                        </span>
                      )}
                      {s.session.note && (
                        <span className="ml-1 text-white/40">· {s.session.note}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold tabular-nums ${s.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {formatMoney(s.profit)}
                      </p>
                      <p className="text-xs text-white/40">
                        {s.spinsWon}W / {s.spinsFinal}F
                      </p>
                    </div>
                    {!isHistorical && (
                      <button
                        type="button"
                        onClick={() => startEdit(s.session)}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
                        title="Modifier les horaires"
                      >
                        Modifier
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
