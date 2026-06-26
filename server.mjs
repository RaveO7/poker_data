import { createServer } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DATA_FILE_RELATIVE,
  createDataApiMiddleware,
  ensureDataFile,
} from './server/data-handler.mjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const PORT = Number(process.env.PORT) || 3000

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
}

ensureDataFile()
const dataApi = createDataApiMiddleware()

const server = createServer(async (req, res) => {
  await dataApi(req, res, async () => {
    if (!req.url || req.method !== 'GET') {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    let filePath = join(DIST_DIR, req.url === '/' ? 'index.html' : req.url)

    if (!existsSync(filePath) || !extname(filePath)) {
      filePath = join(DIST_DIR, 'index.html')
    }

    if (!existsSync(filePath)) {
      res.statusCode = 404
      res.end('Build manquant. Lancez: npm run build')
      return
    }

    const ext = extname(filePath)
    res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream')
    createReadStream(filePath).pipe(res)
  })
})

server.listen(PORT, () => {
  console.log(`Poker Tracker: http://localhost:${PORT}`)
  console.log(`Données JSON: ${DATA_FILE_RELATIVE}`)
})
