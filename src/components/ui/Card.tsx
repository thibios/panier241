import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export default function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div className={`rounded-card bg-white p-4 shadow-card ${className}`} {...rest}>
      {children}
    </div>
  )
}
