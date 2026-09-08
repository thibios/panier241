import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import { userProfile } from '../data/addresses'

export default function Profile() {
  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-xl font-bold">Profil</h1>
      </WovenHeader>
      <div className="px-5 pt-5">
        <Card className="text-sm text-brand-dark/60">
          Écran Profil à construire à l'étape 6. Utilisateur : {userProfile.firstName} {userProfile.lastName}.
        </Card>
      </div>
    </PageShell>
  )
}
