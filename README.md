# Panier 241 — MVP client

## Lancer le projet

Prérequis : Node.js 18+.

```bash
npm install
npm run dev
```

## Configuration Supabase (backend réel)

L'app utilise [Supabase](https://supabase.com) (Postgres + authentification) pour les comptes,
adresses, favoris et commandes. Le catalogue (marchés/marchands/produits) reste en données
mockées locales (`src/data/`).

1. Copier `.env.example` en `.env.local` et renseigner :
   - `VITE_SUPABASE_URL` — Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Project Settings → API → clé `anon public`
2. Exécuter `supabase/schema.sql` dans Supabase → SQL Editor (une seule fois, à la création du projet)
3. Authentication → Sign In / Providers → Email → désactiver **"Confirm email"** (pour que
   l'inscription connecte immédiatement, sans lien à cliquer dans un email)

**Déploiement (Vercel)** : ajouter les deux mêmes variables dans Project Settings → Environment
Variables, puis redéployer.

## Structure

- `src/types` — types TypeScript partagés
- `src/data` — données mockées du catalogue (marchés, marchands, produits) et créneaux
- `src/lib/supabaseClient.ts` — client Supabase
- `src/context` — état global : `AuthContext` (compte), `CartContext` (panier, en session
  navigateur), `FavoritesContext` / `AddressesContext` / `OrdersContext` (persistés en base,
  par compte)
- `src/components/ui` — composants réutilisables (Button, Card, StatusBadge...)
- `src/components/layout` — en-tête, navigation basse, structure de page
- `src/pages` — un fichier par écran (`Auth.tsx` + les 6 écrans du parcours client)
- `supabase/schema.sql` — schéma de base de données (tables, RLS, trigger de création de profil)
