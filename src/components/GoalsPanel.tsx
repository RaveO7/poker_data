import { getBankrollGoalProgress, getMonthlyGoalsProgress, hasMonthlyGoals } from '../lib/analytics'
import { formatMoney } from '../lib/date'
import type { PokerData } from '../types'
import { Card } from './ui'

interface GoalsPanelProps {
  data: PokerData
}

export function GoalsPanel({ data }: GoalsPanelProps) {
  if (!hasMonthlyGoals(data.settings)) return null

  const goals = getMonthlyGoalsProgress(data)
  const bankroll = getBankrollGoalProgress(data)

  return (
    <Card title="🎯 Objectifs">
      <p className="mb-4 text-xs text-white/40">{goals.monthLabel}</p>

      <div className="space-y-4">
        {goals.profitGoalEnabled && (
          <GoalProgress
            label="Objectif profit mensuel"
            currentLabel={formatMoney(goals.monthProfit)}
            targetLabel={`${goals.profitGoal} €`}
            percent={goals.profitGoalPercent ?? 0}
            reached={goals.profitGoalReached}
            variant="profit"
          />
        )}

        {goals.lossLimitEnabled && (
          <GoalProgress
            label="Limite de perte mensuelle"
            currentLabel={
              goals.monthProfit < 0 ? `${Math.abs(goals.monthProfit).toFixed(0)} € perdus` : '0 € perdu'
            }
            targetLabel={`max ${goals.lossLimit} €`}
            percent={goals.lossLimitPercent ?? 0}
            reached={goals.lossLimitReached}
            variant="loss"
          />
        )}

        {goals.maxSpinsEnabled && (
          <GoalProgress
            label="Spins aujourd'hui"
            currentLabel={`${goals.spinsToday} spins`}
            targetLabel={`max ${goals.maxSpinsPerDay}`}
            percent={goals.spinsTodayPercent ?? 0}
            reached={goals.spinsLimitReached}
            variant="spins"
          />
        )}

        {bankroll && (
          <GoalProgress
            label="Objectif bankroll"
            currentLabel={formatMoney(bankroll.current)}
            targetLabel={`${bankroll.goal} €`}
            percent={bankroll.percent}
            reached={bankroll.reached}
            variant="profit"
          />
        )}
      </div>

      {(goals.lossLimitReached || goals.spinsLimitReached) && (
        <div className="mt-4 space-y-2">
          {goals.lossLimitReached && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
              Limite de perte mensuelle atteinte ({goals.lossLimit} €).
            </p>
          )}
          {goals.spinsLimitReached && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm text-amber-200">
              Limite de spins du jour atteinte ({goals.maxSpinsPerDay}).
            </p>
          )}
        </div>
      )}

      {bankroll?.reached && (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          Objectif bankroll atteint ({bankroll.goal} €) — bravo !
        </p>
      )}

      {goals.profitGoalReached && (
        <p className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
          Objectif de profit mensuel atteint — bravo !
        </p>
      )}
    </Card>
  )
}

function GoalProgress({
  label,
  currentLabel,
  targetLabel,
  percent,
  reached,
  variant,
}: {
  label: string
  currentLabel: string
  targetLabel: string
  percent: number
  reached: boolean
  variant: 'profit' | 'loss' | 'spins'
}) {
  const barColor = {
    profit: reached ? 'bg-emerald-500' : 'bg-gold',
    loss: reached ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-sky-500',
    spins: reached ? 'bg-amber-500' : 'bg-sky-500',
  }[variant]

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="tabular-nums text-white/50">
          {currentLabel} / {targetLabel}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <p className="mt-0.5 text-right text-xs text-white/40">{percent.toFixed(0)}%</p>
    </div>
  )
}
