import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { categories } from '../data/categories'
import { markets } from '../data/markets'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import type { CategoryId } from '../types'

const categoryColorHex: Record<CategoryId, string> = {
  legumes: '#3FAE5C',
  fruits: '#F2994A',
  poisson: '#E8543A',
  cereales: '#C08A3E',
}

interface ProductDraft {
  name: string
  category: CategoryId
  price: string
  unit: string
}

function emptyProductRow(): ProductDraft {
  return { name: '', category: 'legumes', price: '', unit: 'kg' }
}

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none'

export default function BecomeMerchant() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh } = useCatalog()

  const [name, setName] = useState('')
  const [marketId, setMarketId] = useState(markets[0]?.id ?? '')
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([])
  const [address, setAddress] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [productDrafts, setProductDrafts] = useState<ProductDraft[]>([emptyProductRow()])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function toggleCategory(id: CategoryId) {
    setSelectedCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file)
    if (file) setPhotoPreview(URL.createObjectURL(file))
    else setPhotoPreview(null)
  }

  function updateProductDraft(index: number, patch: Partial<ProductDraft>) {
    setProductDrafts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  function addProductRow() {
    setProductDrafts((prev) => [...prev, emptyProductRow()])
  }

  function removeProductRow(index: number) {
    setProductDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  const validProducts = productDrafts.filter((p) => p.name.trim() && p.price.trim() && p.unit.trim())

  const canSubmit =
    !!user &&
    name.trim() &&
    marketId &&
    selectedCategories.length > 0 &&
    address.trim() &&
    !!photoFile &&
    validProducts.length > 0

  async function handleSubmit() {
    if (!user || !canSubmit) return
    setError(null)
    setIsSubmitting(true)

    try {
      const path = `${user.id}/${Date.now()}-${photoFile!.name}`
      const { error: uploadError } = await supabase.storage.from('kiosk-photos').upload(path, photoFile!)
      if (uploadError) throw new Error(`Échec de l'envoi de la photo : ${uploadError.message}`)

      const { data: publicUrlData } = supabase.storage.from('kiosk-photos').getPublicUrl(path)

      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          market_id: marketId,
          categories: selectedCategories,
          address: address.trim(),
          image_emoji: '🏪',
          banner_color: categoryColorHex[selectedCategories[0]],
          kiosk_photo_url: publicUrlData.publicUrl,
        })
        .select('id')
        .single()

      if (merchantError || !merchant) throw new Error(`Échec de la création du marchand : ${merchantError?.message}`)

      const productsToInsert = validProducts.map((p) => ({
        merchant_id: merchant.id,
        name: p.name.trim(),
        category: p.category,
        price: Math.round(Number(p.price)),
        unit: p.unit.trim(),
        image_emoji: categories.find((c) => c.id === p.category)?.icon ?? '🛒',
      }))

      const { error: productsError } = await supabase.from('products').insert(productsToInsert)
      if (productsError) throw new Error(`Échec de l'ajout des produits : ${productsError.message}`)

      await refresh()
      navigate('/marchand-espace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
      setIsSubmitting(false)
    }
  }

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <h1 className="text-xl font-bold">Devenir marchand</h1>
        </div>
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5 pb-8">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">Ma boutique</h2>
          <Card className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom de la boutique"
              className={inputClass}
            />
            <select value={marketId} onChange={(e) => setMarketId(e.target.value)} className={inputClass}>
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse (ex: Allée B, Libreville)"
              className={inputClass}
            />
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">Catégories vendues</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-brand text-white' : 'bg-white text-brand-dark/70 shadow-card'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">Photo du kiosque</h2>
          <Card>
            {photoPreview && (
              <img src={photoPreview} alt="Aperçu du kiosque" className="mb-3 h-40 w-full rounded-2xl object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-brand-dark/70"
            />
          </Card>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-dark">Mes produits</h2>
            <button type="button" onClick={addProductRow} className="text-xs font-semibold text-brand">
              + Ajouter un produit
            </button>
          </div>
          <div className="space-y-3">
            {productDrafts.map((draft, index) => (
              <Card key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-dark/50">Produit {index + 1}</span>
                  {productDrafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProductRow(index)}
                      className="text-xs font-semibold text-category-poisson"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => updateProductDraft(index, { name: e.target.value })}
                  placeholder="Nom du produit (ex: Tomates fraîches)"
                  className={inputClass}
                />
                <select
                  value={draft.category}
                  onChange={(e) => updateProductDraft(index, { category: e.target.value as CategoryId })}
                  className={inputClass}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={draft.price}
                    onChange={(e) => updateProductDraft(index, { price: e.target.value })}
                    placeholder="Prix (F CFA)"
                    className={inputClass}
                  />
                  <input
                    type="text"
                    value={draft.unit}
                    onChange={(e) => updateProductDraft(index, { unit: e.target.value })}
                    placeholder="Unité (kg, pièce...)"
                    className={inputClass}
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-category-poisson">{error}</p>}

        <Button fullWidth disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Création en cours...' : 'Créer mon espace marchand'}
        </Button>
      </div>
    </PageShell>
  )
}
