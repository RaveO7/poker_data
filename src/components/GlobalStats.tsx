import { formatDuration, formatMoney } from '../lib/date'
import { getGlobalStats } from '../lib/stats'
import type { PokerData } from '../types'
import { Card, StatBox } from './ui'

interface GlobalStatsProps {
  data: PokerData
}

export function GlobalStats({ data }: GlobalStatsProps) {
  const stats = getGlobalStats(data)

  return (
    <Card title="🏆 Totaux globaux">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Spins joués" value={stats.played} />
        <StatBox label="Finales" value={stats.final} accent="blue" />
        <StatBox label="Victoires" value={stats.won} accent="green" />
        <StatBox label="Tournois" value={stats.tournaments} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Taux finale" value={`${stats.finalRate.toFixed(1)}%`} accent="blue" />
        <StatBox label="Taux victoire" value={`${stats.winRate.toFixed(1)}%`} accent="green" />
        <StatBox
          label="Profit spins"
          value={formatMoney(stats.spinProfit)}
          accent={stats.spinProfit >= 0 ? 'green' : 'red'}
        />
        <StatBox
          label="Profit tournois"
          value={formatMoney(stats.tournamentProfit)}
          accent={stats.tournamentProfit >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-black/25 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Profit total estimé</p>
          <p
            className={`text-2xl font-bold tabular-nums ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {formatMoney(stats.profit)}
          </p>
        </div>
        <div className="text-right text-sm text-white/50">
          <p>Temps total : {formatDuration(stats.durationMs)}</p>
          <p>{stats.tournamentsWon} tournoi(s) avec gains</p>
        </div>
      </div>
    </Card>
  )
}
