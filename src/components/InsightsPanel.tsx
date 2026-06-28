import {
  formatPaceInterval,
  formatProfitPerHour,
  formatSpinsPerHour,
  getGlobalPace,
  getHourlyStats,
  getMonthComparison,
  getMonthSimulation,
  getMultiplierDistribution,
  getSessionDurationInsights,
  getStatsByNote,
  getStatsByDevice,
  getStatsByStake,
  getTodayPace,
  getTournamentAbi,
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
  const byDevice = getStatsByDevice(data).filter((d) => d.device !== 'unknown' || d.played > 0)
  const byStake = getStatsByStake(data)
  const multipliers = getMultiplierDistribution(data)
  const tournaments = getTournamentAnalytics(data)
  const variance = getVarianceStats(data)
  const week = getWeekComparison(data)
  const month = getMonthComparison(data)
  const hourly = getHourlyStats(data)
  const durationInsights = getSessionDurationInsights(data)
  const abiAll = getTournamentAbi(data, false)
  const abiMonth = getTournamentAbi(data, true)
  const simulation = getMonthSimulation(data)

  const bestHour =
    hourly.length > 0
      ? hourly.reduce((best, h) => (h.profit > best.profit ? h : best))
      : null
  const bestWinRateHour =
    hourly.length > 0
      ? hourly.reduce((best, h) => (h.winRate > best.winRate && h.played >= 5 ? h : best))
      : null

  const hasData =
    todayPace.spinsPlayed > 0 ||
    globalPace.spinsPlayed > 0 ||
    byNote.length > 0 ||
    byDevice.length > 0 ||
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

        {/* Performance par support */}
        {byDevice.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Performance par support</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="pb-2 pr-3 font-medium">Support</th>
                    <th className="pb-2 pr-3 font-medium">Sessions</th>
                    <th className="pb-2 pr-3 font-medium">Win %</th>
                    <th className="pb-2 pr-3 font-medium">Spins/h</th>
                    <th className="pb-2 pr-3 font-medium">€/h</th>
                    <th className="pb-2 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {byDevice.map((d) => (
                    <tr key={d.device} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-medium">{d.label}</td>
                      <td className="py-2 pr-3 tabular-nums">{d.sessions}</td>
                      <td className="py-2 pr-3 tabular-nums">{d.winRate.toFixed(1)}%</td>
                      <td className="py-2 pr-3 tabular-nums text-sky-400">
                        {formatSpinsPerHour(d.spinsPerHour)}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-sky-400">
                        {formatProfitPerHour(d.profitPerHour)}
                      </td>
                      <td
                        className={`py-2 tabular-nums font-semibold ${d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {formatMoney(d.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

        {/* Comparaison mois */}
        {(month.current.played > 0 || month.previous.played > 0) && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Comparaison mensuelle</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <ComparisonCard
                label={month.currentLabel}
                profit={month.current.profit}
                played={month.current.played}
                won={month.current.won}
                pph={month.current.profitPerHour}
              />
              <ComparisonCard
                label={month.previousLabel}
                profit={month.previous.profit}
                played={month.previous.played}
                won={month.previous.won}
                pph={month.previous.profitPerHour}
              />
            </div>
            <p className="mt-2 text-center text-sm text-white/50">
              Écart profit :{' '}
              <span className={month.profitDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {formatMoney(month.profitDelta)}
              </span>
            </p>
          </section>
        )}

        {/* Créneaux horaires */}
        {hourly.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Meilleur créneau horaire</h3>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              {bestHour && (
                <div className="rounded-xl bg-black/25 px-4 py-3">
                  <p className="text-xs text-white/50">Meilleur profit</p>
                  <p className="mt-1 text-lg font-bold text-emerald-400">{bestHour.label}</p>
                  <p className="text-sm text-white/50">
                    {formatMoney(bestHour.profit)} · {bestHour.winRate.toFixed(0)}% win ({bestHour.played} spins)
                  </p>
                </div>
              )}
              {bestWinRateHour && bestWinRateHour.hour !== bestHour?.hour && (
                <div className="rounded-xl bg-black/25 px-4 py-3">
                  <p className="text-xs text-white/50">Meilleur win rate (≥5 spins)</p>
                  <p className="mt-1 text-lg font-bold text-sky-400">{bestWinRateHour.label}</p>
                  <p className="text-sm text-white/50">
                    {bestWinRateHour.winRate.toFixed(0)}% · {formatMoney(bestWinRateHour.profit)}
                  </p>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="pb-2 pr-3 font-medium">Créneau</th>
                    <th className="pb-2 pr-3 font-medium">Spins</th>
                    <th className="pb-2 pr-3 font-medium">Win %</th>
                    <th className="pb-2 font-medium">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {hourly.map((h) => (
                    <tr key={h.hour} className="border-b border-white/5">
                      <td className="py-2 pr-3 font-medium">{h.label}</td>
                      <td className="py-2 pr-3 tabular-nums">{h.played}</td>
                      <td className="py-2 pr-3 tabular-nums">{h.winRate.toFixed(1)}%</td>
                      <td
                        className={`py-2 tabular-nums font-semibold ${h.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                      >
                        {formatMoney(h.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Durée vs €/h */}
        {durationInsights.sessions.length >= 3 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Sessions : durée vs €/h</h3>
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <StatBox
                label="Durée moyenne"
                value={`${durationInsights.avgDurationMin.toFixed(0)} min`}
              />
              <StatBox
                label="Sessions longues perdantes"
                value={durationInsights.longSessionsNegative}
                accent={durationInsights.longSessionsNegative > 0 ? 'red' : 'green'}
              />
              {durationInsights.bestProfitPerHour && (
                <StatBox
                  label="Meilleur €/h"
                  value={formatProfitPerHour(durationInsights.bestProfitPerHour.profitPerHour)}
                  accent="green"
                />
              )}
            </div>
            <div className="space-y-2">
              {[...durationInsights.sessions]
                .sort((a, b) => b.durationMin - a.durationMin)
                .slice(0, 6)
                .map((s) => (
                  <div
                    key={s.sessionId}
                    className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
                  >
                    <span className="text-white/70">
                      {s.durationMin.toFixed(0)} min
                      {s.note && <span className="ml-1 text-white/40">· {s.note}</span>}
                    </span>
                    <span className="flex gap-3 tabular-nums">
                      <span className="text-sky-400">{formatProfitPerHour(s.profitPerHour)}</span>
                      <span className={s.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {formatMoney(s.profit)}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Simulation mois */}
        {simulation && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-white/70">Simulation objectif mensuel</h3>
            <div className="rounded-xl bg-black/25 px-4 py-3">
              <p className="text-sm text-white/70">{simulation.message}</p>
              {simulation.spinsNeeded != null && (
                <p className="mt-2 text-xs text-white/40">
                  {simulation.playedThisMonth} spins joués · {simulation.daysLeft} jours restants · objectif{' '}
                  {simulation.profitGoal} €
                </p>
              )}
            </div>
          </section>
        )}

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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <StatBox label="ITM" value={`${tournaments.itmRate.toFixed(0)}%`} accent="green" />
              <StatBox
                label="Place moy."
                value={tournaments.avgPlace != null ? tournaments.avgPlace.toFixed(0) : '—'}
              />
              <StatBox
                label="ABI global"
                value={abiAll != null ? `${abiAll.toFixed(1)} €` : '—'}
              />
              <StatBox
                label="ABI ce mois"
                value={abiMonth != null ? `${abiMonth.toFixed(1)} €` : '—'}
              />
              <StatBox
                label="ROI tournois"
                value={tournaments.roi != null ? `${tournaments.roi.toFixed(0)}%` : '—'}
                accent={tournaments.roi != null && tournaments.roi >= 0 ? 'green' : 'red'}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
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
