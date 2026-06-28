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
import {
  computeSessionStats,
  computeSpinProfitFromCounts,
  getSessionWinMultipliers,
  getSpinStake,
} from '../lib/stats'
import type { SessionSpinCounts } from '../lib/stats'
import type { Session } from '../types'
import type { PokerData } from '../types'
import { DEVICE_LABELS, SESSION_DEVICES, SPIN_MULTIPLIERS } from '../types'
import { Card } from './ui'

interface SessionHistoryProps {
  data: PokerData
  filters: HistoryFilterState
  onSaveSessionEdits: (
    id: string,
    updates: Partial<Pick<Session, 'date' | 'startTime' | 'endTime' | 'note' | 'device'>>,
    spinCounts: SessionSpinCounts,
    profit: number,
    winMultipliers: number[],
  ) => void
  onDeleteSession: (id: string) => void
}

interface EditForm {
  startTime: string
  endTime: string
  note: string
  device?: Session['device']
  spinsPlayed: string
  spinsFinal: string
  spinsWon: string
  profit: string
  winMultipliers: number[]
  stake: number
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

function profitFromForm(form: EditForm): string {
  const played = parseInt(form.spinsPlayed, 10) || 0
  return String(computeSpinProfitFromCounts(form.stake, played, form.winMultipliers))
}

function resizeWinMultipliers(
  current: number[],
  won: number,
  defaultMult: number,
): number[] {
  const next = [...current]
  while (next.length < won) next.push(defaultMult)
  return next.slice(0, won)
}

export function SessionHistory({ data, filters, onSaveSessionEdits, onDeleteSession }: SessionHistoryProps) {
  const sessions = filterSessions(data, filters)
    .map((session) => computeSessionStatsFiltered(data, session, filters))
    .sort((a, b) => b.session.startTime.localeCompare(a.session.startTime))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm>({
    startTime: '',
    endTime: '',
    note: '',
    device: undefined,
    spinsPlayed: '0',
    spinsFinal: '0',
    spinsWon: '0',
    profit: '0',
    winMultipliers: [],
    stake: 5,
  })

  const startEdit = (stats: (typeof sessions)[number]) => {
    const full = computeSessionStats(data, stats.session)
    const sessionSpins = data.spins.filter((s) => s.sessionId === stats.session.id)
    const stake =
      sessionSpins.length > 0 ? getSpinStake(sessionSpins[0]) : data.settings.selectedSpinStake
    const winMultipliers = getSessionWinMultipliers(data, stats.session.id)

    setEditingId(stats.session.id)
    setForm({
      startTime: toDatetimeLocalValue(stats.session.startTime),
      endTime: stats.session.endTime ? toDatetimeLocalValue(stats.session.endTime) : '',
      note: stats.session.note ?? '',
      device: stats.session.device,
      spinsPlayed: String(full.spinsPlayed),
      spinsFinal: String(full.spinsFinal),
      spinsWon: String(full.spinsWon),
      profit: String(full.profit),
      winMultipliers,
      stake,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({
      startTime: '',
      endTime: '',
      note: '',
      spinsPlayed: '0',
      spinsFinal: '0',
      spinsWon: '0',
      profit: '0',
      winMultipliers: [],
      stake: 5,
    })
  }

  const parseCount = (value: string): number | null => {
    const n = parseInt(value, 10)
    if (Number.isNaN(n) || n < 0) return null
    return n
  }

  const updateWonCount = (value: string) => {
    const won = parseInt(value, 10) || 0
    setForm((f) => {
      const winMultipliers = resizeWinMultipliers(
        f.winMultipliers,
        won,
        data.settings.selectedSpinMultiplier,
      )
      const next = { ...f, spinsWon: value, winMultipliers }
      return { ...next, profit: profitFromForm(next) }
    })
  }

  const setWinMultiplier = (index: number, mult: number) => {
    setForm((f) => {
      const winMultipliers = f.winMultipliers.map((m, i) => (i === index ? mult : m))
      const next = { ...f, winMultipliers }
      return { ...next, profit: profitFromForm(next) }
    })
  }

  const saveEdit = (session: Session) => {
    const startIso = fromDatetimeLocalValue(form.startTime)
    const endIso = form.endTime ? fromDatetimeLocalValue(form.endTime) : undefined

    if (!session.isActive && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      alert('La fin doit être après le début.')
      return
    }

    const played = parseCount(form.spinsPlayed)
    const final = parseCount(form.spinsFinal)
    const won = parseCount(form.spinsWon)
    if (played == null || final == null || won == null) {
      alert('Les nombres de spins doivent être des entiers ≥ 0.')
      return
    }

    const profitValue = parseFloat(form.profit.replace(',', '.'))
    if (Number.isNaN(profitValue)) {
      alert('Le P&L doit être un nombre valide.')
      return
    }

    if (form.winMultipliers.length !== won) {
      alert('Le nombre de multiplicateurs doit correspondre aux victoires.')
      return
    }

    onSaveSessionEdits(
      session.id,
      {
        date: startIso.slice(0, 10),
        startTime: startIso,
        note: form.note.trim() || undefined,
        device: form.device,
        ...(endIso ? { endTime: endIso } : {}),
      },
      { played, final, won },
      profitValue,
      form.winMultipliers,
    )
    cancelEdit()
  }

  const confirmDelete = (stats: (typeof sessions)[number]) => {
    const { session } = stats
    const label = session.isActive ? 'session en cours' : formatDate(session.date)
    const detail = `${stats.spinsPlayed} spins, ${stats.tournamentsPlayed} tournois, ${formatMoney(stats.profit)}`
    const message = session.isActive
      ? `Supprimer la ${label} (${detail}) ?\n\nLa session active et toutes ses données seront effacées.`
      : `Supprimer la session du ${label} (${detail}) ?\n\nCette action est irréversible.`

    if (!window.confirm(message)) return

    if (editingId === session.id) cancelEdit()
    onDeleteSession(session.id)
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
            <div key={s.session.id} className="rounded-xl bg-black/20 px-4 py-3">
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
                  <p className="text-sm text-white/50">Durée : {formatDuration(previewMs)}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-sm">
                      <span className="text-white/60">Parties</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.spinsPlayed}
                        onChange={(e) => {
                          const spinsPlayed = e.target.value
                          setForm((f) => {
                            const next = { ...f, spinsPlayed }
                            return { ...next, profit: profitFromForm(next) }
                          })
                        }}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-white/60">Finales</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.spinsFinal}
                        onChange={(e) => setForm((f) => ({ ...f, spinsFinal: e.target.value }))}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="text-white/60">Victoires</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.spinsWon}
                        onChange={(e) => updateWonCount(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                      />
                    </label>
                  </div>

                  {form.winMultipliers.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm text-white/60">
                        Multiplicateurs des victoires ({form.stake} € / spin)
                      </p>
                      <div className="space-y-2">
                        {form.winMultipliers.map((mult, index) => (
                          <div
                            key={index}
                            className="flex flex-wrap items-center gap-2 rounded-lg bg-black/25 px-3 py-2"
                          >
                            <span className="w-16 text-xs text-white/50">Win {index + 1}</span>
                            <div className="flex flex-wrap gap-1">
                              {SPIN_MULTIPLIERS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setWinMultiplier(index, m)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                    mult === m
                                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                                  }`}
                                >
                                  ×{m}
                                </button>
                              ))}
                            </div>
                            <span className="ml-auto text-xs text-emerald-400">
                              +{form.stake * mult} €
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-white/40">
                        P&L calculé : {formatMoney(parseFloat(profitFromForm(form)))}
                      </p>
                    </div>
                  )}

                  <label className="block text-sm">
                    <span className="text-white/60">P&L session (€)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={form.profit}
                      onChange={(e) => setForm((f) => ({ ...f, profit: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
                    />
                    <p className="mt-1 text-xs text-white/40">
                      Ajustez manuellement seulement si le P&L réel diffère du calcul spins.
                    </p>
                  </label>
                  <div>
                    <p className="mb-2 text-xs text-white/60">Support de jeu</p>
                    <div className="flex flex-wrap gap-2">
                      {SESSION_DEVICES.map((device) => (
                        <button
                          key={device}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, device }))}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            form.device === device
                              ? 'bg-sky-500 text-white ring-2 ring-sky-300'
                              : 'bg-white/10 text-white/80 hover:bg-white/20'
                          }`}
                        >
                          {DEVICE_LABELS[device]}
                        </button>
                      ))}
                    </div>
                  </div>
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
                      {s.session.device && (
                        <span className="ml-1 rounded bg-sky-500/20 px-1.5 py-0.5 text-xs text-sky-300">
                          {DEVICE_LABELS[s.session.device]}
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
                        {s.session.profitOverride != null && (
                          <span className="ml-1 text-amber-400/80">· P&L ajusté</span>
                        )}
                      </p>
                    </div>
                    {!isHistorical && (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
                          title="Modifier la session"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(s)}
                          className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/25"
                          title="Supprimer la session"
                        >
                          Supprimer
                        </button>
                      </div>
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
