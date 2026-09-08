# Panier 241 — MVP client

## Lancer le projet

Prérequis : Node.js 18+ (non détecté sur cette machine — à installer depuis https://nodejs.org).

```bash
npm install
npm run dev
```

## Structure

- `src/types` — types TypeScript partagés
- `src/data` — données mockées (marchés, marchands, produits, adresses, créneaux)
- `src/context` — état global (panier, commandes) via React Context
- `src/components/ui` — composants réutilisables (Button, Card, StatusBadge...)
- `src/components/layout` — en-tête, navigation basse, structure de page
- `src/pages` — un fichier par écran
