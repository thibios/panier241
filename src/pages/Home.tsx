import PageShell from '../components/layout/PageShell'
import WovenHeader from '../components/layout/WovenHeader'
import Card from '../components/ui/Card'
import { categories } from '../data/categories'

export default function Home() {
  return (
    <PageShell>
      <WovenHeader>
        <h1 className="text-2xl font-bold">Panier 241</h1>
        <p className="mt-1 text-sm text-white/80">
          Vos marchés et commerçants préférés, livrés chez vous.
        </p>
      </WovenHeader>

      <div className="space-y-4 px-5 pt-5">
        <Card className="text-sm text-brand-dark/60">
          Étape 1 validée : structure du projet, design system et navigation.
          L'écran Accueil complet (recherche, marchés, favoris) arrive à l'étape suivante.
        </Card>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <div key={cat.id} className="flex flex-col items-center gap-1.5">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl text-white ${cat.colorClass}`}>
                {cat.icon}
              </div>
              <span className="text-xs font-medium text-brand-dark/70">{cat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
