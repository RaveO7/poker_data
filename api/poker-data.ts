import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list, put } from '@vercel/blob'
import { createHistoricalSeed, normalizeData, type PokerData } from './lib/data.js'

const BLOB_PATH = 'poker-tracker.json'

function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN

  const tokenKey = Object.keys(process.env).find(
    (key) => key.endsWith('_READ_WRITE_TOKEN') && process.env[key],
  )

  return tokenKey ? process.env[tokenKey] : undefined
}

function blobOptions() {
  const token = getBlobToken()
  return token ? { token } : {}
}

async function readBlobData(): Promise<PokerData> {
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 1, ...blobOptions() })

  if (blobs.length === 0) {
    const seed = createHistoricalSeed()
    await writeBlobData(seed)
    return seed
  }

  const blob = blobs[0]
  const response = await fetch(blob.downloadUrl ?? blob.url)
  if (!response.ok) throw new Error('Impossible de lire les données cloud')
  return normalizeData((await response.json()) as Partial<PokerData>)
}

async function writeBlobData(data: unknown): Promise<PokerData> {
  const normalized = normalizeData(data as Partial<PokerData>)
  await put(BLOB_PATH, JSON.stringify(normalized, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    ...blobOptions(),
  })
  return normalized
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  const token = getBlobToken()
  if (!token) {
    return res.status(503).json({
      error:
        'BLOB_READ_WRITE_TOKEN manquant. Dans Vercel : Storage → votre Blob → Connect to Project → poker_data, puis Redeploy.',
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
