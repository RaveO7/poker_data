import type { AppTheme } from '../types'

interface ThemeToggleProps {
  theme: AppTheme
  onChange: (theme: AppTheme) => void
}

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20"
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {isDark ? '🌙 Sombre' : '☀️ Clair'}
    </button>
  )
}
