import type { PokerData } from '../types'

export const DATA_FILE_PATH = import.meta.env.PROD
  ? 'Vercel Blob (cloud)'
  : 'data/poker-tracker.json'

const API_URL = '/api/poker-data'

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // ignore
  }
  return `Erreur ${res.status}`
}

export async function fetchPokerData(): Promise<PokerData> {
  const res = await fetch(API_URL)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<PokerData>
}

export async function savePokerData(data: PokerData): Promise<PokerData> {
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<PokerData>
}
