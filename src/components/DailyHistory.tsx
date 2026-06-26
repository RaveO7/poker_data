import { formatDate, formatDuration, formatMoney } from '../lib/date'
import { getAllDayStats } from '../lib/stats'
import type { PokerData } from '../types'
import { Card } from './ui'

interface DailyHistoryProps {
  data: PokerData
}

export function DailyHistory({ data }: DailyHistoryProps) {
  const days = getAllDayStats(data)

  if (days.length === 0) {
    return (
      <Card title="📅 Historique par jour">
        <p className="text-center text-white/50">Aucune donnée pour le moment.</p>
      </Card>
    )
  }

  return (
    <Card title="📅 Historique par jour">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 pr-4 font-medium">Spins</th>
              <th className="pb-2 pr-4 font-medium">Finales</th>
              <th className="pb-2 pr-4 font-medium">Wins</th>
              <th className="pb-2 pr-4 font-medium">Tournois</th>
              <th className="pb-2 pr-4 font-medium">Temps</th>
              <th className="pb-2 font-medium">P&L</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date} className="border-b border-white/5">
                <td className="py-2.5 pr-4 font-medium">{formatDate(day.date)}</td>
                <td className="py-2.5 pr-4 tabular-nums">{day.spinsPlayed}</td>
                <td className="py-2.5 pr-4 tabular-nums">{day.spinsFinal}</td>
                <td className="py-2.5 pr-4 tabular-nums text-emerald-400">{day.spinsWon}</td>
                <td className="py-2.5 pr-4 tabular-nums">{day.tournamentsPlayed}</td>
                <td className="py-2.5 pr-4 tabular-nums">{formatDuration(day.durationMs)}</td>
                <td
                  className={`py-2.5 tabular-nums font-semibold ${day.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {formatMoney(day.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
