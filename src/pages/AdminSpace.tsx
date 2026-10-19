import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { ApprovalStatus } from '../types'
import { useMarkets, type CustomMarketRow } from '../context/MarketsContext'
import AdminOrders from '../components/admin/AdminOrders'
import { translateDbError } from '../lib/orderEngine'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import CategoryAdmin from '../components/admin/CategoryAdmin'
import { MFA_SECTION_ID } from '../components/account/MfaSettings'

interface MerchantRow {
  id: string
  name: string
  address: string
  status: ApprovalStatus
}

interface LivreurRow {
  id: string
  name: string
  phone: string
  vehicle: string
  status: ApprovalStatus
}

export default function AdminSpace() {
  const { isAdmin, isAdminMember } = useAuth()
  const [merchants, setMerchants] = useState<MerchantRow[]>([])
  const [livreurs, setLivreurs] = useState<LivreurRow[]>([])
  const [loading, setLoading] = useState(false)
  const [proposedMarkets, setProposedMarkets] = useState<CustomMarketRow[]>([])
  const [actionError, setActionError] = useState<string | null>(null)
  const { refresh: refreshMarkets } = useMarkets()

  async function fetchAll() {
    setLoading(true)
    const [merchantsRes, livreursRes, marketsRes] = await Promise.all([
      supabase.from('merchants').select('id, name, address, status').order('name'),
      supabase.from('livreurs').select('id, name, phone, vehicle, status').order('name'),
      supabase.from('custom_markets').select('id, name, neighborhood, city, status, kind, logo_url, market_type, address, photo_url, created_at').eq('status', 'pending').order('created_at'),
    ])
    if (marketsRes.data) setProposedMarkets(marketsRes.data as CustomMarketRow[])
    if (merchantsRes.data) setMerchants(merchantsRes.data)
    if (livreursRes.data) setLivreurs(livreursRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (isAdmin) fetchAll()
  }, [isAdmin])

  // Les refus de la base (ex. approbation d'un commerçant de démonstration) sont affichés tels quels.
  async function setMerchantStatus(id: string, status: ApprovalStatus) {
    setActionError(null)
    const { error } = await supabase.from('merchants').update({ status }).eq('id', id)
    if (error) setActionError(translateDbError(error))
    await fetchAll()
  }

  async function setMarketStatus(id: string, status: 'approved' | 'rejected') {
    setActionError(null)
    const { error } = await supabase.from('custom_markets').update({ status }).eq('id', id)
    if (error) setActionError(translateDbError(error))
    await Promise.all([fetchAll(), refreshMarkets()])
  }

  async function setLivreurStatus(id: string, status: ApprovalStatus) {
    setActionError(null)
    const { error } = await supabase.from('livreurs').update({ status }).eq('id', id)
    if (error) setActionError(translateDbError(error))
    await fetchAll()
  }

  // Inscrit comme administrateur mais session sans second facteur (aal1) : la base refuse tout droit admin.
  if (!isAdmin && isAdminMember) {
    return (
      <PageShell>
        <div className="px-5 pt-8 text-center">
          <ShieldCheck className="mx-auto h-9 w-9 text-brand-dark/30" />
          <p className="mt-2 text-sm font-medium text-brand-dark">
            Activez la double authentification pour accéder à l'administration
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted">
            L'espace admin exige un code à 6 chiffres en plus du mot de passe.
          </p>
          <Link to={`/profil#${MFA_SECTION_ID}`} className="mt-4 inline-block text-sm font-semibold text-brand">
            Activer la double authentification
          </Link>
        </div>
      </PageShell>
    )
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="px-5 pt-8 text-center">
          <Lock className="mx-auto h-9 w-9 text-brand-dark/30" />
          <p className="mt-2 text-sm font-medium text-brand-dark">Accès réservé à l'administrateur</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand">
            <ArrowLeft className="inline h-4 w-4" /> Retour à l'accueil
          </Link>
        </div>
      </PageShell>
    )
  }

  const pendingMerchants = merchants.filter((m) => m.status === 'pending')
  const pendingLivreurs = livreurs.filter((l) => l.status === 'pending')
  const activeMerchants = merchants.filter((m) => m.status === 'approved')
  const activeLivreurs = livreurs.filter((l) => l.status === 'approved')

  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Espace admin</h1>
      </WovenHeader>

      <div className="space-y-6 px-5 pt-5 pb-8">
        <div className="flex justify-end">
          <button type="button" onClick={fetchAll} className="text-xs font-semibold text-brand">
            {loading ? 'Rafraîchissement...' : 'Rafraîchir'}
          </button>
        </div>

        {actionError && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {actionError}
          </p>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">
            Marchands en attente {pendingMerchants.length > 0 && `(${pendingMerchants.length})`}
          </h2>
          {pendingMerchants.length > 0 ? (
            <div className="space-y-2">
              {pendingMerchants.map((m) => (
                <Card key={m.id} className="space-y-2">
                  <p className="text-sm font-semibold text-brand-dark">{m.name}</p>
                  <p className="text-xs text-muted">{m.address}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setMerchantStatus(m.id, 'approved')}>Approuver</Button>
                    <Button variant="secondary" onClick={() => setMerchantStatus(m.id, 'rejected')}>
                      Rejeter
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted">Aucune demande en attente.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">
            Marchés et magasins proposés {proposedMarkets.length > 0 && `(${proposedMarkets.length})`}
          </h2>
          {proposedMarkets.length > 0 ? (
            <div className="space-y-2">
              {proposedMarkets.map((m) => (
                <Card key={m.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    {(m.logo_url ?? m.photo_url) && <img src={(m.logo_url ?? m.photo_url) as string} alt={`Logo ${m.name}`} className="h-12 w-12 rounded-xl bg-white object-contain" />}
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">{m.name}</p>
                      <p className="text-xs text-muted">
                        {m.kind === 'supermarche' ? 'Magasin / enseigne' : m.market_type ?? 'Marché'} · {m.neighborhood}, {m.city}
                        {m.address ? ` · ${m.address}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setMarketStatus(m.id, 'approved')}>Approuver</Button>
                    <Button variant="secondary" onClick={() => setMarketStatus(m.id, 'rejected')}>
                      Rejeter
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted">Aucun marché proposé.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">
            Livreurs en attente {pendingLivreurs.length > 0 && `(${pendingLivreurs.length})`}
          </h2>
          {pendingLivreurs.length > 0 ? (
            <div className="space-y-2">
              {pendingLivreurs.map((l) => (
                <Card key={l.id} className="space-y-2">
                  <p className="text-sm font-semibold text-brand-dark">{l.name}</p>
                  <p className="text-xs text-muted">{l.phone} · {l.vehicle}</p>
                  <div className="flex gap-2">
                    <Button onClick={() => setLivreurStatus(l.id, 'approved')}>Approuver</Button>
                    <Button variant="secondary" onClick={() => setLivreurStatus(l.id, 'rejected')}>
                      Rejeter
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted">Aucune demande en attente.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">
            Marchands actifs {activeMerchants.length > 0 && `(${activeMerchants.length})`}
          </h2>
          <div className="space-y-2">
            {activeMerchants.map((m) => (
              <Card key={m.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">{m.name}</p>
                  <p className="text-xs text-muted">{m.address}</p>
                </div>
                <Button variant="secondary" onClick={() => setMerchantStatus(m.id, 'suspended')}>
                  Suspendre
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">
            Livreurs actifs {activeLivreurs.length > 0 && `(${activeLivreurs.length})`}
          </h2>
          <div className="space-y-2">
            {activeLivreurs.map((l) => (
              <Card key={l.id} className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-brand-dark">{l.name}</p>
                  <p className="text-xs text-muted">{l.phone} · {l.vehicle}</p>
                </div>
                <Button variant="secondary" onClick={() => setLivreurStatus(l.id, 'suspended')}>
                  Suspendre
                </Button>
              </Card>
            ))}
          </div>
        </section>

        <AdminOrders
          merchants={merchants.map((m) => ({ id: m.id, name: m.name }))}
          livreurs={livreurs.map((l) => ({ id: l.id, name: l.name }))}
        />

        <CategoryAdmin />
      </div>
    </PageShell>
  )
}
