# Stratégie de tests — Le Panier 241

Date : 19/10/2026. Statuts autorisés : absent / présent non exécuté / réussi / échoué / bloqué / insuffisant.

## 1. État actuel (observé)

| Niveau | Outil | Statut | Preuve |
|---|---|---|---|
| Typage + build | `tsc -b && vite build` | **réussi** | `npm run build`, code 0, le 19/10/2026 |
| Lint | — | **absent** | aucun script `lint`, aucune config ESLint |
| Tests unitaires JS (`pricing.ts`, `orderEngine.ts`, `whatsapp.ts`) | — | **absent** | aucun runner dans `package.json` |
| Tests de composants / E2E (Playwright…) | — | **absent** | — |
| SQL 020 isolement démo | `supabase/tests/020_demo_data_isolation_tests.sql` | **réussi** | U04, 19/10/2026 : 25 positifs + 15 négatifs = 40 ; commandes support avec `initial_subtotal`, insert direct API vérifié refusé (022) |
| SQL 022 moteur de commande | `supabase/tests/022_order_engine_tests.sql` | **réussi** | U04, 19/10/2026 : 46 positifs + 69 négatifs = 115 ; barème lu dans `app_settings` (forfait sans GPS 2000 F, 024) |
| SQL 023 taxonomie | `supabase/tests/023_catalog_taxonomy_tests.sql` | **réussi** | U04, 19/10/2026 : 46 positifs + 31 négatifs = 77 ; comptes Bâti Plus (87, 025) / CECADO / matériaux lus en base |
| SQL 026 lecture livreurs | `supabase/tests/026_livreurs_lecture_restreinte_tests.sql` | **réussi** | 19/10/2026 : 4 scénarios (anon, tiers, livreur, admin) |
| Advisors Supabase | `get_advisors` | **insuffisant** (non automatisé) | exécuté manuellement le 19/10 |
| CI | — | **absent** | pas de `.github/workflows` |
| Tests de charge / sécurité dynamique | — | **absent** | — |

Remarque de méthode : depuis U04 (19/10/2026), chaque fichier de test SQL porte lui-même `begin;` en tête et `rollback;` en fin. Ils écrivent dans `auth.users` et `public.*` (annulé par le rollback) et le 022 crée/supprime temporairement une policy et un GRANT sur `orders` : **ne jamais retirer le `rollback`, ni les lancer sur la production sans nécessité**. Les exécutions U04 ont eu lieu sur la production (aucune branche, U05) : comptes de `orders`, `products`, `merchants`, `reviews`, `favorites`, `livreurs`, `order_status_history`, `order_ledger`, `merchant_sections`, `storefront_categories`, `auth.users`, `app_settings` identiques avant et après chaque fichier ; policy `t022_tmp` absente et UPDATE sur `orders` non accordé à `authenticated` après le 022.

## 2. Cible

### 2.1 Base de données (priorité 1)
1. Fait (U04, 19/10/2026) : fixtures et assertions périmées corrigées (020 : `initial_subtotal` ; 022 : barème lu dans `app_settings` ; 023 : comptages lus en base).
2. Fait (U04) : chaque fichier enveloppé dans `begin; … rollback;` ; vérification « aucune ligne restante » faite par requêtes de comptage après exécution (à intégrer au fichier lui-même si exécuté en CI).
3. Exécuter sur une **branche Supabase** ou une base locale (`supabase start`) recréée depuis les migrations, jamais sur la production par défaut.
4. Ajouter des tests pour : lecture anon de `livreurs` (fait : `026_*`), suppression de compte (U08), bucket vidéo privé (U10).
5. pgTAP envisageable plus tard ; le format actuel (assertions levant une exception) suffit pour démarrer.

### 2.2 Front (priorité 2)
1. Vitest pour `src/lib/pricing.ts` (barème identique à `app_settings`), `src/lib/orderEngine.ts` (`orderFromRow` avec `payment_status` NULL, `translateDbError`), `src/lib/whatsapp.ts`.
2. ESLint (règles React Hooks) + `tsc --noEmit` en CI.
3. Playwright : 4 parcours de bout en bout sur un environnement de test (client commande ; commerçant prépare ; livreur accepte/livre/encaisse ; admin corrige avec motif).

### 2.3 Sécurité (priorité 1-2)
- Matrice RLS « rôle × table × opération » exécutée en SQL (anon, client, commerçant, livreur, admin, tiers).
- `npm audit` et `get_advisors` à chaque PR (rapport, sans correction automatique).

## 3. Portes de validation (Phase L)

| Porte | Conditions de passage (toutes vérifiables) |
|---|---|
| G0 — Base saine | build réussi ; 3 fichiers SQL réussis sur branche ; 0 ligne de test restante |
| G1 — Données perso | anon ne lit plus aucun téléphone (requête S5 = 0) ; bucket vidéo privé ; politique de confidentialité à jour |
| G2 — Admin durci | MFA admin actif ; protection mots de passe compromis active (advisor disparu) ; journal des actions admin |
| G3 — Pilote fermé | tests E2E des 4 rôles réussis ; supervision d'erreurs active ; sauvegarde restaurée avec succès une fois |
| G4 — Stores | suppression de compte in-app + lien web ; manifeste/icônes ; empaquetage choisi ; exigences Apple/Google revérifiées à la date de soumission |
