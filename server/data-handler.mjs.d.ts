import type { IncomingMessage, ServerResponse } from 'node:http'

export function ensureDataFile(): void
export function readDataFile(): unknown
export function writeDataFile(data: unknown): unknown
export function createDataApiMiddleware(): (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => Promise<void>
