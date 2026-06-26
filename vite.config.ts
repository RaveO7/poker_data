import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// @ts-expect-error JS module without full types
import { createDataApiMiddleware, ensureDataFile } from './server/data-handler.mjs'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'poker-data-api',
      configureServer(server) {
        ensureDataFile()
        const middleware = createDataApiMiddleware()
        server.middlewares.use((req, res, next) => {
          void middleware(req, res, next)
        })
      },
    },
  ],
  server: {
    watch: {
      ignored: ['**/data/**'],
    },
  },
})
