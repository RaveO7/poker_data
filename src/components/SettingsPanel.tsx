import { useRef, useState } from 'react'
import { DATA_FILE_PATH } from '../lib/api'
import { exportData, parseImportedJson } from '../lib/storage'
import type { PokerData, Settings } from '../types'
import { Card } from './ui'

interface SettingsPanelProps {
  data: PokerData
  onUpdate: (settings: Partial<Settings>) => void
  onReset: () => void
  onImport: (data: PokerData) => void
  onReload: () => void
}

export function SettingsPanel({ data, onUpdate, onReset, onImport, onReload }: SettingsPanelProps) {
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseImportedJson(reader.result as string)
        onImport(parsed)
      } catch {
        alert('Fichier JSON invalide.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <Card title="⚙️ Paramètres">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full rounded-lg bg-white/10 py-2 text-sm hover:bg-white/15"
      >
        {open ? 'Masquer' : 'Options avancées'}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg bg-black/25 px-3 py-2 text-left text-sm">
            <p className="text-white/50">Stockage des données</p>
            <p className="mt-1 font-mono text-gold-light">{DATA_FILE_PATH}</p>
            <p className="mt-2 text-xs text-white/40">
              {import.meta.env.PROD
                ? 'En ligne : données sauvegardées dans Vercel Blob. Utilisez Exporter / Importer JSON pour une copie locale.'
                : 'En local : fichier modifiable à la main. Après édition, cliquez sur « Recharger ».'}
            </p>
          </div>

          <p className="text-sm text-white/50">
            Le gain estimé par victoire spin = ticket × multiplicateur (ex: 5 € × 3 = 15 €).
          </p>

          <label className="block text-left text-sm">
            <span className="text-white/60">Multiplicateur de gain spin (× ticket)</span>
            <input
              type="number"
              min="1"
              step="0.1"
              value={data.settings.spinWinMultiplier}
              onChange={(e) => onUpdate({ spinWinMultiplier: parseFloat(e.target.value) || 1 })}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-white outline-none focus:border-gold"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onReload}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Recharger les données
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Importer JSON
            </button>
            <button
              type="button"
              onClick={() => exportData(data)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Exporter JSON
            </button>
            <button
              type="button"
              onClick={() => void onReset()}
              className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30"
            >
              Réinitialiser tout
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
