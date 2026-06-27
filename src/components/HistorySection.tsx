import { useState } from 'react'
import {
  DEFAULT_HISTORY_FILTERS,
  getAvailableStakes,
  type HistoryFilterState,
} from '../lib/historyFilters'
import type { PokerData, Session } from '../types'
import type { SessionSpinCounts } from '../lib/stats'
import { DailyHistory } from './DailyHistory'
import { HistoryFilters } from './HistoryFilters'
import { SessionHistory } from './SessionHistory'

interface HistorySectionProps {
  data: PokerData
  onSaveSessionEdits: (
    id: string,
    updates: Partial<Pick<Session, 'date' | 'startTime' | 'endTime' | 'note'>>,
    spinCounts: SessionSpinCounts,
  ) => void
}

export function HistorySection({ data, onSaveSessionEdits }: HistorySectionProps) {
  const [filters, setFilters] = useState<HistoryFilterState>(DEFAULT_HISTORY_FILTERS)
  const availableStakes = getAvailableStakes(data)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-felt-light/30 p-4">
        <p className="mb-3 text-sm font-medium text-white/70">Filtres historique</p>
        <HistoryFilters filters={filters} availableStakes={availableStakes} onChange={setFilters} />
      </div>
      <DailyHistory data={data} filters={filters} />
      <SessionHistory data={data} filters={filters} onSaveSessionEdits={onSaveSessionEdits} />
    </div>
  )
}
