import { useState } from 'react'
import {
  TOURNAMENT_STAKE_OPTIONS,
  TOURNAMENT_TICKET_VALUE,
  formatTournamentEntry,
  type PokerData,
  type Tournament,
} from '../types'
import { ActionButton, Card, StatBox, TicketSelector } from './ui'

interface TournamentTrackerProps {
  data: PokerData
  onStart: () => void
  onFinish: (id: string, place: number, winnings: number) => void
  onStakeChange: (stake: number) => void
}

function TournamentForm({
  tournament,
  onFinish,
}: {
  tournament: Tournament
  onFinish: (id: string, place: number, winnings: number) => void
}) {
  const [place, setPlace] = useState('')
  const [winnings, setWinnings] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const placeNum = parseInt(place, 10)
    const winningsNum = parseFloat(winnings) || 0
    if (!placeNum || placeNum < 1) return
    onFinish(tournament.id, placeNum, winningsNum)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
    >
      <p className="mb-3 text-sm font-medium text-amber-200">
        Tournoi en cours — {formatTournamentEntry(tournament.buyIn)}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-left text-sm">
          <span className="text-white/60">Place</span>
          <input
            type="number"
            min="1"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            placeholder="ex: 3"
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
            required
          />
        </label>
        <label className="block text-left text-sm">
          <span className="text-white/60">Gains (€)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={winnings}
            onChange={(e) => setWinnings(e.target.value)}
            placeholder="0 si rien"
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
          />
        </label>
      </div>
      <button
        type="submit"
        className="mt-3 w-full rounded-lg bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-500"
      >
        Enregistrer le résultat
      </button>
    </form>
  )
}

function formatStakeSublabel(stake: number): string {
  return stake === TOURNAMENT_TICKET_VALUE ? 'Ticket gratuit' : `Ticket : ${stake} €`
}

export function TournamentTracker({ data, onStart, onFinish, onStakeChange }: TournamentTrackerProps) {
  const today = new Date().toISOString().slice(0, 10)
  const todayTournaments = data.tournaments.filter((t) => t.date === today)
  const inProgress = todayTournaments.filter((t) => t.status === 'in_progress')
  const completed = todayTournaments.filter((t) => t.status === 'completed')
  const stake = data.settings.selectedTournamentStake

  const totalWinnings = completed.reduce((s, t) => s + t.winnings, 0)
  const totalBuyIn = todayTournaments.reduce((s, t) => s + t.buyIn, 0)

  return (
    <Card title="♦ Tournois">
      <TicketSelector
        label="Ticket tournoi"
        options={TOURNAMENT_STAKE_OPTIONS}
        value={stake}
        onChange={onStakeChange}
      />

      <div className="mb-5 mt-4 grid grid-cols-3 gap-3">
        <StatBox label="Lancés aujourd'hui" value={todayTournaments.length} />
        <StatBox label="Terminés" value={completed.length} accent="blue" />
        <StatBox
          label="Profit tournois"
          value={`${totalWinnings - totalBuyIn >= 0 ? '+' : ''}${(totalWinnings - totalBuyIn).toFixed(0)} €`}
          accent={totalWinnings - totalBuyIn >= 0 ? 'green' : 'red'}
        />
      </div>

      <ActionButton
        label="+1 Nouveau tournoi"
        sublabel={formatStakeSublabel(stake)}
        onClick={onStart}
        variant="primary"
        disabled={inProgress.length > 0}
      />

      {inProgress.length > 0 && (
        <div className="mt-4 space-y-3">
          {inProgress.map((t) => (
            <TournamentForm key={t.id} tournament={t} onFinish={onFinish} />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm text-white/50">Résultats du jour</p>
          <ul className="space-y-2">
            {completed
              .slice()
              .reverse()
              .map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-sm"
                >
                  <span>
                    {formatTournamentEntry(t.buyIn)} — {t.place}e place
                    {t.winnings > 0 ? ` — ${t.winnings.toFixed(2)} €` : ' — ITM 0 €'}
                  </span>
                  <span className={t.winnings - t.buyIn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {t.winnings - t.buyIn >= 0 ? '+' : ''}
                    {(t.winnings - t.buyIn).toFixed(2)} €
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
