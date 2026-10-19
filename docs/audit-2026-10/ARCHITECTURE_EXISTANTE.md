# Architecture existante — Le Panier 241

Audit en lecture seule du 19/10/2026. Toutes les affirmations renvoient à un fichier, une commande ou une requête SQL en lecture (SELECT) sur le projet Supabase `ukaauidavtmtjithahmn`.

## 1. Nature de l'application (fait vérifié)

- **Application web monopage**, pas une application mobile native. `package.json` : React 18.3.1, React Router 6.30.6, Vite 5.4.21, TypeScript 5.9.3, Tailwind 3.4.19, `@supabase/supabase-js` 2.116.0, `lucide-react` (vérifié par `npm ls --depth=0`).
- **Aucune trace de React Native, Expo, Capacitor, Cordova ni TWA** : aucune dépendance de ce type dans `package.json`, aucun dossier `android/` ou `ios/`.
- **Pas une PWA** : `public/` ne contient que `apple-touch-icon.png`, `basket-icon.svg`, `favicon.png`, `logos/` ; aucun `manifest.webmanifest` ni service worker (`grep serviceWorker|manifest` sans résultat dans `src/`, `index.html`, `public/`). `index.html` déclare seulement `theme-color` et `apple-touch-icon`.
- Une seule application pour les quatre rôles (client, commerçant, livreur, administrateur) : les espaces sont des routes du même bundle (`src/App.tsx`).
- Bundle de production : un seul fichier JS de 692,69 kB (188,39 kB gzip), avertissement Vite « chunks > 500 kB » (`npm run build`, sortie observée).

## 2. Points d'entrée

| Point d'entrée | Fichier | Rôle |
|---|---|---|
| Page HTML | `index.html` | charge `/src/main.tsx`, polices Google Fonts |
| Application React | `src/main.tsx` → `src/App.tsx` | `AuthProvider` → `BrowserRouter` → `Gate` |
| Fonction serverless | `api/pexels.ts` | proxy GET vers l'API Pexels (clé `PEXELS_API_KEY` côté serveur) |
| Configuration d'hébergement | `vercel.json` | réécriture SPA vers `index.html`, en-têtes CSP/HSTS/XFO… |
| Base de données | `supabase/*.sql` (002 à 025) + `schema.sql` | schéma, RLS, fonctions RPC |
| Proxy local | `vite.config.ts` | `/api` relayé vers `https://panier241.vercel.app` en développement |

### Routage (`src/App.tsx`)

- Hors connexion : `/confidentialite`, `/cgu`, `/nouveau-mot-de-passe` ; toute autre URL affiche `AuthPage` si pas de session.
- Connecté (`AuthenticatedApp`) : `/`, `/recherche`, `/prix-officiels`, `/marche/:marketId`, `/categorie/:categoryId`, `/marchand/:merchantId`, `/creneau`, `/panier`, `/commandes`, `/profil`, `/devenir-marchand`, `/marchand-espace`, `/devenir-livreur`, `/livreur-espace`, `/admin`, `/aide`, `/contact`.
- Conséquence : **le catalogue n'est pas consultable sans compte dans l'interface**, alors que la base l'expose à l'anonyme (voir §5).
- Aucune route « 404 » dédiée dans l'espace connecté.

## 3. Rôles

| Rôle | Comment il est déterminé | Preuve |
|---|---|---|
| Client | tout utilisateur connecté | `src/App.tsx` (`Gate`) |
| Commerçant | ligne `merchants` dont `owner_id = auth.uid()` ; `status` `pending/approved/suspended` | policies `merchants`, `set_order_status` (022) |
| Livreur | ligne `livreurs` dont `owner_id = auth.uid()` et `status = 'approved'` | `list_available_deliveries` (022) |
| Administrateur | **adresse e-mail codée en dur** | `public.is_admin()` : `select exists (select 1 from auth.users where id = auth.uid() and lower(email) = '<email du propriétaire>')` (requête `pg_get_functiondef`) ; même e-mail en dur côté client : `src/context/AuthContext.tsx:25` (`ADMIN_EMAIL`, `isAdminEmail`) |

Un même compte peut cumuler client + commerçant + livreur (les fonctions interdisent seulement au livreur de prendre sa propre commande ou celle de son commerce : `set_order_status`, `list_available_deliveries`).

## 4. Flux principaux

```
Navigateur (SPA React)
 ├─ supabase-js (clé anon publique, VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 │    ├─ Auth : email + mot de passe (signUp / signInWithPassword) — src/context/AuthContext.tsx
 │    ├─ PostgREST : lectures directes (catalogue, commandes, historique) + écritures directes
 │    │    sur merchants, products, livreurs, profiles, addresses, favorites, reviews,
 │    │    custom_markets, categories, storefront_categories, merchant_sections…
 │    ├─ RPC moteur de commande (022) : create_order, set_order_status, adjust_order_amount,
 │    │    respond_to_adjustment, record_payment, list_available_deliveries, list_my_deliveries,
 │    │    admin_orders  (record_payout existe mais n'est appelé nulle part dans src/)
 │    └─ Storage : buckets publics avatars, kiosk-photos, product-photos, shopping-videos
 ├─ GET /api/pexels?query=… → fonction Vercel → api.pexels.com (photos d'illustration)
 ├─ Liens https://wa.me/<numéro> (src/lib/whatsapp.ts) : Cart, Contact, MerchantDetail, Orders
 └─ Google Fonts (index.html)
```

Appels RPC observés dans le code (`grep rpc(`) : `create_order`, `set_order_status` (×5 : client, commerçant, livreur, admin), `respond_to_adjustment`, `adjust_order_amount`, `record_payment` (commerçant, livreur), `list_available_deliveries`, `list_my_deliveries`, `admin_orders`.

### Stockage côté navigateur

- Session Supabase (jetons d'accès et de rafraîchissement) dans `localStorage` si « Rester connecté », sinon `sessionStorage` (`src/lib/supabaseClient.ts`, `sessionStore`).
- Panier, créneau, adresse et moyen de paiement choisis : `sessionStorage` préfixe `panier241:` (`src/lib/storage.ts`, `src/context/CartContext.tsx`). `signOut` efface `cart-items`, `cart-slot`, `cart-address` mais **pas `cart-payment`** (`src/context/AuthContext.tsx`, `signOut`) — sans gravité.
- Statuts de commande « vus » : `localStorage` `notif-seen:<user id>` (`src/context/OrdersContext.tsx`).

## 5. Base de données (état réel en production, requêtes SELECT du 19/10/2026)

### Tables `public` (toutes avec RLS activée, aucune en FORCE RLS)

addresses, app_settings, categories, category_attributes, custom_markets, favorites, livreurs, market_locations, merchant_section_products, merchant_sections, merchants, official_prices, order_amount_adjustments, order_delivery_details, order_disputes, order_ledger, order_status_history, orders, products, profiles, reviews, storefront_categories (22 tables).

### Volumétrie (comptages, aucune donnée personnelle lue)

| Élément | Valeur |
|---|---|
| Comptes `auth.users` | 9 (0 non confirmé) |
| Facteurs MFA | 0 (y compris pour le compte administrateur) |
| Commerçants | 2 approuvés réels (Bâti Plus Gabon : 87 produits, CECADO : 24) + 7 démo suspendus |
| Livreurs | 2 approuvés |
| Commandes | 10 (4 en préparation, 1 prête, 1 en livraison, 2 livrées, 2 annulées), toutes `payment_status` NULL (antérieures à 022) ; 2 commandes orphelines (commerçant inexistant) |
| Produits | 146 (aucun prix ≤ 0) |
| Journal financier / historique | 32 / 10 lignes ; 0 litige |
| Prix officiels | 60 lignes, relevé le plus récent 18/10/2026 |
| Fichiers Storage | product-photos 2, shopping-videos 1, avatars 1, kiosk-photos 6 |
| `app_settings` | delivery_base_fee 2000, delivery_rate_per_km 300, delivery_fallback_fee 2000, service_fee_rate 0.05, deposit_threshold 100000, deposit_rate 0.05, adjustment_auto_max_rate 0.10 |

### Migrations

- Fichiers `supabase/002…025` + `schema.sql` (001 implicite). `list_migrations` ne connaît que 12 migrations suivies (de `product_variants`/012 à `025_batiplus_prix_factures`) : **002 à 011 ont été appliquées hors du suivi des migrations**. 020 apparaît après 021 dans l'historique (horodatages 20261018133745 vs 20261018131318).
- 022 appliquée le 18/10 à 23:32, 023 le 18/10 à 23:34, 024 et 025 le 19/10 (horodatages `list_migrations`).
- Clés étrangères : `orders.merchant_id` est un `text` sans clé étrangère vers `merchants.id` (uuid) ; les jointures font `m.id::text = o.merchant_id` (022).

### Buckets Storage (`storage.buckets`)

| Bucket | Public | Taille max | Types |
|---|---|---|---|
| avatars | oui | 2 Mo | jpeg, png, webp |
| kiosk-photos | oui | 5 Mo | jpeg, png, webp, heic, heif |
| product-photos | oui | 5 Mo | idem |
| shopping-videos | **oui** | 50 Mo | `video/*` |

Écriture limitée au dossier `<uid>/` (policies `storage.objects` INSERT) ; pas de policy UPDATE/DELETE pour kiosk/product/shopping (fichiers non supprimables par l'utilisateur).

## 6. Hébergement et variables d'environnement (noms seulement)

- Front : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (présents dans `.env.example` et `.env.local` ; `.env.local` ignoré par `.gitignore` via `*.local`, seul `.env.example` est suivi par Git).
- Serveur Vercel : `PEXELS_API_KEY` (`api/pexels.ts`), non présent dans les fichiers locaux.
- URL du projet Supabase écrite en dur dans `create_order` (contrôle du lien vidéo, 022 l. 853).
- Fichier `.claude/settings.local.json` non suivi : non lu (consigne).

## 7. Services externes

| Service | Usage | Données envoyées |
|---|---|---|
| Supabase | Auth, Postgres, Storage | toutes les données du service |
| Vercel | hébergement statique + `api/pexels.ts` | requêtes HTTP |
| Pexels | photos d'illustration via proxy | mot-clé de recherche uniquement |
| Google Fonts | polices (CSS + fichiers) | adresse IP du visiteur (chargement direct depuis `index.html`) |
| WhatsApp | liens `wa.me` sortants | numéro + message pré-rempli, à l'initiative de l'utilisateur |

Aucun prestataire de paiement, d'SMS, d'e-mail transactionnel, de notification push, de cartographie ou de supervision (Sentry, etc.) n'est intégré (`package.json`, `grep` dans `src/`).

## 8. Qualité TypeScript

- `tsconfig.json` : `strict: true`, `noUnusedLocals`, `noUnusedParameters`. `tsc -b` passe (build observé).
- `any` explicite : 1 occurrence (`api/pexels.ts`, `handler(req: any, res: any)`).
- `as unknown as` : 8 occurrences (conversions de lignes Supabase, ex. `src/context/OrdersContext.tsx` `data as unknown as OrderRow[]`).
- Aucun type généré depuis le schéma (`supabase gen types` absent) : `OrderRow` (`src/lib/orderEngine.ts`) est écrit à la main ; `payment_status` y est typé non nul alors que les 10 commandes réelles ont `payment_status` NULL.
- Pas d'ESLint ni de Prettier configurés (aucun script `lint` dans `package.json`), alors qu'un commentaire `eslint-disable-next-line` subsiste (`OrdersContext.tsx`).
