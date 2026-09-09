import { Link } from 'react-router-dom'
import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { buildWhatsAppLink, PANIER241_WHATSAPP } from '../lib/whatsapp'

const CONTACT_EMAIL = 'contactpanier241@gmail.com'

export default function Contact() {
  return (
    <PageShell>
      <WovenHeader>
        <div className="flex items-center gap-3">
          <Link to="/profil" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">
            ←
          </Link>
          <h1 className="text-xl font-bold">Contact</h1>
        </div>
      </WovenHeader>

      <div className="space-y-4 px-5 pt-5 pb-8">
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🟢</span>
            <div>
              <p className="text-sm font-semibold text-brand-dark">WhatsApp</p>
              <p className="text-xs text-brand-dark/50">{PANIER241_WHATSAPP}</p>
            </div>
          </div>
          <a
            href={buildWhatsAppLink(PANIER241_WHATSAPP, 'Bonjour Panier 241, ')}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button fullWidth>Écrire sur WhatsApp</Button>
          </a>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✉️</span>
            <div>
              <p className="text-sm font-semibold text-brand-dark">Email</p>
              <p className="text-xs text-brand-dark/50">{CONTACT_EMAIL}</p>
            </div>
          </div>
          <a href={`mailto:${CONTACT_EMAIL}`}>
            <Button variant="secondary" fullWidth>
              Envoyer un email
            </Button>
          </a>
        </Card>

        <p className="text-center text-xs text-brand-dark/40">
          Certaines photos sont fournies par{' '}
          <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="underline">
            Pexels
          </a>
          .
        </p>
      </div>
    </PageShell>
  )
}
