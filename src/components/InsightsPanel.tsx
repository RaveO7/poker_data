import {
  formatPaceInterval,
  formatProfitPerHour,
  formatSpinsPerHour,
  getGlobalPace,
  getMultiplierDistribution,
  getStatsByNote,
  getStatsByStake,
  getTodayPace,
  getTournamentAnalytics,
  getVarianceStats,
  getWeekComparison,
} from '../lib/analytics'
import { formatMoney } from '../lib/date'
import type { PokerData } from '../types'
import { Card, StatBox } from './ui'

interface InsightsPanelProps {
  data: PokerData
}

export function InsightsPanel({ data }: InsightsPanelProps) {
  const todayPace = getTodayPace(data)
  const globalPace = getGlobalPace(data)
  const byNote = getStatsByNote(data).filter((n) => n.played > 0 || n.note !== 'Sans note')
  const byStake = getStatsByStake(data)
  const multipliers = getMultiplierDistribution(data)
  const tournaments = getTournamentAnalytics(data)
  const variance = getVarianceStats(data)
  const week = getWeekComparison(data)

  const hasData =
    todayPace.spinsPlayed > 0 ||
    globalPace.spinsPlayed > 0 ||
    byNote.length > 0 ||
    byStake.length > 0 ||
    multipliers.length > 0 ||
    tournaments.total > 0 ||
    week.current.played > 0 ||
    week.previous.played > 0

  if (!hasData) {
    return (
      <Card title="🔍 Analyses détaillées">
        <p className="text-center text-white/50">Jouez quelques parties pour voir les analyses.</p>
      </Card>
    )
  }

  return (
    <Card title="🔍 Analyses détaillées">
      <div className="space-y-6">
        {/* Rythme de jeu */}
        {(todayPace.spinsPlayed > 0 || globalPace.spinsPlayed > 0) && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Rythme de jeu</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <PaceCard label="Aujourd'hui" pace={todayPace} />
              <PaceCard label="Global" pace={globalPace} />
            </div>
          </section>
        )}

        {/* Performance par note */}
        {byNote.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Performance par contexte</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="pb-2 pr-3 font-medium">Note</th>
                    <th className="pb-2 pr-3 font-medium">Sessions</th>
                    <th className="pb-2 pr-3 font-medium">Win %</th>
                    <th className="pb-2 pr-3 font-medium">Spins/h</th>
                    <th className="pb-2 pr-3 font-medium">€/h</th>
                    <th className="pb-2 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {byNote.map((n) => (
                    <tr key={n.note} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-medium capitalize">{n.note}</td>
                      <td className="py-2 pr-3 tabular-nums">{n.sessions}</td>
                      <td className="py-2 pr-3 tabular-nums">{n.winRate.toFixed(1)}%</td>
                      <td className="py-2 pr-3 tabular-nums text-sky-400">
                        {formatSpinsPerHour(n.spinsPerHour)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-sky-400">
                        {formatProfitPerHour(n.profitPerHour)}
                      </td>
                      <td
                        className={`py-2 tabular-nums font-semibold ${n.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {formatMoney(n.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Comparaison semaine */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-white/70">Comparaison hebdomadaire</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <ComparisonCard
              label={week.currentLabel}
              profit={week.current.profit}
              played={week.current.played}
              won={week.current.won}
              pph={week.current.profitPerHour}
            />
            <ComparisonCard
              label={week.previousLabel}
              profit={week.previous.profit}
              played={week.previous.played}
              won={week.previous.won}
              pph={week.previous.profitPerHour}
            />
          </div>
          <p className="mt-2 text-center text-sm text-white/50">
            Écart profit :{' '}
            <span className={week.profitDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {formatMoney(week.profitDelta)}
            </span>
          </p>
        </section>

        {/* Par ticket */}
        {byStake.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Performance par ticket spin</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="pb-2 pr-3 font-medium">Ticket</th>
                    <th className="pb-2 pr-3 font-medium">Parties</th>
                    <th className="pb-2 pr-3 font-medium">Victoires</th>
                    <th className="pb-2 pr-3 font-medium">Taux win</th>
                    <th className="pb-2 pr-3 font-medium">ROI</th>
                    <th className="pb-2 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {byStake.map((s) => (
                    <tr key={s.stake} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-medium">{s.stake} €</td>
                      <td className="py-2 pr-3 tabular-nums">{s.played}</td>
                      <td className="py-2 pr-3 tabular-nums text-emerald-400">{s.won}</td>
                      <td className="py-2 pr-3 tabular-nums">{s.winRate.toFixed(1)}%</td>
                      <td className="py-2 pr-3 tabular-nums">
                        {s.roi != null ? `${s.roi.toFixed(1)}%` : '—'}
                      </td>
                      <td
                        className={`py-2 tabular-nums font-semibold ${s.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {formatMoney(s.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Multiplicateurs */}
        {multipliers.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Répartition des multiplicateurs</h3>
            <div className="flex flex-wrap gap-2">
              {multipliers.map((m) => (
                <div
                  key={m.multiplier}
                  className="rounded-xl bg-black/25 px-4 py-3 text-center"
                >
                  <p className="text-lg font-bold text-emerald-400">×{m.multiplier}</p>
                  <p className="text-sm text-white/60">{m.count} victoire{m.count > 1 ? 's' : ''}</p>
                  <p className="text-xs text-white/40">{m.totalGain.toFixed(0)} € gagnés</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tournois */}
        {tournaments.total > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Statistiques tournois</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBox label="ITM" value={`${tournaments.itmRate.toFixed(0)}%`} accent="green" />
              <StatBox
                label="Place moy."
                value={tournaments.avgPlace != null ? tournaments.avgPlace.toFixed(0) : '—'}
              />
              <StatBox
                label="ROI tournois"
                value={tournaments.roi != null ? `${tournaments.roi.toFixed(0)}%` : '—'}
                accent={tournaments.roi != null && tournaments.roi >= 0 ? 'green' : 'red'}
              />
              <StatBox
                label="Profit tournois"
                value={formatMoney(tournaments.profit)}
                accent={tournaments.profit >= 0 ? 'green' : 'red'}
              />
            </div>
            {tournaments.byBuyIn.length > 1 && (
              <div className="mt-3 space-y-2">
                {tournaments.byBuyIn.map((b) => (
                  <div
                    key={b.buyIn}
                    className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
                  >
                    <span>
                      {b.label} — {b.count} tournoi{b.count > 1 ? 's' : ''} · ITM {b.itmRate.toFixed(0)}%
                    </span>
                    <span className={b.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {formatMoney(b.profit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Variance */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-white/70">Variance & records</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Série sans win" value={variance.longestLosingStreak} accent="red" />
            <StatBox
              label="Max drawdown"
              value={`-${variance.biggestDownswing.toFixed(0)} €`}
              accent="red"
            />
            <StatBox
              label="Meilleure session"
              value={formatMoney(variance.bestSessionProfit)}
              accent="green"
            />
            <StatBox
              label="Pire session"
              value={formatMoney(variance.worstSessionProfit)}
              accent="red"
            />
          </div>
        </section>
      </div>
    </Card>
  )
}

function PaceCard({
  label,
  pace,
}: {
  label: string
  pace: ReturnType<typeof getTodayPace>
}) {
  return (
    <div className="rounded-xl bg-black/25 px-4 py-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-sky-400">
        {formatSpinsPerHour(pace.spinsPerHour)}
      </p>
      <p className="mt-1 text-sm text-white/50">
        {pace.spinsPlayed} spins · intervalle moy.{' '}
        {formatPaceInterval(pace.avgSecondsBetweenSpins)}
      </p>
    </div>
  )
}

function ComparisonCard({
  label,
  profit,
  played,
  won,
  pph,
}: {
  label: string
  profit: number
  played: number
  won: number
  pph: number | null
}) {
  return (
    <div className="rounded-xl bg-black/25 px-4 py-3">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatMoney(profit)}
      </p>
      <p className="mt-1 text-sm text-white/50">
        {played} parties · {won} wins · {formatProfitPerHour(pph)}
      </p>
    </div>
  )
}
