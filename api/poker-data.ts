import type { VercelRequest, VercelResponse } from '@vercel/node'
import { get, put } from '@vercel/blob'
import { createHistoricalSeed, normalizeData, type PokerData } from './lib/data.js'

const BLOB_PATH = 'poker-tracker.json'
const BLOB_ACCESS = 'private' as const

function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN

  const tokenKey = Object.keys(process.env).find(
    (key) => key.endsWith('_READ_WRITE_TOKEN') && process.env[key],
  )

  return tokenKey ? process.env[tokenKey] : undefined
}

function isBlobConfigured(): boolean {
  return Boolean(getBlobToken() || process.env.BLOB_STORE_ID)
}

function blobAuth() {
  const token = getBlobToken()
  return token ? { token } : {}
}

async function readBlobData(): Promise<PokerData> {
  const result = await get(BLOB_PATH, { access: BLOB_ACCESS, ...blobAuth() })

  if (!result?.stream) {
    const seed = createHistoricalSeed()
    await writeBlobData(seed)
    return seed
  }

  const text = await new Response(result.stream).text()
  return normalizeData(JSON.parse(text) as Partial<PokerData>)
}

async function writeBlobData(data: unknown): Promise<PokerData> {
  const normalized = normalizeData(data as Partial<PokerData>)
  await put(BLOB_PATH, JSON.stringify(normalized, null, 2), {
    access: BLOB_ACCESS,
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...blobAuth(),
  })
  return normalized
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  if (!isBlobConfigured()) {
    return res.status(503).json({
      error:
        'Blob non lié au projet. Storage → poker-data → Connect to Project → poker_data, puis Redeploy.',
    })
  }

  try {
    if (req.method === 'GET') {
      const data = await readBlobData()
      return res.status(200).json(data)
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      const data = await writeBlobData(req.body)
      return res.status(200).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    })
  }
}
