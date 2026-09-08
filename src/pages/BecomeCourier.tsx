import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const vehicles = ['Moto', 'Vélo', 'Voiture', 'À pied']

const inputClass =
  'w-full rounded-2xl bg-brand-light px-3 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/40 focus:outline-none'

export default function BecomeCourier() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicle, setVehicle] = useState(vehicles[0])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = !!user && name.trim() && phone.trim() && vehicle

  async function handleSubmit() {
    if (!user || !canSubmit) return
    setError(null)
    setIsSubmitting(true)

    const { error: insertError } = await supabase.from('livreurs').insert({
      owner_id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      vehicle,
    })

    if (insertError) {
      setError(insertError.message)
      setIsSubmitting(false)
      return
    }

    navigate('/livreur-espace')
  }

  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <h1 className="text-xl font-bold">Devenir livreur</h1>
        </div>
      </WovenHeader>

      <div className="space-y-5 px-5 pt-5 pb-8">
        <Card className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom complet"
            className={inputClass}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone (ex: +241 074 12 34 56)"
            className={inputClass}
          />
          <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={inputClass}>
            {vehicles.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Card>

        {error && <p className="text-sm text-category-poisson">{error}</p>}

        <Button fullWidth disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Création en cours...' : 'Créer mon espace livreur'}
        </Button>
      </div>
    </PageShell>
  )
}
