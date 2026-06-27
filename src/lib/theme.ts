import type { AppTheme } from '../types'

export function applyTheme(theme: AppTheme): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}
