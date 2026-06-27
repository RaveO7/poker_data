import {
  DATE_RANGE_LABELS,
  DEFAULT_HISTORY_FILTERS,
  TYPE_FILTER_LABELS,
  type HistoryDateRange,
  type HistoryFilterState,
  type HistoryStakeFilter,
  type HistoryTypeFilter,
} from '../lib/historyFilters'
import { SPIN_STAKES } from '../types'

interface HistoryFiltersProps {
  filters: HistoryFilterState
  availableStakes: number[]
  onChange: (filters: HistoryFilterState) => void
}

export function HistoryFilters({ filters, availableStakes, onChange }: HistoryFiltersProps) {
  const stakes = [...new Set([...SPIN_STAKES, ...availableStakes])].sort((a, b) => a - b)

  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <FilterGroup
        label="Période"
        options={(['all', '7d', '30d', '90d'] as HistoryDateRange[]).map((v) => ({
          value: v,
          label: DATE_RANGE_LABELS[v],
        }))}
        value={filters.dateRange}
        onChange={(dateRange) => onChange({ ...filters, dateRange })}
      />
      <FilterGroup
        label="Type"
        options={(['all', 'spin', 'tournament'] as HistoryTypeFilter[]).map((v) => ({
          value: v,
          label: TYPE_FILTER_LABELS[v],
        }))}
        value={filters.type}
        onChange={(type) => onChange({ ...filters, type })}
      />
      <FilterGroup
        label="Ticket"
        options={[
          { value: 'all' as const, label: 'Tous' },
          ...stakes.map((s) => ({ value: s as HistoryStakeFilter, label: `${s} €` })),
        ]}
        value={filters.stake}
        onChange={(stake) => onChange({ ...filters, stake })}
      />
      {(filters.dateRange !== 'all' || filters.type !== 'all' || filters.stake !== 'all') && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_HISTORY_FILTERS)}
          className="self-end rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/20"
        >
          Réinitialiser
        </button>
      )}
    </div>
  )
}

function FilterGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-white/50">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              value === opt.value
                ? 'bg-gold text-felt-dark'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
