# Audit initial — Le Panier 241

Date : 19/10/2026. Périmètre : dépôt `panier241/` (commit `b1647b5`) et projet Supabase de production `ukaauidavtmtjithahmn`.
Mode : **lecture seule**. Aucun code, aucune configuration, aucune donnée modifiés. Seuls fichiers créés : `docs/audit-2026-10/*.md`.
Aucune note globale chiffrée n'est donnée : les constats sont classés par gravité avec leur preuve.

Documents liés : [ARCHITECTURE_EXISTANTE](ARCHITECTURE_EXISTANTE.md) · [REGISTRE_RISQUES](REGISTRE_RISQUES.md) · [STRATEGIE_TESTS](STRATEGIE_TESTS.md) · [ROADMAP_TECHNIQUE](ROADMAP_TECHNIQUE.md) · [CHECKLIST_PROGRESSION](CHECKLIST_PROGRESSION.md)

---

## 0. Commandes et requêtes exécutées (preuves)

| # | Commande / requête | Résultat observé |
|---|---|---|
| C1 | `npm run build` (`tsc -b && vite build`) | Réussi (code 0). 2042 modules, `index-*.js` 692,69 kB (gzip 188,39 kB), avertissement « chunk > 500 kB ». |
| C2 | `npm ls --depth=0` | 13 dépendances directes (versions dans ARCHITECTURE_EXISTANTE §1). |
| C3 | `npm audit --json` | 12 vulnérabilités : 7 élevées, 5 modérées, 0 critique. Seule dépendance **d'exécution** touchée : `react-router` / `react-router-dom` 6.30.6 (modéré : redirection ouverte GHSA-wrjc-x8rr-h8h6 ; GHSA-337j-9hxr-rhxg concerne le SSR, non utilisé). Les autres (vite, esbuild, tailwindcss, braces, micromatch, chokidar, fast-glob, postcss-selector-parser, postcss-nested, source-map-js) sont des outils de développement/compilation. Correctifs proposés = versions majeures (vite 8, tailwind 4, react-router 7). |
| C4 | `git status --short`, `git log` | Non suivis avant audit : `.claude/settings.local.json`, 5 images à la racine (`Ceca_Gadis_Logo.png`, `Logo-Batiplu-R-18-V1.jpg`, `im.jpg`, `im2.webp`, `im3.webp`). |
| S1 | `list_migrations` | 12 migrations suivies (012 → 025). 002 à 011 absentes du suivi. |
| S2 | `pg_get_functiondef('public.is_admin')` | Admin = comparaison avec un e-mail en dur dans `auth.users`. |
| S3 | `pg_policies` (public + storage) | 57 policies relevées (détail §5). |
| S4 | `information_schema.role_table_grants` | `anon` a SELECT/INSERT/UPDATE/DELETE sur la plupart des tables (protégées par RLS) ; plus aucune écriture sur `orders` pour anon/authenticated. |
| S5 | Simulation `set local role anon` dans `begin … rollback` | anon lit 2 livreurs **avec leur téléphone**, 2 commerçants, 111 produits, 1 avis, 7 paramètres ; 0 commande, 0 profil. |
| S6 | Droits EXECUTE des fonctions `public` | RPC du moteur : authenticated seulement ; `is_admin` et `visible_categories` exécutables par anon. |
| S7 | Comptages (users, MFA, commandes, statuts, stockage) | 9 comptes, 0 MFA, 10 commandes, `payment_status` NULL sur les 10, 2 commandes orphelines. |
| S8 | `get_advisors security` | 2 WARN `anon_security_definer_function_executable`, 12 WARN `authenticated_security_definer_function_executable` (attendus pour les RPC), 1 WARN `auth_leaked_password_protection` désactivée. |
| S9 | `get_advisors performance` | 25 `auth_rls_initplan`, 50 `multiple_permissive_policies`, 9 clés étrangères non indexées, 11 index inutilisés (faible volume). |
| T1 | `supabase/tests/020_demo_data_isolation_tests.sql` exécuté dans `begin; … rollback;` (+ levée d'exception finale pour annuler à coup sûr) | **ÉCHEC** : les ~30 premières assertions passent, puis l'insertion de commandes de test est refusée : `null value in column "initial_subtotal" … violates not-null constraint` (le jeu de test date d'avant 022). |
| T2 | Contrôle après T1 | 0 compte `test02*`, 0 commerçant `Test02*`, 0 produit de test, 0 commande de test ; 9 commerçants, 146 produits ; kiosque démo toujours `suspended` : **rien n'est resté**. |
| W1-W4 | WebFetch/WebSearch documentation officielle | Voir §9 (Apple, Google Play, Gabon). |

Tests 022 et 023 : **lus, non exécutés**. La lecture montre des assertions devenues fausses après 024/025 (forfait 1500 F attendu l. 166-168 alors que `delivery_fallback_fee = 2000` ; « Bâti Plus (30) » attendu l. 130 alors que Bâti Plus a 87 produits). Ils échoueraient donc en l'état ; statut : *présent, non exécuté, périmé*.

---

## 1. Faits demandés : vérification

| Fait annoncé | Verdict | Preuve |
|---|---|---|
| App web React 18 + Vite + TS + Tailwind, pas React Native/Expo | **Vrai** | `package.json`, `npm ls` ; aucun `android/`, `ios/`, Expo, Capacitor |
| Supabase Auth email/mot de passe | **Vrai** | `src/context/AuthContext.tsx` (`signUp`, `signInWithPassword`) |
| Postgres + RLS, Storage | **Vrai** | RLS activée sur les 22 tables (S3), 4 buckets |
| Vercel `vercel.json` + `api/pexels.ts` | **Vrai** | fichiers présents |
| Migrations jusqu'à 025 appliquées les 18-19/10 | **Vrai pour 012-025** (horodatages 18/10 et 19/10) ; 002-011 hors suivi | S1 |
| 022 : create_order / set_order_status / adjust_order_amount / respond_to_adjustment / record_payment / list_available_deliveries / admin_orders | **Vrai**, + `record_payout` et `list_my_deliveries` (non mentionnées) | S6, `supabase/022_order_engine.sql` |
| Tests SQL dans `supabase/tests/` | **Présents** (020, 022, 023) ; aucun ne contient `begin`/`rollback` : l'appelant doit les envelopper | lecture des fichiers |
| Pas de lint ni de tests JS | **Vrai** | `package.json` : scripts `dev`, `build`, `preview` seulement |
| Aucun prestataire de paiement | **Vrai** | aucune dépendance ni appel ; `record_payment` (022) enregistre un encaissement hors ligne déclaratif |
| Pas d'OTP/SMS | **Vrai** | aucun appel `signInWithOtp`/phone ; `docs/SECURITY_REQUIREMENTS.md` R02 « Absent » |
| Pas de 2FA admin | **Vrai** | 0 ligne `auth.mfa_factors` (S7), aucun appel `mfa` dans `src/` |
| Pas de push | **Vrai** | aucun service worker ni manifeste |
| Pas de photo de preuve de départ/livraison | **Vrai** | `src/pages/CourierSpace.tsx` : aucun `input type=file` ; les uploads existent seulement pour commerçant, avatar, vidéo de liste (`Cart.tsx:380`) |
| Pas de mode hors ligne livreur | **Vrai** | seul `OfflineBanner.tsx` (bandeau `navigator.onLine`), pas de cache ni file d'attente |

---

## 2. Phase A — Cartographie

Voir [ARCHITECTURE_EXISTANTE.md](ARCHITECTURE_EXISTANTE.md). Points saillants :
- une SPA unique pour 4 rôles, tout le contenu derrière la connexion (`src/App.tsx`, `Gate`) ;
- moteur de commande et montants côté base (022) ; le front n'envoie que identifiants et quantités (`src/context/OrdersContext.tsx`, `placeOrder`) ;
- d'autres écritures restent directes depuis le navigateur sous RLS (produits, fiches commerçant/livreur, approbations admin `src/pages/AdminSpace.tsx:60-74`, catégories `src/components/admin/CategoryAdmin.tsx`).

## 3. Phase B — Technologies à conserver

| Brique | Version | Recommandation | Justification |
|---|---|---|---|
| React 18 + TypeScript strict | 18.3.1 / 5.9.3 | Conserver | build propre, `strict` activé |
| Vite | 5.4.21 | Conserver, montée de version planifiée | vulnérabilités du serveur de dev uniquement (C3) |
| Tailwind | 3.4.19 | Conserver | vulnérabilités de la chaîne de compilation, pas d'exécution |
| React Router | 6.30.6 | Conserver, corriger la vulnérabilité (C3) | seule dépendance d'exécution signalée |
| Supabase (Auth, Postgres, RLS, Storage, RPC) | supabase-js 2.116.0 | Conserver | moteur de commande serveur sérieux (022), tests SQL existants |
| Vercel (statique + 1 fonction) | — | Conserver | en-têtes de sécurité déjà posés |
| Types manuels | — | Remplacer par types générés | `OrderRow` déclare `payment_status` non nul alors que la base contient 10 NULL (S7) ; 8 `as unknown as` |

## 4. Phase C — Audit fonctionnel des parcours

Légende : Existe / Accessible / Contrôle serveur / Erreurs gérées / Testé.

### Client
| Parcours | Existe | Contrôle serveur | Erreurs | Testé | Constat |
|---|---|---|---|---|---|
| Inscription / connexion | oui (`Auth.tsx`) | Supabase Auth | messages traduits (`translateAuthError`) | non | pas d'OTP ; confirmation e-mail : réglage Auth non vérifiable par SQL (0 compte non confirmé) ; protection mots de passe compromis désactivée (S8) |
| Mot de passe oublié | oui (`ResetPassword.tsx`, route publique) | Supabase | — | non | — |
| Catalogue / recherche | oui | RLS produits (020) | `CatalogState` | 023 (périmé) | invisible sans compte dans l'UI, lisible par l'API anonyme |
| Panier → commande | oui (`Cart.tsx`) | `create_order` recalcule tout | `translateDbError` | 022 (périmé) | idempotence par `requestIdRef` (`Cart.tsx:157`) ; un seul commerçant par panier |
| Suivi / historique | oui (`Orders.tsx`) | RLS + `order_status_history` | oui | 022 | pas de temps réel (rechargement manuel `refresh`) |
| Annulation | oui | `set_order_status` (motif obligatoire) | oui | 022 | conforme à la matrice 022 |
| Réponse à ajustement | oui | `respond_to_adjustment` | oui | 022 | — |
| Avis | oui (`Orders.tsx:57`) | policy reviews (commande livrée/retirée) | — | 020 (échec avant cette partie) | `reviews` lisibles publiquement avec `user_id` |
| Litige | **non** côté UI | table `order_disputes` + policy | — | 022 | données prévues, aucun écran |
| Suppression de compte | **absent** | — | — | — | aucun écran ni fonction ; exigé par Apple 5.1.1(v) et Google Play (§9) |

### Commerçant
| Parcours | Existe | Contrôle serveur | Constat |
|---|---|---|---|
| Candidature (`BecomeMerchant.tsx`) | oui | trigger `force_pending_on_insert` (022) | bon |
| Produits (ajout/suppression) | oui | RLS `products` | `handleDeleteProduct` ignore l'erreur (`MerchantSpace.tsx:250`) — bouton silencieux en cas de refus |
| Statuts de commande | oui (`MerchantSpace.tsx:125`) | `set_order_status` | bon |
| Ajustement de montant | oui (`MerchantSpace.tsx:190`) | `adjust_order_amount` (+10 % auto, une seule fois) | bon |
| Encaissement acompte/retrait | oui (`MerchantSpace.tsx:156`) | `record_payment` | déclaratif, sans pièce |
| Rubriques / mises en avant | oui | RLS (023) | — |
| Suppression de son commerce | possible par API (policy DELETE `merchants`) | **aucune clé étrangère** depuis `orders.merchant_id` (text) → crée des commandes orphelines (2 existent déjà, S7) |

### Livreur
| Parcours | Existe | Contrôle serveur | Constat |
|---|---|---|---|
| Candidature | oui (`BecomeCourier.tsx`) | forcé `pending` | bon |
| Courses disponibles | oui | `list_available_deliveries` sans téléphone ni adresse | bon |
| Accepter / livrer | oui | `set_order_status` + `for update` (pas de double prise) | bon |
| Encaisser | oui (`CourierSpace.tsx:243`) | `record_payment` | moyen enregistré = `method ?? 'especes'` : peut différer du moyen réel ; aucune preuve |
| Photo de preuve, hors ligne, navigation | absents | — | — |
| **Exposition du téléphone** | — | policy `livreurs` SELECT `status = 'approved'` pour **tout rôle, y compris anon** | S5 : 2 numéros lisibles sans compte |

### Administrateur
| Parcours | Existe | Contrôle serveur | Constat |
|---|---|---|---|
| Accès `/admin` | oui | `is_admin()` (e-mail en dur) | pas de MFA, pas de rôle en table, pas de second admin possible sans migration |
| Approbations | oui (`AdminSpace.tsx:60-74`) | policies UPDATE admin | **aucun historique** des approbations/suspensions |
| Commandes | oui (`AdminOrders.tsx`) | `admin_orders`, `set_order_status` (motif) | bon |
| Reversements | **non** côté UI | `record_payout` existe | fonction non raccordée |
| Paramètres tarifaires | **non** côté UI | `app_settings` (policy admin) | modification seulement par SQL |
| Litiges | **non** côté UI | policy admin UPDATE | — |

### Éléments « Bientôt disponible » (pas des boutons morts)
`MarketCard.tsx:23`, `CategoryDetail.tsx:279`, `Home.tsx:49`, `MarketDetail.tsx:80`, `Search.tsx:209` : libellés affichés quand une catégorie/un lieu n'a pas de commerçant. Les moyens de paiement `pay-1/2/3` (`src/data/addresses.ts`) sont des libellés fixes, sans intégration.

## 5. Phase D — Commandes et paiements

| Exigence | État | Preuve |
|---|---|---|
| Source de vérité des montants | **Base** : `create_order` relit `products.price`, calcule commission, livraison (haversine ou forfait), acompte depuis `app_settings` | `022_order_engine.sql` l. 879-940 |
| Estimation front alignée | oui (2000 / 300 / forfait 2000 / 5 % / 100 000 / 5 %) | `src/lib/pricing.ts` vs `app_settings` (S7) |
| Idempotence | oui : index unique `(user_id, client_request_id)` + rattrapage `unique_violation` | 022 l. 225-227, 958-963 |
| Transitions | machine à états explicite, rôle par rôle, verrou `for update` | 022 l. 975-1139 |
| Écriture directe interdite | trigger `guard_order_direct_write` + `revoke insert, update, delete` | 022 l. 503-525, S4 |
| Historique | `order_status_history` append-only (trigger) | 022 l. 365-370 |
| Journal financier | `order_ledger` append-only, contre-passation à l'annulation | 022 l. 603-701 |
| Ajustement | une fois, +10 % auto, au-delà accord du client, bloque « prête » et livreurs | 022 l. 1177-1292 |
| Paiement réel | **aucun** : encaissement déclaratif par livreur/commerçant/admin | `record_payment` |
| Données héritées | 10 commandes antérieures à 022 : `payment_status` NULL, `payment_method` NULL | S7 |
| Fraude | pas de limite de commandes par compte/heure ; pas de vérification du téléphone ; pas de contrôle de stock (aucune colonne de stock dans `products`) ; le commerçant peut se commander à lui-même (non bloqué dans `create_order`) ; aucune preuve d'encaissement | lecture 022, colonnes `products` |
| Remboursement | ligne `reversement` « due » créée à l'annulation d'une commande encaissée, mais exécution manuelle (`record_payout` sans UI) | 022 l. 649-656 |

## 6. Phase E — Sécurité

### Constats prioritaires
1. **Téléphones des livreurs lisibles sans compte** — policy « Lecture des livreurs approuves, du proprietaire ou de l'admin » (`status = 'approved' OR …`, rôle `public`) ; simulation anon : 2 lignes avec téléphone (S5). Gravité : élevée (données personnelles de personnes réelles).
2. **Compte administrateur unique, identifié par e-mail codé en dur, sans MFA** — `is_admin()` (S2), `src/context/AuthContext.tsx:25`, 0 facteur MFA (S7). Compromission du mot de passe = contrôle total (statuts, montants via corrections, paramètres, approbations).
3. **Protection contre les mots de passe compromis désactivée** et longueur minimale 6 caractères (S8, `translateAuthError`).
4. **Vidéos de liste de courses dans un bucket public** (`shopping-videos` public=true, 50 Mo, `video/*`) : toute personne disposant de l'URL la lit ; l'URL contient l'identifiant de l'utilisateur.
5. **Proxy `/api/pexels` ouvert** : sans authentification ni limitation de débit (`api/pexels.ts`), consommable par des tiers (quota Pexels). Le message d'erreur renvoie `err.message`.
6. **Aucune limitation de débit applicative** sur `create_order`, `custom_markets` (proposition de marché), candidatures : seules les limites par défaut de Supabase s'appliquent (non vérifiées).
7. `is_admin()` et `visible_categories()` exécutables par anon (S8) : faible risque (renvoient un booléen / des catégories publiques), à documenter.
8. Absence d'historique d'administration (approbations, suspensions, paramètres) hors commandes.
9. Suppression d'un commerçant possible sans contrôle des commandes liées (policy DELETE + `orders.merchant_id` text sans FK).

### Points solides
- RLS active partout ; anon ne lit ni commandes, ni profils, ni adresses (S5).
- Moteur de commande : `security definer` + `search_path` figé, droits retirés à anon (S6).
- Faille « inscription directement approved » corrigée (trigger 022), note commerçant verrouillée.
- En-têtes HTTP : CSP stricte `script-src 'self'`, `frame-ancestors 'none'`, HSTS, XFO DENY, nosniff (`vercel.json`). `style-src 'unsafe-inline'` présent (attendu avec certaines bibliothèques).
- Jetons de session dans `localStorage`/`sessionStorage` (`supabaseClient.ts`) : choix standard de supabase-js, exposé en cas de XSS ; la CSP limite ce risque.
- Secrets : `.env.local` ignoré par Git ; seule la clé anon (publique par conception) est côté navigateur ; clé Pexels côté serveur.

## 7. Phase F — Données personnelles

| Donnée | Où | Finalité | Accès |
|---|---|---|---|
| Nom, prénom, téléphone, e-mail | `auth.users` metadata, `profiles` | compte | soi-même (policy profiles) |
| Adresses + GPS | `addresses`, `order_delivery_details` | livraison | soi ; commerçant ; livreur affecté pendant la course |
| Téléphone client par commande | `orders.client_phone` | contact livraison | client, commerçant, livreur en course |
| Vidéo de liste de courses | bucket public `shopping-videos` | préparation | toute personne ayant l'URL |
| Nom + téléphone livreur | `livreurs` | contact | **public (anon)** |
| Avis | `reviews` (avec `user_id`) | réputation | public |
| Avatar | bucket public `avatars` | profil | URL publique (la lecture par listing est limitée au propriétaire) |

- Pages légales présentes et publiques : `/confidentialite` (`Privacy.tsx`, « mis à jour le 4 octobre 2026 », **antérieure à 022** : ne mentionne ni le journal financier, ni l'historique conservé après suppression de compte, ni l'exposition publique du téléphone des livreurs), `/cgu` (`Terms.tsx`).
- `Privacy.tsx` affirme un hébergement Supabase « dans l'Union européenne » : **non vérifié** dans cet audit (région du projet non consultée).
- Suppression de compte : **absente**. Rétention : aucune règle ; `order_status_history` est volontairement sans clé étrangère pour « survivre à la suppression d'un compte » (022 l. 285).
- Juridictions : Gabon — loi n° 001/2011 du 25/09/2011 modifiée par la loi n° 025/2023 du 12/07/2023 ; l'autorité serait l'APDPVP (ex-CNPDCP). Sources trouvées : texte publié par l'AFAPDP (association des autorités francophones) et presse gabonaise ; **le site officiel de l'autorité ou du Journal officiel n'a pas été consulté** → à confirmer. RGPD : pertinent seulement si des personnes situées dans l'UE sont visées ou si l'exploitant est établi dans l'UE (à qualifier par un juriste). **Aucune conclusion de conformité n'est tirée.**

## 8. Phase G — Qualité et tests

| Élément | Statut |
|---|---|
| Compilation TypeScript + build | **Réussi** (C1) |
| Lint | **Absent** |
| Tests JS unitaires / E2E | **Absent** |
| Test SQL 020 | **Échoué** (T1 : fixture incompatible avec 022) |
| Test SQL 022 | **Présent, non exécuté** ; périmé par lecture (forfait 1500 F) |
| Test SQL 023 | **Présent, non exécuté** ; périmé par lecture (30 produits Bâti Plus attendus, 87 réels) |
| CI | **Absent** (aucun `.github/`) |
| Audit npm | 12 vulnérabilités (C3) |

Voir [STRATEGIE_TESTS.md](STRATEGIE_TESTS.md).

## 9. Phase H — Build, déploiement, stores (vérifié le 19/10/2026)

| Exigence | Source officielle | Situation Panier 241 |
|---|---|---|
| Apple 4.2 : l'app doit aller au-delà d'un « site web reconditionné » | https://developer.apple.com/app-store/review/guidelines/ (consulté le 19/10/2026 ; date de mise à jour non lue, page tronquée) | une simple coque WebView de la SPA risque un refus ; il faudrait des fonctions natives (notifications, caméra, hors ligne) |
| Apple 5.1.1(v) : suppression de compte dans l'app si création de compte | même URL | **manquant** |
| Google Play : cible API 36 (Android 16) pour nouvelles apps et mises à jour depuis le 31/08/2026 (extension possible au 01/11/2026) | https://developer.android.com/google/play/requirements/target-sdk | à respecter si empaquetage Android |
| Google Play : suppression de compte dans l'app **et** lien web + formulaire Data safety | https://support.google.com/googleplay/android-developer/answer/13327111 | **manquant** |
| Comptes développeur | Apple Developer Program, Google Play Console | **non vérifiable ici** : demandent l'action du propriétaire |

Options d'empaquetage (à évaluer, aucune imposée) : PWA (manifeste + service worker, sans store) ; TWA Android (exige PWA + Digital Asset Links) ; Capacitor (iOS + Android, accès natif). Prérequis communs : manifeste, icônes, suppression de compte, politique de confidentialité à jour, code-splitting du bundle de 692 kB.

Déploiement Vercel : non inspecté (aucun appel aux outils Vercel, consigne lecture seule) ; `vite.config.ts` cible `https://panier241.vercel.app` en proxy de dev.

## 10. Écarts entre la documentation et le code

| Document | Écart | Preuve |
|---|---|---|
| `docs/APP_FLOW.md` l. 32 | « forfait de 1 500 F … soit 3 500 F » ; réel : forfait total 2000 F | `app_settings` (S7), `pricing.ts` |
| `docs/PRD.md` l. 221 | « forfait 1 500 F sans GPS », calcul « Partielle » côté client | 022 + 024 : calcul serveur, 2000 F |
| `supabase/022_order_engine.sql` en-tête l. 17-18 | « forfait 1500 F » et « pricing.ts devra être aligné » | 024 et `pricing.ts` déjà alignés |
| `docs/audits/ORDER_ENGINE.md` l. 22 | « pricing.ts calcule encore 2000 + 1500 » | `pricing.ts` : `FALLBACK_DELIVERY_FEE = 2000` total |
| `supabase/tests/022_order_engine_tests.sql` l. 9 | « 114 tests, tous passés le 18/10 » ; l. 166 attend 1500 F | 024 |
| `supabase/tests/023_*.sql` l. 130 | attend 30 produits Bâti Plus | 87 après 025 |
| `supabase/tests/020_*.sql` | fixture commandes sans `initial_subtotal` | T1 |
| `docs/DEV_PLAN.md`, `docs/SECURITY_REQUIREMENTS.md` | rédigés le 18/10 (avant 022-025) : à relire pour les cases déjà fermées (écritures directes `orders`, inscription approved) | `git log -1` |
| `src/pages/Privacy.tsx` | daté du 4/10, ne décrit pas les données 022 ni l'exposition du téléphone livreur | §7 |
| `README.md` | daté du 08/09 | `git log` |
| `CLAUDE.md` | règles de délégation à des sous-agents, sans lien avec le produit | lecture |

## 11. Synthèse de maturité

Prototype avancé / pré-lancement : le **cœur transactionnel est côté serveur et bien protégé** (montants, transitions, idempotence, journal), mais l'application n'est pas prête pour une ouverture large ni pour les stores : exposition publique de téléphones de livreurs, administration unique sans MFA, aucune suppression de compte, aucun paiement réel ni preuve d'encaissement, tests SQL périmés et aucun test automatisé côté front, aucune supervision.

## 12. Cinq anomalies prioritaires

1. Téléphones des livreurs lisibles par l'anonyme — policy SELECT `livreurs` (S5).
2. Admin unique par e-mail en dur sans MFA, protection mots de passe compromis désactivée — `is_admin()`, `AuthContext.tsx:25`, advisors.
3. Suppression de compte absente (bloquant stores) — aucun écran ni fonction ; `Privacy.tsx` obsolète.
4. Tests SQL 020/022/023 en échec ou périmés : plus aucun filet de non-régression fiable sur le moteur de commande — `supabase/tests/*`.
5. Vidéos de liste de courses en bucket public + `/api/pexels` sans limitation — `storage.buckets`, `api/pexels.ts`.

## 13. Limites de l'audit

- Réglages Supabase Auth (confirmation e-mail, durée des jetons, limites de débit, SMTP), région du projet, sauvegardes/PITR : non consultables par SQL, **non vérifiés**.
- Projet Vercel (variables, domaines, journaux, protection) : non inspecté.
- Parcours UI non exécutés dans un navigateur (pas de serveur lancé) : l'audit fonctionnel est fait par lecture du code et de la base.
- Tests 022 et 023 non exécutés (périmés par lecture).
- Sources juridiques gabonaises non officielles au sens strict (AFAPDP, presse).
