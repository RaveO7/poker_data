import { getTodayCounts } from '../lib/stats'
import { SPIN_STAKES, type PokerData } from '../types'
import { ActionButton, Card, StatBox, TicketSelector } from './ui'

interface SpinTrackerProps {
  data: PokerData
  onAdd: (type: 'played' | 'final' | 'win') => void
  onStakeChange: (stake: number) => void
}

export function SpinTracker({ data, onAdd, onStakeChange }: SpinTrackerProps) {
  const counts = getTodayCounts(data)
  const stake = data.settings.selectedSpinStake

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <ActionButton
          label="+1 Victoire"
          sublabel={`${stake} €`}
          onClick={() => onAdd('win')}
          variant="success"
        />
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
