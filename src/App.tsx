import { BankrollChart } from './components/BankrollChart'
import { ChartsPanel } from './components/ChartsPanel'
import { GlobalStats } from './components/GlobalStats'
import { DailyHistory } from './components/DailyHistory'
import { InsightsPanel } from './components/InsightsPanel'
import { SessionBar } from './components/SessionBar'
import { SessionHistory } from './components/SessionHistory'
import { SettingsPanel } from './components/SettingsPanel'
import { SpinTracker } from './components/SpinTracker'
import { StatsOverview } from './components/StatsOverview'
import { TournamentTracker } from './components/TournamentTracker'
import { usePokerStore } from './hooks/usePokerStore'
import { DATA_FILE_PATH } from './lib/api'

function App() {
  const {
    data,
    loading,
    error,
    tick,
    refreshData,
    startSession,
    endSession,
    updateSession,
    undoLastAction,
    addSpin,
    startTournament,
    finishTournament,
    updateSettings,
    resetData,
    importFromFile,
  } = usePokerStore()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-white/60">
        Chargement des données…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-red-400">{error ?? 'Impossible de charger les données.'}</p>
        <p className="text-sm text-white/50">
          {import.meta.env.PROD ? (
            <>
              Vérifiez que le Blob Store est <strong>lié au projet</strong> sur Vercel (Storage →
              Connect to Project), puis faites un <strong>Redeploy</strong>.
            </>
          ) : (
            <>
              Lancez <code className="text-gold-light">npm run dev</code> et vérifiez{' '}
              <code className="text-gold-light">{DATA_FILE_PATH}</code>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => void refreshData()}
          className="rounded-lg bg-gold px-4 py-2 font-semibold text-felt-dark"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gold-light sm:text-4xl">Poker Tracker</h1>
        <p className="mt-2 text-white/60">Suivez vos spins, tournois et votre évolution au quotidien</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <main className="space-y-6">
        <SessionBar
          data={data}
          tick={tick}
          onStart={startSession}
          onEnd={endSession}
          onUndo={undoLastAction}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <SpinTracker
            data={data}
            onAdd={addSpin}
            onStakeChange={(stake) => updateSettings({ selectedSpinStake: stake })}
          />
          <TournamentTracker
            data={data}
            onStart={startTournament}
            onFinish={finishTournament}
            onStakeChange={(stake) => updateSettings({ selectedTournamentStake: stake })}
          />
        </div>

        <GlobalStats data={data} />
        <BankrollChart data={data} />
        <ChartsPanel data={data} />
        <InsightsPanel data={data} />
        <StatsOverview data={data} />

        <DailyHistory data={data} />
        <SessionHistory data={data} onUpdateSession={updateSession} />
        <SettingsPanel
          data={data}
          onUpdate={updateSettings}
          onReset={resetData}
          onImport={importFromFile}
          onReload={() => void refreshData()}
        />
      </main>

      <footer className="mt-10 pb-6 text-center text-xs text-white/30">
        Données sauvegardées dans {DATA_FILE_PATH}
      </footer>
    </div>
  )
}

export default App
