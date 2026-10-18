-- 023 — Taxonomie du catalogue : catégories globales en base, catégories mises en avant
--       par enseigne ou boutique, rubriques propres au commerçant, attributs filtrables.
--
-- Référence : docs/audits/AUDIT_CATEGORISATION.md (audit, conception, bilan).
-- Prérequis : 020 appliquée (merchants.is_demo). Indépendante de 022 (aucune table de commande touchée).
--
-- Contenu :
--   1. categories : taxonomie globale à deux niveaux (famille, sous-catégorie). Les 20 identifiants
--      actuels de src/data/categories.ts deviennent les familles (ids conservés, immuables).
--      Écriture réservée à l'administrateur.
--   2. products : clé étrangère category -> categories (familles), nouvelle colonne subcategory_id
--      (sous-catégorie facultative, cohérente avec la famille), attributs jsonb. Contrôle par trigger.
--      merchants.categories : chaque valeur doit être une famille existante.
--   3. category_attributes : attributs filtrables par catégorie (définitions, pas de valeurs inventées).
--   4. storefront_categories : catégories mises en avant par enseigne (market_id, admin) ou par
--      boutique (merchant_id, admin ou propriétaire du commerce).
--   5. merchant_sections + merchant_section_products : rubriques du commerçant (« Promotions »...)
--      et liaison produit <-> rubrique sans duplication de produit. Même commerçant garanti par
--      clés étrangères composites.
--   6. visible_categories() : catégories ayant au moins un produit publiable (ou mises en avant
--      par l'éditorial), règle de l'accueil.
--   7. Données : sous-catégories des produits réels quand le classement est certain ; attributs déduits
--      des noms et variantes existants. Les produits incertains restent au niveau famille (liste dans
--      l'audit). Garde-fous : aucun produit supprimé, aucun prix, unité, nom, commerçant ni famille modifié.
--
-- Aucun prix n'est saisi ni modifié par cette migration (ni prix du magasin, ni prix officiel DGCCRF).
-- Aucune suppression de donnée. Rejouable (if not exists, on conflict do nothing, drop policy if exists).
-- À appliquer en une seule transaction.

begin;

-- Photo de référence pour les garde-fous de fin de migration.
create temporary table _t023_products_before on commit drop as
  select id, merchant_id, name, category, price, unit, variant_label from public.products;

-- ---------------------------------------------------------------------------
-- 1. Taxonomie globale
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 60),
  parent_id text references public.categories (id) on delete restrict,
  label text not null check (char_length(trim(label)) between 2 and 80),
  short_label text check (short_label is null or char_length(trim(short_label)) between 2 and 40),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  /** Indicateur éditorial : affichée à l'accueil même sans produit publiable. */
  is_featured boolean not null default false,
  image_url text check (
    image_url is null
    or image_url like 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/kiosk-photos/%'
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

comment on table public.categories is
  'Taxonomie globale du catalogue (migration 023). Deux niveaux : famille (parent_id null) et sous-catégorie. '
  'Les identifiants des familles sont ceux de src/data/categories.ts et ne changent jamais.';

create index if not exists categories_parent_idx on public.categories (parent_id, sort_order);

-- Arbre à deux niveaux, identifiants immuables, pas de déplacement d'une catégorie utilisée.
create or replace function public.guard_category_tree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grand_parent text;
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'L''identifiant d''une catégorie ne se modifie pas' using errcode = '42501';
  end if;

  if new.parent_id is not null then
    select parent_id into v_grand_parent from public.categories where id = new.parent_id;
    if not found then
      raise exception 'Catégorie parente inconnue : %', new.parent_id using errcode = '23503';
    end if;
    if v_grand_parent is not null then
      raise exception 'Deux niveaux au plus : % est déjà une sous-catégorie', new.parent_id using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from public.categories c where c.parent_id = new.id) then
      raise exception 'Une famille qui a des sous-catégories ne peut pas devenir sous-catégorie' using errcode = '23514';
    end if;
  end if;

  -- Blocs imbriqués : la requête sur products n'est préparée qu'en cas de mise à jour du parent.
  if tg_op = 'UPDATE' then
    if new.parent_id is distinct from old.parent_id then
      if exists (select 1 from public.products p where p.category = new.id or p.subcategory_id = new.id) then
        raise exception 'Catégorie utilisée par des produits : elle ne peut pas changer de niveau ni de famille' using errcode = '23514';
      end if;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_category_tree() from public, anon, authenticated;

drop trigger if exists guard_category_tree on public.categories;
create trigger guard_category_tree
  before insert or update on public.categories
  for each row execute function public.guard_category_tree();

alter table public.categories enable row level security;

drop policy if exists "Lecture des categories actives ou par l'admin" on public.categories;
create policy "Lecture des categories actives ou par l'admin"
  on public.categories for select
  using (is_active or public.is_admin());

drop policy if exists "L'admin cree les categories" on public.categories;
create policy "L'admin cree les categories"
  on public.categories for insert
  with check (public.is_admin());

drop policy if exists "L'admin modifie les categories" on public.categories;
create policy "L'admin modifie les categories"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "L'admin supprime les categories" on public.categories;
create policy "L'admin supprime les categories"
  on public.categories for delete
  using (public.is_admin());

revoke truncate, trigger, references on public.categories from anon, authenticated;

-- 1.a Familles : les 20 identifiants actuels (libellés de src/data/categories.ts).
insert into public.categories (id, parent_id, label, short_label, sort_order) values
  ('legumes',      null, 'Légumes', null, 10),
  ('fruits',       null, 'Fruits', null, 20),
  ('poisson',      null, 'Poisson & Viande', null, 30),
  ('cereales',     null, 'Céréales & Épices', null, 40),
  ('restauration', null, 'Restauration', null, 50),
  ('boulangerie',  null, 'Pâtisserie & Boulangerie', null, 60),
  ('bricolage',    null, 'Bricolage & Construction', null, 70),
  ('epicerie',     null, 'Épicerie & Alimentation', null, 80),
  ('high-tech',    null, 'High-Tech, Informatique & Électronique', 'High-Tech', 90),
  ('maison',       null, 'Maison & Jardin', null, 100),
  ('mode',         null, 'Mode & Accessoires', null, 110),
  ('beaute',       null, 'Beauté & Santé', null, 120),
  ('auto-moto',    null, 'Auto & Moto', null, 130),
  ('bebe',         null, 'Bébé & Puériculture', null, 140),
  ('livres',       null, 'Livres, Musique & Vidéo', 'Livres & Musique', 150),
  ('jeux',         null, 'Jeux & Jouets', null, 160),
  ('sport',        null, 'Sport & Loisirs', null, 170),
  ('industrie',    null, 'Industrie & Science', null, 180),
  ('chr',          null, 'Équipement professionnel (CHR)', 'Équipement CHR', 190),
  ('numerique',    null, 'Produits numériques', null, 200)
on conflict (id) do nothing;

-- 1.b Sous-catégories (liste du propriétaire, alignée sur les types de produits de src/data/businessTypes.ts).
--     Pas de doublon : les EPI et l'outillage sont sous « Bricolage & Construction », l'électroménager sous
--     « Maison & Jardin », la droguerie (lessive, papier, savon) sous « Épicerie & Alimentation ».
insert into public.categories (id, parent_id, label, short_label, sort_order) values
  -- Bricolage & Construction
  ('bricolage-materiaux',     'bricolage', 'Gros œuvre et matériaux', 'Matériaux', 10),
  ('bricolage-ciment',        'bricolage', 'Ciment, sable et granulats', 'Ciment et granulats', 20),
  ('bricolage-carrelage',     'bricolage', 'Carrelage et revêtements', 'Carrelage', 30),
  ('bricolage-plomberie',     'bricolage', 'Plomberie et sanitaire', 'Plomberie', 40),
  ('bricolage-electricite',   'bricolage', 'Électricité et éclairage', 'Électricité', 50),
  ('bricolage-peinture',      'bricolage', 'Peinture et étanchéité', 'Peinture', 60),
  ('bricolage-quincaillerie', 'bricolage', 'Quincaillerie et outillage', 'Outillage', 70),
  ('bricolage-menuiserie',    'bricolage', 'Menuiserie et bois', 'Menuiserie', 80),
  ('bricolage-epi',           'bricolage', 'Équipements de protection (EPI)', 'EPI', 90),
  -- Épicerie & Alimentation
  ('epicerie-salee',     'epicerie', 'Épicerie salée', null, 10),
  ('epicerie-sucree',    'epicerie', 'Épicerie sucrée', null, 20),
  ('epicerie-boissons',  'epicerie', 'Boissons', null, 30),
  ('epicerie-frais',     'epicerie', 'Produits frais et charcuterie', 'Produits frais', 40),
  ('epicerie-droguerie', 'epicerie', 'Droguerie, hygiène et entretien', 'Droguerie et entretien', 50),
  -- Poisson & Viande
  ('poisson-frais',       'poisson', 'Poisson frais', null, 10),
  ('poisson-fume-sale',   'poisson', 'Poisson fumé ou salé', null, 20),
  ('poisson-fruits-mer',  'poisson', 'Fruits de mer', null, 30),
  ('poisson-viande',      'poisson', 'Viande et charcuterie', 'Viande', 40),
  ('poisson-volaille',    'poisson', 'Volaille et œufs', 'Volaille', 50),
  -- Céréales & Épices
  ('cereales-riz-farines',      'cereales', 'Riz, farines et graines', 'Riz et farines', 10),
  ('cereales-epices',           'cereales', 'Épices et condiments', 'Épices', 20),
  -- High-Tech
  ('high-tech-telephones',   'high-tech', 'Téléphones et tablettes', 'Téléphones', 10),
  ('high-tech-accessoires',  'high-tech', 'Accessoires de téléphonie', 'Accessoires', 20),
  ('high-tech-informatique', 'high-tech', 'Informatique', null, 30),
  ('high-tech-tv-son',       'high-tech', 'TV, audio et vidéo', 'TV et audio', 40),
  -- Maison & Jardin
  ('maison-meubles',        'maison', 'Meubles', null, 10),
  ('maison-decoration',     'maison', 'Décoration et luminaires', 'Décoration', 20),
  ('maison-literie',        'maison', 'Literie et linge de maison', 'Literie', 30),
  ('maison-cuisine',        'maison', 'Cuisine et arts de la table', 'Cuisine', 40),
  ('maison-electromenager', 'maison', 'Électroménager', null, 50),
  ('maison-jardin',         'maison', 'Jardin', null, 60),
  -- Mode & Accessoires
  ('mode-femme',      'mode', 'Vêtements femme', null, 10),
  ('mode-homme',      'mode', 'Vêtements homme', null, 20),
  ('mode-enfant',     'mode', 'Vêtements enfant', null, 30),
  ('mode-chaussures', 'mode', 'Chaussures', null, 40),
  ('mode-sacs',       'mode', 'Sacs et maroquinerie', 'Sacs', 50),
  ('mode-bijoux',     'mode', 'Bijoux, montres et lunettes', 'Bijoux et montres', 60),
  -- Beauté & Santé
  ('beaute-soins',      'beaute', 'Soins du corps et du visage', 'Soins', 10),
  ('beaute-cheveux',    'beaute', 'Cheveux', null, 20),
  ('beaute-maquillage', 'beaute', 'Maquillage', null, 30),
  ('beaute-parfums',    'beaute', 'Parfums', null, 40),
  ('beaute-sante',      'beaute', 'Santé et premiers soins', 'Santé', 50),
  -- Auto & Moto
  ('auto-moto-pieces-auto', 'auto-moto', 'Pièces et accessoires auto', 'Pièces auto', 10),
  ('auto-moto-pneus',       'auto-moto', 'Pneus', null, 20),
  ('auto-moto-moto',        'auto-moto', 'Pièces et accessoires moto', 'Moto', 30),
  -- Bébé & Puériculture
  ('bebe-alimentation', 'bebe', 'Alimentation bébé', null, 10),
  ('bebe-couches',      'bebe', 'Couches et toilette', 'Couches', 20),
  ('bebe-puericulture', 'bebe', 'Poussettes et sièges auto', 'Poussettes', 30),
  ('bebe-chambre',      'bebe', 'Chambre de bébé', null, 40),
  -- Livres, Musique & Vidéo
  ('livres-livres',      'livres', 'Livres', null, 10),
  ('livres-fournitures', 'livres', 'Fournitures scolaires et de bureau', 'Fournitures', 20),
  ('livres-musique',     'livres', 'Musique et vidéo', null, 30),
  -- Jeux & Jouets
  ('jeux-jouets',  'jeux', 'Jouets', null, 10),
  ('jeux-societe', 'jeux', 'Jeux de société et puzzles', 'Jeux de société', 20),
  -- Sport & Loisirs
  ('sport-equipement', 'sport', 'Équipement sportif', null, 10),
  ('sport-vetements',  'sport', 'Vêtements et chaussures de sport', 'Tenues de sport', 20),
  ('sport-camping',    'sport', 'Camping et plein air', 'Camping', 30),
  -- Industrie & Science
  ('industrie-nettoyage',   'industrie', 'Nettoyage professionnel', null, 10),
  ('industrie-laboratoire', 'industrie', 'Matériel de laboratoire', 'Laboratoire', 20),
  -- Équipement professionnel (CHR)
  ('chr-cuisine',   'chr', 'Matériel de cuisine professionnel', 'Cuisine pro', 10),
  ('chr-hotelier',  'chr', 'Équipement hôtelier', null, 20),
  ('chr-vetements', 'chr', 'Vêtements de travail', null, 30),
  -- Produits numériques
  ('numerique-logiciels',  'numerique', 'Logiciels et licences', 'Logiciels', 10),
  ('numerique-formations', 'numerique', 'Cours en ligne et e-books', 'Cours en ligne', 20),
  ('numerique-creations',  'numerique', 'Créations numériques', null, 30)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Produits et commerçants rattachés à la taxonomie
-- ---------------------------------------------------------------------------

-- Diagnostic avant la clé étrangère : aucune valeur hors taxonomie.
do $$
declare
  v_bad text;
begin
  select string_agg(distinct p.category, ', ') into v_bad
  from public.products p
  where not exists (select 1 from public.categories c where c.id = p.category and c.parent_id is null);
  if v_bad is not null then
    raise exception '023 : produits avec une catégorie hors taxonomie (%) : arrêt', v_bad;
  end if;
  select string_agg(distinct x, ', ') into v_bad
  from public.merchants m, unnest(m.categories) as x
  where not exists (select 1 from public.categories c where c.id = x and c.parent_id is null);
  if v_bad is not null then
    raise exception '023 : commerçants avec une catégorie hors taxonomie (%) : arrêt', v_bad;
  end if;
end $$;

alter table public.products add column if not exists subcategory_id text
  references public.categories (id) on delete set null;
alter table public.products add column if not exists attributes jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_category_fkey' and conrelid = 'public.products'::regclass) then
    -- on delete restrict : une famille utilisée par des produits ne peut pas être supprimée (la désactiver).
    alter table public.products
      add constraint products_category_fkey foreign key (category) references public.categories (id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_attributes_object' and conrelid = 'public.products'::regclass) then
    alter table public.products
      add constraint products_attributes_object check (jsonb_typeof(attributes) = 'object' and pg_column_size(attributes) <= 4096);
  end if;
  -- Support des clés étrangères composites de merchant_section_products (même commerçant).
  if not exists (select 1 from pg_constraint where conname = 'products_id_merchant_key' and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_id_merchant_key unique (id, merchant_id);
  end if;
end $$;

create index if not exists products_category_idx on public.products (category);
create index if not exists products_subcategory_idx on public.products (subcategory_id);

comment on column public.products.category is 'Famille globale (categories.id, parent_id null). Clé étrangère depuis 023.';
comment on column public.products.subcategory_id is
  'Sous-catégorie globale facultative ; son parent doit être products.category. Null = classé au niveau famille.';
comment on column public.products.attributes is
  'Valeurs des attributs filtrables (clés de category_attributes). Un attribut absent ne bloque aucun affichage.';

-- security definer : le contrôle lit toute la taxonomie, y compris les catégories désactivées
-- que la RLS masque au commerçant (sinon une catégorie désactivée apparaîtrait « inconnue »).
-- Catégorie valide, sous-catégorie cohérente. Une catégorie désactivée n'est plus attribuable, mais les
-- produits déjà classés la gardent (pas de perte d'historique). Le contrôle ne se déclenche que si la
-- catégorie ou la sous-catégorie change : prix, stock, unité ou propriétaire ne sont jamais concernés.
create or replace function public.validate_product_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent text;
  v_active boolean;
begin
  if tg_op = 'UPDATE'
     and new.category is not distinct from old.category
     and new.subcategory_id is not distinct from old.subcategory_id then
    return new;
  end if;

  select parent_id, is_active into v_parent, v_active from public.categories where id = new.category;
  if not found then
    raise exception 'Catégorie inconnue : %', new.category using errcode = '23503';
  end if;
  if v_parent is not null then
    raise exception 'La catégorie d''un produit est une famille ; « % » est une sous-catégorie (famille : %)', new.category, v_parent
      using errcode = '23514';
  end if;
  if not v_active and (tg_op = 'INSERT' or new.category is distinct from old.category) then
    raise exception 'La catégorie « % » est désactivée', new.category using errcode = '23514';
  end if;

  if new.subcategory_id is not null then
    select parent_id, is_active into v_parent, v_active from public.categories where id = new.subcategory_id;
    if not found then
      raise exception 'Sous-catégorie inconnue : %', new.subcategory_id using errcode = '23503';
    end if;
    if v_parent is distinct from new.category then
      raise exception 'La sous-catégorie « % » n''appartient pas à la famille « % »', new.subcategory_id, new.category
        using errcode = '23514';
    end if;
    if not v_active and (tg_op = 'INSERT' or new.subcategory_id is distinct from old.subcategory_id) then
      raise exception 'La sous-catégorie « % » est désactivée', new.subcategory_id using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_product_category() from public, anon, authenticated;

drop trigger if exists validate_product_category on public.products;
create trigger validate_product_category
  before insert or update on public.products
  for each row execute function public.validate_product_category();

-- merchants.categories (tableau) : chaque valeur est une famille existante ; une valeur ajoutée doit être active.
create or replace function public.validate_merchant_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bad text;
begin
  if tg_op = 'UPDATE' and new.categories is not distinct from old.categories then
    return new;
  end if;
  select string_agg(x, ', ') into v_bad
  from unnest(new.categories) as x
  where not exists (
    select 1 from public.categories c
    where c.id = x and c.parent_id is null
      and (c.is_active or (tg_op = 'UPDATE' and x = any (old.categories)))
  );
  if v_bad is not null then
    raise exception 'Catégorie de commerce inconnue ou désactivée : %', v_bad using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_merchant_categories() from public, anon, authenticated;

drop trigger if exists validate_merchant_categories on public.merchants;
create trigger validate_merchant_categories
  before insert or update on public.merchants
  for each row execute function public.validate_merchant_categories();

-- ---------------------------------------------------------------------------
-- 3. Attributs filtrables par catégorie
-- ---------------------------------------------------------------------------

create table if not exists public.category_attributes (
  id uuid primary key default gen_random_uuid(),
  category_id text not null references public.categories (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null check (char_length(trim(label)) between 2 and 60),
  value_type text not null default 'texte' check (value_type in ('texte', 'nombre', 'oui_non')),
  unit text check (unit is null or char_length(trim(unit)) between 1 and 15),
  is_filterable boolean not null default true,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, key)
);

comment on table public.category_attributes is
  'Attributs filtrables d''une famille ou d''une sous-catégorie (023). Définitions seulement : les valeurs sont '
  'dans products.attributes ; les filtres proposent les valeurs réellement présentes.';

alter table public.category_attributes enable row level security;

drop policy if exists "Lecture des attributs actifs ou par l'admin" on public.category_attributes;
create policy "Lecture des attributs actifs ou par l'admin"
  on public.category_attributes for select
  using (is_active or public.is_admin());

drop policy if exists "L'admin gere les attributs" on public.category_attributes;
create policy "L'admin gere les attributs"
  on public.category_attributes for all
  using (public.is_admin())
  with check (public.is_admin());

revoke truncate, trigger, references on public.category_attributes from anon, authenticated;

-- Définitions déduites des variantes déjà saisies par les commerçants (aucune valeur technique inventée).
insert into public.category_attributes (category_id, key, label, value_type, unit, sort_order) values
  ('bricolage-materiaux',     'diametre',   'Diamètre',   'nombre', 'mm',  10),
  ('bricolage-ciment',        'poids',      'Poids',      'nombre', 'kg',  10),
  ('bricolage-electricite',   'section',    'Section',    'nombre', 'mm²', 10),
  ('bricolage-quincaillerie', 'puissance',  'Puissance',  'nombre', 'W',   10),
  ('bricolage-carrelage',     'format',     'Format',     'texte',  null,  10),
  ('bricolage-carrelage',     'couleur',    'Couleur',    'texte',  null,  20),
  ('bricolage-peinture',      'couleur',    'Couleur',    'texte',  null,  10),
  ('bricolage-peinture',      'contenance', 'Contenance', 'nombre', 'L',   20),
  ('epicerie',                'contenance', 'Contenance', 'nombre', 'L',   10),
  ('epicerie',                'poids',      'Poids',      'nombre', 'kg',  20),
  ('mode',                    'taille',     'Taille',     'texte',  null,  10),
  ('mode',                    'couleur',    'Couleur',    'texte',  null,  20)
on conflict (category_id, key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Catégories mises en avant par enseigne ou par boutique
-- ---------------------------------------------------------------------------

create table if not exists public.storefront_categories (
  id uuid primary key default gen_random_uuid(),
  -- Enseigne ou marché : identifiant texte de l'application (mkt-... fixe, cm-<uuid> ajouté), comme merchants.market_id.
  market_id text check (market_id is null or market_id ~ '^(mkt-[a-z0-9-]{1,60}|cm-[0-9a-f-]{36})$'),
  merchant_id uuid references public.merchants (id) on delete cascade,
  category_id text not null references public.categories (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(market_id, merchant_id) = 1),
  unique (market_id, category_id),
  unique (merchant_id, category_id)
);

comment on table public.storefront_categories is
  'Sélection ordonnée de catégories globales mises en avant par une enseigne (market_id, administrateur) '
  'ou par une boutique (merchant_id, administrateur ou propriétaire du commerce). Migration 023.';

create index if not exists storefront_categories_merchant_idx on public.storefront_categories (merchant_id, sort_order);
create index if not exists storefront_categories_market_idx on public.storefront_categories (market_id, sort_order);

alter table public.storefront_categories enable row level security;

drop policy if exists "Lecture des categories mises en avant" on public.storefront_categories;
create policy "Lecture des categories mises en avant"
  on public.storefront_categories for select
  using (
    market_id is not null
    or exists (
      select 1 from public.merchants m
      where m.id = storefront_categories.merchant_id
        and not m.is_demo
        and (m.status = 'approved' or m.owner_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "Le proprietaire ou l'admin gere les categories mises en avant" on public.storefront_categories;
create policy "Le proprietaire ou l'admin gere les categories mises en avant"
  on public.storefront_categories for all
  using (
    public.is_admin()
    or (merchant_id is not null and exists (
      select 1 from public.merchants m
      where m.id = storefront_categories.merchant_id and m.owner_id = auth.uid() and not m.is_demo
    ))
  )
  with check (
    public.is_admin()
    or (merchant_id is not null and market_id is null and exists (
      select 1 from public.merchants m
      where m.id = storefront_categories.merchant_id and m.owner_id = auth.uid() and not m.is_demo
    ))
  );

revoke truncate, trigger, references on public.storefront_categories from anon, authenticated;

-- Enseignes réelles : catégories de leurs catalogues actuels (modifiables par l'administrateur).
insert into public.storefront_categories (market_id, category_id, sort_order) values
  ('mkt-bati-plus', 'bricolage', 0),
  ('mkt-bati-plus', 'bricolage-materiaux', 10),
  ('mkt-bati-plus', 'bricolage-ciment', 20),
  ('mkt-bati-plus', 'bricolage-carrelage', 30),
  ('mkt-bati-plus', 'bricolage-plomberie', 40),
  ('mkt-bati-plus', 'bricolage-electricite', 50),
  ('mkt-bati-plus', 'bricolage-peinture', 60),
  ('mkt-bati-plus', 'bricolage-quincaillerie', 70),
  ('mkt-ceca-gadis', 'epicerie', 0),
  ('mkt-ceca-gadis', 'epicerie-salee', 10),
  ('mkt-ceca-gadis', 'epicerie-boissons', 20),
  ('mkt-ceca-gadis', 'epicerie-frais', 30),
  ('mkt-ceca-gadis', 'epicerie-droguerie', 40)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 5. Rubriques du commerçant (collections) et liaison produit <-> rubrique
-- ---------------------------------------------------------------------------

create table if not exists public.merchant_sections (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  is_active boolean not null default true,
  image_url text check (
    image_url is null
    or image_url like 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/product-photos/%'
  ),
  created_at timestamptz not null default now(),
  unique (id, merchant_id)
);

create unique index if not exists merchant_sections_name_key on public.merchant_sections (merchant_id, lower(trim(name)));

comment on table public.merchant_sections is
  'Rubriques propres à un commerçant (« Promotions », « Nouveautés »...). Ne modifient jamais la catégorie '
  'globale d''un produit. Migration 023.';

alter table public.merchant_sections enable row level security;

drop policy if exists "Lecture des rubriques visibles, du proprietaire ou de l'admin" on public.merchant_sections;
create policy "Lecture des rubriques visibles, du proprietaire ou de l'admin"
  on public.merchant_sections for select
  using (
    exists (
      select 1 from public.merchants m
      where m.id = merchant_sections.merchant_id
        and not m.is_demo
        and ((m.status = 'approved' and merchant_sections.is_visible and merchant_sections.is_active)
             or m.owner_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "Le proprietaire ou l'admin gere ses rubriques" on public.merchant_sections;
create policy "Le proprietaire ou l'admin gere ses rubriques"
  on public.merchant_sections for all
  using (
    public.is_admin()
    or exists (select 1 from public.merchants m
               where m.id = merchant_sections.merchant_id and m.owner_id = auth.uid() and not m.is_demo)
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.merchants m
               where m.id = merchant_sections.merchant_id and m.owner_id = auth.uid() and not m.is_demo)
  );

revoke truncate, trigger, references on public.merchant_sections from anon, authenticated;

create table if not exists public.merchant_section_products (
  section_id uuid not null,
  product_id uuid not null,
  merchant_id uuid not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (section_id, product_id),
  -- La rubrique et le produit appartiennent au même commerçant (garanti par la base).
  foreign key (section_id, merchant_id) references public.merchant_sections (id, merchant_id) on delete cascade,
  foreign key (product_id, merchant_id) references public.products (id, merchant_id) on delete cascade
);

create index if not exists merchant_section_products_product_idx on public.merchant_section_products (product_id);

comment on table public.merchant_section_products is
  'Liaison produit <-> rubrique : un produit peut figurer dans plusieurs rubriques sans être dupliqué. '
  'Supprimer une rubrique ne supprime que les liaisons, jamais le produit. Migration 023.';

alter table public.merchant_section_products enable row level security;

drop policy if exists "Lecture des liaisons des rubriques lisibles" on public.merchant_section_products;
create policy "Lecture des liaisons des rubriques lisibles"
  on public.merchant_section_products for select
  using (exists (select 1 from public.merchant_sections s where s.id = merchant_section_products.section_id));

drop policy if exists "Le proprietaire ou l'admin lie ses produits a ses rubriques" on public.merchant_section_products;
create policy "Le proprietaire ou l'admin lie ses produits a ses rubriques"
  on public.merchant_section_products for all
  using (
    public.is_admin()
    or exists (select 1 from public.merchants m
               where m.id = merchant_section_products.merchant_id and m.owner_id = auth.uid() and not m.is_demo)
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.merchants m
               where m.id = merchant_section_products.merchant_id and m.owner_id = auth.uid() and not m.is_demo)
  );

revoke truncate, trigger, references on public.merchant_section_products from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Règle d'affichage : catégories non vides (ou mises en avant par l'éditorial)
-- ---------------------------------------------------------------------------

-- p_parent null : familles ; sinon sous-catégories de cette famille.
-- Produit publiable = produit d'un commerçant approuvé et non démo.
create or replace function public.visible_categories(p_parent text default null)
returns table (id text, parent_id text, label text, short_label text, sort_order integer,
               image_url text, is_featured boolean, product_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.parent_id, c.label, c.short_label, c.sort_order, c.image_url, c.is_featured, coalesce(n.cnt, 0)
  from public.categories c
  left join lateral (
    select count(*) as cnt
    from public.products p
    join public.merchants m on m.id = p.merchant_id
    where m.status = 'approved' and not m.is_demo
      and (case when c.parent_id is null then p.category = c.id else p.subcategory_id = c.id end)
  ) n on true
  where c.is_active
    and c.parent_id is not distinct from p_parent
    and (p_parent is null or exists (select 1 from public.categories f where f.id = p_parent and f.is_active))
    and (coalesce(n.cnt, 0) > 0 or c.is_featured)
  order by c.sort_order, c.label;
$$;

revoke execute on function public.visible_categories(text) from public;
grant execute on function public.visible_categories(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Données : sous-catégories certaines et attributs déduits des variantes existantes
-- ---------------------------------------------------------------------------
-- Par identifiant de produit (pas par nom de commerçant). Seule la sous-catégorie est renseignée,
-- la famille ne change pas. Produits laissés au niveau famille (classement incertain) : coffre-fort,
-- groupes électrogènes, surpresseur pour piscine (Bâti Plus) ; pain de boulangerie, tomates locales (CECADO) ;
-- produits des commerçants de démonstration (non publics). Voir docs/audits/AUDIT_CATEGORISATION.md.

update public.products p
set subcategory_id = v.sub
from (values
  -- Bâti Plus Gabon
  ('accc83de-0655-43d4-9b71-5a021f84eeff', 'bricolage', 'bricolage-materiaux'),     -- Fer à béton 6mm
  ('df288855-11d0-47b1-aa85-7d517f77684c', 'bricolage', 'bricolage-materiaux'),     -- Fer à béton 8mm
  ('fe052f72-64ce-46d1-b469-5343fe31f629', 'bricolage', 'bricolage-materiaux'),     -- Fer à béton 10mm
  ('106248b2-0191-43b0-a4d7-50898c14d8a8', 'bricolage', 'bricolage-materiaux'),     -- Fer à béton 12mm
  ('55c85250-b2be-421d-b264-4e8a1546e204', 'bricolage', 'bricolage-materiaux'),     -- Fer à béton 14mm
  ('1136a722-cef6-461d-a3e2-59496638de2d', 'bricolage', 'bricolage-materiaux'),     -- Fer à béton 16mm
  ('126a6cc0-3570-4d01-bb92-c7162d3d45a8', 'bricolage', 'bricolage-ciment'),        -- Sac de ciment 25kg
  ('bd7a40f6-6cc9-422d-a472-58417ad9e057', 'bricolage', 'bricolage-ciment'),        -- Sac de ciment 50kg
  ('3d334489-8580-478c-9e40-1510cf5e8f7d', 'bricolage', 'bricolage-carrelage'),     -- Carrelage sol 60x60 Gris
  ('5e864cf5-8467-4ccd-8f89-3d26c7eb0ab0', 'bricolage', 'bricolage-carrelage'),     -- Carrelage sol 60x60 Beige
  ('a70d877a-f4bb-4abe-917d-e818f817d1e6', 'bricolage', 'bricolage-carrelage'),     -- Carrelage sol 60x60 Blanc
  ('09db576e-6372-4ce7-bd96-498e0f091cb8', 'bricolage', 'bricolage-plomberie'),     -- Pommeau de douche
  ('d5fab9ca-2cda-4115-a9f4-07515dc542bf', 'bricolage', 'bricolage-plomberie'),     -- Robinetterie Mitigeur douche
  ('b5f952c3-7e8f-4235-9206-9fa73867db78', 'bricolage', 'bricolage-plomberie'),     -- Robinetterie Mitigeur lavabo
  ('d128693f-17b6-4f16-892c-9dda7ed2f964', 'bricolage', 'bricolage-plomberie'),     -- Robinetterie Mitigeur cuisine
  ('f2cdc61d-8b36-4303-9c84-d475e2afaf64', 'bricolage', 'bricolage-electricite'),   -- Câble 1.5mm²
  ('a48b8814-372d-4d2b-9fc0-ae41417c09ec', 'bricolage', 'bricolage-electricite'),   -- Câble 2.5mm²
  ('c06aaf3f-e1fc-4a51-9145-8d7fd65e330a', 'bricolage', 'bricolage-electricite'),   -- Câble 6mm²
  ('619c2f2b-6467-45c2-94bf-e1e639b8ef1a', 'bricolage', 'bricolage-electricite'),   -- Luminaire LED plafonnier
  ('7790a986-be64-4d68-9821-88600806b42e', 'bricolage', 'bricolage-peinture'),      -- Peinture murale 20L Blanc
  ('098da047-1f27-48db-b4e4-ea417f5b4443', 'bricolage', 'bricolage-peinture'),      -- Peinture murale 20L Beige
  ('62c56eae-ea79-49d7-8f90-86f7e3ce8201', 'bricolage', 'bricolage-peinture'),      -- Peinture murale 20L Gris clair
  ('6e1cd4fe-c014-4ea7-a4b3-66e82190aad2', 'bricolage', 'bricolage-quincaillerie'), -- Perceuse 500W
  ('5cb09a8f-e4bd-4a48-a71e-266ed8230444', 'bricolage', 'bricolage-quincaillerie'), -- Perceuse 750W
  ('efee44c0-f17b-410f-8c20-5c8176102949', 'bricolage', 'bricolage-quincaillerie'), -- Perceuse 1000W
  -- CECADO
  ('39cd8cb0-a737-4395-b025-ab1551e624c5', 'epicerie', 'epicerie-salee'),           -- Riz importé 5kg
  ('ae613754-cd91-432c-b725-8065c0c27767', 'epicerie', 'epicerie-salee'),           -- Riz importé 10kg
  ('c8ccc0a9-abb3-4a5f-98f2-99663dc9280b', 'epicerie', 'epicerie-salee'),           -- Riz importé 25kg
  ('b012ddd6-8505-4f66-8252-51a92bbe7a30', 'epicerie', 'epicerie-salee'),           -- Riz importé 50kg
  ('b56cc960-9d7e-40b0-8b8c-156d1be9deb0', 'epicerie', 'epicerie-salee'),           -- Huile de cuisine 1L
  ('172d5837-6915-4aed-b1ed-32f0043e3781', 'epicerie', 'epicerie-salee'),           -- Huile de cuisine 2L
  ('08d92988-6639-49d3-8a92-49c213376450', 'epicerie', 'epicerie-salee'),           -- Huile de cuisine 5L
  ('1bd91746-8cde-4b3b-b691-2afaf0be5ee2', 'epicerie', 'epicerie-boissons'),        -- Eau minérale 0.5L
  ('b3da4059-65ea-4de6-ac82-666ec35a0b7d', 'epicerie', 'epicerie-boissons'),        -- Eau minérale 1.5L
  ('a2137318-b6ba-42cc-8304-987e84353fc5', 'epicerie', 'epicerie-boissons'),        -- Eau minérale 5L
  ('ce5eb48c-fffc-4bd6-91c3-903abaf0e0dc', 'epicerie', 'epicerie-boissons'),        -- Jus de fruit Orange
  ('cebb1895-daca-4578-b6cc-bf8441db8fde', 'epicerie', 'epicerie-boissons'),        -- Jus de fruit Ananas
  ('238a9d08-9eaa-40e2-94d3-e5cf20b17040', 'epicerie', 'epicerie-boissons'),        -- Jus de fruit Mangue
  ('16b5282d-b52f-4b7b-b6c8-e59f3e4df806', 'epicerie', 'epicerie-frais'),           -- Jambon de charcuterie
  ('8f84d466-3b95-45fa-b67b-3c747acf9e32', 'epicerie', 'epicerie-droguerie'),       -- Lessive en poudre 1kg
  ('5ef89f39-36c6-41f9-b305-660d04aae511', 'epicerie', 'epicerie-droguerie'),       -- Lessive en poudre 3kg
  ('03a50efe-4e62-4b70-a811-d66311f1d8ac', 'epicerie', 'epicerie-droguerie'),       -- Lessive en poudre 5kg
  ('1aa45758-ab94-4458-b5a7-6356159a458b', 'epicerie', 'epicerie-droguerie'),       -- Papier toilette pack de 6
  ('97b66a66-f313-405d-a38f-cf9eb673d722', 'epicerie', 'epicerie-droguerie'),       -- Papier toilette pack de 12
  ('d7db7d9d-0d56-4c31-ac66-da127e438488', 'epicerie', 'epicerie-droguerie'),       -- Savon de toilette Neutre
  ('2a3f5e49-5b8a-42d0-acb0-5ac2dfb03372', 'epicerie', 'epicerie-droguerie'),       -- Savon de toilette Lavande
  ('e04a0360-fead-484c-acc5-3f79adfa8df1', 'epicerie', 'epicerie-droguerie')        -- Savon de toilette Citron
) as v(id, family, sub)
where p.id = v.id::uuid
  and p.category = v.family        -- jamais de changement de famille
  and p.subcategory_id is null;    -- ne pas écraser un classement déjà fait

-- Attributs : valeurs lues dans les noms et variantes déjà saisis (ex. « 12mm » -> diamètre 12).
update public.products p
set attributes = p.attributes || v.attrs::jsonb
from (values
  ('accc83de-0655-43d4-9b71-5a021f84eeff', '{"diametre": 6}'),
  ('df288855-11d0-47b1-aa85-7d517f77684c', '{"diametre": 8}'),
  ('fe052f72-64ce-46d1-b469-5343fe31f629', '{"diametre": 10}'),
  ('106248b2-0191-43b0-a4d7-50898c14d8a8', '{"diametre": 12}'),
  ('55c85250-b2be-421d-b264-4e8a1546e204', '{"diametre": 14}'),
  ('1136a722-cef6-461d-a3e2-59496638de2d', '{"diametre": 16}'),
  ('126a6cc0-3570-4d01-bb92-c7162d3d45a8', '{"poids": 25}'),
  ('bd7a40f6-6cc9-422d-a472-58417ad9e057', '{"poids": 50}'),
  ('3d334489-8580-478c-9e40-1510cf5e8f7d', '{"format": "60x60", "couleur": "Gris"}'),
  ('5e864cf5-8467-4ccd-8f89-3d26c7eb0ab0', '{"format": "60x60", "couleur": "Beige"}'),
  ('a70d877a-f4bb-4abe-917d-e818f817d1e6', '{"format": "60x60", "couleur": "Blanc"}'),
  ('f2cdc61d-8b36-4303-9c84-d475e2afaf64', '{"section": 1.5}'),
  ('a48b8814-372d-4d2b-9fc0-ae41417c09ec', '{"section": 2.5}'),
  ('c06aaf3f-e1fc-4a51-9145-8d7fd65e330a', '{"section": 6}'),
  ('7790a986-be64-4d68-9821-88600806b42e', '{"couleur": "Blanc", "contenance": 20}'),
  ('098da047-1f27-48db-b4e4-ea417f5b4443', '{"couleur": "Beige", "contenance": 20}'),
  ('62c56eae-ea79-49d7-8f90-86f7e3ce8201', '{"couleur": "Gris clair", "contenance": 20}'),
  ('6e1cd4fe-c014-4ea7-a4b3-66e82190aad2', '{"puissance": 500}'),
  ('5cb09a8f-e4bd-4a48-a71e-266ed8230444', '{"puissance": 750}'),
  ('efee44c0-f17b-410f-8c20-5c8176102949', '{"puissance": 1000}'),
  ('39cd8cb0-a737-4395-b025-ab1551e624c5', '{"poids": 5}'),
  ('ae613754-cd91-432c-b725-8065c0c27767', '{"poids": 10}'),
  ('c8ccc0a9-abb3-4a5f-98f2-99663dc9280b', '{"poids": 25}'),
  ('b012ddd6-8505-4f66-8252-51a92bbe7a30', '{"poids": 50}'),
  ('b56cc960-9d7e-40b0-8b8c-156d1be9deb0', '{"contenance": 1}'),
  ('172d5837-6915-4aed-b1ed-32f0043e3781', '{"contenance": 2}'),
  ('08d92988-6639-49d3-8a92-49c213376450', '{"contenance": 5}'),
  ('1bd91746-8cde-4b3b-b691-2afaf0be5ee2', '{"contenance": 0.5}'),
  ('b3da4059-65ea-4de6-ac82-666ec35a0b7d', '{"contenance": 1.5}'),
  ('a2137318-b6ba-42cc-8304-987e84353fc5', '{"contenance": 5}'),
  ('8f84d466-3b95-45fa-b67b-3c747acf9e32', '{"poids": 1}'),
  ('5ef89f39-36c6-41f9-b305-660d04aae511', '{"poids": 3}'),
  ('03a50efe-4e62-4b70-a811-d66311f1d8ac', '{"poids": 5}')
) as v(id, attrs)
where p.id = v.id::uuid;

-- ---------------------------------------------------------------------------
-- 8. Garde-fous : aucune perte, aucune modification de prix, unité, nom, commerçant ni famille
-- ---------------------------------------------------------------------------

do $$
declare
  v_missing integer;
  v_changed integer;
  v_incoherent integer;
begin
  select count(*) into v_missing
  from _t023_products_before b
  where not exists (select 1 from public.products p where p.id = b.id);
  if v_missing > 0 then
    raise exception '023 : % produit(s) disparu(s) : arrêt', v_missing;
  end if;

  select count(*) into v_changed
  from _t023_products_before b
  join public.products p on p.id = b.id
  where p.price is distinct from b.price
     or p.unit is distinct from b.unit
     or p.name is distinct from b.name
     or p.merchant_id is distinct from b.merchant_id
     or p.category is distinct from b.category
     or p.variant_label is distinct from b.variant_label;
  if v_changed > 0 then
    raise exception '023 : % produit(s) modifié(s) hors sous-catégorie ou attributs : arrêt', v_changed;
  end if;

  select count(*) into v_incoherent
  from public.products p
  join public.categories s on s.id = p.subcategory_id
  where s.parent_id is distinct from p.category;
  if v_incoherent > 0 then
    raise exception '023 : % sous-catégorie(s) incohérente(s) avec leur famille : arrêt', v_incoherent;
  end if;
end $$;

commit;
