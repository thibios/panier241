import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  fullWidth?: boolean
  children: ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark active:scale-[0.98]',
  secondary: 'bg-brand-light text-brand hover:bg-brand/10 active:scale-[0.98]',
  ghost: 'bg-transparent text-brand-dark hover:bg-brand-light',
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`rounded-pill px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        variantClasses[variant]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
