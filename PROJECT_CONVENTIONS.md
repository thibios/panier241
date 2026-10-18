# Le Panier 241 — Conventions du projet

Document de référence pour toute personne ou tout agent IA qui modifie ce dépôt.

Légende utilisée partout :

- **Existant** : convention déjà appliquée dans le code. Exemple réel cité.
- **Nouvelle règle** : convention ajoutée ici. À appliquer à partir de maintenant.
- **Écart** : le code actuel ne respecte pas une règle ou une bonne pratique. Ne pas corriger sans demande explicite.

Stack : React 18 + Vite 5 + TypeScript 5 (strict) + Tailwind 3 + React Router 6 + Supabase (Postgres, RLS, Auth, Storage) + une fonction serverless Vercel (`api/pexels.ts`). Hébergement Vercel. Il n'y a pas de backend classique : pas de controllers, pas de repositories, pas d'ORM.

---

## 1. Structure des dossiers

**Existant**

```
panier241/
  api/                  Fonctions serverless Vercel (pexels.ts)
  docs/                 PRD.md, design-system.md
  public/               Icônes, logos (public/logos/*.png|webp)
  supabase/             schema.sql puis migrations 002_… à 019_…
  src/
    pages/              Un écran par route (Home.tsx, Cart.tsx, MerchantSpace.tsx…)
    components/
      layout/           Structure d'écran (PageShell, BottomNav, OfflineBanner, LegalPage…)
      ui/               Composants réutilisables (Button, Card, MarketCard, SearchBar…)
    context/            État global : un Provider + un hook par domaine (CartContext.tsx…)
    lib/                Fonctions utilitaires et accès techniques (supabaseClient, storage, format, pricing…)
    data/               Données statiques (markets, categories, neighborhoods, deliverySlots…)
    theme/              tokens.ts, MerchantThemeProvider.tsx
    types/              index.ts : types du domaine
```

**Nouvelle règle**

- Ne pas créer de nouveau dossier racine dans `src/` sans justification écrite dans le commit.
- Un composant utilisé par une seule page reste dans `components/ui/` s'il est générique, sinon dans le fichier de la page.
- Pas de dossier `services/`, `hooks/` ou `utils/` parallèle : `lib/` et `context/` jouent ce rôle (voir sections 11 et 12).

## 2. Naming

**Existant**

| Élément | Convention | Exemple réel |
|---|---|---|
| Composant, page, Provider | PascalCase | `MarketCard`, `MerchantSpace`, `OrdersProvider` |
| Hook | `use` + PascalCase | `useCart`, `usePexelsPhoto`, `useMarketPhoto` |
| Fonction | camelCase, verbe | `formatFCFA`, `compressImage`, `resolveMarketTheme` |
| Constante de module | UPPER_SNAKE_CASE | `ORDER_COLUMNS`, `CACHE_TTL_MS`, `REMEMBER_KEY` |
| Données statiques | camelCase pluriel | `markets`, `categories`, `categoryColors` |
| Identifiants métier | kebab-case préfixé | `mkt-bati-plus`, `mkt-mont-bouet` |
| Valeurs d'énumération | snake_case ou kebab-case français | `en_preparation`, `apres-midi`, `marche` |
| Routes | français, kebab-case | `/prix-officiels`, `/devenir-marchand`, `/livreur-espace` |
| Tables et colonnes SQL | snake_case anglais ou français | `orders.delivery_fee`, `livreurs`, `custom_markets` |
| Policies RLS | phrase française entre guillemets | `"Le client annule sa commande en preparation"` |
| Clés de stockage navigateur | préfixe `panier241:` | `panier241:remember-me` |

Le code (identifiants) est en anglais, avec des termes métier français assumés (`livreur`, `marche`, `retrait`). Les textes visibles sont en français.

**Nouvelle règle**

- Garder ce mélange tel quel. Ne pas renommer `livreur` en `courier` dans le code existant.
- Nouveau terme métier : reprendre le mot déjà utilisé en base s'il existe.

## 3. Fichiers

**Existant**

- Un composant par fichier, nom du fichier = nom du composant : `components/ui/QuantityStepper.tsx`.
- Contextes nommés `<Domaine>Context.tsx`.
- Utilitaires en camelCase : `lib/flyToCart.ts`, `lib/productGroups.ts`.
- Extensions : `.tsx` si JSX, `.ts` sinon.

**Nouvelle règle**

- Un fichier de page qui dépasse 500 lignes (`MerchantSpace.tsx` en a 500) doit être découpé en sous-composants avant tout ajout important.

## 4. Composants

**Existant**

- Composants fonctionnels, `export default function Nom()`. Exemple : `Button.tsx`.
- Exports nommés en plus quand un fichier expose des variantes : `CardSkeleton` dans `CatalogState.tsx`, `PanierMark` dans `CartIcon.tsx`.
- Props typées par une `interface NomProps`, qui étend les attributs HTML natifs quand c'est utile (`ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>`).
- Variantes par table de classes : `variantClasses: Record<Variant, string>`.
- Icônes : `lucide-react` uniquement, plus `components/ui/icons.tsx`. Aucune emoji.
- Mise en page mobile : `PageShell` (`max-w-md`, `pb-24` pour la barre de navigation).

**Nouvelle règle**

- Avant de créer un composant, chercher dans `components/ui/` un équivalent (`Button`, `Card`, `StatusBadge`, `CatalogState`…).
- Toute nouvelle page utilise `PageShell`.

## 5. Fonctions

**Existant**

- Fonctions pures dans `lib/` : `formatFCFA(amount)`, `computeDelivery` et `haversineDistanceKm` dans `lib/pricing.ts`.
- Les fonctions qui peuvent échouer côté métier renvoient `{ error: string | null }` : `cancelOrder` dans `OrdersContext.tsx`.
- `async/await` partout, pas de `.then` en chaîne, sauf dans quelques `useEffect` (`OrdersContext`).

**Nouvelle règle**

- Une fonction = une responsabilité. Paramètres nommés par objet au-delà de trois paramètres.
- Toute fonction exportée de `lib/` porte un commentaire JSDoc d'une ligne.

## 6. Variables

**Existant**

- `const` par défaut. Noms explicites : `seenStatuses`, `draftPhotoFile`.
- Montants en entiers F CFA (`price: number // en F CFA`).
- Dates en chaînes ISO (`createdAt: string // ISO`).

**Nouvelle règle**

- Pas de `var`. Pas d'abréviation obscure. Pas de `any` dans `src/` (voir écart section 9).

## 7. API

**Existant**

- Une seule route serveur : `GET /api/pexels?query=&locale=&page=` renvoie `{ url: string | null }`.
- Le reste passe par le client Supabase (`supabase.from(...)`, `supabase.storage`, `supabase.auth`).
- Réponses d'erreur JSON `{ error: string }` avec code HTTP explicite (400, 500, 502).

**Nouvelle règle**

- Toute nouvelle route serveur va dans `api/<nom>.ts`, valide ses paramètres, renvoie `{ error }` en cas d'échec.
- Une route n'est créée que si elle protège un secret ou exige un calcul de confiance.

## 8. Base de données

**Existant**

- Postgres Supabase. RLS activée sur chaque table (`alter table … enable row level security`).
- Règles d'accès par policies nommées en français. Règles métier sensibles par triggers : `protect_order_columns` (014, 016), `prevent_merchant_self_status_change` (006).
- Fonctions `security definer set search_path = public` : `is_admin()`, `update_merchant_rating()`.
- Contraintes `check` sur les longueurs : `char_length(cancel_reason) <= 300`.
- Mapping ligne SQL vers type TS par une fonction `fromRow` et une liste de colonnes explicite (`ORDER_COLUMNS`).

**Nouvelle règle**

- Jamais `select('*')` dans un nouveau code : lister les colonnes.
- Toute règle d'autorisation ou de calcul de montant vit en base (policy, trigger, fonction), pas seulement dans le navigateur.

**Écart** : les montants des commandes sont calculés par le navigateur et non recalculés en base (PRD, section 1, point 3).

## 9. Types

**Existant**

- Types du domaine centralisés dans `src/types/index.ts` : `Market`, `Product`, `Merchant`, `Order`, `OrderStatus`…
- Unions littérales pour les états : `OrderStatus = 'en_preparation' | 'en_livraison' | 'livree' | 'annulee'`.
- Champs nullables explicites (`string | null`) ; champs optionnels pour les ajouts récents (`businessType?`).
- `tsconfig.json` : `strict`, `noUnusedLocals`, `noUnusedParameters`.

**Nouvelle règle**

- Un type partagé par plus d'un fichier va dans `types/index.ts`.
- Les types de lignes SQL (`OrderRow`) restent privés au contexte qui les lit.

**Écart** : `api/pexels.ts` type `req` et `res` en `any`. Le dossier `api/` n'est couvert par aucun `tsconfig`.

## 10. Interfaces

**Existant**

- `interface` pour les objets et les props (`ButtonProps`, `OrdersContextValue`, `ThemeTokens`).
- `type` pour les unions et alias (`CategoryId`, `ApprovalStatus`, `SeenStatuses`).
- Commentaires JSDoc sur les champs non évidents (`/** Position GPS ; absente tant que… */`).

**Nouvelle règle**

- Garder cette répartition. Pas de préfixe `I`.

## 11. Hooks

**Existant**

- Chaque contexte exporte son hook : `useAuth`, `useCart`, `useOrders`, `useCatalog`, `useMarkets`, `useFavorites`, `useAddresses`, `usePexelsPhotos`.
- Hooks utilitaires dans `lib/` (`usePexelsPhoto`, `useProductNamePhoto`) ou à côté de leur composant (`useMarketPhoto` dans `MarketVisual.tsx`).
- Nettoyage des écouteurs dans le `return` de `useEffect` (`OfflineBanner.tsx`).

**Nouvelle règle**

- Un hook de contexte lève une erreur claire hors de son Provider (déjà fait dans `useCart` : à généraliser).
- Pas de `// eslint-disable-next-line react-hooks/exhaustive-deps` dans du nouveau code : corriger les dépendances.

**Écart** : ces commentaires `eslint-disable` existent (`OrdersContext.tsx`) alors qu'ESLint n'est pas installé.

## 12. Services

**Existant** : pas de couche `services/`. L'accès aux données se fait dans les contextes (`context/*.tsx`) et directement dans certaines pages (`MerchantSpace.tsx`, `CourierSpace.tsx`, `AdminSpace.tsx`, `Cart.tsx`, `Profile.tsx`).

**Équivalent dans cette stack (Nouvelle règle)**

- Le « service » d'un domaine = son contexte dans `context/` ou une fonction dans `lib/`.
- Une donnée lue par plusieurs écrans passe par un contexte. Une opération ponctuelle d'un seul espace (admin, marchand, livreur) peut rester dans la page.
- Ne pas créer de dossier `services/` parallèle.

## 13. Controllers

**Existant** : aucun. Sans équivalent.

**Équivalent (Nouvelle règle)** : le rôle du controller est tenu par les policies RLS et les triggers (autorisation), et par `api/*.ts` (point d'entrée serveur). Ne pas introduire de serveur Express ou équivalent.

## 14. Repositories

**Existant** : aucun. Le rôle est tenu par les fonctions `fromRow` et les constantes de colonnes dans les contextes (`ORDER_COLUMNS` dans `OrdersContext.tsx`).

**Nouvelle règle** : toute nouvelle table lue par l'app a un type `XxxRow`, une fonction `fromRow` et une constante de colonnes, au même endroit.

## 15. Schemas

**Existant**

- Schéma SQL : `supabase/schema.sql` (base) puis migrations numérotées.
- Pas de bibliothèque de schéma côté TS (pas de Zod). Les types TS sont écrits à la main.

**Nouvelle règle**

- La vérité du schéma est en SQL. Toute colonne ajoutée en base est reportée dans `types/index.ts` et dans le `XxxRow` concerné, dans le même commit.
- Ne pas ajouter Zod ou autre sans accord.

## 16. Validation

**Existant**

- Côté base : contraintes `check` (longueurs, valeurs autorisées, URL de photo autorisée dans 019).
- Côté serveur : `api/pexels.ts` refuse une `query` vide ou de plus de 100 caractères, borne `page` entre 1 et 20.
- Côté client : champs de formulaire HTML, `.trim()` avant envoi (`Auth.tsx`).

**Nouvelle règle**

- La validation client sert le confort. La validation qui protège vit en base.
- Toute nouvelle colonne texte libre a une contrainte `char_length(...) <= N`.

## 17. Gestion des erreurs

**Existant**

- État local `const [error, setError] = useState<string | null>(null)` dans les pages (`Auth.tsx`, `Orders.tsx`, `BecomeMerchant.tsx`).
- Messages français rédigés pour l'utilisateur : « L'email n'a pas pu être envoyé. Réessaie dans quelques minutes. »
- `try/catch` silencieux autour de `localStorage`/`sessionStorage` (`lib/storage.ts`, `supabaseClient.ts`).
- Catalogue : `CatalogState` affiche un message et un bouton « Réessayer ».

**Nouvelle règle**

- Toujours lire `error` dans le retour Supabase. Ne jamais l'ignorer.
- Afficher un message français, jamais le message technique brut.

**Écarts**

- Certaines pages affichent `insertError.message` brut, en anglais (`BecomeCourier.tsx`, `Orders.tsx`).
- `OrdersContext` ignore `error` au chargement des commandes et à l'insertion.

## 18. Logging

**Existant** : aucun `console.*` dans `src/` ni `api/`. Pas d'outil de suivi d'erreurs.

**Nouvelle règle**

- Pas de `console.log` commité.
- `console.error` autorisé uniquement dans `api/*.ts` (visible dans les logs Vercel), sans données personnelles ni secret.
- Un outil de suivi (type Sentry) ne s'ajoute qu'avec accord.

## 19. Commentaires

**Existant**

- En français, au présent, pour expliquer le pourquoi : `// Les design tokens sont posés avant le premier rendu pour éviter tout flash de couleur.`
- JSDoc `/** … */` sur les fonctions exportées et les champs de types.
- En-tête explicatif en tête de chaque migration SQL et de `api/pexels.ts`.

**Nouvelle règle** : pas de code commenté laissé en place. Pas de `TODO` sans contexte.

## 20. Documentation

**Existant** : `README.md` (lancement, Supabase), `docs/PRD.md`, `docs/design-system.md`, `CLAUDE.md`.

**Nouvelle règle**

- Un changement de design system met à jour `docs/design-system.md` dans le même commit.
- Un changement de comportement produit visible met à jour `docs/PRD.md` (statut de la fonctionnalité).
- `docs/TRD.md` n'existe pas encore. À créer quand une décision technique structurante est prise.

**Corrigé (18/10/2026)** : `docs/design-system.md` décrit la palette actuelle de `tokens.ts` (`#1B4A2E`, `#9DA94A`, ivoire). La source de vérité reste `tokens.ts`.

## 21. Git

**Existant**

- Une seule branche, `main`, suivie de `origin/main`.
- Tout push sur `main` déclenche le déploiement de production Vercel.

**Nouvelle règle**

- Avant chaque commit : `npm run build` sans erreur et vérification mobile en 375 x 812.
- Ne jamais commiter `.env.local`, `dist/`, `node_modules/`, `*.tsbuildinfo`.

**Écart** : `.gitignore` contient `tailwind.config.js` et `vite.config.js`, alors que `tailwind.config.js` est suivi par Git. Ses modifications restent suivies, mais la ligne est trompeuse.

## 22. Branches

**Existant** : travail direct sur `main`.

**Nouvelle règle**

- Petit changement validé : `main` reste autorisé (pratique actuelle).
- Changement risqué (migration destructive, refonte, paiement) : branche `feat/<sujet>` ou `fix/<sujet>`, aperçu Vercel, puis fusion dans `main`.

## 23. Commits

**Existant** (`git log --oneline -30`)

- Français, sans accents, première ligne descriptive : `Annulation de commande par le client et page des prix officiels DGCCRF`.
- Deux styles coexistent : nominal (`Connexion : logo pose sur une carte blanche`) et verbe au présent (`Ajoute les variantes de produits`).
- Corps en liste à tirets, puis ligne d'attribution.

**Nouvelle règle**

- Format : `Zone : changement` en français, moins de 72 caractères.
- Corps : liste à tirets du quoi et du pourquoi. Citer la migration si elle existe.
- Dernière ligne obligatoire :

```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## 24. Pull requests

**Existant** : aucune PR. Sans équivalent actuel.

**Nouvelle règle** (pour les branches de la section 22)

- Titre au format commit. Description : objectif, fichiers touchés, migration éventuelle, captures 375 x 812.
- Description terminée par la ligne d'attribution Claude Code demandée par l'outil.

## 25. Code review

**Existant** : revue ponctuelle (commit `ffb8cf0 Corrige les bugs releves par la revue de code des variantes`). `CLAUDE.md` impose de relire le diff avant de conclure.

**Nouvelle règle** : grille minimale.

- Textes en français, pas d'emoji, pas de faux chiffres.
- Couleurs via tokens, pas de hex en dur.
- `error` Supabase traité.
- Migration présente si la base change.
- Aucune clé secrète côté client.
- Rendu vérifié en 375 x 812.

## 26. Tests

**Existant** : aucun test, aucun lanceur de tests, aucun linter dans `package.json`. Scripts : `dev`, `build` (`tsc -b && vite build`), `preview`. Le contrôle actuel est le typage strict au build.

**Nouvelle règle**

- `npm run build` est le contrôle minimal obligatoire.
- Si des tests sont ajoutés : Vitest, fichiers `*.test.ts` à côté du code, en commençant par `lib/pricing.ts` et `lib/format.ts`. Ajout soumis à accord.

## 27. Variables d'environnement

**Existant**

- `.env.example` : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Valeurs locales dans `.env.local` (ignoré par `*.local`).
- `supabaseClient.ts` lève une erreur claire si une variable manque.
- `PEXELS_API_KEY` est lue par `api/pexels.ts` via `process.env`, configurée dans Vercel.

**Nouvelle règle**

- Préfixe `VITE_` uniquement pour une valeur publique. Tout ce qui est préfixé `VITE_` part dans le navigateur.
- Toute nouvelle variable est ajoutée à `.env.example`, sans valeur.

**Écart** : `PEXELS_API_KEY` n'est pas listée dans `.env.example`.

## 28. Secrets

**Existant** : la clé Pexels reste côté serveur, la fonction `api/pexels.ts` sert de proxy. Le client n'a que la clé anonyme Supabase, protégée par la RLS.

**Nouvelle règle**

- Clés secrètes (Pexels, clé `service_role` Supabase, futurs paiements) : côté serveur uniquement, dans les variables Vercel.
- Jamais de secret dans le code, les migrations, les commits ou les messages.

## 29. API (contrat et évolution)

**Existant** : contrat implicite de `/api/pexels` décrit dans son commentaire d'en-tête. Cache CDN `s-maxage=2592000, stale-while-revalidate`.

**Nouvelle règle**

- Avant de modifier une route ou une signature de contexte, chercher tous ses appelants (`grep usePexelsPhoto`, `grep useOrders`).
- Changement non rétrocompatible : ajouter un paramètre optionnel plutôt que changer le sens d'un paramètre existant.
- Le cache client (`pexels-cache:v4:`) est versionné : changer la version si le format de réponse change.

## 30. Migrations

**Existant**

- `supabase/schema.sql` puis `002_merchant_space.sql` à `019_custom_markets_details.sql`.
- Nom : `NNN_sujet_en_snake_case.sql`, numéro sur trois chiffres.
- En-tête en commentaire, sections numérotées (`-- 1. …`).
- Idempotence partielle : `add column if not exists`, `drop policy if exists` puis `create policy`, `create or replace function`.
- Exécution manuelle dans l'éditeur SQL Supabase.

**Nouvelle règle**

- Tout changement de base passe par une nouvelle migration `020_…`, jamais par une modification d'une migration déjà appliquée.
- Une migration doit pouvoir être rejouée sans erreur (`if exists`, `if not exists`).
- Le commit qui ajoute la migration dit si elle est appliquée en production.

**Écarts**

- `schema.sql` n'est pas numéroté `001`.
- Pas de suivi automatique des migrations appliquées (pas de CLI Supabase).
- `019_custom_markets_details.sql` code en dur l'URL du projet Supabase dans une contrainte `check`.
- `002_merchant_space.sql` insère des commerçants de démonstration avec des notes inventées (voir PRD).

## 31. Dépendances

**Existant** : 5 dépendances d'exécution (`@supabase/supabase-js`, `lucide-react`, `react`, `react-dom`, `react-router-dom`), 8 de développement. Versions en `^`. `package-lock.json` suivi.

**Nouvelle règle**

- Toute nouvelle dépendance est justifiée dans le commit. Préférer l'API native (le projet utilise déjà `IntersectionObserver`, Web Animations, `createImageBitmap`).
- Pas de bibliothèque UI complète, pas de bibliothèque d'animation.

## 32. Performance

**Existant**

- Images compressées avant envoi (`lib/compressImage.ts`, 1600 px, JPEG 0,85).
- Photos Pexels mises en cache 30 jours (`localStorage`) et côté CDN.
- Animations en CSS ou API natives, neutralisées par `prefers-reduced-motion`.
- Squelettes de chargement (`.skeleton`, `CardSkeleton`).

**Nouvelle règle**

- Pas de requête Supabase dans une boucle de rendu.
- Pages lourdes et rarement visitées (`AdminSpace`) : chargement différé (`React.lazy`) si le bundle grossit. Aucun `lazy` aujourd'hui.

## 33. Sécurité

**Existant**

- RLS sur toutes les tables, triggers de protection des colonnes de commande (`014_security_hardening.sql`).
- En-têtes HTTP stricts dans `vercel.json` : CSP, HSTS, `X-Frame-Options: DENY`, `Permissions-Policy`.
- Session Supabase en `localStorage` ou `sessionStorage` selon « Rester connecté », jamais le mot de passe.

**Nouvelle règle**

- Nouveau domaine externe (images, API) : l'ajouter à la CSP de `vercel.json` dans le même commit.
- Ne jamais faire confiance à une valeur envoyée par le navigateur pour un montant, un statut ou un rôle.

## 34. Accessibilité

**Existant**

- Anneau `focus-visible` sur les éléments interactifs, zone tactile d'au moins 40 px (`min-h-11` sur `Button`).
- `aria-label`, `aria-hidden` sur les icônes, `role="status"` et `role="alert"` (`CatalogState`, `OfflineBanner`).
- Contraste 4,5:1 exigé pour le texte blanc sur `brand` (`docs/design-system.md`).

**Nouvelle règle** : chaque bouton icône a un `aria-label` français. Chaque image porteuse de sens a un `alt`.

## 35. UI/UX

**Existant**

- Palette dans `src/theme/tokens.ts` : vert profond `#1B4A2E`, olive `#9DA94A`, ivoire `#FBF8EC`, jaune ivoire `#F1E8C9`.
- Polices : Quicksand (`font-display`, titres), Nunito (`font-sans`, texte).
- Couleurs consommées via Tailwind (`bg-brand`, `text-brand-dark`, `bg-accent`), jamais en dur.
- Thèmes d'enseigne par `marketThemes` et `MerchantThemeProvider`, limités à la vitrine.
- Tutoiement dans les textes (« Vérifie ta connexion, puis réessaie. »).
- Mobile d'abord, colonne `max-w-md`.

**Règles validées (Nouvelle règle formalisée)**

- Textes de l'interface en français.
- Pas d'emoji. Pas de dégradé violet. Pas de pilule décorative.
- Pas de faux avis, de fausses métriques, de faux comptes.
- Pour chaque prix saisi, indiquer s'il s'agit du plafond officiel DGCCRF ou du prix du magasin.
- Vérification en 375 x 812 avant tout commit.

**Écart** : `components/ui/BrandLogo.tsx` code en dur les couleurs du drapeau (`#009E60`, `#F2B705`, `#3A75C4`). Toléré pour le logo officiel ; ne pas reproduire ailleurs.

## 36. Gestion des états

**Existant**

- État global par React Context, imbriqué dans `App.tsx` (`PexelsProvider` > `MarketsProvider` > `CatalogProvider` > … > `OrdersProvider`).
- État local par `useState`. Pas de Redux, pas de React Query.
- Persistance légère par `lib/storage.ts` (`readSession`, `writeSession`, `readLocal`, `writeLocal`, préfixe `panier241:`).
- Chaque contexte expose `loading` et, si besoin, `error` et `refresh` (`CatalogContext`).

**Nouvelle règle**

- Pas de nouvelle bibliothèque d'état sans accord.
- Tout accès au stockage navigateur passe par `lib/storage.ts`.

## 37. Fichiers (envoi et stockage)

**Existant**

- Supabase Storage, buckets publics en lecture : `kiosk-photos`, `product-photos`, photos de profil, vidéos de liste de courses (003, 008, 010, 013).
- Compression avant envoi (`compressImage`), avatar recadré en carré 512 px (`lib/avatar.ts`).
- Limite de 5 Mo par image côté stockage.

**Nouvelle règle**

- Nouveau bucket : créé par migration, avec policies d'écriture limitées au propriétaire.
- Toujours compresser une image avant envoi. Chemin de fichier préfixé par l'identifiant du propriétaire.

## 38. Erreurs offline

**Existant**

- `OfflineBanner` écoute `online`/`offline` et affiche un bandeau.
- `CatalogState` propose « Réessayer ».
- Le panier est conservé en `sessionStorage` (`writeSession('cart-items', …)` dans `CartContext.tsx`).

**Nouvelle règle**

- Une action d'écriture hors ligne affiche un message clair et ne perd pas la saisie.
- Pas de file d'attente hors ligne ni de service worker sans accord.

## 39. Versioning

**Existant** : `package.json` en `0.1.0`, jamais incrémenté. Pas de tag Git. Le déploiement est continu sur `main`.

**Nouvelle règle**

- SemVer sur `package.json` au lancement public (`1.0.0`).
- Tag Git `vX.Y.Z` à chaque version annoncée aux utilisateurs.
- Le document `docs/PRD.md` garde son propre numéro de version.

---

## Règle critique pour les agents IA

Avant toute modification, dans cet ordre :

1. Lire `PROJECT_CONVENTIONS.md`.
2. Lire la section pertinente de `docs/PRD.md`.
3. Lire le TRD pertinent. `docs/TRD.md` n'existe pas encore : le signaler et s'appuyer sur ce document et sur `docs/design-system.md`.
4. Identifier les fichiers concernés (page, contexte, composant, migration).
5. Vérifier les conventions existantes dans ces fichiers.
6. Ne pas créer d'architecture parallèle (pas de `services/`, pas de serveur, pas de nouvelle bibliothèque d'état).
7. Réutiliser les composants (`components/ui/`) et les « services » (`context/`, `lib/`).
8. Ne pas dupliquer de code sans justification écrite.
9. Ne pas modifier une API, une signature de contexte ou une table sans vérifier toutes ses dépendances.
10. Ne pas supprimer une fonctionnalité sans autorisation explicite.

---

## RÈGLES ABSOLUES POUR CLAUDE CODE

**Interdit**

- Mettre un secret côté client ou dans un commit.
- Modifier une migration déjà appliquée.
- Changer la base sans nouvelle migration numérotée.
- Coder une couleur en dur hors `tokens.ts`.
- Ajouter emoji, dégradé violet, faux avis, fausse métrique, faux compte.
- Écrire un texte d'interface en anglais.
- Pousser sur `main` sans `npm run build` réussi.
- Ajouter une dépendance ou un dossier d'architecture sans accord.

**Obligatoire**

- Suivre les 10 étapes de la règle critique.
- Traiter chaque `error` Supabase avec un message français.
- Vérifier le rendu en 375 x 812 avant commit.
- Mettre à jour `types/index.ts` avec chaque colonne ajoutée.
- Mettre à jour la CSP pour tout nouveau domaine externe.
- Terminer chaque commit par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Relire le diff avant de conclure.
