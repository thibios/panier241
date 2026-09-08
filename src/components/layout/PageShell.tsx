import type { ReactNode } from 'react'

export default function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-full max-w-md pb-24">{children}</div>
}
