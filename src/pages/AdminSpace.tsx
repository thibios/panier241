import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabaseClient'
import { useAuth, isAdminEmail } from '../context/AuthContext'
import type { ApprovalStatus } from '../types'

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
  const { user } = useAuth()
  const [merchants, setMerchants] = useState<MerchantRow[]>([])
  const [livreurs, setLivreurs] = useState<LivreurRow[]>([])
  const [loading, setLoading] = useState(false)

  async function fetchAll() {
    setLoading(true)
    const [merchantsRes, livreursRes] = await Promise.all([
      supabase.from('merchants').select('id, name, address, status').order('name'),
      supabase.from('livreurs').select('id, name, phone, vehicle, status').order('name'),
    ])
    if (merchantsRes.data) setMerchants(merchantsRes.data)
    if (livreursRes.data) setLivreurs(livreursRes.data)
    setLoading(false)
  }

  useEffect(() => {
    if (isAdminEmail(user?.email)) fetchAll()
  }, [user])

  async function setMerchantStatus(id: string, status: ApprovalStatus) {
    await supabase.from('merchants').update({ status }).eq('id', id)
    await fetchAll()
  }

  async function setLivreurStatus(id: string, status: ApprovalStatus) {
    await supabase.from('livreurs').update({ status }).eq('id', id)
    await fetchAll()
  }

  if (!isAdminEmail(user?.email)) {
    return (
      <PageShell>
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl">🔒</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">Accès réservé à l'administrateur</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand">
            ← Retour à l'accueil
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

        <section>
          <h2 className="mb-2 text-sm font-semibold text-brand-dark">
            Marchands en attente {pendingMerchants.length > 0 && `(${pendingMerchants.length})`}
          </h2>
          {pendingMerchants.length > 0 ? (
            <div className="space-y-2">
              {pendingMerchants.map((m) => (
                <Card key={m.id} className="space-y-2">
                  <p className="text-sm font-semibold text-brand-dark">{m.name}</p>
                  <p className="text-xs text-brand-dark/50">{m.address}</p>
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
            <p className="text-center text-sm text-brand-dark/50">Aucune demande en attente.</p>
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
                  <p className="text-xs text-brand-dark/50">{l.phone} · {l.vehicle}</p>
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
            <p className="text-center text-sm text-brand-dark/50">Aucune demande en attente.</p>
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
                  <p className="text-xs text-brand-dark/50">{m.address}</p>
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
                  <p className="text-xs text-brand-dark/50">{l.phone} · {l.vehicle}</p>
                </div>
                <Button variant="secondary" onClick={() => setLivreurStatus(l.id, 'suspended')}>
                  Suspendre
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
