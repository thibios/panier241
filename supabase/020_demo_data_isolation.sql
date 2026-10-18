-- 020 — Isolement des données de démonstration et notes issues des seuls avis réels
--
-- Décision du propriétaire (18/10/2026, docs/audits/AUDIT_FAUX_COMMERCANTS.md) : les 7 commerçants
-- fictifs (6 du seed de 002 + « Kiosque Test Automatise ») sont CONSERVÉS en production, suspendus,
-- comme données de test et de visualisation. Aucune suppression de commerçant, produit, commande ou avis.
--
-- Contenu :
--   1. merchants.is_demo : marquage des 7 commerçants ; un commerçant de démonstration n'est jamais
--      approuvé (trigger) et n'est lisible par l'API que par l'administrateur.
--   2. products : lecture réservée aux produits des commerçants approuvés (non démo), au propriétaire
--      du commerce (non démo) et à l'administrateur. Remplace la policy « using (true) » de 002.
--   3. Notes : défaut de merchants.rating à 0, recalcul depuis reviews, trigger insert/update/delete.
--   4. Favoris orphelins (commerce inexistant) supprimés. Commandes orphelines conservées telles quelles.
--
-- Aucun prix n'est saisi ni modifié par cette migration.
-- À appliquer en une seule transaction.

begin;

-- ---------------------------------------------------------------------------
-- 1. Commerçants de démonstration
-- ---------------------------------------------------------------------------

alter table public.merchants
  add column if not exists is_demo boolean not null default false;

comment on column public.merchants.is_demo is
  'Donnée de démonstration, jamais visible du public. Conservée en base pour les tests et la visualisation '
  '(décision du propriétaire, migration 020). Un commerçant is_demo ne peut jamais être approuvé ; '
  'seul l''administrateur le lit par l''API. Le marquage ne se modifie que par migration.';

update public.merchants
set is_demo = true
where id in (
  '10000000-0000-0000-0000-000000000001', -- Chez Maman Adjoua (seed 002)
  '10000000-0000-0000-0000-000000000002', -- Étal Nguema Fruits (seed 002)
  '10000000-0000-0000-0000-000000000003', -- Poissonnerie de Nkembo (seed 002)
  '10000000-0000-0000-0000-000000000004', -- Boucherie Centrale Oloumi (seed 002)
  '10000000-0000-0000-0000-000000000005', -- Épicerie Traditionnelle Akébé (seed 002)
  '10000000-0000-0000-0000-000000000006', -- Le Jardin de Mont-Bouët (seed 002)
  'c8f0355b-497f-41df-8458-0b9f35aea535'  -- Kiosque Test Automatise (compte de test)
);

-- Garde-fous : exactement 7 commerçants marqués, aucun commerçant réel, aucun approuvé.
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.merchants where is_demo;
  if v_count <> 7 then
    raise exception '020 : % commerçants marqués is_demo au lieu de 7 : arrêt', v_count;
  end if;
  if exists (
    select 1 from public.merchants
    where is_demo and (name in ('Bâti Plus Gabon', 'CECADO') or status = 'approved')
  ) then
    raise exception '020 : un commerçant réel ou approuvé est marqué is_demo : arrêt';
  end if;
end $$;

-- Un commerçant de démonstration n'est jamais approuvé, même par l'administrateur.
-- Le marquage is_demo ne se modifie pas par l'API (anon / authenticated), seulement par migration.
create or replace function public.guard_demo_merchant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.is_demo then
      raise exception 'Un commerçant de démonstration ne se crée que par migration' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.is_demo is distinct from old.is_demo then
      raise exception 'Le marquage démonstration ne se modifie que par migration' using errcode = '42501';
    end if;
  end if;
  if new.is_demo and new.status = 'approved' then
    raise exception 'Un commerçant de démonstration ne peut pas être approuvé' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_demo_merchant() from public, anon, authenticated;

drop trigger if exists guard_demo_merchant on public.merchants;
create trigger guard_demo_merchant
  before insert or update on public.merchants
  for each row execute function public.guard_demo_merchant();

-- Lecture : approuvé et non démo, ou propriétaire (non démo), ou administrateur.
drop policy if exists "Lecture des marchands approuves, du proprietaire ou de l'admin" on public.merchants;
create policy "Lecture marchands : approuves non demo, proprietaire, admin"
  on public.merchants for select
  using (
    (status = 'approved' and not is_demo)
    or (owner_id = auth.uid() and not is_demo)
    or public.is_admin()
  );

-- Le propriétaire d'un commerçant de démonstration ne le modifie ni ne le supprime.
drop policy if exists "Le proprietaire modifie son marchand" on public.merchants;
create policy "Le proprietaire modifie son marchand"
  on public.merchants for update
  using (auth.uid() = owner_id and not is_demo)
  with check (auth.uid() = owner_id and not is_demo);

drop policy if exists "Le proprietaire supprime son marchand" on public.merchants;
create policy "Le proprietaire supprime son marchand"
  on public.merchants for delete
  using (auth.uid() = owner_id and not is_demo);

-- ---------------------------------------------------------------------------
-- 2. Produits : plus de lecture publique des produits des commerçants non approuvés
-- ---------------------------------------------------------------------------

drop policy if exists "Lecture publique des produits" on public.products;
create policy "Lecture produits : marchand approuve non demo, proprio, admin"
  on public.products for select
  using (
    exists (
      select 1 from public.merchants m
      where m.id = products.merchant_id
        and not m.is_demo
        and (m.status = 'approved' or m.owner_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "Le proprietaire gere ses produits" on public.products;
create policy "Le proprietaire gere ses produits"
  on public.products for all
  using (exists (
    select 1 from public.merchants m
    where m.id = products.merchant_id and m.owner_id = auth.uid() and not m.is_demo
  ))
  with check (exists (
    select 1 from public.merchants m
    where m.id = products.merchant_id and m.owner_id = auth.uid() and not m.is_demo
  ));

-- ---------------------------------------------------------------------------
-- 3. Notes : uniquement issues de la table reviews
-- ---------------------------------------------------------------------------

alter table public.merchants alter column rating set default 0;

update public.merchants m
set review_count = s.n,
    rating       = s.avg_rating
from (
  select mm.id,
         count(r.id)::integer as n,
         coalesce(round(avg(r.rating)::numeric, 1), 0) as avg_rating
  from public.merchants mm
  left join public.reviews r on r.merchant_id = mm.id
  group by mm.id
) s
where s.id = m.id
  and (m.review_count is distinct from s.n or m.rating is distinct from s.avg_rating);

create or replace function public.update_merchant_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid;
begin
  foreach v_target in array array[
    case when tg_op in ('INSERT', 'UPDATE') then new.merchant_id end,
    case when tg_op in ('UPDATE', 'DELETE') then old.merchant_id end
  ] loop
    continue when v_target is null;
    update public.merchants
    set review_count = (select count(*) from public.reviews where merchant_id = v_target),
        rating       = coalesce((select round(avg(rating)::numeric, 1)
                                 from public.reviews where merchant_id = v_target), 0)
    where id = v_target;
  end loop;
  return null; -- trigger AFTER : valeur de retour ignorée
end;
$$;

revoke execute on function public.update_merchant_rating() from public, anon, authenticated;

drop trigger if exists on_review_created on public.reviews;
drop trigger if exists on_review_changed on public.reviews;
create trigger on_review_changed
  after insert or update or delete on public.reviews
  for each row execute function public.update_merchant_rating();

-- ---------------------------------------------------------------------------
-- 4. Données orphelines
-- ---------------------------------------------------------------------------

-- Favoris pointant vers un commerce inexistant (ids mch-* de l'ancienne maquette ; 3 lignes le 18/10/2026).
-- Accord du propriétaire pour ce seul nettoyage.
delete from public.favorites f
where not exists (select 1 from public.merchants m where m.id::text = f.merchant_id);

-- Commandes orphelines (merchant_id sans commerçant) : CONSERVÉES telles quelles, aucune écriture.
-- Liste au 18/10/2026 : voir docs/audits/AUDIT_FAUX_COMMERCANTS.md, section « Décision et migration ».

commit;
