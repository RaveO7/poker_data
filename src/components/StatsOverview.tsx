import { formatDuration, formatMoney } from '../lib/date'
import { formatProfitPerHour, profitPerHour } from '../lib/analytics'
import { computeDayStats, getTodayCounts } from '../lib/stats'
import type { PokerData } from '../types'
import { Card, StatBox } from './ui'

interface StatsOverviewProps {
  data: PokerData
}

export function StatsOverview({ data }: StatsOverviewProps) {
  const today = new Date().toISOString().slice(0, 10)
  const dayStats = computeDayStats(data, today)
  const counts = getTodayCounts(data)
  const pph = profitPerHour(dayStats.profit, dayStats.durationMs)

  const totalGames = counts.played + counts.tournaments

  return (
    <Card title="📊 Aujourd'hui">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Parties totales" value={totalGames} />
        <StatBox label="Temps de jeu" value={formatDuration(dayStats.durationMs)} accent="blue" />
        <StatBox
          label="Profit / Perte"
          value={formatMoney(dayStats.profit)}
          accent={dayStats.profit >= 0 ? 'green' : 'red'}
        />
        <StatBox label="€ / heure" value={formatProfitPerHour(pph)} accent="blue" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
        <div className="text-center text-sm">
          <p className="text-white/50">Spins joués</p>
          <p className="font-bold">{dayStats.spinsPlayed}</p>
        </div>
        <div className="text-center text-sm">
          <p className="text-white/50">Finales</p>
          <p className="font-bold">{dayStats.spinsFinal}</p>
        </div>
        <div className="text-center text-sm">
          <p className="text-white/50">Victoires spin</p>
          <p className="font-bold text-emerald-400">{dayStats.spinsWon}</p>
        </div>
        <div className="text-center text-sm">
          <p className="text-white/50">Tournois</p>
          <p className="font-bold">{dayStats.tournamentsPlayed}</p>
        </div>
      </div>
    </Card>
  )
}
