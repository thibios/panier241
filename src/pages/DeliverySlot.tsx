import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { generateDeliveryDays } from '../data/deliverySlots'
import { useCart } from '../context/CartContext'
import { useAddresses } from '../context/AddressesContext'

const periodIcon: Record<string, string> = {
  matin: '🌅',
  'apres-midi': '☀️',
  soir: '🌙',
  retrait: '🏪',
}

export default function DeliverySlot() {
  const navigate = useNavigate()
  const { itemCount, selectedSlot, setSelectedSlot, selectedAddressId, setSelectedAddressId } = useCart()
  const { addresses } = useAddresses()
  const days = useMemo(() => generateDeliveryDays(), [])
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [showAddressPicker, setShowAddressPicker] = useState(false)

  const activeDay = days[activeDayIndex]
  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault) ?? addresses[0]

  if (itemCount === 0) {
    return (
      <PageShell>
        <div className="px-5 pt-6 text-center">
          <p className="text-3xl">🧺</p>
          <p className="mt-2 text-sm font-medium text-brand-dark">Ton panier est vide</p>
          <p className="mt-1 text-xs text-brand-dark/50">
            Ajoute des produits depuis une fiche marchand avant de choisir un créneau.
          </p>
          <Link to="/" className="mt-4 inline-block">
            <Button>Découvrir les marchands</Button>
          </Link>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/panier" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <h1 className="text-xl font-bold">Choix du créneau</h1>
        </div>
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-brand-dark">Quel jour ?</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((day, index) => (
              <button
                key={day.date}
                type="button"
                onClick={() => setActiveDayIndex(index)}
                className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium transition ${
                  index === activeDayIndex
                    ? 'bg-brand text-white'
                    : 'bg-white text-brand-dark/70 shadow-card'
                }`}
              >
                {day.dayLabel}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-brand-dark">Quel créneau ?</h2>
          <div className="space-y-3">
            {activeDay.slots.map((slot) => {
              const isSelected = selectedSlot?.id === slot.id
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`flex w-full items-center gap-3 rounded-card p-4 text-left shadow-card transition ${
                    isSelected ? 'bg-brand text-white' : 'bg-white text-brand-dark'
                  }`}
                >
                  <span className="text-xl">{periodIcon[slot.period]}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{slot.periodLabel}</p>
                    <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-brand-dark/50'}`}>
                      {slot.timeRange}
                    </p>
                  </div>
                  {isSelected && <span className="text-lg">✓</span>}
                </button>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-brand-dark">Adresse de livraison</h2>
          {!selectedAddress ? (
            <Card className="text-center">
              <p className="text-sm text-brand-dark/70">
                Tu n'as pas encore d'adresse enregistrée.
              </p>
              <Link to="/profil" className="mt-3 inline-block">
                <Button variant="secondary">Ajouter une adresse dans mon profil</Button>
              </Link>
            </Card>
          ) : (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📍</span>
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">{selectedAddress.label}</p>
                    <p className="text-xs text-brand-dark/50">{selectedAddress.fullAddress}</p>
                    <p className="text-xs text-brand-dark/50">
                      {selectedAddress.neighborhood}, {selectedAddress.city}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddressPicker((v) => !v)}
                  className="shrink-0 text-xs font-semibold text-brand"
                >
                  Changer
                </button>
              </div>
            </Card>
          )}

          {showAddressPicker && (
            <div className="mt-2 space-y-2">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => {
                    setSelectedAddressId(addr.id)
                    setShowAddressPicker(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-card p-3 text-left text-sm shadow-card ${
                    addr.id === selectedAddressId ? 'bg-brand-light' : 'bg-white'
                  }`}
                >
                  <span>
                    <span className="font-medium text-brand-dark">{addr.label}</span>{' '}
                    <span className="text-brand-dark/50">— {addr.neighborhood}</span>
                  </span>
                  {addr.id === selectedAddressId && <span className="text-brand">✓</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="pb-4 pt-2">
          <Button fullWidth disabled={!selectedSlot || !selectedAddress} onClick={() => navigate('/panier')}>
            Valider le créneau
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
