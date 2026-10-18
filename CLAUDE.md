# CLAUDE.md

## Règles générales

- Ne fais jamais le travail toi-même.
- Délègue toujours à des sub-agents.
- N'utilise pas constamment Fable.
- Utilise Opus 5.5 pour les tâches les plus simples.

## Routage des modèles

| Type de tâche | Modèle |
|---|---|
| Code simple, résumé | Opus 5.5 |
| Architecture, refactoring | Fable 5.1 |

- Donne un contexte minimal à chaque sub-agent : uniquement ce dont il a besoin pour sa tâche.
- Résume chaque résultat de sub-agent en trois lignes.

## Vérification

- Relis le diff avant de conclure.
