import { formatDate, formatDuration, formatMoney } from '../lib/date'
import { getRecentSessions } from '../lib/stats'
import type { PokerData } from '../types'
import { Card } from './ui'

interface SessionHistoryProps {
  data: PokerData
}

export function SessionHistory({ data }: SessionHistoryProps) {
  const sessions = getRecentSessions(data, 8)

  if (sessions.length === 0) {
    return (
      <Card title="🕐 Historique des sessions">
        <p className="text-center text-white/50">Aucune session enregistrée.</p>
      </Card>
    )
  }

  return (
    <Card title="🕐 Historique des sessions">
      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s.session.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 px-4 py-3"
          >
            <div>
              <p className="font-medium">
                {s.session.id === 'historical-excel-import'
                  ? 'Import Excel (historique)'
                  : formatDate(s.session.date)}
                {s.session.isActive && (
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                    En cours
                  </span>
                )}
              </p>
              <p className="text-sm text-white/50">
                {s.spinsPlayed} spins · {s.tournamentsPlayed} tournois ·{' '}
                {formatDuration(s.durationMs)}
              </p>
            </div>
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
          </div>
        ))}
      </div>
    </Card>
  )
}
