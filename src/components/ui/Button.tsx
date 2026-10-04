import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  fullWidth?: boolean
  /** Affiche un indicateur d'attente et bloque le bouton. */
  loading?: boolean
  children: ReactNode
}

// États : normal / survol / press (active) / focus clavier / disabled / loading.
const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-white hover:bg-brand/90',
  secondary: 'bg-brand-light text-brand hover:bg-brand/10',
  ghost: 'bg-transparent text-brand-dark hover:bg-brand-light',
  danger: 'bg-category-poisson text-white hover:bg-category-poisson/90',
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
        variantClasses[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
