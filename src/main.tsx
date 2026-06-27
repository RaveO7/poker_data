import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme } from './lib/theme'
import './index.css'
import App from './App'

applyTheme('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
