# Registre des risques — Le Panier 241

Date : 19/10/2026. Probabilité (P) et impact (I) : Faible / Moyen / Élevé, estimés qualitativement à partir des preuves. Les références (S5, C3, T1…) renvoient au tableau des commandes d'[AUDIT_INITIAL.md](AUDIT_INITIAL.md) §0.

| ID | Risque | Catégorie | P | I | Preuve | Mesure proposée | Unité (ROADMAP) |
|---|---|---|---|---|---|---|---|
| R01 | Téléphones (et `owner_id`) des livreurs approuvés lisibles sans compte | Données perso | Élevé (déjà le cas) | Élevé | policy SELECT `livreurs` ; simulation anon : 2 lignes avec téléphone (S5) | restreindre la lecture à soi + admin ; exposer le nom/téléphone au client seulement via la commande (déjà copiés dans `orders.livreur_name/phone`) | **RÉSOLU le 19/10/2026** (026, tests 4/4, anon : 0 ligne) |
| R02 | Prise de contrôle du compte admin unique (mot de passe seul) | Sécurité | Moyen | Élevé | `is_admin()` par e-mail en dur (S2) ; 0 MFA (S7) ; mots de passe compromis non vérifiés (S8) | activer la protection mots de passe compromis ; MFA TOTP pour l'admin ; rôle admin en table | U02, U03, U12 |
| R03 | Refus en store / non-conformité : suppression de compte absente | Publication / juridique | Élevé | Élevé | aucun écran ni fonction ; Apple 5.1.1(v), Google Play (AUDIT §9) | fonction serveur de suppression + écran + page web de demande | U08, U09 |
| R04 | Régression silencieuse du moteur de commande | Qualité | Élevé | Élevé | test 020 échoue (T1) ; 022/023 périmés | remettre les tests au vert, les exécuter sur une branche Supabase à chaque migration | U04, U05, U06 |
| R05 | Vidéos de liste de courses consultables par toute personne ayant l'URL | Données perso | Moyen | Moyen | bucket `shopping-videos` public (S storage) | bucket privé + URL signées pour client/commerçant | U10 |
| R06 | Abus du proxy Pexels (quota, coût) | Disponibilité | Moyen | Faible | `api/pexels.ts` sans auth ni limite | limiter (origine, débit) ou pré-générer les images | U11 |
| R07 | Fraude à l'encaissement (déclaration sans preuve, moyen par défaut « espèces ») | Paiement | Moyen | Moyen | `record_payment` déclaratif ; `CourierSpace.tsx` `method ?? 'especes'` | rapprochement admin, preuve (référence de transaction mobile money), puis prestataire | U14, U17 |
| R08 | Commandes fantômes en masse (pas de vérification téléphone, pas de limite) | Fraude | Moyen | Moyen | `create_order` sans plafond par compte ; pas d'OTP | plafond de commandes actives par client ; OTP avant 1re commande (décision propriétaire) | U13 |
| R09 | Commandes orphelines si un commerçant supprime sa fiche | Données | Faible | Moyen | policy DELETE `merchants` ; `orders.merchant_id` text sans FK ; 2 orphelines (S7) | interdire la suppression si commandes, préférer la suspension | U15 |
| R10 | Vulnérabilité d'exécution `react-router` (redirection ouverte) | Sécurité | Faible | Faible | `npm audit` (C3) | mise à jour ciblée testée | U16 |
| R11 | Vulnérabilités outils (vite, esbuild…) sur poste de dev | Sécurité | Faible | Faible | C3 | mise à jour majeure planifiée, serveur de dev non exposé | U16 |
| R12 | Absence de supervision : erreurs en production invisibles | Exploitation | Élevé | Moyen | aucune dépendance de suivi d'erreurs ; `console.error` seul | journalisation front + alertes Supabase/Vercel | U18 |
| R13 | Pas de sauvegarde vérifiée avant migration | Exploitation | Moyen | Élevé | `docs/DEV_PLAN.md` l. 116 (« aucune procédure n'existe encore ») ; PITR non vérifié | procédure d'export + test de restauration | U07 |
| R14 | Dérive de la documentation (forfait 1500 F, statut des failles) | Gouvernance | Élevé | Faible | AUDIT §10 | mise à jour documentaire après chaque migration | U19 |
| R15 | Migrations 002-011 hors suivi : reconstruction d'un environnement incertaine | Exploitation | Moyen | Moyen | `list_migrations` (S1) | rejouer le schéma complet sur une branche de test et comparer | U05 |
| R16 | Politique de confidentialité obsolète vs traitements réels | Juridique | Élevé | Moyen | `Privacy.tsx` daté 4/10, antérieur à 022 | réécriture après R01/R05/R03, revue par juriste | U09 |
| R17 | Qualification juridique Gabon (loi 001/2011 modifiée 025/2023, APDPVP) non confirmée | Juridique | Moyen | Moyen | sources non officielles (AFAPDP, presse) | consultation du JO / de l'autorité, éventuelle déclaration préalable | hors périmètre technique |
| R18 | Refus Apple 4.2 si coque WebView sans valeur native | Publication | Moyen | Moyen | guideline 4.2 | choisir l'empaquetage après PWA (manifeste, hors ligne, notifications) | U20+ |
| R19 | Bundle unique de 692 kB : lenteur sur réseau mobile | Performance | Moyen | Faible | build (C1) | découpage par route (`React.lazy`) | U21 |
| R20 | Lecture publique des avis avec `user_id` | Données perso | Faible | Faible | policy reviews `true` | vue publique sans `user_id` | U01 (lot RLS) |
| R21 | Erreurs ignorées côté UI (suppression produit) | Qualité | Moyen | Faible | `MerchantSpace.tsx:250` | gérer l'erreur | U22 |
