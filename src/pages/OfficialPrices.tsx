import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Search, Scale, ExternalLink, Info } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { CardSkeleton } from '../components/ui/CatalogState'
import { supabase } from '../lib/supabaseClient'
import { formatFCFA } from '../lib/format'

interface OfficialPrice {
  id: number
  numero: number
  categorie: string
  designation: string
  prix_gros: number | null
  prix_demi_gros: number | null
  prix_detail: number
  unite_detail: string
  regime_fiscal: string
  source: string
  source_url: string
  releve_le: string
}

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Prix plafonds officiels (DGCCRF) : détail, demi-gros et gros, avec leur source. */
export default function OfficialPrices() {
  const [rows, setRows] = useState<OfficialPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('official_prices')
      .select('*')
      .order('numero')
      .then(({ data, error }) => {
        if (error) setFailed(true)
        setRows((data as OfficialPrice[]) ?? [])
        setLoading(false)
      })
  }, [])

  const categories = useMemo(() => [...new Set(rows.map((r) => r.categorie))], [rows])
  const q = normalize(query.trim())
  const visible = rows.filter(
    (r) => (!category || r.categorie === category) && (!q || normalize(`${r.designation} ${r.categorie}`).includes(q)),
  )
  const meta = rows[0]

  return (
    <PageShell>
      <header className="px-5 pb-3 pt-6">
        <Link to="/" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-brand">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Accueil
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light">
            <Scale className="h-5 w-5 text-brand" aria-hidden="true" />
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-dark">Prix officiels</h1>
        </div>
        <p className="mt-2 text-sm text-muted">
          Prix plafonds fixés par l'État pour les produits défiscalisés à prix bloqués. Un commerçant ne peut pas vendre
          plus cher.
        </p>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-full border border-line-strong bg-white px-4 shadow-field focus-within:ring-2 focus-within:ring-brand">
          <Search className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Riz, sucre, huile, poulet…"
            aria-label="Rechercher un produit"
            className="min-w-0 flex-1 bg-transparent text-sm text-brand-dark placeholder:text-muted focus:outline-none"
          />
        </label>
      </header>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtrer par catégorie">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold ${category === null ? 'bg-brand text-on-header' : 'border border-line bg-card text-brand-dark'}`}
          >
            Tout
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? null : c)}
              aria-pressed={category === c}
              className={`h-9 shrink-0 rounded-full px-4 text-xs font-semibold ${category === c ? 'bg-brand text-on-header' : 'border border-line bg-card text-brand-dark'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3 px-5 pb-4 pt-4">
        {loading && [0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        {failed && <p className="text-center text-sm text-danger">Les prix n'ont pas pu être chargés. Vérifiez votre connexion.</p>}
        {!loading && !failed && visible.length === 0 && (
          <p className="py-6 text-center text-sm text-muted">Aucun produit officiel ne correspond à « {query} ».</p>
        )}

        {visible.map((r) => (
          <div key={r.id} className="rounded-card border border-line bg-card p-4 shadow-card">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{r.categorie}</p>
            <p className="mt-1 text-sm font-semibold text-brand-dark">{r.designation}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Prix de détail maximum</p>
                <p className="font-display text-xl font-bold tabular-nums text-brand">
                  {formatFCFA(r.prix_detail)} <span className="font-sans text-xs font-medium text-muted">{r.unite_detail}</span>
                </p>
              </div>
            </div>
            {(r.prix_gros != null || r.prix_demi_gros != null) && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
                <div>
                  <p className="text-muted">Prix de gros</p>
                  <p className="font-semibold tabular-nums text-brand-dark">{r.prix_gros != null ? formatFCFA(r.prix_gros) : '—'}</p>
                </div>
                <div>
                  <p className="text-muted">Prix de demi-gros</p>
                  <p className="font-semibold tabular-nums text-brand-dark">{r.prix_demi_gros != null ? formatFCFA(r.prix_demi_gros) : '—'}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {meta && (
          <div className="mt-2 space-y-2 rounded-card bg-muted-bg p-4 text-xs text-muted">
            <p className="flex gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="text-brand-dark">Taxes :</strong> {meta.regime_fiscal}. Les prix affichés sont donc les
                prix finaux payés par le client.
              </span>
            </p>
            <p>
              <strong className="text-brand-dark">Source :</strong> {meta.source}, relevée le{' '}
              {new Date(meta.releve_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Les prix de gros et demi-gros portent sur le carton ou le colis indiqué dans le nom du produit.
            </p>
            <a href={meta.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand underline">
              Voir la liste sur le site de la DGCCRF <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </PageShell>
  )
}
