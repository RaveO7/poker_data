import { getTodayCounts } from '../lib/stats'
import { SPIN_MULTIPLIERS, SPIN_STAKES, type PokerData, type SpinEventType } from '../types'
import { ActionButton, Card, StatBox, TicketSelector } from './ui'

interface SpinTrackerProps {
  data: PokerData
  onAdd: (type: SpinEventType, multiplier?: number) => void
  onStakeChange: (stake: number) => void
}

export function SpinTracker({ data, onAdd, onStakeChange }: SpinTrackerProps) {
  const counts = getTodayCounts(data)
  const stake = data.settings.selectedSpinStake
  const selectedMultiplier = data.settings.selectedSpinMultiplier

  return (
    <Card title="♠ Spins">
      <TicketSelector
        label="Ticket spin"
        options={SPIN_STAKES.map((s) => ({ value: s, label: `${s} €` }))}
        value={stake}
        onChange={onStakeChange}
      />

      <div className="mb-5 mt-4 grid grid-cols-3 gap-3">
        <StatBox label="Parties jouées" value={counts.played} />
        <StatBox label="Finales" value={counts.final} accent="blue" />
        <StatBox label="Victoires" value={counts.won} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ActionButton
          label="+1 Partie"
          sublabel={`${stake} €`}
          onClick={() => onAdd('played')}
          variant="secondary"
        />
        <ActionButton
          label="+1 Finale"
          sublabel={`${stake} €`}
          onClick={() => onAdd('final')}
          variant="warning"
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-white/60">Victoire — multiplicateur de la roue</p>
        <div className="grid grid-cols-4 gap-2">
          {SPIN_MULTIPLIERS.map((mult) => {
            const isSelected = selectedMultiplier === mult
            const gain = stake * mult
            return (
              <button
                key={mult}
                type="button"
                onClick={() => onAdd('win', mult)}
                className={`flex flex-col items-center rounded-xl px-2 py-3 text-sm font-semibold transition active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40'
                }`}
              >
                <span className="text-base">×{mult}</span>
                <span className="mt-0.5 text-xs opacity-80">+{gain} €</span>
              </button>
            )
          })}
        </div>
      </div>

      {counts.played > 0 && (
        <p className="mt-4 text-center text-sm text-white/50">
          Taux finale : {((counts.final / counts.played) * 100).toFixed(0)}% · Taux victoire :{' '}
          {((counts.won / counts.played) * 100).toFixed(0)}%
        </p>
      )}
    </Card>
  )
}
