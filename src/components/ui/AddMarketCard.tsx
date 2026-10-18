import { useEffect, useState, type FormEvent } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useMarkets } from '../../context/MarketsContext'

const field =
  'w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'

/** Carte « + » de la rangée des marchés : ouvre un formulaire pour ajouter un marché de proximité réel. */
export default function AddMarketCard() {
  const { addMarket } = useMarkets()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'approved' | 'pending'>(null)

  function close() {
    setOpen(false)
    setName('')
    setNeighborhood('')
    setError(null)
    setDone(null)
  }

  // La touche Échap ferme le formulaire.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2 || neighborhood.trim().length < 2) {
      setError('Indiquez le nom du marché et son quartier.')
      return
    }
    setIsSaving(true)
    setError(null)
    const result = await addMarket(name, neighborhood)
    setIsSaving(false)
    if (result.error) setError(result.error)
    else setDone(result.approved ? 'approved' : 'pending')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-brand/40 bg-card p-3 text-brand transition hover:border-brand active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-brand-dark">
          <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
        </span>
        <span className="text-center text-sm font-semibold leading-tight">Ajouter un marché de proximité</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-market-title">
          <div className="w-full max-w-md rounded-[1.75rem] bg-card p-5 shadow-float">
            <div className="flex items-start justify-between gap-3">
              <h2 id="add-market-title" className="font-display text-lg font-bold text-brand-dark">
                Ajouter un marché de proximité
              </h2>
              <button type="button" onClick={close} aria-label="Fermer" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-brand-dark">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {done ? (
              <div className="mt-4 space-y-3 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-brand-dark">
                  <Check className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-brand-dark">
                  {done === 'approved' ? 'Marché ajouté.' : 'Merci, votre proposition est envoyée.'}
                </p>
                <p className="text-xs text-muted">
                  {done === 'approved'
                    ? 'Il apparaît maintenant dans les marchés de proximité.'
                    : "Il apparaîtra dans l'application dès que l'équipe Le Panier 241 l'aura vérifié."}
                </p>
                <button type="button" onClick={close} className="h-11 w-full rounded-full bg-brand text-sm font-semibold text-on-header">
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="market-name" className="mb-1 block text-xs font-semibold text-brand-dark">
                    Nom du marché
                  </label>
                  <input id="market-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex. : Marché de Nkembo" className={field} autoFocus />
                </div>
                <div>
                  <label htmlFor="market-area" className="mb-1 block text-xs font-semibold text-brand-dark">
                    Quartier
                  </label>
                  <input id="market-area" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} placeholder="Ex. : Nkembo" className={field} />
                </div>
                <p className="text-xs text-muted">Ville : Libreville. Ajoutez uniquement un marché qui existe réellement.</p>
                {error && (
                  <p role="alert" className="text-xs font-semibold text-danger">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={isSaving} className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-on-header disabled:opacity-50">
                  {isSaving ? 'Enregistrement…' : 'Ajouter le marché'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
