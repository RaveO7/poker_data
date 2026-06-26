import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEmptyData, createHistoricalSeed } from './seed.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
export const DATA_FILE_PATH = join(PROJECT_ROOT, 'data', 'poker-tracker.json')
export const DATA_FILE_RELATIVE = 'data/poker-tracker.json'

function migrateSettings(raw = {}) {
  return {
    selectedSpinStake: raw.selectedSpinStake ?? raw.spinBuyIn ?? 5,
    selectedTournamentStake: raw.selectedTournamentStake ?? raw.tournamentBuyIn ?? 5,
    spinWinMultiplier:
      raw.spinWinMultiplier ??
      (raw.spinWinGain && raw.spinBuyIn ? raw.spinWinGain / raw.spinBuyIn : 3),
  }
}

export function normalizeData(raw) {
  const base = raw && typeof raw === 'object' ? raw : createEmptyData()
  return {
    sessions: Array.isArray(base.sessions) ? base.sessions : [],
    spins: Array.isArray(base.spins) ? base.spins : [],
    tournaments: Array.isArray(base.tournaments) ? base.tournaments : [],
    settings: migrateSettings(base.settings),
  }
}

export function ensureDataFile() {
  const dir = dirname(DATA_FILE_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  if (!existsSync(DATA_FILE_PATH)) {
    writeFileSync(DATA_FILE_PATH, JSON.stringify(createHistoricalSeed(), null, 2), 'utf-8')
  }
}

export function readDataFile() {
  ensureDataFile()
  const raw = readFileSync(DATA_FILE_PATH, 'utf-8')
  return normalizeData(JSON.parse(raw))
}

export function writeDataFile(data) {
  ensureDataFile()
  const normalized = normalizeData(data)
  writeFileSync(DATA_FILE_PATH, JSON.stringify(normalized, null, 2), 'utf-8')
  return normalized
}

export async function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export function createDataApiMiddleware() {
  return async (req, res, next) => {
    if (!req.url?.startsWith('/api/poker-data')) return next()

    res.setHeader('Content-Type', 'application/json')

    try {
      if (req.method === 'GET') {
        res.statusCode = 200
        res.end(JSON.stringify(readDataFile()))
        return
      }

      if (req.method === 'PUT' || req.method === 'POST') {
        const body = await readRequestBody(req)
        const parsed = normalizeData(JSON.parse(body))
        writeDataFile(parsed)
        res.statusCode = 200
        res.end(JSON.stringify(parsed))
        return
      }

      res.statusCode = 405
      res.end(JSON.stringify({ error: 'Method not allowed' }))
    } catch (error) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Server error' }))
    }
  }
}
