import { useEffect, useState, type FormEvent } from 'react'
import { Plus, X, Check, Camera, ChevronDown } from 'lucide-react'
import NeighborhoodPicker from './NeighborhoodPicker'
import { useMarkets } from '../../context/MarketsContext'

const MARKET_TYPES = [
  'Marché vivrier (fruits, légumes, tubercules)',
  'Marché de poisson / débarcadère',
  'Marché de viande',
  'Marché de nuit',
  'Marché de gros',
  'Marché artisanal',
  'Marché de vêtements / friperie',
  'Marché mixte (tout type de produits)',
]

const field =
  'w-full rounded-card border border-line-strong bg-white px-3 py-2.5 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'

/** Carte « + » de la rangée des marchés : ouvre un formulaire pour ajouter un marché de proximité réel. */
export default function AddMarketCard({ kind = 'marche' }: { kind?: 'marche' | 'supermarche' }) {
  const isStore = kind === 'supermarche'
  const title = isStore ? 'Ajouter un magasin ou une enseigne' : 'Ajouter un marché de proximité'
  const { addMarket } = useMarkets()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [marketType, setMarketType] = useState('')
  const [address, setAddress] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<null | 'approved' | 'pending'>(null)

  function close() {
    setOpen(false)
    setName('')
    setNeighborhood('')
    setLogoFile(null)
    setLogoPreview(null)
    setMarketType('')
    setAddress('')
    setPhotoFile(null)
    setPhotoPreview(null)
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
      setError(isStore ? 'Indiquez le nom du magasin et son quartier.' : 'Indiquez le nom du marché et son quartier.')
      return
    }
    if (isStore && !logoFile) {
      setError('Ajoutez le logo du magasin ou de l’enseigne.')
      return
    }
    setIsSaving(true)
    setError(null)
    const result = await addMarket({ name, neighborhood, kind, logoFile, photoFile, marketType, address })
    setIsSaving(false)
    if (result.error) setError(result.error)
    else setDone(result.approved ? 'approved' : 'pending')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[11rem] w-40 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-brand/40 bg-card p-3 text-brand transition hover:border-brand active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-brand-dark">
          <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
        </span>
        <span className="text-center text-sm font-semibold leading-tight">{title}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-market-title">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] bg-card p-5 shadow-float">
            <div className="flex items-start justify-between gap-3">
              <h2 id="add-market-title" className="font-display text-lg font-bold text-brand-dark">
                {title}
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
                  {done === 'approved' ? (isStore ? 'Magasin ajouté.' : 'Marché ajouté.') : 'Merci, votre proposition est envoyée.'}
                </p>
                <p className="text-xs text-muted">
                  {done === 'approved'
                    ? isStore
                      ? 'Il apparaît maintenant dans les magasins et enseignes.'
                      : 'Il apparaît maintenant dans les marchés de proximité.'
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
                    {isStore ? 'Nom du magasin ou de l’enseigne' : 'Nom du marché'}
                  </label>
                  <input id="market-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={isStore ? 'Ex. : Mbolo' : 'Ex. : Marché de Nkembo'} className={field} autoFocus />
                </div>
                <div>
                  <label htmlFor="market-area" className="mb-1 block text-xs font-semibold text-brand-dark">
                    Quartier
                  </label>
                  <NeighborhoodPicker value={neighborhood} onChange={setNeighborhood} inputClassName={field} inputId="market-area" />
                </div>
                {!isStore && (
                  <>
                    <div>
                      <label htmlFor="market-type" className="mb-1 block text-xs font-semibold text-brand-dark">
                        Type de marché
                      </label>
                      <div className="relative">
                        <select id="market-type" value={marketType} onChange={(e) => setMarketType(e.target.value)} className={`${field} appearance-none pr-9`}>
                          <option value="">Choisir le type de marché</option>
                          {MARKET_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="market-address" className="mb-1 block text-xs font-semibold text-brand-dark">
                        Adresse ou repère (facultatif)
                      </label>
                      <input id="market-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} placeholder="Ex. : derrière la gare routière" className={field} />
                    </div>
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-brand-dark">Photo du marché (facultatif)</p>
                      <label className="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-strong bg-white p-3">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light">
                          {photoPreview ? <img src={photoPreview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5 text-brand" aria-hidden="true" />}
                        </span>
                        <span className="text-xs text-muted">{photoFile ? photoFile.name : 'Prendre ou choisir une photo réelle du marché'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            setPhotoFile(file)
                            setPhotoPreview(file ? URL.createObjectURL(file) : null)
                          }}
                        />
                      </label>
                    </div>
                  </>
                )}
                {isStore && (
                  <div>
                    <p className="mb-1 block text-xs font-semibold text-brand-dark">Logo (obligatoire)</p>
                    <label className="flex cursor-pointer items-center gap-3 rounded-card border border-dashed border-line-strong bg-white p-3">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light">
                        {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-contain" /> : <Plus className="h-5 w-5 text-brand" aria-hidden="true" />}
                      </span>
                      <span className="text-xs text-muted">{logoFile ? logoFile.name : 'Choisir une image : JPEG, PNG ou WebP, 5 Mo au plus'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null
                          setLogoFile(file)
                          setLogoPreview(file ? URL.createObjectURL(file) : null)
                        }}
                      />
                    </label>
                  </div>
                )}
                <p className="text-xs text-muted">
                  Ville : Libreville. Ajoutez uniquement {isStore ? 'un magasin qui existe' : 'un marché qui existe'} réellement.
                </p>
                {error && (
                  <p role="alert" className="text-xs font-semibold text-danger">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={isSaving} className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-on-header disabled:opacity-50">
                  {isSaving ? 'Enregistrement…' : isStore ? 'Ajouter le magasin' : 'Ajouter le marché'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
