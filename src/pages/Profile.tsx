import { useState } from 'react'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { userProfile, paymentMethods } from '../data/addresses'
import { useOrders } from '../context/OrdersContext'
import { useFavorites } from '../context/FavoritesContext'
import { useAddresses } from '../context/AddressesContext'

const paymentIcon: Record<string, string> = {
  'pay-1': '📱',
  'pay-2': '📱',
  'pay-3': '💵',
}

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default function Profile() {
  const { orders } = useOrders()
  const { favoriteIds } = useFavorites()
  const { addresses, addAddress } = useAddresses()

  const [isAddingAddress, setIsAddingAddress] = useState(false)
  const [label, setLabel] = useState('')
  const [fullAddress, setFullAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')

  function resetForm() {
    setLabel('')
    setFullAddress('')
    setNeighborhood('')
    setIsAddingAddress(false)
  }

  function handleAddAddress() {
    if (!label.trim() || !fullAddress.trim() || !neighborhood.trim()) return
    addAddress({
      label: label.trim(),
      fullAddress: fullAddress.trim(),
      neighborhood: neighborhood.trim(),
      city: 'Libreville',
    })
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
              {userProfile.firstName} {userProfile.lastName}
            </h1>
            <p className="text-sm text-white/80">{userProfile.phone}</p>
            <p className="text-xs text-white/60">Membre depuis {formatMemberSince(userProfile.memberSince)}</p>
          </div>
        </div>
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5">
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-lg font-bold text-brand-dark">{orders.length}</p>
            <p className="mt-0.5 text-[11px] text-brand-dark/50">Commandes</p>
          </Card>
          <Card className="text-center">
            <p className="text-lg font-bold text-brand-dark">{favoriteIds.length}</p>
            <p className="mt-0.5 text-[11px] text-brand-dark/50">Favoris</p>
          </Card>
          <Card className="text-center">
            <p className="text-lg font-bold text-brand-dark">⭐ {userProfile.averageRatingGiven.toFixed(1)}</p>
            <p className="mt-0.5 text-[11px] text-brand-dark/50">Note moyenne</p>
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
                disabled={!label.trim() || !fullAddress.trim() || !neighborhood.trim()}
                onClick={handleAddAddress}
              >
                Enregistrer l'adresse
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
          <div className="space-y-2 pb-4">
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
      </div>
    </PageShell>
  )
}
