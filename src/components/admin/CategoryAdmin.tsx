import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Card from '../ui/Card'
import Button from '../ui/Button'
import FeaturedCategoriesEditor from '../merchant/FeaturedCategoriesEditor'
import { supabase } from '../../lib/supabaseClient'
import { compressImage } from '../../lib/compressImage'
import { useAuth } from '../../context/AuthContext'
import { useMarkets } from '../../context/MarketsContext'
import { useTaxonomy, CATEGORY_COLUMNS, ATTRIBUTE_COLUMNS, attributeFromRow } from '../../context/TaxonomyContext'
import type { CategoryAttribute } from '../../types'

/** Ligne categories lue par l'administrateur (actives et désactivées). */
interface AdminCategoryRow {
  id: string
  parent_id: string | null
  label: string
  short_label: string | null
  sort_order: number
  is_active: boolean
  is_featured: boolean
  image_url: string | null
}

interface AdminProductRow {
  id: string
  name: string
  variant_label: string | null
  merchant_id: string
  category: string
  subcategory_id: string | null
}

type AttributeRowFromDb = Parameters<typeof attributeFromRow>[0]

const field =
  'w-full rounded-xl border border-line-strong bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Identifiant stable proposé à partir d'un libellé (sans accents, en minuscules, tirets). */
function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** Message français d'une erreur d'écriture de la taxonomie. */
function adminError(message: string, code?: string) {
  if (code === '23505') return 'Cet identifiant existe déjà.'
  if (code === '23503') return 'Catégorie utilisée par des produits ou des sous-catégories : désactive-la plutôt que de la supprimer.'
  if (/Deux niveaux|ne peut pas devenir|changer de niveau/.test(message)) return 'Deux niveaux au plus, et une catégorie utilisée ne change pas de famille.'
  if (code === '23514') return 'Valeur refusée : vérifie le libellé (2 à 80 caractères) et l’identifiant.'
  return "L'enregistrement a échoué. Réessaie."
}

/**
 * Administration de la taxonomie (migration 023) : familles et sous-catégories (création, libellés,
 * ordre, activation, mise en avant éditoriale, image), attributs filtrables, catégories mises en avant
 * par enseigne, produits non classés et catégories inutilisées. Écriture réservée à l'admin (RLS).
 */
export default function CategoryAdmin() {
  const { user } = useAuth()
  const { markets } = useMarkets()
  const { refresh: refreshTaxonomy } = useTaxonomy()
  const [rows, setRows] = useState<AdminCategoryRow[]>([])
  const [attrs, setAttrs] = useState<CategoryAttribute[]>([])
  const [products, setProducts] = useState<AdminProductRow[]>([])
  const [merchantNames, setMerchantNames] = useState<Map<string, string>>(new Map())
  const [unavailable, setUnavailable] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [marketId, setMarketId] = useState('')
  const [newFamily, setNewFamily] = useState('')

  const load = useCallback(async () => {
    const [catRes, attrRes, prodRes, merchRes] = await Promise.all([
      supabase.from('categories').select(CATEGORY_COLUMNS).order('sort_order'),
      supabase.from('category_attributes').select(ATTRIBUTE_COLUMNS).order('sort_order'),
      supabase.from('products').select('id, name, variant_label, merchant_id, category, subcategory_id'),
      supabase.from('merchants').select('id, name, is_demo'),
    ])
    if (catRes.error) {
      setUnavailable(true)
      return
    }
    setUnavailable(false)
    setRows(catRes.data as AdminCategoryRow[])
    setAttrs(attrRes.data ? (attrRes.data as AttributeRowFromDb[]).map(attributeFromRow) : [])
    setProducts(prodRes.data ? (prodRes.data as AdminProductRow[]) : [])
    setMerchantNames(new Map((merchRes.data ?? []).map((m: { id: string; name: string; is_demo: boolean }) => [m.id, m.is_demo ? `${m.name} (démonstration)` : m.name])))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const familiesRows = useMemo(() => rows.filter((r) => r.parent_id === null), [rows])
  const childrenOf = (id: string) => rows.filter((r) => r.parent_id === id)
  const usage = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
      if (p.subcategory_id) counts.set(p.subcategory_id, (counts.get(p.subcategory_id) ?? 0) + 1)
    }
    return counts
  }, [products])
  const familiesWithSubs = new Set(rows.filter((r) => r.parent_id).map((r) => r.parent_id as string))
  const unclassified = products.filter((p) => !p.subcategory_id && familiesWithSubs.has(p.category))
  const unused = rows.filter((r) => !usage.get(r.id))

  async function write(action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) {
    setBusy(true)
    setError(null)
    const { error: writeError } = await action()
    if (writeError) setError(adminError(writeError.message, writeError.code))
    await Promise.all([load(), refreshTaxonomy()])
    setBusy(false)
    return !writeError
  }

  function update(id: string, patch: Partial<AdminCategoryRow>) {
    return write(() => supabase.from('categories').update(patch).eq('id', id))
  }

  async function create(parentId: string | null, label: string) {
    const clean = label.trim()
    const base = slugify(clean)
    const id = parentId ? `${parentId}-${base}`.slice(0, 60) : base
    if (clean.length < 2 || !ID_PATTERN.test(id)) {
      setError('Libellé trop court ou sans lettre.')
      return false
    }
    const siblings = rows.filter((r) => r.parent_id === parentId)
    const sort = siblings.length > 0 ? Math.max(...siblings.map((s) => s.sort_order)) + 10 : 10
    return write(() => supabase.from('categories').insert({ id, parent_id: parentId, label: clean, sort_order: sort }))
  }

  async function uploadImage(id: string, file: File | null) {
    if (!file || !user) return
    setBusy(true)
    const small = await compressImage(file, 800)
    const path = `${user.id}/categorie-${id}-${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage.from('kiosk-photos').upload(path, small, { contentType: small.type })
    setBusy(false)
    if (uploadError) {
      setError("L'image n'a pas pu être envoyée. Réessaie.")
      return
    }
    await update(id, { image_url: supabase.storage.from('kiosk-photos').getPublicUrl(path).data.publicUrl })
  }

  if (unavailable) {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold text-brand-dark">Catégories</h2>
        <p className="text-center text-sm text-muted">Taxonomie indisponible : la migration 023 n'est pas encore appliquée, ou la connexion a échoué.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-brand-dark">Catégories ({familiesRows.length} familles, {rows.length - familiesRows.length} sous-catégories)</h2>
      {error && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-xs font-semibold text-danger">{error}</p>}

      {familiesRows.map((fam) => {
        const isOpen = openId === fam.id
        const subs = childrenOf(fam.id)
        return (
          <Card key={fam.id} className="space-y-2">
            <button type="button" onClick={() => setOpenId(isOpen ? null : fam.id)} aria-expanded={isOpen} className="flex w-full items-center gap-2 text-left">
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-semibold ${fam.is_active ? 'text-brand-dark' : 'text-muted'}`}>{fam.label}</span>
                <span className="block text-[11px] text-muted">
                  {fam.id} · {usage.get(fam.id) ?? 0} produit{(usage.get(fam.id) ?? 0) > 1 ? 's' : ''} · {subs.length} sous-catégorie{subs.length > 1 ? 's' : ''}
                  {fam.is_active ? '' : ' · désactivée'}
                  {fam.is_featured ? ' · mise en avant' : ''}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-line pt-3">
                <CategoryRowEditor row={fam} busy={busy} onSave={(patch) => update(fam.id, patch)} onImage={(f) => uploadImage(fam.id, f)} canFeature />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-brand-dark">Sous-catégories</p>
                  {subs.map((sub) => (
                    <div key={sub.id} className="rounded-xl bg-brand-light/50 p-2">
                      <CategoryRowEditor row={sub} busy={busy} onSave={(patch) => update(sub.id, patch)} usage={usage.get(sub.id) ?? 0} />
                    </div>
                  ))}
                  <InlineCreate placeholder="Nouvelle sous-catégorie" busy={busy} onCreate={(label) => create(fam.id, label)} />
                </div>
                <AttributesEditor
                  scopeIds={[fam.id, ...subs.map((s) => s.id)]}
                  labelOf={(id) => rows.find((r) => r.id === id)?.label ?? id}
                  attrs={attrs}
                  busy={busy}
                  write={write}
                />
              </div>
            )}
          </Card>
        )
      })}

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-brand-dark">Nouvelle famille</p>
        <p className="text-xs text-muted">Une famille ajoutée s'affiche avec l'icône générique tant qu'aucune icône dédiée n'existe.</p>
        <div className="flex gap-2">
          <input value={newFamily} onChange={(e) => setNewFamily(e.target.value)} maxLength={80} placeholder="Libellé" aria-label="Libellé de la nouvelle famille" className={field} />
          <Button
            disabled={busy || newFamily.trim().length < 2}
            onClick={async () => {
              if (await create(null, newFamily)) setNewFamily('')
            }}
          >
            Créer
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <p className="text-sm font-semibold text-brand-dark">Catégories mises en avant par enseigne</p>
        <select value={marketId} onChange={(e) => setMarketId(e.target.value)} aria-label="Enseigne ou marché" className={field}>
          <option value="">Choisir une enseigne ou un marché…</option>
          {markets.map((m) => (
            <option key={m.id} value={m.id}>{m.name}{m.kind === 'marche' ? ' (marché)' : ''}</option>
          ))}
        </select>
        {marketId && <FeaturedCategoriesEditor key={marketId} scope={{ marketId }} />}
      </Card>

      <Card className="space-y-1">
        <p className="text-sm font-semibold text-brand-dark">Produits sans sous-catégorie ({unclassified.length})</p>
        {unclassified.length === 0 && <p className="text-xs text-muted">Aucun.</p>}
        {unclassified.map((p) => (
          <p key={p.id} className="text-xs text-brand-dark/80">
            {p.name}{p.variant_label ? ` · ${p.variant_label}` : ''} — {merchantNames.get(p.merchant_id) ?? 'commerçant inconnu'} ({rows.find((r) => r.id === p.category)?.label ?? p.category})
          </p>
        ))}
      </Card>

      <Card className="space-y-1">
        <p className="text-sm font-semibold text-brand-dark">Catégories sans produit ({unused.length})</p>
        <p className="text-xs text-muted">Masquées aux clients, sauf mise en avant éditoriale.</p>
        <p className="text-xs text-brand-dark/80">{unused.map((r) => r.label).join(', ') || 'Aucune.'}</p>
      </Card>
    </section>
  )
}

function CategoryRowEditor({
  row,
  busy,
  onSave,
  onImage,
  canFeature = false,
  usage,
}: {
  row: AdminCategoryRow
  busy: boolean
  onSave: (patch: Partial<AdminCategoryRow>) => Promise<boolean>
  onImage?: (file: File | null) => void
  canFeature?: boolean
  usage?: number
}) {
  const [label, setLabel] = useState(row.label)
  const [shortLabel, setShortLabel] = useState(row.short_label ?? '')
  const [order, setOrder] = useState(String(row.sort_order))
  const dirty = label !== row.label || shortLabel !== (row.short_label ?? '') || order !== String(row.sort_order)

  return (
    <div className="space-y-2">
      {usage !== undefined && <p className="text-[11px] text-muted">{row.id} · {usage} produit{usage > 1 ? 's' : ''}{row.is_active ? '' : ' · désactivée'}</p>}
      <div className="flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} aria-label="Libellé" className={field} />
        <input value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" aria-label="Ordre" className={`${field} !w-16`} />
      </div>
      <input value={shortLabel} onChange={(e) => setShortLabel(e.target.value)} maxLength={40} placeholder="Libellé court (facultatif)" aria-label="Libellé court" className={field} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={busy || !dirty || label.trim().length < 2}
          onClick={() => onSave({ label: label.trim(), short_label: shortLabel.trim() || null, sort_order: Number.parseInt(order, 10) || 0 })}
        >
          Enregistrer
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => onSave({ is_active: !row.is_active })}>
          {row.is_active ? 'Désactiver' : 'Réactiver'}
        </Button>
        {canFeature && (
          <Button variant="ghost" disabled={busy} onClick={() => onSave({ is_featured: !row.is_featured })}>
            {row.is_featured ? 'Retirer la mise en avant' : 'Mettre en avant'}
          </Button>
        )}
      </div>
      {onImage && (
        <label className="flex items-center gap-2 text-xs text-brand-dark/80">
          {row.image_url && <img src={row.image_url} alt="" className="h-10 w-10 rounded-xl object-cover" />}
          <span className="font-semibold">Image</span>
          <input type="file" accept="image/*" disabled={busy} onChange={(e) => onImage(e.target.files?.[0] ?? null)} className="min-w-0 flex-1 text-xs" />
        </label>
      )}
    </div>
  )
}

function InlineCreate({ placeholder, busy, onCreate }: { placeholder: string; busy: boolean; onCreate: (label: string) => Promise<boolean> }) {
  const [value, setValue] = useState('')
  return (
    <div className="flex gap-2">
      <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} placeholder={placeholder} aria-label={placeholder} className={field} />
      <Button
        variant="secondary"
        disabled={busy || value.trim().length < 2}
        onClick={async () => {
          if (await onCreate(value)) setValue('')
        }}
      >
        Ajouter
      </Button>
    </div>
  )
}

function AttributesEditor({
  scopeIds,
  labelOf,
  attrs,
  busy,
  write,
}: {
  scopeIds: string[]
  labelOf: (id: string) => string
  attrs: CategoryAttribute[]
  busy: boolean
  write: (action: () => PromiseLike<{ error: { message: string; code?: string } | null }>) => Promise<boolean>
}) {
  const [target, setTarget] = useState(scopeIds[0])
  const [label, setLabel] = useState('')
  const [valueType, setValueType] = useState<CategoryAttribute['valueType']>('texte')
  const [unit, setUnit] = useState('')
  const list = attrs.filter((a) => scopeIds.includes(a.categoryId))
  const key = slugify(label).replace(/-/g, '_')

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-brand-dark">Attributs filtrables</p>
      {list.length === 0 && <p className="text-xs text-muted">Aucun attribut.</p>}
      {list.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-xs">
          <span className={`min-w-0 flex-1 truncate ${a.isActive ? 'text-brand-dark' : 'text-muted'}`}>
            {a.label}{a.unit ? ` (${a.unit})` : ''} · {labelOf(a.categoryId)}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => write(() => supabase.from('category_attributes').update({ is_active: !a.isActive }).eq('id', a.id))}
            className="font-semibold text-brand disabled:opacity-40"
          >
            {a.isActive ? 'Désactiver' : 'Réactiver'}
          </button>
        </div>
      ))}
      <div className="space-y-2 rounded-xl border border-line p-2">
        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Catégorie de l'attribut" className={field}>
          {scopeIds.map((id) => (
            <option key={id} value={id}>{labelOf(id)}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Libellé (ex. Diamètre)" aria-label="Libellé de l'attribut" className={field} />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={15} placeholder="Unité" aria-label="Unité" className={`${field} !w-20`} />
        </div>
        <select value={valueType} onChange={(e) => setValueType(e.target.value as CategoryAttribute['valueType'])} aria-label="Type de valeur" className={field}>
          <option value="texte">Texte</option>
          <option value="nombre">Nombre</option>
          <option value="oui_non">Oui / non</option>
        </select>
        <Button
          variant="secondary"
          disabled={busy || label.trim().length < 2 || !/^[a-z][a-z0-9_]{1,39}$/.test(key)}
          onClick={async () => {
            const ok = await write(() =>
              supabase.from('category_attributes').insert({ category_id: target, key, label: label.trim(), value_type: valueType, unit: unit.trim() || null }),
            )
            if (ok) {
              setLabel('')
              setUnit('')
            }
          }}
        >
          Ajouter l'attribut
        </Button>
      </div>
    </div>
  )
}
