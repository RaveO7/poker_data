import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list, put } from '@vercel/blob'
import { createHistoricalSeed, normalizeData, type PokerData } from './lib/data'

const BLOB_PATH = 'poker-tracker.json'

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

async function readBlobData(): Promise<PokerData> {
  const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 })

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
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return normalized
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json')

  if (!blobConfigured()) {
    return res.status(503).json({
      error:
        'Vercel Blob non configuré. Créez un Blob Store dans le dashboard Vercel et liez-le au projet.',
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
