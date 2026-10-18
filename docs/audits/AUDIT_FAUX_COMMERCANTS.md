# Audit : commerçants fictifs, faux avis et fausses notes

Date : 18/10/2026
Périmètre : migrations `supabase/*.sql`, code `src/`, base Supabase de production (`ukaauidavtmtjithahmn`).
Mode : lecture seule. Aucune requête d'écriture n'a été exécutée, aucun fichier modifié hormis ce rapport.

## 1. Synthèse

| Constat | Détail |
|---|---|
| Commerçants fictifs encore en base | **6** (seed de `002`) + **1** commerçant de test (`Kiosque Test Automatise`) |
| Visibles par le public | **Non** : tous les 7 sont en `status = 'suspended'`, et la policy SELECT de `merchants` ne montre que `approved` |
| Notes inventées encore en base | **Non** : rating = 0 et review_count = 0 sur les 6 fictifs, Bâti Plus Gabon et CECADO |
| Faux avis dans `reviews` | 1 seul avis, sur `Kiosque Test Automatise` (note 4, commande de test) |
| Problème | Ce nettoyage a été fait à la main en base : **aucune migration ne le trace**. Rejouer `002` et `011` sur une base neuve recrée les 6 faux commerçants, leurs notes (4,4 à 4,9, 62 à 203 avis) et les notes 4,6 / 4,3 de Bâti Plus et CECADO |
| Dépendances bloquantes (clés étrangères) | **Aucune**. `products` et `reviews` sont en `on delete cascade` ; `orders.merchant_id` et `favorites.merchant_id` sont du texte sans clé étrangère |
| Dépendances à traiter avant suppression | 6 commandes liées aux fictifs/test (dont 3 bloquées en `en_preparation`), 2 commandes orphelines, 3 favoris orphelins, 1 photo stockée |

## 2. Lignes fictives insérées par les migrations

### 2.1 `002_merchant_space.sql` (seed « catalogue de démo », owner_id null)

| id | Nom | market_id | Note insérée | Avis insérés | Produits insérés |
|---|---|---|---|---|---|
| 10000000-0000-0000-0000-000000000001 | Chez Maman Adjoua | mkt-mont-bouet | 4.8 | 156 | 6 |
| 10000000-0000-0000-0000-000000000002 | Étal Nguema Fruits | mkt-mont-bouet | 4.6 | 89 | 5 |
| 10000000-0000-0000-0000-000000000003 | Poissonnerie de Nkembo | mkt-nkembo | 4.7 | 121 | 3 |
| 10000000-0000-0000-0000-000000000004 | Boucherie Centrale Oloumi | mkt-oloumi | 4.5 | 74 | 2 |
| 10000000-0000-0000-0000-000000000005 | Épicerie Traditionnelle Akébé | mkt-akebe | 4.9 | 203 | 6 |
| 10000000-0000-0000-0000-000000000006 | Le Jardin de Mont-Bouët | mkt-mont-bouet | 4.4 | 62 | 4 |

Total : 705 avis inventés, aucune ligne correspondante dans `reviews`.
Les marchés `mkt-nkembo`, `mkt-oloumi`, `mkt-akebe` n'existent plus dans `src/data/markets.ts` : ces commerçants pointent vers des lieux absents.

### 2.2 `011_bati_plus_cecado.sql` (lieux réels, notes inventées)

| Nom | market_id | Note insérée | Avis insérés | Statut |
|---|---|---|---|---|
| Bâti Plus Gabon | mkt-bati-plus | 4.6 | 0 | approved |
| CECADO | mkt-ceca-gadis | 4.3 | 0 | approved |

Note sans aucun avis : valeur codée en dur. Le commerçant est réel, la note ne l'est pas.

### 2.3 `012_product_variants.sql`

Ajoute des variantes aux deux catalogues réels et à 3 fictifs (Akébé +4, Boucherie Oloumi +2, Poissonnerie Nkembo +2), par sélection sur le nom du commerçant.

### 2.4 Autres

- `006_admin_approval.sql` ligne 19 : `update public.merchants set status = 'approved' where owner_id is null;` a approuvé les 6 fictifs au moment de la migration.
- `merchants.rating` a pour **valeur par défaut 5** (`002`) : tout nouveau commerçant naît avec une note de 5 sans avis. L'interface la masque tant que `review_count = 0` (`MerchantCard.tsx`, `MerchantDetail.tsx`), mais la valeur est fausse en base.
- Aucune migration (003 à 019) n'insère d'avis ni d'autre commerçant. `custom_markets` est vide.

## 3. État en production

### 3.1 Commerçants

| Nom | id | owner_id | status | rating | review_count | Moy. réelle (reviews) |
|---|---|---|---|---|---|---|
| Chez Maman Adjoua | 10000000-...-0001 | null | suspended | 0 | 0 | aucun avis |
| Étal Nguema Fruits | 10000000-...-0002 | null | suspended | 0 | 0 | aucun avis |
| Poissonnerie de Nkembo | 10000000-...-0003 | null | suspended | 0 | 0 | aucun avis |
| Boucherie Centrale Oloumi | 10000000-...-0004 | null | suspended | 0 | 0 | aucun avis |
| Épicerie Traditionnelle Akébé | 10000000-...-0005 | null | suspended | 0 | 0 | aucun avis |
| Le Jardin de Mont-Bouët | 10000000-...-0006 | null | suspended | 0 | 0 | aucun avis |
| Kiosque Test Automatise | c8f0355b-497f-41df-8458-0b9f35aea535 | compte réel (test) | suspended | 4.0 | 1 | 4.0 (1 avis) |
| Bâti Plus Gabon | 29803cf7-509d-4f20-83c3-87b7813dfdb4 | null | approved | 0 | 0 | aucun avis |
| CECADO | 2331b1f8-47ad-48bf-864f-67e844d4a316 | null | approved | 0 | 0 | aucun avis |

9 commerçants au total. Seuls Bâti Plus Gabon et CECADO sont publics.

### 3.2 Dépendances par commerçant

| Nom | Produits | dont variantes | Commandes (orders.merchant_id) | Avis | Favoris | Photo kiosque |
|---|---|---|---|---|---|---|
| Chez Maman Adjoua | 6 | 0 | 3 (toutes `en_preparation`) | 0 | 0 | non |
| Étal Nguema Fruits | 5 | 0 | 0 | 0 | 0 | non |
| Poissonnerie de Nkembo | 5 | 3 | 0 | 0 | 0 | non |
| Boucherie Centrale Oloumi | 4 | 3 | 0 | 0 | 0 | non |
| Épicerie Traditionnelle Akébé | 10 | 7 | 0 | 0 | 0 | non |
| Le Jardin de Mont-Bouët | 4 | 0 | 0 | 0 | 0 | non |
| Kiosque Test Automatise | 1 | 0 | 3 (2 `livree`, 1 `en_livraison`) | 1 | 0 | oui (1 fichier, `kiosk-photos/152d62c9-.../`) |
| Bâti Plus Gabon | 30 | 26 | 1 (`annulee`) | 0 | 0 | logo `kiosk-photos/logos/` |
| CECADO | 24 | 21 | 1 (`annulee`) | 0 | 0 | logo `kiosk-photos/logos/` |

Sous-total fictifs + test : 35 produits, 6 commandes, 1 avis, 1 fichier stocké. 3 comptes clients distincts ont passé ces commandes (comptes de test probables, non vérifiés nominativement).

Il n'existe **pas de table `order_items`** : les lignes de commande sont dans `orders.items` (jsonb). Aucune n'embarque l'id d'un commerçant.

### 3.3 Données orphelines (anciens identifiants de maquette)

| Table | merchant_id | Nom stocké | Lignes |
|---|---|---|---|
| orders | mch-maman-adjoua | Chez Maman Adjoua | 1 |
| orders | e958ecec-ea10-4444-926e-bebf892c07f6 | Boutique Validation Test | 1 |
| favorites | mch-poissonnerie-nkembo | (aucun) | 2 |
| favorites | mch-maman-adjoua | (aucun) | 1 |

Ces lignes renvoient à des commerçants qui n'existent plus (ids `mch-*` de l'ancienne maquette côté client, et un commerçant de test déjà supprimé).

### 3.4 Clés étrangères et règles

| Table enfant | Colonne | Référence | Règle de suppression |
|---|---|---|---|
| products | merchant_id (uuid) | merchants.id | CASCADE |
| reviews | merchant_id (uuid) | merchants.id | CASCADE |
| reviews | order_id (uuid) | orders.id | CASCADE |
| orders | merchant_id (text) | aucune | - |
| favorites | merchant_id (text) | aucune | - |

Conséquence : supprimer un commerçant supprime ses produits et ses avis, mais laisse ses commandes et favoris orphelins. Rien ne bloque techniquement ; c'est l'historique des commandes qu'il faut décider.

## 4. Notes non issues de la table `reviews`

| Point | Constat | Risque |
|---|---|---|
| Bâti Plus Gabon, CECADO | 0 / 0 en base, cohérent avec `reviews` | `011` réinjecte 4.6 et 4.3 si rejouée |
| 6 fictifs | 0 / 0 en base | `002` réinjecte 4.4 à 4.9 et 705 avis si rejouée |
| Kiosque Test Automatise | 4.0 / 1, cohérent avec son unique avis | c'est un avis de test |
| Défaut de colonne | `rating default 5` | toute ligne neuve a une note 5 sans avis |
| Trigger `update_merchant_rating` | ne se déclenche qu'en `after insert` | une suppression d'avis ne recalcule pas la note ; `avg` sur zéro avis renvoie null |
| Code client | aucune note codée en dur ; affichage conditionné à `reviewCount > 0` | aucun |

## 5. Plan de nettoyage proposé (NON exécuté)

### 5.1 À conserver

| Élément | Raison |
|---|---|
| Bâti Plus Gabon (`29803cf7-...`) et ses 30 produits | enseigne réelle (lieu `mkt-bati-plus`, « Bâti Plus ») |
| CECADO (`2331b1f8-...`) et ses 24 produits | enseigne réelle (lieu `mkt-ceca-gadis`, « Ceca-Gadis ») |
| Lieux `mkt-mont-bouet` (Marché Mont-Bouët), `mkt-bati-plus`, `mkt-ceca-gadis`, `mkt-centre-affaires` (Centr' Affaires) dans `src/data/markets.ts` | lieux réels ; la migration ne touche qu'aux commerçants, jamais aux lieux |
| Logos `kiosk-photos/logos/*` | utilisés par `markets.ts` |
| Les 2 commandes `annulee` de Bâti Plus et CECADO | historique client réel |

### 5.2 Choix recommandé

- **6 fictifs sans dépendance hors produits** (Étal Nguema, Poissonnerie Nkembo, Boucherie Oloumi, Épicerie Akébé, Jardin de Mont-Bouët) : suppression ; les produits partent en cascade.
- **Chez Maman Adjoua** : ses 3 commandes sont bloquées en `en_preparation` et ne seront jamais honorées. Les passer en `annulee` avec un motif, puis supprimer le commerçant. Les commandes restent lisibles par le client grâce à `merchant_name` (texte).
- **Kiosque Test Automatise** : commerçant d'un compte de test réel. À supprimer avec son avis (cascade) ; sa commande `en_livraison` passe en `annulee`. La photo stockée se supprime depuis le tableau de bord Storage (pas en SQL).
- **Orphelins** : favoris `mch-*` supprimés ; commandes orphelines `en_preparation`/`en_livraison` éventuelles annulées, jamais supprimées.
- **Notes** : recalcul systématique depuis `reviews`, défaut de colonne ramené à 0, trigger étendu à `delete` et `update`.
- **Migrations sources** : neutraliser le seed de `002` et les notes de `011` pour qu'une base neuve ne recrée pas ces données (modification de fichiers à valider séparément ; non faite ici).

Alternative prudente si l'on préfère garder une trace : ne rien supprimer, laisser `status = 'suspended'` (déjà le cas) et n'appliquer que les sections 2, 5 et 6 ci-dessous.

### 5.3 Ordre imposé par les dépendances

1. Annuler les commandes ouvertes rattachées aux commerçants à supprimer (pas de clé étrangère, mais à faire avant pour ne pas perdre le lien `merchant_id` utile au diagnostic).
2. Supprimer les favoris orphelins.
3. Supprimer les commerçants (cascade : `reviews` puis `products`).
4. Recalculer `rating` / `review_count` de tous les commerçants restants.
5. Changer le défaut de colonne et remplacer le trigger.
6. Hors SQL : supprimer le fichier `kiosk-photos/152d62c9-ec64-4d50-a489-b0f517ed52b2/` dans Storage.

### 5.4 Proposition de fichier `supabase/020_cleanup_demo_merchants.sql`

Non créé, non appliqué. À relire, puis exécuter de préférence sur une branche Supabase avant la production.

```sql
-- Panier 241 — suppression des commerçants de démonstration et des notes inventées
-- Conserve : Bâti Plus Gabon, CECADO et tous les lieux (markets.ts).
begin;

-- Liste figée des commerçants à retirer (ids vérifiés le 18/10/2026)
create temporary table _to_remove (id uuid primary key) on commit drop;
insert into _to_remove (id) values
  ('10000000-0000-0000-0000-000000000001'), -- Chez Maman Adjoua
  ('10000000-0000-0000-0000-000000000002'), -- Étal Nguema Fruits
  ('10000000-0000-0000-0000-000000000003'), -- Poissonnerie de Nkembo
  ('10000000-0000-0000-0000-000000000004'), -- Boucherie Centrale Oloumi
  ('10000000-0000-0000-0000-000000000005'), -- Épicerie Traditionnelle Akébé
  ('10000000-0000-0000-0000-000000000006'), -- Le Jardin de Mont-Bouët
  ('c8f0355b-497f-41df-8458-0b9f35aea535'); -- Kiosque Test Automatise

-- Garde-fou : ne jamais toucher aux commerçants réels
do $$
begin
  if exists (
    select 1 from public.merchants m join _to_remove r on r.id = m.id
    where m.name in ('Bâti Plus Gabon', 'CECADO') or m.status = 'approved'
  ) then
    raise exception 'Un commerçant réel ou approuvé figure dans la liste : arrêt';
  end if;
end $$;

-- 1. Commandes ouvertes des commerçants retirés et des commandes orphelines : annulées, jamais supprimées
update public.orders o
set status = 'annulee',
    cancelled_at = coalesce(o.cancelled_at, now()),
    cancel_reason = coalesce(o.cancel_reason, 'Commerçant de démonstration retiré du catalogue')
where o.status in ('en_preparation', 'en_livraison')
  and (
    o.merchant_id in (select id::text from _to_remove)
    or o.merchant_id not in (select id::text from public.merchants)
  );

-- 2. Favoris pointant vers un commerçant retiré ou inexistant (ids mch-* de l'ancienne maquette)
delete from public.favorites f
where f.merchant_id in (select id::text from _to_remove)
   or f.merchant_id not in (select id::text from public.merchants);

-- 3. Commerçants (cascade : reviews puis products)
delete from public.merchants where id in (select id from _to_remove);

-- 4. Notes : uniquement issues de la table reviews
update public.merchants m
set review_count = coalesce(s.n, 0),
    rating       = coalesce(s.avg_rating, 0)
from (
  select mm.id, count(r.id) as n, round(avg(r.rating)::numeric, 1) as avg_rating
  from public.merchants mm
  left join public.reviews r on r.merchant_id = mm.id
  group by mm.id
) s
where s.id = m.id;

-- 5. Plus de note par défaut
alter table public.merchants alter column rating set default 0;

-- 6. Recalcul aussi à la suppression et à la modification d'un avis
create or replace function public.update_merchant_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid := coalesce(new.merchant_id, old.merchant_id);
begin
  update public.merchants
  set review_count = (select count(*) from public.reviews where merchant_id = target),
      rating       = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where merchant_id = target), 0)
  where id = target;
  return coalesce(new, old);
end;
$$;

revoke execute on function public.update_merchant_rating() from public, anon, authenticated;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_changed
  after insert or update or delete on public.reviews
  for each row execute procedure public.update_merchant_rating();

commit;
```

Remarque : si un avis change de commerçant (`update` de `merchant_id`), l'ancien commerçant n'est pas recalculé ; cas non prévu par l'application, à traiter seulement s'il apparaît.

### 5.5 Vérifications après application

```sql
select name, status, rating, review_count from public.merchants order by name;            -- attendu : Bâti Plus Gabon, CECADO, 0 / 0
select count(*) from public.products where merchant_id not in (select id from public.merchants); -- attendu : 0
select count(*) from public.favorites where merchant_id not in (select id::text from public.merchants); -- attendu : 0
select status, count(*) from public.orders group by status;                                -- plus aucune commande ouverte orpheline
```

## 6. Points annexes relevés

| Point | Recommandation |
|---|---|
| `002` et `011` contiennent toujours le seed et les notes | retirer le bloc seed de `002` et passer 4.6 / 4.3 à 0 dans `011` (ou les annoter « historique, ne pas rejouer ») |
| Historique `supabase_migrations` en base ne contient que 012 à 019 | 002 à 011 ont été passées à la main dans l'éditeur SQL ; le nettoyage manuel déjà fait n'a laissé aucune trace |
| Policy `products` : lecture publique `using (true)` | les produits des commerçants suspendus restent lisibles par l'API ; le client les filtre (`CatalogContext.tsx`), mais la base non. À restreindre aux commerçants approuvés |
| Prix des produits de Bâti Plus et CECADO | à confirmer comme prix magasin (et non plafond DGCCRF) avant lancement |

## 7. Décision et migration

### 7.1 Décision du propriétaire (18/10/2026)

Les 7 commerçants fictifs (6 du seed `002`, ids `10000000-...-0001` à `0006`, et `Kiosque Test Automatise`) sont **conservés** en production, suspendus, comme données de test et de visualisation. **Aucune suppression** de commerçant, produit, commande ou avis. Le plan de suppression de la section 5 est abandonné ; c'est l'« alternative prudente » qui est retenue, renforcée.

### 7.2 Fichiers

| Fichier | Contenu |
|---|---|
| `supabase/020_demo_data_isolation.sql` | migration (non appliquée) |
| `supabase/tests/020_demo_data_isolation_tests.sql` | 39 assertions (25 positives, 14 négatives) |
| `supabase/002_merchant_space.sql` | commentaire d'en-tête ; seed : rating 0, review_count 0 (au lieu de 4,4-4,9 / 62-203) |
| `supabase/011_bati_plus_cecado.sql` | commentaire d'en-tête ; rating 0 (au lieu de 4,6 et 4,3) |

Rien d'autre n'est modifié dans `002` et `011` (produits et prix inchangés). Aucun prix saisi par 020.

### 7.3 Contenu de 020

1. `merchants.is_demo boolean not null default false`, commenté « donnée de démonstration, jamais visible du public » ; les 7 ids marqués `true` (garde-fou : exactement 7, aucun approuvé, ni Bâti Plus ni CECADO).
2. Trigger `guard_demo_merchant` (before insert/update) : un commerçant `is_demo` ne peut jamais être `approved`, **même par l'administrateur ou le rôle postgres** ; `is_demo` ne peut être ni posé ni retiré par l'API (anon / authenticated), seulement par une migration.
3. Policy SELECT `merchants` : `(approved et non démo) ou (propriétaire et non démo) ou admin`. Policies UPDATE / DELETE du propriétaire : `and not is_demo`.
4. Policy SELECT `products` (remplace `using (true)`) : produit lisible si son commerçant est non démo et (approuvé ou appartient à l'utilisateur), ou si admin. Policy ALL du propriétaire : `and not is_demo`.
5. `merchants.rating` : défaut 0 ; recalcul de `rating` / `review_count` depuis `reviews` pour tous (résultat actuel : seul le Kiosque garde 4,0 / 1, issu de son avis de test) ; trigger `on_review_changed` after insert/update/delete, qui recalcule aussi l'ancien commerçant si un avis change de `merchant_id` ; note 0 (et non null) quand il n'y a plus d'avis. Remplace `on_review_created`.
6. Favoris orphelins : suppression des seules lignes dont `merchant_id` ne correspond à aucun commerçant (3 lignes : `mch-maman-adjoua` x1, `mch-poissonnerie-nkembo` x2).
7. Commandes orphelines : **aucune écriture**. Conservées telles quelles :

| order id | merchant_id | merchant_name | status | créée le |
|---|---|---|---|---|
| 8a717cfb-a7a5-4eeb-9367-080828ff79c7 | mch-maman-adjoua | Chez Maman Adjoua | en_preparation | 08/09/2026 |
| cc02fa49-0fa3-410c-b331-a6683563eaea | e958ecec-ea10-4444-926e-bebf892c07f6 | Boutique Validation Test | en_livraison | 09/09/2026 |

### 7.4 Tests (18/10/2026)

Exécutés contre la base de production dans une transaction annulée (corps de 020 + fichier de tests, terminée par une exception volontaire puis `rollback`). Résultat : **39 / 39 réussis** (25 positifs, 14 négatifs). Vérification après coup : colonne `is_demo` absente, défaut `rating` toujours 5, triggers et policies d'origine en place, 3 favoris, 1 avis, aucun compte, commerçant, produit ou commande de test restant. Rôles simulés par `set local role` + `request.jwt.claims` : anon, propriétaire réel, tiers, propriétaire du kiosque de test, admin, postgres.

### 7.5 Impacts front et points restants

- `CatalogContext.tsx` : aucune régression ; la requête filtre déjà `status = 'approved'` et le filtrage côté client des produits devient redondant (inoffensif). Bâti Plus, CECADO et leurs 54 produits restent visibles par anon (testé).
- `AdminSpace.tsx` : les 7 démo restent listés pour l'admin ; un clic « approuver » sur un démo est désormais refusé par la base, mais `setMerchantStatus` n'affiche pas l'erreur (le statut reste simplement inchangé après rafraîchissement).
- Propriétaire du `Kiosque Test Automatise` (compte de test) : ne voit plus son commerce, ses produits ni ses 3 commandes côté marchand ; `MerchantSpace` / `Profile` le traitent comme sans commerce.
- **Conflit avec 022 (non appliquée)** : `force_pending_on_signup()` force `new.rating := 5` à l'inscription ; à ramener à 0 avant d'appliquer 022, sinon chaque nouveau commerçant renaît avec une note 5 sans avis.
- `reviews` reste en lecture publique `using (true)` : l'avis de test du kiosque est lisible par l'API. Non traité (hors demande).
- Rejouer `002` sur une base neuve recrée les 6 fictifs en `approved` via `006` jusqu'à ce que `020` passe ; c'est `020` qui les marque et le trigger bloque ensuite toute réapprobation (020 échoue si l'un d'eux est approuvé : les suspendre d'abord sur une base neuve).
