# AI_RULES.md — Gouvernance des agents IA, Le Panier 241

Ce fichier s'impose à tout agent IA (agent principal et sous-agents) qui intervient sur le projet. Il complète `CLAUDE.md` sans le contredire. En cas de doute, appliquer la règle la plus prudente.

## 1. Interdits

- R1. Ne pas inventer de fonctionnalité. Implémenter uniquement ce qui est demandé ou décrit dans `docs/PRD.md`.
- R2. Ne pas modifier l'architecture (structure `src/`, contextes, routage, Supabase, `api/`, Vercel) sans autorisation explicite du propriétaire.
- R3. Ne pas supprimer de code fonctionnel. Un code est supprimé seulement si la tâche le demande et après vérification qu'il n'est plus utilisé (`grep` sur tout le projet).
- R4. Ne pas créer de doublon : chercher d'abord un composant, hook, contexte, utilitaire ou type existant (`src/components`, `src/lib`, `src/context`, `src/types`) et le réutiliser.
- R5. Ne pas modifier une règle métier (section 7) ni une décision validée du PRD.
- R6. Ne pas trancher les décisions ouvertes D1 à D5 du PRD (ajustement du montant, retrait sur stand, calcul serveur, circuit de l'argent, machine à états). Elles relèvent du propriétaire ; les recommandations du PRD ne valent pas validation.
- R7. Ne pas changer le design system (section 8).
- R8. Ne pas modifier la base sans migration numérotée (section 9).
- R9. Ne pas modifier une API, une signature exportée, un schéma de table, une policy ou une fonction SQL sans analyse d'impact : lister les appelants, les écrans et les rôles touchés.
- R10. Ne pas contourner la sécurité : pas de désactivation de RLS, pas de policy permissive, pas de `service_role` côté front, pas de suppression de trigger de protection (`014`, `016`).
- R11. Ne jamais déclarer une tâche terminée sans vérification (section 6).

## 2. Avant de coder

- R12. Lire `AI_RULES.md`.
- R13. Lire `PROJECT_CONVENTIONS.md`. S'il n'existe pas, le dire et suivre les conventions visibles dans le code.
- R14. Lire la section du PRD concernée (`docs/PRD.md`).
- R15. Lire le TRD concerné. Aucun TRD n'existe à ce jour : le dire et s'appuyer sur le code et les migrations.
- R16. Inspecter le code existant de la zone touchée.
- R17. Identifier les dépendances (contextes, tables, policies, triggers, routes).
- R18. Lister les fichiers à modifier.
- R19. Décrire le plan en quelques lignes.
- R20. Signaler les risques (sécurité, RLS, régression, données, prix).
- R21. Demander confirmation uniquement pour une décision réellement bloquante. Sinon, avancer.

## 3. Pendant

- R22. Modifier seulement le nécessaire. Pas de refactoring opportuniste.
- R23. Respecter l'architecture et les conventions existantes.
- R24. Réutiliser les composants et les jetons existants.
- R25. Écrire un code lisible et maintenable, typé TypeScript strict, sans `any` injustifié.
- R26. Ajouter les tests nécessaires quand un outil de test existe (aucun aujourd'hui, voir section 6).
- R27. Ne pas masquer les erreurs : pas de `catch` vide, pas de `@ts-ignore`, pas de `as any` pour faire passer le build. Afficher ou journaliser l'erreur.

## 4. Après

- R28. Lancer les vérifications de la section 6 et la checklist finale.
- R29. Vérifier l'absence de régression sur les parcours touchés (client, commerçant, livreur, admin).
- R30. Vérifier les permissions RLS pour chaque rôle concerné quand la base est touchée.
- R31. Vérifier la sécurité : aucun secret, aucune donnée sensible exposée, aucune policy élargie.
- R32. Relire le diff (`git diff`) avant de conclure.
- R33. Résumer les fichiers modifiés et indiquer les problèmes restants ou non vérifiés.

## 5. Règle fondamentale

- R34. Ne jamais dire « c'est terminé » parce que le code est écrit. Terminé signifie : implémenté, conforme au PRD et à ces règles, vérifié, sans régression connue, conforme aux conventions, état documenté (ce qui est fait, ce qui reste, ce qui n'a pas pu être testé).

## 6. Vérifications réellement disponibles

Scripts présents dans `package.json` : `dev`, `build`, `preview`. Aucun script `lint`, aucun script `test`, aucune configuration ESLint, aucun fichier de test.

- R35. Types et compilation : `npm run build` (lance `tsc -b` puis `vite build`). Il doit passer sans erreur.
- R36. Lint : absent. Remplacement : `npm run build` (contrôle TypeScript) et relecture du diff. Ne pas prétendre avoir lancé un lint.
- R37. Tests : absents. Remplacement : test manuel du parcours touché avec `npm run dev`, décrit précisément dans le résumé. Ne pas prétendre avoir lancé des tests automatisés.
- R38. Ne pas ajouter ESLint, Vitest ou un autre outil sans autorisation (R2).

## 7. Règles métier figées

- R39. Paiement à la livraison uniquement, au livreur (espèces, Airtel Money, Moov Money). Aucun paiement en ligne.
- R40. Un seul commerçant par panier.
- R41. Frais de service : 5 % du sous-total, arrondi à l'unité.
- R42. Livraison : 2 000 F + 300 F/km (distance à vol d'oiseau) ; forfait 1 500 F sans GPS. Barème dans `src/lib/pricing.ts`, à ne pas dupliquer.
- R43. Annulation client seulement si la commande est `en_preparation` ; une commande `annulee` ne change plus.
- R44. Commerçants, livreurs, marchés et magasins proposés passent par la validation administrateur avant d'être visibles.
- R45. Un magasin ou une enseigne n'est affiché qu'avec un logo.
- R46. Prix officiels DGCCRF proposés à la demande (panier, motif d'annulation, `/prix-officiels`), jamais sur l'accueil.
- R47. À chaque saisie ou modification de prix (code, seed, migration, données), signaler explicitement s'il s'agit du prix officiel DGCCRF (plafond) ou du prix du magasin.

## 8. Design et contenu figés

- R48. Pas d'emoji dans l'interface ni dans les contenus.
- R49. Pas de dégradé violet, pas de look générique.
- R50. Pas de faux avis, pas de fausses métriques, pas de faux comptes, pas de chiffres décoratifs.
- R51. Toute couleur passe par les jetons de `src/theme/tokens.ts` (`baseTheme`, `uiTokens`, `categoryColors`, thèmes marchands). Aucune couleur codée en dur dans un composant. Ne pas modifier la palette (vert profond `#1B4A2E`, olive, jaune ivoire) ni le logo officiel « Le Panier 241 ».
- R52. `docs/design-system.md` est la référence de la charte actuelle, alignée sur `src/theme/tokens.ts`. En cas d'écart, `tokens.ts` fait foi et le document est corrigé dans le même commit.

## 9. Base de données

- R53. Toute modification de schéma, policy, trigger ou fonction passe par un nouveau fichier `supabase/NNN_description.sql`, numéroté à la suite (dernier : `019_custom_markets_details.sql`, prochain : `020_...`). Ne jamais modifier une migration déjà appliquée.
- R54. Chaque migration qui crée une table active la RLS et définit ses policies.
- R55. Données de test en base : toujours annulées ou supprimées à la fin de la tâche, et le signaler dans le résumé.

## 10. Secrets et comptes

- R56. Jamais de secret (clé, token, mot de passe, `service_role`) dans le code, les migrations, les commits ou le chat. Utiliser les variables d'environnement ; `.env.local` ne se lit pas à voix haute et ne se commite pas ; `.env.example` ne contient que des noms de variables.
- R57. Ne jamais saisir, définir ou réinitialiser un mot de passe à la place du propriétaire. Lui demander de le faire.

## 11. Cohérence avec CLAUDE.md

- R58. `CLAUDE.md` reste en vigueur : délégation aux sous-agents, routage des modèles (Opus 5.5 pour le simple, Fable 5.1 pour l'architecture et le refactoring), contexte minimal par sous-agent, résumé de chaque résultat en trois lignes, relecture du diff.
- R59. `AI_RULES.md` complète `CLAUDE.md` et ne le contredit pas. Chaque sous-agent reçoit les règles de ce fichier utiles à sa tâche ; l'agent principal vérifie leur respect avant de conclure.
- R60. En cas de conflit apparent entre les deux fichiers, s'arrêter et le signaler au propriétaire.

## CHECKLIST FINALE

À exécuter avant de déclarer chaque tâche terminée.

- [ ] Le travail correspond à la demande et au PRD ; aucune fonctionnalité inventée ; aucune décision D1-D5 tranchée.
- [ ] Seuls les fichiers nécessaires sont modifiés : `git status` puis `git diff` relus.
- [ ] Aucun doublon créé ; composants et jetons existants réutilisés.
- [ ] Compilation et types : `npm run build` passe sans erreur.
- [ ] Lint : aucun script disponible ; signalé comme non lancé.
- [ ] Tests automatisés : aucun script disponible ; test manuel du parcours avec `npm run dev`, décrit dans le résumé.
- [ ] Régressions vérifiées sur les parcours touchés (client, commerçant, livreur, admin).
- [ ] Règles métier intactes : paiement à la livraison, un commerçant par panier, 5 %, 2 000 F + 300 F/km, 1 500 F sans GPS, annulation seulement `en_preparation`, validation admin, logo obligatoire, prix officiels à la demande.
- [ ] Chaque prix saisi est signalé : prix officiel DGCCRF ou prix du magasin.
- [ ] Design : aucune couleur en dur (`grep -rnE "#[0-9A-Fa-f]{6}" src --include=*.tsx`), aucun emoji, aucun dégradé violet, aucun faux avis, fausse métrique ou faux compte.
- [ ] Base : changement livré dans une migration `supabase/020_...` ou suivante ; RLS active et policies vérifiées pour chaque rôle.
- [ ] Sécurité : aucun secret dans le diff (`git diff | grep -iE "key|secret|token|password|service_role"`), aucune policy élargie, aucun trigger de protection retiré.
- [ ] Données de test en base annulées ou supprimées.
- [ ] Aucun mot de passe saisi ou défini à la place du propriétaire.
- [ ] Résumé rédigé : fichiers modifiés, vérifications lancées, ce qui n'a pas pu être vérifié, problèmes restants.
