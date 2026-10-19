# Stratégie de tests — Le Panier 241

Date : 19/10/2026. Statuts autorisés : absent / présent non exécuté / réussi / échoué / bloqué / insuffisant.

## 1. État actuel (observé)

| Niveau | Outil | Statut | Preuve |
|---|---|---|---|
| Typage + build | `tsc -b && vite build` | **réussi** | `npm run build`, code 0, le 19/10/2026 |
| Lint | — | **absent** | aucun script `lint`, aucune config ESLint |
| Tests unitaires JS (`pricing.ts`, `orderEngine.ts`, `whatsapp.ts`) | — | **absent** | aucun runner dans `package.json` |
| Tests de composants / E2E (Playwright…) | — | **absent** | — |
| SQL 020 isolement démo | `supabase/tests/020_demo_data_isolation_tests.sql` | **échoué** | exécuté le 19/10 dans `begin … rollback` : ~30 assertions passent puis `null value in column "initial_subtotal"` (fixture d'avant 022) ; aucune donnée restante (vérifié) |
| SQL 022 moteur de commande | `supabase/tests/022_order_engine_tests.sql` | **présent non exécuté** (périmé) | l. 166-168 attend un forfait 1500 F ; base : 2000 F (024) |
| SQL 023 taxonomie | `supabase/tests/023_catalog_taxonomy_tests.sql` | **présent non exécuté** (périmé) | l. 130 attend 30 produits Bâti Plus ; base : 87 (025) |
| Advisors Supabase | `get_advisors` | **insuffisant** (non automatisé) | exécuté manuellement le 19/10 |
| CI | — | **absent** | pas de `.github/workflows` |
| Tests de charge / sécurité dynamique | — | **absent** | — |

Remarque de méthode : les fichiers de test SQL ne contiennent ni `begin` ni `rollback` ; ils dépendent de l'appelant. Ils écrivent dans `auth.users` et `public.*` (annulé ensuite) et le 022 crée/supprime temporairement une policy et un GRANT sur `orders` : **ne jamais les lancer hors transaction, ni sur la production sans nécessité**.

## 2. Cible

### 2.1 Base de données (priorité 1)
1. Corriger les fixtures et assertions périmées (020 : `initial_subtotal` ; 022 : forfait lu depuis `app_settings` plutôt qu'en dur ; 023 : comptages relatifs à l'état initial, comme le fait déjà S7).
2. Envelopper chaque fichier dans `begin; … rollback;` et terminer par une vérification « aucune ligne de test restante ».
3. Exécuter sur une **branche Supabase** ou une base locale (`supabase start`) recréée depuis les migrations, jamais sur la production par défaut.
4. Ajouter des tests pour : lecture anon de `livreurs` (doit échouer après U01), suppression de compte (U08), bucket vidéo privé (U10).
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
