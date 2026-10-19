# Checklist de progression — Le Panier 241

Date : 19/10/2026. Statuts : VERIFIE, PARTIEL, MANQUANT, BLOQUANT, NON VERIFIE, HORS PERIMETRE.
VERIFIE seulement avec une preuve observée (commande exécutée, requête ou lecture précise). Références S/C/T : [AUDIT_INITIAL.md](AUDIT_INITIAL.md) §0. Unités U : [ROADMAP_TECHNIQUE.md](ROADMAP_TECHNIQUE.md).

Les 24 phases du cycle couvertes : 1 cadrage, 2 architecture, 3 données, 4 authentification, 5 rôles, 6 catalogue, 7 commandes, 8 paiements, 9 livraison, 10 administration, 11 sécurité, 12 données personnelles, 13 qualité du code, 14 tests, 15 build, 16 déploiement, 17 environnements/sauvegardes, 18 performance, 19 accessibilité/UX, 20 documentation, 21 empaquetage mobile, 22 publication stores, 23 surveillance, 24 maintenance.

| ID | Étape | Critère vérifiable | Statut | Preuve | Test de validation | Blocage / action suivante |
|---|---|---|---|---|---|---|
| P01-1 | Cadrage | PRD et décisions D1-D5 consignées | VERIFIE | `docs/PRD.md`, `docs/audits/ORDER_ENGINE.md` | lecture | mettre à jour les montants obsolètes (U19) |
| P02-1 | Architecture | Nature de l'app identifiée (SPA web, pas RN/Expo) | VERIFIE | `package.json`, `npm ls` (C2), absence `android/ios` | `npm ls --depth=0` | — |
| P02-2 | Architecture | Points d'entrée et flux cartographiés | VERIFIE | ARCHITECTURE_EXISTANTE §2-4 | lecture `App.tsx`, `vercel.json`, `api/pexels.ts` | — |
| P02-3 | Architecture | Catalogue consultable sans compte (cohérence UI/API) | PARTIEL | `App.tsx` `Gate` vs S5 (API anon lit 111 produits) | — | DÉCISION : catalogue public ou non |
| P03-1 | Données | RLS active sur toutes les tables `public` | VERIFIE | requête `pg_class.relrowsecurity` : 22/22 | même requête | — |
| P03-2 | Données | Migrations toutes suivies | PARTIEL | `list_migrations` : 012-025 seulement (S1) | rejouer sur branche | U05 |
| P03-3 | Données | Intégrité commande ↔ commerçant | MANQUANT | `orders.merchant_id` text sans FK ; 2 orphelines (S7) | requête orphelines = 0 | U15 |
| P03-4 | Données | Types TS alignés sur le schéma | PARTIEL | `OrderRow` manuel ; `payment_status` NULL ×10 (S7) | `supabase gen types` + `tsc` | U24 |
| P04-1 | Auth | Inscription/connexion e-mail + mot de passe | VERIFIE | `AuthContext.tsx` `signUp`/`signInWithPassword` | parcours manuel | — |
| P04-2 | Auth | Protection mots de passe compromis | MANQUANT | advisor `auth_leaked_password_protection` (S8) | advisor absent | U02 |
| P04-3 | Auth | OTP / vérification du téléphone | MANQUANT | aucun appel OTP ; SECURITY_REQUIREMENTS R02 | — | DÉCISION, U13 |
| P04-4 | Auth | Confirmation e-mail et réglages Auth | NON VERIFIE | non lisible par SQL ; 0 compte non confirmé (S7) | tableau de bord Supabase | propriétaire |
| P05-1 | Rôles | Admin non codé en dur | BLOQUANT | `is_admin()` e-mail en dur (S2) ; `AuthContext.tsx:25` | tests SQL admin après U12 | U12 |
| P05-2 | Rôles | MFA administrateur | BLOQUANT | 0 facteur MFA (S7) | connexion admin sans 2e facteur refusée | U03 |
| P05-3 | Rôles | Commerçant/livreur forcés « pending » à l'inscription | VERIFIE | trigger `force_pending_on_insert` (S triggers) ; 022 l. 27-56 | test 022 §0 : réussi 19/10/2026 (U04) | — |
| P05-4 | Rôles | Livreur ne prend pas sa propre commande | VERIFIE | `set_order_status` l. 1088, `list_available_deliveries` l. 1474-1475 | test 022 : réussi 19/10/2026 (U04) | — |
| P06-1 | Catalogue | Démo invisibles du public | VERIFIE | `supabase/tests/020_*` exécuté 19/10/2026 : 25 positifs + 15 négatifs = 40, tous passés (U04) | test 020 | — |
| P06-2 | Catalogue | Taxonomie contrôlée en base | VERIFIE | triggers `validate_product_category`, `guard_category_tree` ; `supabase/tests/023_*` exécuté 19/10/2026 : 46 positifs + 31 négatifs = 77, tous passés (U04, comptes Bâti Plus/CECADO lus en base) | test 023 | — |
| P06-3 | Catalogue | Gestion de stock | MANQUANT | aucune colonne stock dans `products` | — | DÉCISION |
| P07-1 | Commandes | Montants calculés par la base | VERIFIE | `create_order` 022 l. 879-940 ; front n'envoie que id/quantité (`OrdersContext.tsx`) | test 022 : réussi 19/10/2026 (U04) | — |
| P07-2 | Commandes | Idempotence de création | VERIFIE | index `orders_client_request_unique` + `unique_violation` (022 l. 227, 958) ; `Cart.tsx:157` | test 022 « Idempotence » | — |
| P07-3 | Commandes | Aucune écriture directe sur `orders` | VERIFIE | grants authenticated/anon = SELECT seulement (S4) ; trigger `guard_order_direct_write` | requête grants | — |
| P07-4 | Commandes | Historique et journal append-only | VERIFIE | triggers `*_append_only` (S triggers) | test 022 append-only | — |
| P07-5 | Commandes | Tests du moteur à jour et réussis | VERIFIE | `supabase/tests/022_*` exécuté 19/10/2026 : 46 positifs + 69 négatifs = 115, tous passés ; barème lu dans `app_settings` (forfait sans GPS 2 000 F, 024) | test 022 | rejouer sur branche quand U05 sera fait |
| P07-6 | Commandes | Limite anti-commandes en masse | MANQUANT | aucun plafond dans `create_order` | test négatif | U13 |
| P08-1 | Paiements | Prestataire intégré | MANQUANT | aucune dépendance ni appel | — | DÉCISION, U17 |
| P08-2 | Paiements | Encaissement hors ligne tracé | VERIFIE | `record_payment` + ligne `order_ledger` (022 l. 1295-1393) | test 022 encaissement | — |
| P08-3 | Paiements | Preuve / rapprochement des encaissements | MANQUANT | déclaratif ; `CourierSpace.tsx` `method ?? 'especes'` | écran admin | U14 |
| P08-4 | Paiements | Reversements et remboursements exécutables depuis l'UI | MANQUANT | `record_payout` non appelé dans `src/` | E2E admin | U14 |
| P09-1 | Livraison | Adresse/téléphone masqués hors course | VERIFIE | policies `order_delivery_details`, `orders` « sa course en cours » (S3) | test 022 visibilité | — |
| P09-2 | Livraison | Photo de preuve, hors ligne livreur | MANQUANT | aucun `input file` dans `CourierSpace.tsx` ; `OfflineBanner` seul | — | U27 |
| P10-1 | Administration | Commandes, corrections avec motif | VERIFIE | `admin_orders`, `set_order_status` motif obligatoire (022 l. 1094-1097) | test 022 admin | — |
| P10-2 | Administration | Journal des actions admin (approbations, paramètres) | MANQUANT | `AdminSpace.tsx:60-74` UPDATE direct sans trace | ligne d'audit créée | U23 |
| P10-3 | Administration | Litiges traitables | MANQUANT | table `order_disputes`, aucun écran | — | à planifier |
| P11-1 | Sécurité | Aucune donnée personnelle lisible par anon | PARTIEL | 19/10/2026 : migration 026 appliquée ; anon lit 0 livreur (avant : 2) ; tests `supabase/tests/026_*` 4/4 réussis avant et après application. Reste : avis publics avec `user_id` (R20) | requête S5 = 0 livreur ; R20 à traiter | R20 (vue publique des avis sans user_id, sur décision) |
| P11-2 | Sécurité | Secrets hors dépôt | VERIFIE | `.gitignore` `*.local` ; `git ls-files` : seul `.env.example` | `git check-ignore .env.local` | — |
| P11-3 | Sécurité | En-têtes HTTP / CSP | VERIFIE | `vercel.json` (lecture) | `curl -I` sur le site déployé (non fait) | vérifier en production |
| P11-4 | Sécurité | Buckets sensibles privés | MANQUANT | `shopping-videos` public (storage.buckets) | URL publique refusée | U10 |
| P11-5 | Sécurité | Limitation de débit (`/api/pexels`, RPC) | MANQUANT | `api/pexels.ts` sans limite | appel hors origine refusé | U11, U13 |
| P11-6 | Sécurité | Dépendances sans vulnérabilité d'exécution | PARTIEL | `npm audit` : react-router modéré ; 11 autres outils (C3) | `npm audit` | U16 |
| P11-7 | Sécurité | Advisors sécurité traités | PARTIEL | S8 : 1 WARN Auth, 2 WARN anon definer | `get_advisors` | U02 |
| P12-1 | Données perso | Pages légales publiques | VERIFIE | routes `/confidentialite`, `/cgu` hors `Gate` (`App.tsx`) | ouverture sans compte | — |
| P12-2 | Données perso | Politique de confidentialité à jour | PARTIEL | `Privacy.tsx` daté 4/10, antérieur à 022 | relecture | U09 |
| P12-3 | Données perso | Suppression de compte | BLOQUANT | aucun écran ni fonction (`grep`) | test SQL U08 | U08 |
| P12-4 | Données perso | Règles de rétention | MANQUANT | aucune ; historique sans FK (022 l. 285) | — | DÉCISION |
| P12-5 | Données perso | Qualification Gabon / RGPD | NON VERIFIE | sources non officielles (AFAPDP, presse) | consultation JO / APDPVP | hors technique |
| P13-1 | Qualité code | TypeScript strict | VERIFIE | `tsconfig.json` `strict: true` ; 1 `any` (`api/pexels.ts`) | `tsc -b` | — |
| P13-2 | Qualité code | Lint configuré | MANQUANT | aucun script `lint` | `npm run lint` | U25 |
| P14-1 | Tests | Test SQL 020 réussi | VERIFIE | `supabase/tests/020_*` exécuté 19/10/2026 : 25 positifs + 15 négatifs = 40, tous passés ; commandes support posées avec `initial_subtotal`, insert direct API vérifié refusé | test 020 | — |
| P14-2 | Tests | Test SQL 023 réussi | VERIFIE | `supabase/tests/023_*` exécuté 19/10/2026 : 46 positifs + 31 négatifs = 77, tous passés | test 023 | rejouer sur branche quand U05 sera fait |
| P14-3 | Tests | Tests JS unitaires / E2E | MANQUANT | `package.json` | `npm test` | U25 |
| P15-1 | Builds | Build de production | VERIFIE | C1 : `npm run build` code 0 | même commande | — |
| P15-2 | Builds | Taille du bundle < 500 kB par chunk | MANQUANT | C1 : 692,69 kB | build | U21 |
| P16-1 | Déploiement | Projet Vercel, variables, domaine | NON VERIFIE | non inspecté (lecture seule) | tableau de bord Vercel | propriétaire |
| P16-2 | Déploiement | CI (build + tests à chaque PR) | MANQUANT | pas de `.github/` | pipeline vert | U25 |
| P17-1 | Environnements | Environnement de test séparé de la prod | MANQUANT | tests documentés « sur la base » ; aucune branche | branche Supabase | U05 |
| P17-2 | Environnements | Sauvegarde + restauration testée | NON VERIFIE | PITR non consultable ; DEV_PLAN l. 116 | restauration sur branche | U07 |
| P18-1 | Performance | Index et policies optimisés | PARTIEL | S9 : 25 initplan, 9 FK non indexées | advisors | après lot 1 |
| P19-1 | Accessibilité/UX | Revue d'accessibilité | NON VERIFIE | non exécutée (pas de navigateur lancé) | audit Lighthouse/axe | à planifier |
| P20-1 | Documentation | Docs alignées sur 022-025 | PARTIEL | AUDIT §10 (forfait 1500 F, tests « 114 passés ») | relecture | U19 |
| P21-1 | Empaquetage | PWA (manifeste, service worker) | MANQUANT | `public/` sans manifeste | Lighthouse installable | U20 |
| P21-2 | Empaquetage | Choix TWA / Capacitor | MANQUANT | rien dans le dépôt | build signé | DÉCISION, U26 |
| P22-1 | Publication | Exigences Apple/Google identifiées avec URL | VERIFIE | AUDIT §9 (WebFetch 19/10/2026) | revérifier à la soumission | — |
| P22-2 | Publication | Comptes Apple Developer / Play Console | HORS PERIMETRE | action du propriétaire | — | propriétaire |
| P22-3 | Publication | Conformité 5.1.1(v) / suppression Google Play | BLOQUANT | voir P12-3 | — | U08, U09 |
| P23-1 | Surveillance | Suivi d'erreurs et alertes | MANQUANT | aucune dépendance ; `console.error` (`OrdersContext.tsx:67`) | erreur visible dans l'outil | U18 |
| P23-2 | Surveillance | Advisors exécutés régulièrement | PARTIEL | exécutés manuellement le 19/10 (S8, S9) | planification | U25 |
| P24-1 | Maintenance | Procédure de mise à jour des dépendances | MANQUANT | correctifs = majeures (C3) | `npm audit` après mise à jour | U16 |
| P24-2 | Maintenance | Dépôt propre (fichiers non suivis) | PARTIEL | C4 : 5 images + `.claude/settings.local.json` non suivis | `git status` | propriétaire : ranger ou ignorer |

## Décompte final par statut

| Statut | Nombre |
|---|---|
| VERIFIE | 25 |
| PARTIEL | 11 |
| MANQUANT | 23 |
| BLOQUANT | 4 |
| NON VERIFIE | 5 |
| HORS PERIMETRE | 1 |
| **Total** | **69** |

Décompte recalculé mécaniquement sur la colonne Statut (`grep` + `awk`, 19/10/2026).
