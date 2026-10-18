-- 022 — Moteur de commande côté serveur (décisions D1 à D5 validées par le propriétaire)
--
-- Contenu :
--   0. Faille : fiche commerçant ou livreur insérée directement « approved » -> forcée « pending ».
--      Prérequis : 020 appliquée (merchants.is_demo, rating par défaut 0). Les policies de 020 ne sont pas modifiées.
--   1. Paramètres de tarification en base (app_settings) et coordonnées des lieux de vente (market_locations).
--   2. Nouvelles colonnes de commande (mode, montants, parts, acompte, paiement, ajustement) et nouveaux statuts.
--   3. Tables d'audit : order_status_history, order_ledger (append-only), order_amount_adjustments,
--      order_delivery_details (adresse complète / GPS / repère), order_disputes.
--   0 bis. merchants.rating / review_count verrouillés en UPDATE pour tout non-admin.
--   4. Fonctions RPC : create_order (idempotente), set_order_status, adjust_order_amount, respond_to_adjustment,
--      record_payment, record_payout, list_available_deliveries, list_my_deliveries, admin_orders.
--   5. RLS : plus aucune écriture directe dans orders par l'API ; le livreur ne lit que ses courses.
--
-- Montants : prix du magasin (products.price, saisis par le commerçant), jamais le prix officiel DGCCRF.
-- Barème confirmé par le propriétaire : avec GPS 2000 F + 300 F/km (haversine, comme src/lib/pricing.ts) ;
-- sans GPS forfait 1500 F AU TOTAL ; commission 5 % ; acompte 5 % du total au-delà de 100 000 F.
-- src/lib/pricing.ts (forfait sans GPS = 2000 + 1500 aujourd'hui) devra être aligné côté front.
-- À appliquer en une seule transaction. Retour arrière : docs/audits/ORDER_ENGINE.md.

begin;

-- ---------------------------------------------------------------------------
-- 0. Faille critique : inscription directe en « approved »
-- ---------------------------------------------------------------------------

create or replace function public.force_pending_on_signup()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Seules les requêtes de l'API (anon / authenticated) sont contraintes ; les scripts
  -- d'administration (rôle postgres) et l'administrateur gardent la main.
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.status := 'pending';
    if tg_table_name = 'merchants' then
      new.rating := 0;          -- valeur par défaut de la colonne depuis 020 (aucun avis)
      new.review_count := 0;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.force_pending_on_signup() from public, anon, authenticated;

drop trigger if exists force_pending_on_insert on public.merchants;
create trigger force_pending_on_insert
  before insert on public.merchants
  for each row execute function public.force_pending_on_signup();

drop trigger if exists force_pending_on_insert on public.livreurs;
create trigger force_pending_on_insert
  before insert on public.livreurs
  for each row execute function public.force_pending_on_signup();

-- 0 bis. Note et nombre d'avis : jamais modifiables par l'API hors administrateur.
--        Seul le recalcul depuis reviews (update_merchant_rating, security definer, 020) les change.
create or replace function public.lock_merchant_rating()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.rating := old.rating;
    new.review_count := old.review_count;
  end if;
  return new;
end;
$$;

revoke execute on function public.lock_merchant_rating() from public, anon, authenticated;

drop trigger if exists lock_merchant_rating on public.merchants;
create trigger lock_merchant_rating
  before update on public.merchants
  for each row execute function public.lock_merchant_rating();

-- ---------------------------------------------------------------------------
-- 1. Paramètres et coordonnées
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key text primary key,
  value numeric not null check (value >= 0),
  label text not null,
  a_confirmer boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint app_settings_rate_le_1 check (key not like '%\_rate' or value <= 1)
);

alter table public.app_settings enable row level security;

create policy "Lecture publique des parametres"
  on public.app_settings for select
  using (true);

create policy "L'admin modifie les parametres"
  on public.app_settings for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "L'admin ajoute des parametres"
  on public.app_settings for insert
  with check (public.is_admin());

revoke delete, truncate, trigger, references on public.app_settings from anon, authenticated;

insert into public.app_settings (key, value, label, a_confirmer) values
  ('delivery_base_fee',            2000,   'Livraison : partie fixe (F CFA)', false),
  ('delivery_rate_per_km',         300,    'Livraison : prix par km à vol d''oiseau (F CFA)', false),
  ('delivery_fallback_fee',        1500,   'Livraison sans GPS : forfait total (F CFA)', false),
  ('service_fee_rate',             0.05,   'Commission plateforme (part du sous-total)', false),
  ('deposit_threshold',            100000, 'Seuil d''acompte : total de commande au-delà duquel un acompte est dû (F CFA)', false),
  ('deposit_rate',                 0.05,   'Acompte : part du total de la commande', false),
  ('adjustment_auto_max_rate',     0.10,   'Ajustement commerçant appliqué sans accord du client jusqu''à +10 %', false)
on conflict (key) do nothing;

create or replace function public.touch_app_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
revoke execute on function public.touch_app_settings() from public, anon, authenticated;

create trigger touch_app_settings
  before update on public.app_settings
  for each row execute function public.touch_app_settings();

create or replace function public.setting_value(p_key text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v numeric;
begin
  select value into v from public.app_settings where key = p_key;
  if v is null then
    raise exception 'Paramètre manquant : %', p_key using errcode = 'P0002';
  end if;
  return v;
end;
$$;
revoke execute on function public.setting_value(text) from public, anon, authenticated;

-- Coordonnées des lieux de vente (reprises de src/data/markets.ts). Un lieu absent = forfait sans GPS.
create table if not exists public.market_locations (
  market_id text primary key,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.market_locations enable row level security;

create policy "Lecture publique des coordonnees des lieux"
  on public.market_locations for select
  using (true);

create policy "L'admin gere les coordonnees des lieux"
  on public.market_locations for all
  using (public.is_admin())
  with check (public.is_admin());

revoke truncate, trigger, references on public.market_locations from anon, authenticated;

insert into public.market_locations (market_id, lat, lng) values
  ('mkt-mont-bouet', 0.3901, 9.4544),
  ('mkt-bati-plus', 0.407, 9.448),
  ('mkt-ceca-gadis', 0.4, 9.455),
  ('mkt-centre-affaires', 0.3936, 9.4523)
on conflict (market_id) do nothing;

-- Même formule que haversineDistanceKm (src/lib/pricing.ts).
create or replace function public.haversine_km(lat1 double precision, lng1 double precision,
                                               lat2 double precision, lng2 double precision)
returns double precision
language sql
immutable
set search_path = public
as $$
  select 6371 * 2 * atan2(sqrt(h), sqrt(1 - h))
  from (
    select sin(radians(lat2 - lat1) / 2) ^ 2
         + sin(radians(lng2 - lng1) / 2) ^ 2 * cos(radians(lat1)) * cos(radians(lat2)) as h
  ) s;
$$;

-- ---------------------------------------------------------------------------
-- 2. Commandes : colonnes et statuts
-- ---------------------------------------------------------------------------

alter table public.orders add column if not exists fulfillment_mode text not null default 'livraison'
  check (fulfillment_mode in ('livraison', 'retrait'));
alter table public.orders add column if not exists discount_amount integer not null default 0
  check (discount_amount >= 0);
alter table public.orders add column if not exists deposit_amount integer not null default 0
  check (deposit_amount >= 0);
alter table public.orders add column if not exists deposit_status text not null default 'non_requis'
  check (deposit_status in ('non_requis', 'du', 'encaisse', 'inclus_solde'));
alter table public.orders add column if not exists deposit_paid_at timestamptz;
alter table public.orders add column if not exists payment_method text
  check (payment_method in ('airtel_money', 'moov_money', 'especes'));
alter table public.orders add column if not exists payment_status text
  check (payment_status in ('du', 'encaisse'));
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists initial_subtotal integer;
alter table public.orders add column if not exists adjustment_status text not null default 'aucun'
  check (adjustment_status in ('aucun', 'applique', 'en_attente', 'accepte', 'refuse', 'caduc'));
alter table public.orders add column if not exists proposed_subtotal integer check (proposed_subtotal > 0);
alter table public.orders add column if not exists accepted_at timestamptz;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
-- Idempotence de create_order : un même identifiant de tentative ne crée qu'une commande par client.
alter table public.orders add column if not exists client_request_id uuid;
create unique index if not exists orders_client_request_unique on public.orders (user_id, client_request_id);

-- Parts de chaque bénéficiaire, toujours cohérentes avec les montants (colonnes calculées).
alter table public.orders add column if not exists merchant_share integer
  generated always as (subtotal - discount_amount) stored;
alter table public.orders add column if not exists courier_share integer
  generated always as (delivery_fee) stored;
alter table public.orders add column if not exists platform_share integer
  generated always as (service_fee) stored;

-- Le trigger 014/016 renverrait l'ancienne ligne pour les commandes annulées : désactivé le temps de la reprise.
alter table public.orders disable trigger protect_order_columns;

update public.orders set initial_subtotal = subtotal where initial_subtotal is null;
alter table public.orders alter column initial_subtotal set not null;

-- Reprise des statuts : « en_livraison » sans livreur voulait dire « prête, en attente de livreur ».
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status = 'prete_a_livrer' where status = 'en_livraison' and livreur_id is null;
alter table public.orders enable trigger protect_order_columns;
alter table public.orders add constraint orders_status_check check (status in (
  'en_preparation', 'prete_a_livrer', 'en_livraison', 'livree',
  'prete_a_retirer', 'retiree', 'annulee'));

alter table public.orders add constraint orders_amounts_consistent check (
  subtotal >= 0 and service_fee >= 0 and delivery_fee >= 0
  and discount_amount <= subtotal
  and total = subtotal - discount_amount + service_fee + delivery_fee
  and deposit_amount <= total);

alter table public.orders add constraint orders_mode_status_consistent check (
  (fulfillment_mode = 'livraison' and status not in ('prete_a_retirer', 'retiree'))
  or (fulfillment_mode = 'retrait' and status not in ('prete_a_livrer', 'en_livraison', 'livree')));

alter table public.orders add constraint orders_pickup_without_courier check (
  fulfillment_mode = 'livraison' or (livreur_id is null and delivery_fee = 0));

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_merchant_idx on public.orders (merchant_id);
create index if not exists orders_livreur_idx on public.orders (livreur_id);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Tables d'audit et de détail
-- ---------------------------------------------------------------------------

-- Adresse complète, GPS et repère : séparés de orders pour que seul le livreur affecté les lise.
create table if not exists public.order_delivery_details (
  order_id uuid primary key references public.orders (id) on delete cascade,
  full_address text not null check (char_length(full_address) between 3 and 300),
  landmark text check (char_length(landmark) <= 200),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);

-- Historique des statuts (obligatoire, alimenté par trigger, append-only).
-- Pas de clé étrangère : l'historique survit à la suppression d'un compte.
create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  old_status text,
  new_status text not null,
  changed_by uuid,
  actor_role text not null check (actor_role in ('client', 'commercant', 'livreur', 'admin', 'systeme')),
  event text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Journal financier append-only. Lecture :
--   créances par bénéficiaire = somme(amount) des lignes entry_type in ('commande','livraison','commission') ;
--   'acompte' = part du montant « commande » à régler d'avance (informatif, déjà incluse) ;
--   'encaissement' = argent reçu (beneficiary = qui détient l'argent) ; 'reversement' = argent reversé.
create table if not exists public.order_ledger (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  entry_type text not null check (entry_type in ('commande', 'livraison', 'commission', 'acompte', 'encaissement', 'reversement')),
  event text not null,
  amount integer not null,
  beneficiary text not null check (beneficiary in ('commercant', 'livreur', 'plateforme', 'client')),
  beneficiary_ref text,
  payer text check (payer in ('client', 'commercant', 'livreur', 'plateforme')),
  payment_method text check (payment_method in ('airtel_money', 'moov_money', 'especes')),
  state text not null check (state in ('du', 'encaisse', 'annule')),
  actor_id uuid,
  actor_role text not null,
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists order_ledger_order_idx on public.order_ledger (order_id, created_at);
create index if not exists order_ledger_beneficiary_idx on public.order_ledger (beneficiary, beneficiary_ref);

-- Ajustements de montant (D1).
create table if not exists public.order_amount_adjustments (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  old_subtotal integer not null,
  new_subtotal integer not null,
  old_total integer not null,
  new_total integer not null,
  reason text not null check (char_length(reason) between 1 and 300),
  requested_by uuid not null,
  decision text not null check (decision in ('applique', 'en_attente', 'accepte', 'refuse', 'caduc')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists order_amount_adjustments_one_per_order on public.order_amount_adjustments (order_id);

-- Litiges (minimal, sans interface pour l'instant).
create table if not exists public.order_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  opened_by uuid not null default auth.uid(),
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  status text not null default 'ouvert' check (status in ('ouvert', 'en_cours', 'resolu', 'rejete')),
  resolution text check (char_length(resolution) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists order_disputes_order_idx on public.order_disputes (order_id);

-- Append-only : aucune modification ni suppression, quel que soit le rôle.
create or replace function public.forbid_update_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Table % en ajout seul : modification et suppression interdites', tg_table_name
    using errcode = '42501';
end;
$$;
revoke execute on function public.forbid_update_delete() from public, anon, authenticated;

create trigger order_status_history_append_only
  before update or delete on public.order_status_history
  for each row execute function public.forbid_update_delete();
create trigger order_ledger_append_only
  before update or delete on public.order_ledger
  for each row execute function public.forbid_update_delete();

-- Rôle d'un utilisateur vis-à-vis d'une commande (sert aux policies des tables liées).
create or replace function public.order_access_role(p_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then 'admin'
    when o.user_id = auth.uid() then 'client'
    when exists (select 1 from public.merchants m where m.id::text = o.merchant_id and m.owner_id = auth.uid()) then 'commercant'
    when o.livreur_id is not null
         and o.livreur_id = (select l.id from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
      then 'livreur'
  end
  from public.orders o
  where o.id = p_order_id;
$$;
revoke execute on function public.order_access_role(uuid) from public, anon;
grant execute on function public.order_access_role(uuid) to authenticated;

alter table public.order_delivery_details enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_ledger enable row level security;
alter table public.order_amount_adjustments enable row level security;
alter table public.order_disputes enable row level security;

create policy "Adresse visible du client, du commercant, de l'admin et du livreur affecte en course"
  on public.order_delivery_details for select
  to authenticated
  using (
    public.order_access_role(order_id) in ('admin', 'client', 'commercant')
    or (
      public.order_access_role(order_id) = 'livreur'
      and exists (select 1 from public.orders o where o.id = order_id and o.status in ('prete_a_livrer', 'en_livraison'))
    )
  );

create policy "Historique visible des participants de la commande"
  on public.order_status_history for select
  to authenticated
  using (public.order_access_role(order_id) is not null);

create policy "Journal financier visible du commercant, du livreur affecte et de l'admin"
  on public.order_ledger for select
  to authenticated
  using (public.order_access_role(order_id) in ('admin', 'commercant', 'livreur'));

create policy "Ajustements visibles du client, du commercant et de l'admin"
  on public.order_amount_adjustments for select
  to authenticated
  using (public.order_access_role(order_id) in ('admin', 'client', 'commercant'));

create policy "Litige visible de son auteur et de l'admin"
  on public.order_disputes for select
  to authenticated
  using (opened_by = auth.uid() or public.is_admin());

create policy "Un participant ouvre un litige sur sa commande"
  on public.order_disputes for insert
  to authenticated
  with check (
    opened_by = auth.uid()
    and status = 'ouvert' and resolution is null and resolved_at is null
    and public.order_access_role(order_id) in ('client', 'commercant', 'livreur')
  );

create policy "L'admin traite les litiges"
  on public.order_disputes for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Écritures réservées aux fonctions du moteur (security definer).
revoke insert, update, delete, truncate, trigger, references on public.order_delivery_details from anon, authenticated;
revoke insert, update, delete, truncate, trigger, references on public.order_status_history from anon, authenticated;
revoke insert, update, delete, truncate, trigger, references on public.order_ledger from anon, authenticated;
revoke insert, update, delete, truncate, trigger, references on public.order_amount_adjustments from anon, authenticated;
revoke delete, truncate, trigger, references on public.order_disputes from anon, authenticated;
revoke all on public.order_delivery_details, public.order_status_history, public.order_ledger,
              public.order_amount_adjustments, public.order_disputes from anon;

-- ---------------------------------------------------------------------------
-- Reprise des données existantes (avant la pose des triggers d'audit)
-- ---------------------------------------------------------------------------

insert into public.order_status_history (order_id, old_status, new_status, changed_by, actor_role, event, reason, created_at)
select o.id, null, o.status, null, 'systeme', 'reprise_migration_022',
       case when o.status = 'prete_a_livrer' then 'Ancien statut en_livraison sans livreur' end,
       now()
from public.orders o;

insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_role, note)
select o.id, x.entry_type, 'reprise_migration_022', x.amount, x.beneficiary, x.ref, 'client', 'du', 'systeme',
       'Montants repris tels qu''enregistrés avant 022 (calculés par le navigateur)'
from public.orders o
cross join lateral (values
  ('commande',   o.subtotal - o.discount_amount, 'commercant', o.merchant_id),
  ('livraison',  o.delivery_fee,                 'livreur',    o.livreur_id::text),
  ('commission', o.service_fee,                  'plateforme', null)
) as x(entry_type, amount, beneficiary, ref)
where x.amount > 0;

insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_role, note)
select o.id, x.entry_type, 'annulation', -x.amount, x.beneficiary, x.ref, 'client', 'annule', 'systeme',
       'Commande annulée avant 022'
from public.orders o
cross join lateral (values
  ('commande',   o.subtotal - o.discount_amount, 'commercant', o.merchant_id),
  ('livraison',  o.delivery_fee,                 'livreur',    o.livreur_id::text),
  ('commission', o.service_fee,                  'plateforme', null)
) as x(entry_type, amount, beneficiary, ref)
where o.status = 'annulee' and x.amount > 0;

-- ---------------------------------------------------------------------------
-- Triggers sur orders
-- ---------------------------------------------------------------------------

-- Contexte de l'acteur, posé par les fonctions du moteur pour la transaction en cours.
create or replace function public.order_engine_ctx(p_key text)
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('panier241.' || p_key, true), '');
$$;
revoke execute on function public.order_engine_ctx(text) from public, anon, authenticated;

-- 2a. Aucune écriture directe par l'API : création par create_order, changement de statut par set_order_status.
create or replace function public.guard_order_direct_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      raise exception 'Création directe interdite : utiliser create_order()' using errcode = '42501';
    elsif new.status is distinct from old.status then
      raise exception 'Changement de statut direct interdit : utiliser set_order_status()' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_order_direct_write() from public, anon, authenticated;

drop trigger if exists guard_order_direct_write on public.orders;
create trigger guard_order_direct_write
  before insert or update on public.orders
  for each row execute function public.guard_order_direct_write();

-- 2b. protect_order_columns (014/016) : inchangé pour l'API ; les fonctions du moteur
--     (exécutées sous le rôle propriétaire) sont le seul chemin autorisé pour changer un montant.
create or replace function public.protect_order_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  me public.livreurs%rowtype;
begin
  if current_user not in ('anon', 'authenticated') then
    new.updated_at := now();
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if old.status = 'annulee' then
    return old;
  end if;

  new.user_id := old.user_id;
  new.merchant_id := old.merchant_id;
  new.merchant_name := old.merchant_name;
  new.items := old.items;
  new.subtotal := old.subtotal;
  new.service_fee := old.service_fee;
  new.delivery_fee := old.delivery_fee;
  new.distance_km := old.distance_km;
  new.total := old.total;
  new.slot_label := old.slot_label;
  new.address_label := old.address_label;
  new.client_phone := old.client_phone;
  new.shopping_video_url := old.shopping_video_url;
  new.created_at := old.created_at;
  new.fulfillment_mode := old.fulfillment_mode;
  new.discount_amount := old.discount_amount;
  new.deposit_amount := old.deposit_amount;
  new.deposit_status := old.deposit_status;
  new.deposit_paid_at := old.deposit_paid_at;
  new.payment_method := old.payment_method;
  new.payment_status := old.payment_status;
  new.paid_at := old.paid_at;
  new.initial_subtotal := old.initial_subtotal;
  new.adjustment_status := old.adjustment_status;
  new.proposed_subtotal := old.proposed_subtotal;
  new.accepted_at := old.accepted_at;

  if new.status = 'annulee' then
    new.cancelled_at := now();
  else
    new.cancelled_at := old.cancelled_at;
    new.cancel_reason := old.cancel_reason;
  end if;

  if new.livreur_id is distinct from old.livreur_id
     or new.livreur_name is distinct from old.livreur_name
     or new.livreur_phone is distinct from old.livreur_phone then
    select * into me from public.livreurs where owner_id = auth.uid() and status = 'approved';
    if old.livreur_id is null and me.id is not null and new.livreur_id = me.id then
      new.livreur_name := me.name;
      new.livreur_phone := me.phone;
    else
      new.livreur_id := old.livreur_id;
      new.livreur_name := old.livreur_name;
      new.livreur_phone := old.livreur_phone;
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function public.protect_order_columns() from public, anon, authenticated;

-- 2c. Audit : historique des statuts et journal financier.
create or replace function public.order_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(public.order_engine_ctx('actor_role'), 'systeme');
  v_event text;
  v_reason text := public.order_engine_ctx('reason');
  v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    v_event := coalesce(public.order_engine_ctx('event'), 'creation');
    insert into public.order_status_history (order_id, old_status, new_status, changed_by, actor_role, event, reason)
    values (new.id, null, new.status, v_uid, v_role, v_event, v_reason);

    insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_id, actor_role, note)
    select new.id, x.entry_type, 'creation', x.amount, x.beneficiary, x.ref, 'client', 'du', v_uid, v_role, x.note
    from (values
      ('commande',   new.subtotal - new.discount_amount, 'commercant', new.merchant_id, null::text),
      ('livraison',  new.delivery_fee,                   'livreur',    null,            'Livreur non encore affecté'),
      ('commission', new.service_fee,                    'plateforme', null,            null),
      ('acompte',    new.deposit_amount,                 'commercant', new.merchant_id, 'Part du montant commande à régler d''avance')
    ) as x(entry_type, amount, beneficiary, ref, note)
    where x.amount > 0 or x.entry_type = 'commande';
    return new;
  end if;

  v_event := coalesce(public.order_engine_ctx('event'), 'modification_systeme');

  if new.status is distinct from old.status then
    insert into public.order_status_history (order_id, old_status, new_status, changed_by, actor_role, event, reason)
    values (new.id, old.status, new.status, v_uid, v_role, v_event, v_reason);
  end if;

  if old.status <> 'annulee' and new.status = 'annulee' then
    insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_id, actor_role, note)
    select new.id, x.entry_type, 'annulation', -x.amount, x.beneficiary, x.ref, 'client', 'annule', v_uid, v_role, v_reason
    from (values
      ('commande',   old.subtotal - old.discount_amount, 'commercant', old.merchant_id),
      ('livraison',  old.delivery_fee,                   'livreur',    old.livreur_id::text),
      ('commission', old.service_fee,                    'plateforme', null)
    ) as x(entry_type, amount, beneficiary, ref)
    where x.amount > 0;

    if old.deposit_status = 'encaisse' or old.payment_status = 'encaisse' then
      insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_id, actor_role, note)
      values (new.id, 'reversement', 'annulation',
              case when old.payment_status = 'encaisse' then old.total else old.deposit_amount end,
              'client', new.user_id::text,
              case when old.payment_status = 'encaisse' and old.fulfillment_mode = 'livraison' then 'livreur' else 'commercant' end,
              'du', v_uid, v_role, 'Somme déjà encaissée à rembourser au client');
    end if;
    return new;
  end if;

  if old.status = 'annulee' and new.status <> 'annulee' then
    insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_id, actor_role, note)
    select new.id, x.entry_type, 'reprise_admin', x.amount, x.beneficiary, x.ref, 'client', 'du', v_uid, v_role, v_reason
    from (values
      ('commande',   new.subtotal - new.discount_amount, 'commercant', new.merchant_id),
      ('livraison',  new.delivery_fee,                   'livreur',    new.livreur_id::text),
      ('commission', new.service_fee,                    'plateforme', null)
    ) as x(entry_type, amount, beneficiary, ref)
    where x.amount > 0;
    return new;
  end if;

  if new.status <> 'annulee' then
    -- Changements de montant.
    insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_id, actor_role, note)
    select new.id, x.entry_type, v_event, x.delta, x.beneficiary, x.ref, 'client', 'du', v_uid, v_role, v_reason
    from (values
      ('commande',   (new.subtotal - new.discount_amount) - (old.subtotal - old.discount_amount), 'commercant', new.merchant_id),
      ('livraison',  new.delivery_fee - old.delivery_fee,     'livreur',    new.livreur_id::text),
      ('commission', new.service_fee - old.service_fee,       'plateforme', null),
      ('acompte',    new.deposit_amount - old.deposit_amount, 'commercant', new.merchant_id)
    ) as x(entry_type, delta, beneficiary, ref)
    where x.delta <> 0;

    -- Attribution (ou retrait) du livreur : la part livraison change de bénéficiaire.
    if new.livreur_id is distinct from old.livreur_id and old.delivery_fee > 0 then
      insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, state, actor_id, actor_role, note)
      values
        (new.id, 'livraison', 'attribution_livreur', -old.delivery_fee, 'livreur', old.livreur_id::text, 'client', 'du', v_uid, v_role, 'Part livraison retirée'),
        (new.id, 'livraison', 'attribution_livreur',  old.delivery_fee, 'livreur', new.livreur_id::text, 'client', 'du', v_uid, v_role, 'Part livraison attribuée');
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function public.order_audit() from public, anon, authenticated;

drop trigger if exists order_audit on public.orders;
create trigger order_audit
  after insert or update on public.orders
  for each row execute function public.order_audit();

-- ---------------------------------------------------------------------------
-- RLS orders : plus d'écriture directe, livreur limité à ses courses
-- ---------------------------------------------------------------------------

drop policy if exists "Seul le client cree sa commande" on public.orders;
drop policy if exists "Le client annule sa commande en preparation" on public.orders;
drop policy if exists "Seul le marchand met a jour le statut de sa commande" on public.orders;
drop policy if exists "Le livreur accepte et met a jour sa livraison" on public.orders;

-- Le livreur ne lit plus la liste des courses disponibles en direct (adresse et téléphone du client exposés) :
-- il passe par list_available_deliveries(). Il ne lit la ligne complète (téléphone du client compris) que de
-- sa course EN COURS ; dès qu'elle est livrée ou annulée, il ne la voit plus que par list_my_deliveries(),
-- sans téléphone ni adresse (choix : masquage immédiat, plus simple et plus strict qu'un délai de 24 h).
drop policy if exists "Le livreur voit les livraisons disponibles ou les siennes" on public.orders;
create policy "Le livreur voit sa course en cours"
  on public.orders for select
  using (
    livreur_id is not null
    and status = 'en_livraison'
    and livreur_id = (select l.id from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
  );

revoke insert, update, delete on public.orders from anon, authenticated;

-- Avis : une commande retirée sur stand vaut une commande livrée.
drop policy if exists "Le client note sa propre commande livree" on public.reviews;
create policy "Le client note sa propre commande livree"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.user_id = auth.uid()
        and o.status in ('livree', 'retiree')
        and o.merchant_id = reviews.merchant_id::text
    )
    and not exists (
      select 1 from public.merchants m where m.id = reviews.merchant_id and m.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Fonctions du moteur
-- ---------------------------------------------------------------------------

create or replace function public.order_engine_set_ctx(p_role text, p_event text, p_reason text)
returns void
language sql
set search_path = public
as $$
  select set_config('panier241.actor_role', coalesce(p_role, ''), true),
         set_config('panier241.event', coalesce(p_event, ''), true),
         set_config('panier241.reason', coalesce(p_reason, ''), true);
$$;
revoke execute on function public.order_engine_set_ctx(text, text, text) from public, anon, authenticated;

create or replace function public.order_engine_commission(p_base integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select round(p_base * public.setting_value('service_fee_rate'))::integer;
$$;
revoke execute on function public.order_engine_commission(integer) from public, anon, authenticated;

-- Acompte : pourcentage du TOTAL, dû quand le total dépasse le seuil.
create or replace function public.order_engine_deposit(p_total integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when p_total > public.setting_value('deposit_threshold')
              then round(p_total * public.setting_value('deposit_rate'))::integer
              else 0 end;
$$;
revoke execute on function public.order_engine_deposit(integer) from public, anon, authenticated;

-- 4a. Création de commande : seuls les identifiants et quantités viennent du navigateur.
create or replace function public.create_order(
  p_client_request_id uuid,
  p_merchant_id uuid,
  p_items jsonb,
  p_mode text,
  p_slot_label text,
  p_phone text,
  p_payment_method text,
  p_address text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_landmark text default null,
  p_address_label text default null,
  p_shopping_video_url text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m public.merchants%rowtype;
  v_phone text;
  v_slot text := nullif(btrim(coalesce(p_slot_label, '')), '');
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_landmark text := nullif(btrim(coalesce(p_landmark, '')), '');
  v_label text := nullif(btrim(coalesce(p_address_label, '')), '');
  v_bad int;
  v_lines int;
  v_found int;
  v_items jsonb;
  v_subtotal bigint;
  v_discount integer := 0;   -- aucune réduction pour l'instant (codes promo : phase 2)
  v_service integer;
  v_delivery integer := 0;
  v_distance numeric := null;
  v_mlat double precision;
  v_mlng double precision;
  v_deposit integer;
  o public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_client_request_id is null then
    raise exception 'Identifiant de tentative obligatoire' using errcode = '22023';
  end if;
  -- Même tentative déjà enregistrée (double clic, nouvel essai réseau) : renvoie la commande existante.
  select * into o from public.orders where user_id = v_uid and client_request_id = p_client_request_id;
  if found then
    return o;
  end if;
  if p_mode is null or p_mode not in ('livraison', 'retrait') then
    raise exception 'Mode inconnu : livraison ou retrait' using errcode = '22023';
  end if;
  if v_slot is null or char_length(v_slot) > 120 then
    raise exception 'Créneau obligatoire (120 caractères maximum)' using errcode = '22023';
  end if;
  v_phone := regexp_replace(coalesce(p_phone, ''), '[\s.\-()]', '', 'g');
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  if p_payment_method is null or p_payment_method not in ('airtel_money', 'moov_money', 'especes') then
    raise exception 'Moyen de paiement inconnu' using errcode = '22023';
  end if;
  if p_shopping_video_url is not null
     and p_shopping_video_url not like 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/shopping-videos/' || v_uid::text || '/%' then
    raise exception 'Lien de vidéo non autorisé' using errcode = '22023';
  end if;

  select * into m from public.merchants where id = p_merchant_id;
  if not found or m.status <> 'approved' or m.is_demo then
    raise exception 'Commerce introuvable ou indisponible' using errcode = 'P0002';
  end if;

  -- Articles : [{ "product_id" | "variant_id": uuid, "quantity": entier 1..1000 }]
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'Panier vide ou trop long (100 lignes maximum)' using errcode = '22023';
  end if;

  select count(*) into v_bad
  from jsonb_array_elements(p_items) e
  where jsonb_typeof(e) <> 'object'
     or coalesce(e ->> 'variant_id', e ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or case when coalesce(e ->> 'quantity', '') ~ '^[0-9]{1,4}$'
             then (e ->> 'quantity')::int not between 1 and 1000
             else true end;
  if v_bad > 0 then
    raise exception 'Article invalide (identifiant ou quantité entre 1 et 1000)' using errcode = '22023';
  end if;

  with raw as (
    select coalesce(e ->> 'variant_id', e ->> 'product_id')::uuid as product_id,
           (e ->> 'quantity')::int as quantity,
           ord
    from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  ), merged as (
    select product_id, sum(quantity)::int as quantity, min(ord) as ord
    from raw group by product_id
  )
  select count(*),
         count(p.id),
         jsonb_agg(jsonb_build_object(
           'productId', p.id,
           'productName', p.name || coalesce(' ' || p.variant_label, ''),
           'quantity', mg.quantity,
           'unitPrice', p.price,
           'unit', p.unit) order by mg.ord) filter (where p.id is not null),
         coalesce(sum(p.price::bigint * mg.quantity), 0)
    into v_lines, v_found, v_items, v_subtotal
  from merged mg
  left join public.products p on p.id = mg.product_id and p.merchant_id = m.id;

  if v_found <> v_lines then
    raise exception 'Produit introuvable ou appartenant à un autre commerçant (un seul commerçant par commande)'
      using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(v_items) i where (i ->> 'quantity')::int > 1000) then
    raise exception 'Quantité maximale 1000 par produit' using errcode = '22023';
  end if;
  if v_subtotal <= 0 or v_subtotal > 100000000 then
    raise exception 'Montant de commande hors limites' using errcode = '22023';
  end if;

  v_service := public.order_engine_commission((v_subtotal - v_discount)::int);

  if p_mode = 'livraison' then
    if v_address is null or char_length(v_address) not between 3 and 300 then
      raise exception 'Adresse de livraison obligatoire (3 à 300 caractères)' using errcode = '22023';
    end if;
    if v_landmark is not null and char_length(v_landmark) > 200 then
      raise exception 'Point de repère trop long (200 caractères maximum)' using errcode = '22023';
    end if;
    if (p_lat is null) <> (p_lng is null)
       or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
      raise exception 'Coordonnées GPS invalides' using errcode = '22023';
    end if;
    v_label := left(coalesce(v_label, v_address), 160);

    select lat, lng into v_mlat, v_mlng from public.market_locations where market_id = m.market_id;
    if v_mlat is not null and p_lat is not null then
      v_distance := public.haversine_km(v_mlat, v_mlng, p_lat, p_lng);
      v_delivery := public.setting_value('delivery_base_fee')::int
                    + round(v_distance * public.setting_value('delivery_rate_per_km'))::int;
    else
      v_delivery := public.setting_value('delivery_fallback_fee')::int;
    end if;
  else
    v_label := 'Retrait sur stand';
    v_delivery := 0;
  end if;

  v_deposit := public.order_engine_deposit((v_subtotal - v_discount + v_service + v_delivery)::int);

  perform public.order_engine_set_ctx('client', 'creation', null);

  begin
    insert into public.orders (
      user_id, merchant_id, merchant_name, items, subtotal, initial_subtotal, discount_amount,
      service_fee, delivery_fee, distance_km, total, status, slot_label, address_label,
      client_phone, shopping_video_url, fulfillment_mode, deposit_amount, deposit_status,
      payment_method, payment_status, client_request_id
    ) values (
      v_uid, m.id::text, m.name, v_items, v_subtotal, v_subtotal, v_discount,
      v_service, v_delivery, v_distance, v_subtotal - v_discount + v_service + v_delivery,
      'en_preparation', v_slot, v_label,
      v_phone, p_shopping_video_url, p_mode, v_deposit,
      case when v_deposit > 0 then 'du' else 'non_requis' end,
      p_payment_method, 'du', p_client_request_id
    ) returning * into o;
  exception when unique_violation then
    -- Deux appels simultanés avec le même identifiant : le second renvoie la commande du premier.
    select * into o from public.orders where user_id = v_uid and client_request_id = p_client_request_id;
    perform public.order_engine_set_ctx(null, null, null);
    return o;
  end;

  if p_mode = 'livraison' then
    insert into public.order_delivery_details (order_id, full_address, landmark, lat, lng)
    values (o.id, v_address, v_landmark, p_lat, p_lng);
  end if;

  perform public.order_engine_set_ctx(null, null, null);
  return o;
end;
$$;

-- 4b. Machine à états.
--
--  De               -> Vers             | Client | Commerçant (approuvé) | Livreur (approuvé)          | Admin (motif)
--  en_preparation   -> annulee          | oui*   | oui (motif)           | -                           | oui
--  en_preparation   -> prete_a_livrer   | -      | oui (mode livraison)  | -                           | oui
--  en_preparation   -> prete_a_retirer  | -      | oui (mode retrait)    | -                           | oui
--  prete_a_livrer   -> en_livraison     | -      | -                     | oui (accepte, pas sa cmde)  | oui
--  prete_a_livrer   -> annulee          | oui**  | oui (motif)           | -                           | oui
--  en_livraison     -> livree           | -      | -                     | livreur affecté seulement   | oui
--  prete_a_retirer  -> retiree          | -      | oui                   | -                           | oui
--  prete_a_retirer  -> annulee          | oui**  | oui (motif)           | -                           | oui
--  tout             -> tout             | -      | -                     | -                           | oui (cohérent avec le mode)
--  *  motif obligatoire ; ** seulement si l'ajustement de montant est en attente ou a été refusé.
--  Ajustement en attente : ni « prête », ni acceptation livreur, ni « retirée ».
create or replace function public.set_order_status(p_order_id uuid, p_new_status text, p_reason text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_pre constant text[] := array['en_preparation', 'prete_a_livrer', 'prete_a_retirer'];
  o public.orders%rowtype;
  mch public.merchants%rowtype;
  liv public.livreurs%rowtype;
  v_is_client boolean;
  v_is_merchant boolean := false;
  v_is_admin boolean := public.is_admin();
  v_role text;
  v_event text;
  v_ready text;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_new_status is null or p_new_status not in
     ('en_preparation', 'prete_a_livrer', 'en_livraison', 'livree', 'prete_a_retirer', 'retiree', 'annulee') then
    raise exception 'Statut inconnu : %', p_new_status using errcode = '22023';
  end if;
  if v_reason is not null and char_length(v_reason) > 300 then
    raise exception 'Motif trop long (300 caractères maximum)' using errcode = '22023';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;

  v_is_client := (o.user_id = v_uid);
  select * into mch from public.merchants where id::text = o.merchant_id;
  if found and mch.owner_id = v_uid then
    v_is_merchant := true;
  end if;
  select * into liv from public.livreurs where owner_id = v_uid;

  if v_is_client = false and v_is_merchant = false and v_is_admin = false
     and not (liv.id is not null
              and (coalesce(o.livreur_id = liv.id, false) or (o.status = 'prete_a_livrer' and o.livreur_id is null))) then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;

  if o.status = p_new_status then
    raise exception 'La commande est déjà au statut %', p_new_status using errcode = '22023';
  end if;

  v_ready := case o.fulfillment_mode when 'livraison' then 'prete_a_livrer' else 'prete_a_retirer' end;

  if v_is_client and p_new_status = 'annulee'
     and (o.status = 'en_preparation'
          or (o.status = any (v_pre) and o.adjustment_status in ('en_attente', 'refuse'))) then
    v_role := 'client';
    v_event := 'annulation_client';
  elsif v_is_merchant and (
        (o.status = 'en_preparation' and p_new_status = v_ready)
     or (o.fulfillment_mode = 'retrait' and o.status = 'prete_a_retirer' and p_new_status = 'retiree')
     or (p_new_status = 'annulee' and o.status = any (v_pre))) then
    v_role := 'commercant';
    v_event := case p_new_status when 'annulee' then 'annulation_commercant'
                                 when 'retiree' then 'retrait_valide'
                                 else 'commande_prete' end;
  elsif liv.id is not null and (
        (o.status = 'prete_a_livrer' and o.livreur_id is null and p_new_status = 'en_livraison')
     or (o.status = 'en_livraison' and o.livreur_id = liv.id and p_new_status = 'livree')) then
    v_role := 'livreur';
    v_event := case p_new_status when 'en_livraison' then 'acceptation_livreur' else 'livraison_effectuee' end;
  elsif v_is_admin then
    v_role := 'admin';
    v_event := 'correction_admin';
  else
    raise exception 'Transition % -> % non autorisée pour ce compte', o.status, p_new_status using errcode = '42501';
  end if;

  -- Contrôles par rôle.
  if v_role = 'client' then
    if v_reason is null then
      raise exception 'Motif d''annulation obligatoire' using errcode = '22023';
    end if;
  elsif v_role = 'commercant' then
    if mch.status <> 'approved' then
      raise exception 'Commerce suspendu ou non validé : aucune action possible' using errcode = '42501';
    end if;
    if p_new_status = 'annulee' and v_reason is null then
      raise exception 'Motif d''annulation obligatoire' using errcode = '22023';
    end if;
    if p_new_status <> 'annulee' and o.adjustment_status = 'en_attente' then
      raise exception 'Ajustement de montant en attente de réponse du client' using errcode = '55000';
    end if;
  elsif v_role = 'livreur' then
    if liv.status <> 'approved' then
      raise exception 'Compte livreur suspendu ou non validé : aucune action possible' using errcode = '42501';
    end if;
    if o.user_id = v_uid or v_is_merchant then
      raise exception 'Un livreur ne peut pas prendre sa propre commande' using errcode = '42501';
    end if;
    if o.adjustment_status = 'en_attente' then
      raise exception 'Ajustement de montant en attente de réponse du client' using errcode = '55000';
    end if;
  elsif v_role = 'admin' then
    if v_reason is null then
      raise exception 'Motif obligatoire pour une correction administrateur' using errcode = '22023';
    end if;
    if (o.fulfillment_mode = 'retrait' and p_new_status in ('prete_a_livrer', 'en_livraison', 'livree'))
       or (o.fulfillment_mode = 'livraison' and p_new_status in ('prete_a_retirer', 'retiree')) then
      raise exception 'Statut % incompatible avec le mode %', p_new_status, o.fulfillment_mode using errcode = '22023';
    end if;
  end if;

  perform public.order_engine_set_ctx(v_role, v_event, v_reason);

  update public.orders set
    status = p_new_status,
    livreur_id = case
      when v_role = 'livreur' and p_new_status = 'en_livraison' then liv.id
      when p_new_status in ('en_preparation', 'prete_a_livrer') then null
      else livreur_id end,
    livreur_name = case
      when v_role = 'livreur' and p_new_status = 'en_livraison' then liv.name
      when p_new_status in ('en_preparation', 'prete_a_livrer') then null
      else livreur_name end,
    livreur_phone = case
      when v_role = 'livreur' and p_new_status = 'en_livraison' then liv.phone
      when p_new_status in ('en_preparation', 'prete_a_livrer') then null
      else livreur_phone end,
    accepted_at = case
      when v_role = 'livreur' and p_new_status = 'en_livraison' then now()
      when p_new_status in ('en_preparation', 'prete_a_livrer') then null
      else accepted_at end,
    cancelled_at = case when p_new_status = 'annulee' then now() when o.status = 'annulee' then null else cancelled_at end,
    cancel_reason = case when p_new_status = 'annulee' then v_reason when o.status = 'annulee' then null else cancel_reason end,
    adjustment_status = case when p_new_status = 'annulee' and adjustment_status = 'en_attente' then 'caduc' else adjustment_status end
  where id = o.id
  returning * into o;

  if p_new_status = 'annulee' then
    update public.order_amount_adjustments
       set decision = 'caduc', decided_by = v_uid, decided_at = now()
     where order_id = o.id and decision = 'en_attente';
  end if;

  perform public.order_engine_set_ctx(null, null, null);
  return o;
end;
$$;

-- 4c. Ajustement de montant par le commerçant (D1).
create or replace function public.order_engine_apply_subtotal(p_order_id uuid, p_new_subtotal integer, p_adjustment_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  v_service integer;
  v_deposit integer;
begin
  select * into o from public.orders where id = p_order_id;
  v_service := public.order_engine_commission(p_new_subtotal - o.discount_amount);
  if o.deposit_status in ('encaisse', 'inclus_solde') then
    v_deposit := o.deposit_amount;
  else
    v_deposit := public.order_engine_deposit(p_new_subtotal - o.discount_amount + v_service + o.delivery_fee);
  end if;

  update public.orders set
    subtotal = p_new_subtotal,
    service_fee = v_service,
    total = p_new_subtotal - discount_amount + v_service + delivery_fee,
    deposit_amount = v_deposit,
    deposit_status = case when deposit_status in ('encaisse', 'inclus_solde') then deposit_status
                          when v_deposit > 0 then 'du' else 'non_requis' end,
    adjustment_status = p_adjustment_status,
    proposed_subtotal = case when p_adjustment_status = 'applique' then null else proposed_subtotal end
  where id = p_order_id
  returning * into o;
  return o;
end;
$$;
revoke execute on function public.order_engine_apply_subtotal(uuid, integer, text) from public, anon, authenticated;

create or replace function public.adjust_order_amount(p_order_id uuid, p_new_subtotal integer, p_reason text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  o public.orders%rowtype;
  mch public.merchants%rowtype;
  v_max numeric;
  v_new_total integer;
  v_old_subtotal integer;
  v_old_total integer;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) > 300 then
    raise exception 'Motif obligatoire (300 caractères maximum)' using errcode = '22023';
  end if;
  if p_new_subtotal is null or p_new_subtotal <= 0 or p_new_subtotal > 100000000 then
    raise exception 'Nouveau montant invalide' using errcode = '22023';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  select * into mch from public.merchants where id::text = o.merchant_id;
  if not found or mch.owner_id is distinct from v_uid then
    raise exception 'Seul le commerçant de la commande peut ajuster le montant' using errcode = '42501';
  end if;
  if mch.status <> 'approved' then
    raise exception 'Commerce suspendu ou non validé : aucune action possible' using errcode = '42501';
  end if;
  if o.status not in ('en_preparation', 'prete_a_livrer', 'prete_a_retirer') then
    raise exception 'Montant verrouillé : la commande est partie, retirée ou annulée' using errcode = '55000';
  end if;
  if o.adjustment_status <> 'aucun' then
    raise exception 'Le montant ne peut être ajusté qu''une seule fois' using errcode = '55000';
  end if;
  if p_new_subtotal - o.discount_amount < 0 then
    raise exception 'Nouveau montant inférieur à la réduction' using errcode = '22023';
  end if;
  if p_new_subtotal = o.subtotal then
    raise exception 'Le nouveau montant est identique' using errcode = '22023';
  end if;

  v_old_subtotal := o.subtotal;
  v_old_total := o.total;
  v_max := o.subtotal * (1 + public.setting_value('adjustment_auto_max_rate'));
  perform public.order_engine_set_ctx('commercant', 'ajustement_commercant', v_reason);

  if p_new_subtotal <= v_max then
    o := public.order_engine_apply_subtotal(o.id, p_new_subtotal, 'applique');
    insert into public.order_amount_adjustments
      (order_id, old_subtotal, new_subtotal, old_total, new_total, reason, requested_by, decision, decided_by, decided_at)
    values (o.id, v_old_subtotal, p_new_subtotal, v_old_total, o.total, v_reason, v_uid, 'applique', v_uid, now());
  else
    v_new_total := p_new_subtotal - o.discount_amount + public.order_engine_commission(p_new_subtotal - o.discount_amount) + o.delivery_fee;
    update public.orders set adjustment_status = 'en_attente', proposed_subtotal = p_new_subtotal
     where id = o.id returning * into o;
    insert into public.order_amount_adjustments
      (order_id, old_subtotal, new_subtotal, old_total, new_total, reason, requested_by, decision)
    values (o.id, o.subtotal, p_new_subtotal, o.total, v_new_total, v_reason, v_uid, 'en_attente');
  end if;

  perform public.order_engine_set_ctx(null, null, null);
  return o;
end;
$$;

create or replace function public.respond_to_adjustment(p_order_id uuid, p_accept boolean)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  o public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_accept is null then
    raise exception 'Réponse obligatoire (accepter ou refuser)' using errcode = '22023';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found or o.user_id <> v_uid then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  if o.adjustment_status <> 'en_attente' or o.status not in ('en_preparation', 'prete_a_livrer', 'prete_a_retirer') then
    raise exception 'Aucun ajustement en attente sur cette commande' using errcode = '55000';
  end if;

  perform public.order_engine_set_ctx('client',
    case when p_accept then 'ajustement_accepte' else 'ajustement_refuse' end, null);

  if p_accept then
    o := public.order_engine_apply_subtotal(o.id, o.proposed_subtotal, 'accepte');
  else
    update public.orders set adjustment_status = 'refuse' where id = o.id returning * into o;
  end if;

  update public.order_amount_adjustments
     set decision = case when p_accept then 'accepte' else 'refuse' end,
         decided_by = v_uid, decided_at = now()
   where order_id = o.id and decision = 'en_attente';

  perform public.order_engine_set_ctx(null, null, null);
  return o;
end;
$$;

-- 4d. Paiement hors ligne : enregistrement de l'encaissement (aucune intégration de paiement).
create or replace function public.record_payment(p_order_id uuid, p_part text, p_method text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  o public.orders%rowtype;
  mch public.merchants%rowtype;
  liv public.livreurs%rowtype;
  v_role text;
  v_amount integer;
  v_holder text;
  v_holder_ref text;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_part is null or p_part not in ('solde', 'acompte') then
    raise exception 'Part inconnue : solde ou acompte' using errcode = '22023';
  end if;
  if p_method is null or p_method not in ('airtel_money', 'moov_money', 'especes') then
    raise exception 'Moyen de paiement inconnu' using errcode = '22023';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;
  if o.status = 'annulee' then
    raise exception 'Commande annulée' using errcode = '55000';
  end if;
  select * into mch from public.merchants where id::text = o.merchant_id;
  select * into liv from public.livreurs where owner_id = v_uid and status = 'approved';

  if p_part = 'acompte' then
    if o.deposit_status <> 'du' then
      raise exception 'Aucun acompte dû sur cette commande' using errcode = '55000';
    end if;
    if mch.owner_id = v_uid and mch.status = 'approved' then
      v_role := 'commercant';
    elsif v_is_admin then
      v_role := 'admin';
    else
      raise exception 'Seul le commerçant (ou l''admin) enregistre l''acompte' using errcode = '42501';
    end if;
    v_amount := o.deposit_amount;
    v_holder := 'commercant';
    v_holder_ref := o.merchant_id;
  else
    if o.payment_status = 'encaisse' then
      raise exception 'Solde déjà encaissé' using errcode = '55000';
    end if;
    if o.fulfillment_mode = 'livraison' then
      if liv.id is not null and o.livreur_id = liv.id and o.status in ('en_livraison', 'livree') then
        v_role := 'livreur';
      elsif v_is_admin and o.status in ('en_livraison', 'livree') then
        v_role := 'admin';
      else
        raise exception 'Seul le livreur affecté (ou l''admin) enregistre l''encaissement, une fois la course partie' using errcode = '42501';
      end if;
      v_holder := 'livreur';
      v_holder_ref := o.livreur_id::text;
    else
      if mch.owner_id = v_uid and mch.status = 'approved' and o.status in ('prete_a_retirer', 'retiree') then
        v_role := 'commercant';
      elsif v_is_admin and o.status in ('prete_a_retirer', 'retiree') then
        v_role := 'admin';
      else
        raise exception 'Seul le commerçant (ou l''admin) enregistre l''encaissement d''un retrait prêt' using errcode = '42501';
      end if;
      v_holder := 'commercant';
      v_holder_ref := o.merchant_id;
    end if;
    v_amount := o.total - case when o.deposit_status = 'encaisse' then o.deposit_amount else 0 end;
  end if;

  perform public.order_engine_set_ctx(v_role, 'encaissement_' || p_part, null);

  if p_part = 'acompte' then
    update public.orders set deposit_status = 'encaisse', deposit_paid_at = now()
     where id = o.id returning * into o;
  else
    update public.orders set
      payment_status = 'encaisse', paid_at = now(), payment_method = p_method,
      deposit_status = case when deposit_status = 'du' then 'inclus_solde' else deposit_status end
     where id = o.id returning * into o;
  end if;

  insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, payment_method, state, actor_id, actor_role, note)
  values (o.id, 'encaissement', 'encaissement_' || p_part, v_amount, v_holder, v_holder_ref, 'client', p_method, 'encaisse', v_uid, v_role,
          case when p_part = 'acompte' then 'Acompte reçu par le commerçant' else 'Solde reçu du client' end);

  perform public.order_engine_set_ctx(null, null, null);
  return o;
end;
$$;

-- Reversement entre acteurs (ex. livreur -> commerçant, commerçant -> plateforme), saisi par l'admin.
create or replace function public.record_payout(p_order_id uuid, p_from text, p_to text, p_amount integer, p_method text, p_note text default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  o public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_from is null or p_from not in ('client', 'commercant', 'livreur', 'plateforme')
     or p_to is null or p_to not in ('client', 'commercant', 'livreur', 'plateforme') or p_from = p_to then
    raise exception 'Acteurs du reversement invalides' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Montant invalide' using errcode = '22023';
  end if;
  if p_method is null or p_method not in ('airtel_money', 'moov_money', 'especes') then
    raise exception 'Moyen de paiement inconnu' using errcode = '22023';
  end if;
  select * into o from public.orders where id = p_order_id;
  if not found then
    raise exception 'Commande introuvable' using errcode = 'P0002';
  end if;

  insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, beneficiary_ref, payer, payment_method, state, actor_id, actor_role, note)
  values (o.id, 'reversement', 'reversement', p_amount, p_to,
          case p_to when 'commercant' then o.merchant_id when 'livreur' then o.livreur_id::text when 'client' then o.user_id::text end,
          p_from, p_method, 'encaisse', auth.uid(), 'admin', left(p_note, 300))
  returning id into v_id;
  return v_id;
end;
$$;

-- 4e. Courses disponibles pour un livreur approuvé : sans téléphone ni adresse complète du client.
create or replace function public.list_available_deliveries()
returns table (
  order_id uuid,
  merchant_id text,
  merchant_name text,
  market_id text,
  pickup_address text,
  delivery_area text,
  distance_km numeric,
  courier_gain integer,
  amount_to_collect integer,
  payment_method text,
  slot_label text,
  item_count integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  liv public.livreurs%rowtype;
begin
  select * into liv from public.livreurs where owner_id = auth.uid();
  if liv.id is null or liv.status <> 'approved' then
    raise exception 'Compte livreur approuvé requis' using errcode = '42501';
  end if;

  return query
  select o.id, o.merchant_id, o.merchant_name, m.market_id, m.address, o.address_label,
         round(o.distance_km, 1), o.delivery_fee,
         o.total - case when o.deposit_status = 'encaisse' then o.deposit_amount else 0 end,
         o.payment_method, o.slot_label, jsonb_array_length(o.items), o.created_at
  from public.orders o
  left join public.merchants m on m.id::text = o.merchant_id
  where o.status = 'prete_a_livrer'
    and o.fulfillment_mode = 'livraison'
    and o.livreur_id is null
    and o.adjustment_status <> 'en_attente'
    and o.user_id <> auth.uid()
    and (m.owner_id is null or m.owner_id <> auth.uid())
  order by o.created_at;
end;
$$;

-- 4e bis. Historique des courses du livreur : jamais de téléphone ni d'adresse complète.
create or replace function public.list_my_deliveries()
returns table (
  order_id uuid,
  merchant_name text,
  delivery_area text,
  status text,
  courier_gain integer,
  total integer,
  payment_method text,
  payment_status text,
  slot_label text,
  accepted_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  liv public.livreurs%rowtype;
begin
  select * into liv from public.livreurs where owner_id = auth.uid();
  if liv.id is null or liv.status <> 'approved' then
    raise exception 'Compte livreur approuvé requis' using errcode = '42501';
  end if;

  return query
  select o.id, o.merchant_name, o.address_label, o.status, o.delivery_fee, o.total,
         o.payment_method, o.payment_status, o.slot_label, o.accepted_at, o.created_at
  from public.orders o
  where o.livreur_id = liv.id
  order by o.created_at desc;
end;
$$;

-- 4f. Vue administrateur : recherche, filtres, pagination, dossier complet de chaque commande.
create or replace function public.admin_orders(
  p_search text default null,
  p_statuses text[] default null,
  p_mode text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_merchant_id text default null,
  p_livreur_id uuid default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
  v_total bigint;
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;

  with filtered as (
    select o.id, o.created_at
    from public.orders o
    left join public.profiles pr on pr.id = o.user_id
    where (p_statuses is null or o.status = any (p_statuses))
      and (p_mode is null or o.fulfillment_mode = p_mode)
      and (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at < p_to)
      and (p_merchant_id is null or o.merchant_id = p_merchant_id)
      and (p_livreur_id is null or o.livreur_id = p_livreur_id)
      and (v_search is null
           or o.id::text ilike v_search || '%'
           or o.merchant_name ilike '%' || v_search || '%'
           or coalesce(o.livreur_name, '') ilike '%' || v_search || '%'
           or coalesce(o.client_phone, '') ilike '%' || v_search || '%'
           or coalesce(pr.first_name || ' ' || pr.last_name, '') ilike '%' || v_search || '%')
  ), page as (
    select f.id, f.created_at, count(*) over () as total_count
    from filtered f
    order by f.created_at desc, f.id
  ), paged as (
    select * from page limit v_limit offset v_offset
  )
  select (select count(*) from filtered),
         coalesce(jsonb_agg(
           to_jsonb(o) || jsonb_build_object(
             'client', jsonb_build_object('id', o.user_id, 'first_name', pr.first_name, 'last_name', pr.last_name, 'phone', o.client_phone),
             'merchant', (select jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'status', m.status, 'owner_id', m.owner_id)
                          from public.merchants m where m.id::text = o.merchant_id),
             'livreur', (select jsonb_build_object('id', l.id, 'name', l.name, 'phone', l.phone, 'status', l.status)
                         from public.livreurs l where l.id = o.livreur_id),
             'delivery_details', (select to_jsonb(d) - 'order_id' from public.order_delivery_details d where d.order_id = o.id),
             'history', (select coalesce(jsonb_agg(to_jsonb(h) - 'order_id' order by h.created_at, h.id), '[]') from public.order_status_history h where h.order_id = o.id),
             'ledger', (select coalesce(jsonb_agg(to_jsonb(g) - 'order_id' order by g.created_at, g.id), '[]') from public.order_ledger g where g.order_id = o.id),
             'adjustments', (select coalesce(jsonb_agg(to_jsonb(a) - 'order_id' order by a.created_at), '[]') from public.order_amount_adjustments a where a.order_id = o.id),
             'disputes', (select coalesce(jsonb_agg(to_jsonb(s) - 'order_id' order by s.created_at), '[]') from public.order_disputes s where s.order_id = o.id)
           ) order by o.created_at desc, o.id), '[]'::jsonb)
    into v_total, v_rows
  from paged pg
  join public.orders o on o.id = pg.id
  left join public.profiles pr on pr.id = o.user_id;

  return jsonb_build_object('total', v_total, 'limit', v_limit, 'offset', v_offset, 'rows', v_rows);
end;
$$;

-- Droits d'exécution : uniquement les utilisateurs connectés, jamais anon.
revoke execute on function public.create_order(uuid, uuid, jsonb, text, text, text, text, text, double precision, double precision, text, text, text) from public, anon;
revoke execute on function public.set_order_status(uuid, text, text) from public, anon;
revoke execute on function public.adjust_order_amount(uuid, integer, text) from public, anon;
revoke execute on function public.respond_to_adjustment(uuid, boolean) from public, anon;
revoke execute on function public.record_payment(uuid, text, text) from public, anon;
revoke execute on function public.record_payout(uuid, text, text, integer, text, text) from public, anon;
revoke execute on function public.list_available_deliveries() from public, anon;
revoke execute on function public.list_my_deliveries() from public, anon;
revoke execute on function public.admin_orders(text, text[], text, timestamptz, timestamptz, text, uuid, integer, integer) from public, anon;
revoke execute on function public.haversine_km(double precision, double precision, double precision, double precision) from anon;

grant execute on function public.create_order(uuid, uuid, jsonb, text, text, text, text, text, double precision, double precision, text, text, text) to authenticated;
grant execute on function public.set_order_status(uuid, text, text) to authenticated;
grant execute on function public.adjust_order_amount(uuid, integer, text) to authenticated;
grant execute on function public.respond_to_adjustment(uuid, boolean) to authenticated;
grant execute on function public.record_payment(uuid, text, text) to authenticated;
grant execute on function public.record_payout(uuid, text, text, integer, text, text) to authenticated;
grant execute on function public.list_available_deliveries() to authenticated;
grant execute on function public.list_my_deliveries() to authenticated;
grant execute on function public.admin_orders(text, text[], text, timestamptz, timestamptz, text, uuid, integer, integer) to authenticated;

commit;
