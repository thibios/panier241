# Feuille de route technique — Le Panier 241

Date : 19/10/2026. Découpage en **petites unités validables** (Phase K) : chacune a un résultat observable, un test de validation et un retour arrière. Aucune n'est commencée. Les décisions du propriétaire sont signalées « DÉCISION ».

Ordre : d'abord ce qui protège des personnes réelles et le filet de tests, ensuite l'exploitation, enfin la publication.

## Lot 0 — Filet de sécurité (porte G0)

| Unité | Objet | Fichiers / objets | Validation | Retour arrière |
|---|---|---|---|---|
| U04 | Remettre au vert le test 020 (fixture `initial_subtotal`, montants cohérents avec la contrainte 022) | `supabase/tests/020_*.sql` | exécution `begin … rollback` : 0 échec ; 0 ligne restante | revert du fichier |
| U05 | Créer une branche Supabase (ou base locale) depuis les migrations ; constater si 002-011 se rejouent | `supabase/`, branche | schéma de branche = schéma prod (comparaison `information_schema`) | supprimer la branche |
| U06 | Mettre à jour les tests 022 (forfait lu dans `app_settings`) et 023 (comptages relatifs) puis les exécuter sur la branche | `supabase/tests/022_*`, `023_*` | 0 échec | revert |
| U07 | Procédure de sauvegarde/export avant migration + un test de restauration | doc + Supabase | restauration réussie sur branche | — |

## Lot 1 — Données personnelles et administration (portes G1, G2)

| Unité | Objet | Validation | Retour arrière |
|---|---|---|---|
| U01 | Migration 026 : lecture `livreurs` limitée au propriétaire et à l'admin ; avis publics sans `user_id` (vue) si DÉCISION | requête S5 : 0 téléphone pour anon ; parcours client « nom du livreur » toujours affiché via `orders.livreur_name` | script inverse dans la migration |
| U02 | Activer la protection mots de passe compromis et une longueur minimale (réglage Auth, DÉCISION) | advisor `auth_leaked_password_protection` absent | réglage inverse |
| U03 | MFA TOTP pour l'admin (Supabase MFA) + exigence `aal2` dans `is_admin()` | connexion admin sans 2e facteur → `/admin` refusé | retirer l'exigence `aal2` |
| U12 | Rôle admin en table (`admin_users`) au lieu de l'e-mail en dur, côté SQL et côté `AuthContext.tsx` | tests SQL admin réussis ; e-mail introuvable dans `src/` et `is_admin()` | restaurer l'ancienne fonction |
| U10 | Bucket `shopping-videos` privé + URL signées (client, commerçant de la commande) | URL publique → 400/404 ; commerçant voit la vidéo | repasser le bucket en public |
| U23 | Journal des actions admin (approbations, suspensions, paramètres) | une approbation crée une ligne d'audit | supprimer le trigger |

## Lot 2 — Suppression de compte et conformité (portes G1, G4)

| Unité | Objet | Validation |
|---|---|---|
| U08 | Fonction serveur de suppression de compte (anonymisation des commandes conservées, suppression profil/adresses/favoris/fichiers) + écran dans `Profile.tsx` — DÉCISION sur la durée de conservation | test SQL : après suppression, aucune donnée identifiante ; commandes conservées anonymisées |
| U09 | Page web publique de demande de suppression + mise à jour de `Privacy.tsx` (données 022, rétention, droits, autorité compétente une fois confirmée) | revue propriétaire / juriste |

## Lot 3 — Robustesse commandes et paiements

| Unité | Objet | Validation |
|---|---|---|
| U13 | Plafond de commandes actives par client dans `create_order` (DÉCISION sur la valeur) | test négatif « N+1e commande refusée » |
| U14 | Écran admin de rapprochement des encaissements + `record_payout` raccordé | test E2E admin |
| U15 | Interdire la suppression d'un commerçant ayant des commandes (préférer `suspended`) | test négatif |
| U17 | Étude d'un prestataire mobile money (Airtel/Moov) — DÉCISION, contrats hors périmètre technique | document de choix |
| U22 | Gestion des erreurs ignorées (`MerchantSpace.tsx` suppression produit) | message affiché sur refus |
| U24 | Types générés depuis le schéma (`supabase gen types`) et suppression des `as unknown as` | `tsc` réussi |

## Lot 4 — Exploitation (porte G3)

| Unité | Objet | Validation |
|---|---|---|
| U16 | Mise à jour `react-router-dom` (correctif de la vulnérabilité) puis outils (vite, tailwind) en unités séparées | `npm audit` sans vulnérabilité d'exécution ; build réussi ; parcours manuel |
| U18 | Suivi d'erreurs front + alertes (DÉCISION outil) | erreur provoquée visible dans l'outil |
| U11 | Limitation de `/api/pexels` (origine + débit) | appel d'une autre origine refusé |
| U19 | Mise à jour de PRD/APP_FLOW/DEV_PLAN/SECURITY_REQUIREMENTS et des en-têtes de 022 | relecture : plus de « 1500 F » obsolète |
| U25 | ESLint + Vitest + CI (build, lint, tests unitaires) | pipeline vert sur une PR |

## Lot 5 — Préparation stores (porte G4)

| Unité | Objet | Validation |
|---|---|---|
| U20 | PWA : manifeste, icônes, service worker minimal | audit Lighthouse « installable » |
| U21 | Découpage du bundle par route | aucun chunk > 500 kB |
| U26 | Choix d'empaquetage (TWA, Capacitor…) — DÉCISION ; nécessite comptes Apple Developer / Google Play Console (propriétaire) | build signé installable sur appareil de test |
| U27 | Fonctions à valeur native (notifications, photo de preuve livreur, file hors ligne) si cible iOS (Apple 4.2) | tests E2E sur appareil |
| U28 | Fiches stores : Data safety, confidentialité, captures, compte de démonstration pour la revue | revue interne avec les URL officielles revérifiées |

## Première tâche recommandée

**U01 — retirer la lecture publique des téléphones des livreurs.** Petite (une policy), réversible, et elle supprime une exposition **déjà effective** de données personnelles de personnes réelles (2 numéros lisibles sans compte, preuve S5). Prérequis conseillé : U04 (test 020 au vert) peut être mené juste avant pour disposer d'un filet, mais U01 ne dépend pas techniquement de lui.
