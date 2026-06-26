import type { ReactNode } from 'react'

interface CardProps {
  title: string
  children: ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold text-gold-light">{title}</h2>
      {children}
    </section>
  )
}

interface StatBoxProps {
  label: string
  value: string | number
  accent?: 'default' | 'green' | 'red' | 'blue'
}

const accentClasses = {
  default: 'text-white',
  green: 'text-emerald-400',
  red: 'text-red-400',
  blue: 'text-sky-400',
}

export function StatBox({ label, value, accent = 'default' }: StatBoxProps) {
  return (
    <div className="rounded-xl bg-black/25 px-4 py-3 text-center">
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accentClasses[accent]}`}>{value}</p>
    </div>
  )
}

interface ActionButtonProps {
  label: string
  sublabel?: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning'
  disabled?: boolean
}

const variantClasses = {
  primary: 'bg-gold hover:bg-gold-light text-felt-dark',
  secondary: 'bg-white/10 hover:bg-white/20 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  warning: 'bg-amber-600 hover:bg-amber-500 text-white',
}

export function ActionButton({
  label,
  sublabel,
  onClick,
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center rounded-xl px-4 py-5 font-semibold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${variantClasses[variant]}`}
    >
      <span className="text-lg">{label}</span>
      {sublabel && <span className="mt-1 text-xs opacity-80">{sublabel}</span>}
    </button>
  )
}

interface TicketSelectorProps {
  label: string
  options: readonly { value: number; label: string }[]
  value: number
  onChange: (value: number) => void
}

export function TicketSelector({ label, options, value, onChange }: TicketSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm text-white/60">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              value === option.value
                ? 'bg-gold text-felt-dark ring-2 ring-gold-light'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
