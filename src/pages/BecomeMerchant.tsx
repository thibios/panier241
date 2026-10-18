import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Camera, Plus, X, ChevronDown } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { categories } from '../data/categories'
import { businessTypes, neighborhoods, INDEPENDENT_MARKET_ID } from '../data/businessTypes'
import { useMarkets } from '../context/MarketsContext'
import { supabase } from '../lib/supabaseClient'
import { compressImage } from '../lib/compressImage'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { categoryColors } from '../theme/tokens'
import type { CategoryId } from '../types'

interface ProductDraft {
  key: number
  name: string
  productType: string
  price: string
  unit: string
  variantLabel: string
  showVariant: boolean
  photoFile: File | null
  photoPreview: string | null
}

let draftKey = 0
function emptyProduct(unit: string): ProductDraft {
  return { key: ++draftKey, name: '', productType: '', price: '', unit, variantLabel: '', showVariant: false, photoFile: null, photoPreview: null }
}

const MAX_KIOSK_PHOTOS = 4
const field =
  'w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'
const label = 'mb-1 block text-xs font-semibold text-brand-dark'
const sectionTitle = 'mb-3 font-display text-lg font-bold text-brand-dark'
const chip = (active: boolean) =>
  `rounded-full px-3.5 py-2 text-xs font-semibold transition ${active ? 'bg-brand text-on-header' : 'border border-line bg-card text-brand-dark'}`

export default function BecomeMerchant() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh } = useCatalog()
  const { markets } = useMarkets()

  const [businessTypeId, setBusinessTypeId] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [otherNeighborhood, setOtherNeighborhood] = useState('')
  const [marketId, setMarketId] = useState(INDEPENDENT_MARKET_ID)
  const [address, setAddress] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([])
  const [kioskPhotos, setKioskPhotos] = useState<{ file: File; preview: string }[]>([])
  const [products, setProducts] = useState<ProductDraft[]>([emptyProduct('pièce')])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const businessType = businessTypes.find((b) => b.id === businessTypeId)
  const itemWord = businessType?.itemWord ?? 'produit'
  const groups = useMemo(() => [...new Set(businessTypes.map((b) => b.group))], [])
  const finalNeighborhood = neighborhood === 'autre' ? otherNeighborhood.trim() : neighborhood

  function chooseBusinessType(id: string) {
    const type = businessTypes.find((b) => b.id === id)
    setBusinessTypeId(id)
    if (!type) return
    setSelectedCategories(type.categories)
    // Les lignes encore vides prennent l'unité habituelle de ce commerce.
    setProducts((prev) => prev.map((p) => (p.name || p.price ? p : { ...p, unit: type.defaultUnit, productType: '' })))
  }

  function toggleCategory(id: CategoryId) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function addKioskPhotos(files: FileList | null) {
    if (!files) return
    const next = Array.from(files)
      .slice(0, MAX_KIOSK_PHOTOS - kioskPhotos.length)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }))
    setKioskPhotos((prev) => [...prev, ...next])
  }

  function updateProduct(key: number, patch: Partial<ProductDraft>) {
    setProducts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  const validProducts = products.filter((p) => p.name.trim() && Number(p.price) > 0 && p.unit.trim())

  const missing: string[] = []
  if (!businessType) missing.push('le type de commerce')
  if (!name.trim()) missing.push('le nom')
  if (!phone.trim()) missing.push('le téléphone')
  if (!finalNeighborhood) missing.push('le quartier')
  if (!address.trim()) missing.push("l'adresse exacte")
  if (selectedCategories.length === 0) missing.push('une catégorie')
  if (kioskPhotos.length === 0) missing.push('une photo du commerce')
  if (validProducts.length === 0) missing.push(`un ${itemWord} avec son nom et son prix`)

  /** Catégorie d'un produit : déduite de son type quand le commerce couvre plusieurs catégories. */
  function categoryFor(p: ProductDraft): CategoryId {
    if (selectedCategories.includes('fruits') && /fruit|banane/i.test(p.productType)) return 'fruits'
    return selectedCategories[0] ?? businessType?.categories[0] ?? 'epicerie'
  }

  async function uploadTo(bucket: 'kiosk-photos' | 'product-photos', file: File) {
    const small = await compressImage(file)
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, small, { contentType: small.type })
    if (uploadError) throw new Error("Une photo n'a pas pu être envoyée. Vérifiez votre connexion et réessayez.")
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async function handleSubmit() {
    if (!user || missing.length > 0 || !businessType) return
    setError(null)
    setIsSubmitting(true)
    try {
      const kioskUrls = await Promise.all(kioskPhotos.map((p) => uploadTo('kiosk-photos', p.file)))

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          phone: phone.trim(),
          business_type: businessType.label,
          neighborhood: finalNeighborhood,
          market_id: marketId,
          categories: selectedCategories,
          address: address.trim(),
          banner_color: categoryColors[selectedCategories[0]],
          kiosk_photo_url: kioskUrls[0],
          kiosk_photos: kioskUrls,
        })
        .select('id')
        .single()
      if (merchantError || !merchant) throw new Error("Votre commerce n'a pas pu être enregistré. Réessayez dans un instant.")

      const photoUrls = await Promise.all(validProducts.map((p) => (p.photoFile ? uploadTo('product-photos', p.photoFile) : null)))
      const { error: productsError } = await supabase.from('products').insert(
        validProducts.map((p, i) => ({
          merchant_id: merchant.id,
          name: p.name.trim(),
          category: categoryFor(p),
          product_type: p.productType.trim() || null,
          price: Math.round(Number(p.price)),
          unit: p.unit.trim(),
          image_url: photoUrls[i],
          variant_label: p.variantLabel.trim() || null,
        })),
      )
      if (productsError) throw new Error(`Votre commerce est créé, mais les ${itemWord}s n'ont pas pu être ajoutés. Ajoutez-les depuis votre espace marchand.`)

      await refresh()
      navigate('/marchand-espace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell>
      <header className="flex items-center gap-3 px-5 pb-2 pt-6">
        <Link to="/" aria-label="Retour" className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-brand-dark">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Ajouter un commerçant</h1>
          <p className="text-xs text-muted">Votre commerce sera visible après validation par l'équipe.</p>
        </div>
      </header>

      <div className="space-y-7 px-5 pb-10 pt-4">
        {/* 1. Type de commerce */}
        <section>
          <h2 className={sectionTitle}>Type de commerce</h2>
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{group}</p>
                <div className="flex flex-wrap gap-2">
                  {businessTypes
                    .filter((b) => b.group === group)
                    .map((b) => (
                      <button key={b.id} type="button" onClick={() => chooseBusinessType(b.id)} aria-pressed={businessTypeId === b.id} className={chip(businessTypeId === b.id)}>
                        {b.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Le commerce */}
        <section>
          <h2 className={sectionTitle}>Ma boutique</h2>
          <div className="space-y-3 rounded-card border border-line bg-card p-4 shadow-card">
            <div>
              <label htmlFor="m-name" className={label}>Nom du commerce</label>
              <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex. : Chez Mama Rose" className={field} />
            </div>
            <div>
              <label htmlFor="m-phone" className={label}>Téléphone / WhatsApp</label>
              <input id="m-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+241 77 00 00 00" className={field} />
            </div>
            <div>
              <label htmlFor="m-area" className={label}>Quartier</label>
              <div className="relative">
                <select id="m-area" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={`${field} appearance-none pr-9`}>
                  <option value="">Choisir le quartier</option>
                  {neighborhoods.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                  <option value="autre">Autre quartier…</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              </div>
              {neighborhood === 'autre' && (
                <input value={otherNeighborhood} onChange={(e) => setOtherNeighborhood(e.target.value)} maxLength={80} placeholder="Nom du quartier" aria-label="Nom du quartier" className={`${field} mt-2`} />
              )}
            </div>
            <div>
              <label htmlFor="m-market" className={label}>Dans un marché ou un magasin ? (facultatif)</label>
              <div className="relative">
                <select id="m-market" value={marketId} onChange={(e) => setMarketId(e.target.value)} className={`${field} appearance-none pr-9`}>
                  <option value={INDEPENDENT_MARKET_ID}>Non, commerce indépendant</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              </div>
            </div>
            <div>
              <label htmlFor="m-address" className={label}>Adresse exacte</label>
              <textarea id="m-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={200} placeholder="Rue, repère, numéro d'étal… Ex. : face à la pharmacie, 2e étal à gauche" className={field} />
            </div>
          </div>
        </section>

        {/* 3. Catégories vendues */}
        <section>
          <h2 className={sectionTitle}>Catégories vendues</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)} aria-pressed={selectedCategories.includes(cat.id)} className={chip(selectedCategories.includes(cat.id))}>
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Photos du commerce */}
        <section>
          <h2 className={sectionTitle}>Photos du kiosque ou de la boutique</h2>
          <div className="grid grid-cols-4 gap-2">
            {kioskPhotos.map((p, i) => (
              <div key={p.preview} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                <img src={p.preview} alt={`Photo ${i + 1} du commerce`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setKioskPhotos((prev) => prev.filter((_, j) => j !== i))} aria-label={`Retirer la photo ${i + 1}`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
            {kioskPhotos.length < MAX_KIOSK_PHOTOS && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-card text-brand">
                <Camera className="h-6 w-6" aria-hidden="true" />
                <span className="text-[10px] font-semibold">Ajouter</span>
                <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => addKioskPhotos(e.target.files)} />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Jusqu'à {MAX_KIOSK_PHOTOS} photos. La première sert d'image principale.</p>
        </section>

        {/* 5. Produits ou plats */}
        <section>
          <h2 className={sectionTitle}>Mes {itemWord}s</h2>
          <div className="space-y-3">
            {products.map((p, index) => (
              <div key={p.key} className="rounded-card border border-line bg-card p-3 shadow-card">
                <div className="flex gap-3">
                  <label className="relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-brand/40 bg-brand-light/50 text-brand">
                    {p.photoPreview ? (
                      <img src={p.photoPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6" aria-hidden="true" />
                        <span className="px-1 text-center text-[10px] font-semibold leading-tight">Photo du {itemWord}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      aria-label={`Photo du ${itemWord} ${index + 1}`}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null
                        updateProduct(p.key, { photoFile: file, photoPreview: file ? URL.createObjectURL(file) : null })
                      }}
                    />
                  </label>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start gap-2">
                      <input value={p.name} onChange={(e) => updateProduct(p.key, { name: e.target.value })} maxLength={80} placeholder={itemWord === 'plat' ? 'Nom du plat (ex. : Poulet nyembwe)' : `Nom du ${itemWord}`} aria-label={`Nom du ${itemWord} ${index + 1}`} className={field} />
                      {products.length > 1 && (
                        <button type="button" onClick={() => setProducts((prev) => prev.filter((x) => x.key !== p.key))} aria-label={`Retirer ce ${itemWord}`} className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-danger">
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input type="number" inputMode="numeric" min="0" value={p.price} onChange={(e) => updateProduct(p.key, { price: e.target.value })} placeholder="Prix F CFA" aria-label={`Prix du ${itemWord} ${index + 1}`} className={`${field} min-w-0 flex-1`} />
                      <input value={p.unit} onChange={(e) => updateProduct(p.key, { unit: e.target.value })} maxLength={30} placeholder="Unité" aria-label={`Unité du ${itemWord} ${index + 1}`} className={`${field} !w-24 shrink-0`} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-muted">Type de {itemWord}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(businessType?.productTypes ?? []).map((t) => (
                      <button key={t} type="button" onClick={() => updateProduct(p.key, { productType: p.productType === t ? '' : t })} aria-pressed={p.productType === t} className={chip(p.productType === t)}>
                        {t}
                      </button>
                    ))}
                    <input
                      value={businessType?.productTypes.includes(p.productType) ? '' : p.productType}
                      onChange={(e) => updateProduct(p.key, { productType: e.target.value })}
                      maxLength={60}
                      placeholder="Autre type…"
                      aria-label={`Autre type de ${itemWord}`}
                      className="w-32 rounded-full border border-line bg-white px-3 py-2 text-xs text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    />
                  </div>
                </div>

                {p.showVariant ? (
                  <input value={p.variantLabel} onChange={(e) => updateProduct(p.key, { variantLabel: e.target.value })} maxLength={40} placeholder="Variante (ex. : grande part, 1 kg, 12 mm)" aria-label="Variante" className={`${field} mt-3`} />
                ) : (
                  <button type="button" onClick={() => updateProduct(p.key, { showVariant: true })} className="mt-3 text-xs font-semibold text-brand">
                    + Préciser une taille ou une variante
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setProducts((prev) => [...prev, emptyProduct(businessType?.defaultUnit ?? 'pièce')])}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-brand/40 bg-card text-sm font-semibold text-brand"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Ajouter un {itemWord}
          </button>
          <p className="mt-2 text-xs text-muted">Même nom pour plusieurs {itemWord}s = variantes regroupées dans votre vitrine.</p>
        </section>

        {error && <p role="alert" className="rounded-card bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
        {missing.length > 0 && !isSubmitting && (
          <p className="text-xs text-muted">Il manque : {missing.join(', ')}.</p>
        )}

        <button
          type="button"
          disabled={missing.length > 0 || isSubmitting}
          onClick={handleSubmit}
          className="h-12 w-full rounded-full bg-brand text-sm font-semibold text-on-header transition active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? 'Envoi en cours…' : 'Créer mon espace marchand'}
        </button>
      </div>
    </PageShell>
  )
}
