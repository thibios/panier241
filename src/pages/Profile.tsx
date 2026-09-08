import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { paymentMethods } from '../data/addresses'
import { useOrders } from '../context/OrdersContext'
import { useFavorites } from '../context/FavoritesContext'
import { useAddresses } from '../context/AddressesContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const paymentIcon: Record<string, string> = {
  'pay-1': '📱',
  'pay-2': '📱',
  'pay-3': '💵',
}

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { orders } = useOrders()
  const { favoriteIds } = useFavorites()
  const { addresses, addAddress } = useAddresses()

  const [profile, setProfile] = useState<{ firstName: string; lastName: string; phone: string } | null>(
    null,
  )
  const [myMerchantId, setMyMerchantId] = useState<string | null | undefined>(undefined)
  const [myLivreurId, setMyLivreurId] = useState<string | null | undefined>(undefined)

  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [label, setLabel] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({ firstName: data.first_name, lastName: data.last_name, phone: data.phone })
        }
      })
    supabase
      .from('merchants')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => setMyMerchantId(data?.id ?? null))
    supabase
      .from('livreurs')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data }) => setMyLivreurId(data?.id ?? null))
  }, [user])

  function resetForm() {
    setLabel('')
    setFullAddress('')
    setNeighborhood('')
    setIsAddingAddress(false)
  }

  async function handleAddAddress() {
    if (!label.trim() || !fullAddress.trim() || !neighborhood.trim()) return
    setIsSavingAddress(true)
    await addAddress({
      label: label.trim(),
      fullAddress: fullAddress.trim(),
      neighborhood: neighborhood.trim(),
      city: 'Libreville',
    })
    setIsSavingAddress(false)
    resetForm()
  }

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl">
            🧑🏾
          </div>
          <div>
            <h1 className="text-lg font-bold">
              {profile ? `${profile.firstName} ${profile.lastName}` : user?.email}
            </h1>
            {profile?.phone && <p className="text-sm text-white/80">{profile.phone}</p>}
            {user?.created_at && (
              <p className="text-xs text-white/60">Membre depuis {formatMemberSince(user.created_at)}</p>
            )}
          </div>
        </div>
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5">
        <div className="grid grid-cols-2 gap-3">
          <Card className="text-center">
            <p className="text-lg font-bold text-brand-dark">{orders.length}</p>
            <p className="mt-0.5 text-[11px] text-brand-dark/50">Commandes</p>
          </Card>
          <Card className="text-center">
            <p className="text-lg font-bold text-brand-dark">{favoriteIds.length}</p>
            <p className="mt-0.5 text-[11px] text-brand-dark/50">Favoris</p>
          </Card>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-dark">Mes adresses</h2>
            <button
              type="button"
              onClick={() => setIsAddingAddress((v) => !v)}
              className="text-xs font-semibold text-brand"
            >
              {isAddingAddress ? 'Annuler' : 'Ajouter'}
            </button>
          </div>

          {isAddingAddress && (
            <Card className="mb-2 space-y-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Nom (ex: Domicile, Bureau...)"
                className="w-full rounded-2xl bg-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none"
              />
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                placeholder="Adresse complète"
                className="w-full rounded-2xl bg-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none"
              />
              <input
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Quartier (ex: Louis, Nzeng-Ayong...)"
                className="w-full rounded-2xl bg-brand-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none"
              />
              <Button
                fullWidth
                disabled={!label.trim() || !fullAddress.trim() || !neighborhood.trim() || isSavingAddress}
                onClick={handleAddAddress}
              >
                {isSavingAddress ? 'Enregistrement...' : "Enregistrer l'adresse"}
              </Button>
            </Card>
          )}

          <div className="space-y-2">
            {addresses.map((addr) => (
              <Card key={addr.id} className="flex items-start gap-2">
                <span className="text-lg">📍</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-brand-dark">{addr.label}</p>
                    {addr.isDefault && (
                      <span className="rounded-pill bg-brand-light px-2 py-0.5 text-[10px] font-semibold text-brand">
                        Par défaut
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-brand-dark/50">{addr.fullAddress}</p>
                  <p className="text-xs text-brand-dark/50">
                    {addr.neighborhood}, {addr.city}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-brand-dark">Moyens de paiement</h2>
            <button type="button" className="text-xs font-semibold text-brand">
              Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <Card key={pm.id} className="flex items-center gap-3">
                <span className="text-lg">{paymentIcon[pm.id] ?? '💳'}</span>
                <div>
                  <p className="text-sm font-medium text-brand-dark">{pm.label}</p>
                  <p className="text-xs text-brand-dark/50">{pm.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {myMerchantId !== undefined && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-brand-dark">Espace marchand</h2>
            <Link to={myMerchantId ? '/marchand-espace' : '/devenir-marchand'}>
              <Button variant="secondary" fullWidth>
                {myMerchantId ? 'Mon espace marchand 🏪' : 'Devenir marchand'}
              </Button>
            </Link>
          </section>
        )}

        {myLivreurId !== undefined && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-brand-dark">Espace livreur</h2>
            <Link to={myLivreurId ? '/livreur-espace' : '/devenir-livreur'}>
              <Button variant="secondary" fullWidth>
                {myLivreurId ? 'Mon espace livreur 🛵' : 'Devenir livreur'}
              </Button>
            </Link>
          </section>
        )}

        <div className="pb-4">
          <Button variant="ghost" fullWidth onClick={() => signOut()}>
            Se déconnecter
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
