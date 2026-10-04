import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import WovenHeader from './WovenHeader'

export const LEGAL_CONTACT_EMAIL = 'contactpanier241@gmail.com'

/** Mise en page commune aux pages légales (accessibles sans être connecté). */
export default function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string
  updatedAt: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-surface pb-24">
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5 text-sm leading-relaxed text-brand-dark/80">
        <p className="text-xs text-brand-dark/50">Dernière mise à jour : {updatedAt}</p>
        {children}
      </div>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-brand-dark">{title}</h2>
      {children}
    </section>
  )
}
