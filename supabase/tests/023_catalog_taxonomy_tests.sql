-- Tests de la taxonomie du catalogue (023) : 9 scénarios du propriétaire, positifs et négatifs.
--
-- Exécution : migrations 020 à 026 appliquées (état de production). Le fichier porte lui-même
-- sa transaction : "begin;" en tête, "rollback;" en fin ; il s'exécute tel quel (SQL editor, psql,
-- execute_sql). Le dernier SELECT avant le rollback donne le décompte positifs / négatifs.
-- Dernière exécution contre la production : 19/10/2026, 46 positifs + 31 négatifs = 77, tous passés,
-- aucune donnée restante (comptes des tables identiques avant / après).
--
-- Chaque assertion lève une exception en cas d'échec (la transaction échoue alors en entier).
-- Rôles simulés par "set local role" + "set local request.jwt.claims". Rien ne reste après le rollback.
-- Depuis 027 : sessions simulées en aal2 (is_admin() exige aal2 et une ligne admin_users ; sans effet pour les non-admins).
-- Prix utilisés : prix de magasin fictifs de test (aucun prix officiel DGCCRF).

begin;

create temporary table t_results (id serial, kind text, name text);
grant all on t_results to authenticated, anon;
grant usage on sequence t_results_id_seq to authenticated, anon;

create function pg_temp.t_as(p_uid uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', 'aal2')::text);
  execute 'set local role authenticated';
end $$;

create function pg_temp.t_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''{"role":"anon"}''';
  execute 'set local role anon';
end $$;

create function pg_temp.t_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end $$;

create function pg_temp.t_ok(p_kind text, p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'ECHEC [%] %', p_kind, p_name;
  end if;
  insert into t_results (kind, name) values (p_kind, p_name);
end $$;

-- Exécute p_sql et exige une erreur dont le message contient p_fragment.
create function pg_temp.t_err(p_name text, p_sql text, p_fragment text) returns void language plpgsql as $$
declare
  v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is null then
    raise exception 'ECHEC [negatif] % : aucune erreur levée', p_name;
  end if;
  if v_msg not ilike '%' || p_fragment || '%' then
    raise exception 'ECHEC [negatif] % : erreur inattendue « % »', p_name, v_msg;
  end if;
  insert into t_results (kind, name) values ('negatif', p_name);
end $$;

-- Exécute p_sql (UPDATE/DELETE) et renvoie le nombre de lignes touchées.
create function pg_temp.t_rows(p_sql text) returns integer language plpgsql as $$
declare
  v_n integer;
begin
  execute p_sql;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

do $$
declare
  -- Comptes et lignes de test (annulés par le rollback)
  oa uuid := '23000000-0000-0000-0000-0000000000a1';  -- propriétaire du commerce A
  ob uuid := '23000000-0000-0000-0000-0000000000b1';  -- propriétaire du commerce B
  oc uuid := '23000000-0000-0000-0000-0000000000c1';  -- propriétaire de l'enseigne électricité E
  cx uuid := '23000000-0000-0000-0000-0000000000ff';  -- client sans commerce
  ma uuid := '23000000-0000-0000-0000-0000000001a1';
  mb uuid := '23000000-0000-0000-0000-0000000001b1';
  me uuid := '23000000-0000-0000-0000-0000000001c1';
  pa uuid := '23000000-0000-0000-0000-0000000002a1';  -- robinet A (plomberie)
  pa2 uuid := '23000000-0000-0000-0000-0000000002a2'; -- fer à béton A (matériaux, sans attribut)
  pb uuid := '23000000-0000-0000-0000-0000000002b1';  -- robinet B (plomberie)
  pe uuid := '23000000-0000-0000-0000-0000000002c1';  -- câble E (électricité)
  sa uuid; sa2 uuid; sb uuid;
  adm uuid;
  n int; n2 int; v_text text; v_price int; v_cat text; v_sub text; v_mid uuid; v_unit text;
  real_products int; real_price_sum bigint; orders_before int; demo_products int;
  -- Références lues en base avant tout jeu de données (aucun nombre de produits codé en dur)
  bp_before int; cecado_before int; mat_before int; mat_diam_before int;
begin
  -- ------------------------------------------------------------ jeu de données (rôle postgres)
  perform pg_temp.t_postgres();
  select id into adm from auth.users where lower(email) = 'thibiosang@gmail.com';
  if adm is null then raise exception 'Compte admin introuvable'; end if;

  select count(*), coalesce(sum(p.price), 0) into real_products, real_price_sum
  from public.products p join public.merchants m on m.id = p.merchant_id where not m.is_demo;
  select count(*) into demo_products from public.products p join public.merchants m on m.id = p.merchant_id where m.is_demo;
  select count(*) into orders_before from public.orders;
  select count(*) into bp_before from public.products p join public.merchants m on m.id = p.merchant_id where m.name = 'Bâti Plus Gabon';
  select count(*) into cecado_before from public.products p join public.merchants m on m.id = p.merchant_id where m.name = 'CECADO';
  -- Matériaux publiables (commerçant approuvé, non démo), avec et sans diamètre renseigné
  select count(*), count(*) filter (where p.attributes ->> 'diametre' is not null) into mat_before, mat_diam_before
  from public.products p join public.merchants m on m.id = p.merchant_id
  where p.subcategory_id = 'bricolage-materiaux' and m.status = 'approved' and not m.is_demo;

  insert into auth.users (id, email) values
    (oa, 'test023-a@example.invalid'), (ob, 'test023-b@example.invalid'),
    (oc, 'test023-c@example.invalid'), (cx, 'test023-x@example.invalid');
  insert into public.merchants (id, owner_id, name, market_id, categories, address, status) values
    (ma, oa, 'Test023 Quincaillerie A', 'independant', array['bricolage'], 'Oloumi', 'approved'),
    (mb, ob, 'Test023 Quincaillerie B', 'independant', array['bricolage'], 'Akébé', 'approved'),
    (me, oc, 'Test023 Électricité E', 'independant', array['bricolage'], 'Glass', 'approved');
  insert into public.products (id, merchant_id, name, category, subcategory_id, price, unit, attributes) values
    (pa,  ma, 'Test023 Robinet mitigeur', 'bricolage', 'bricolage-plomberie', 25000, 'pièce', '{}'),
    (pa2, ma, 'Test023 Fer', 'bricolage', 'bricolage-materiaux', 3000, 'barre', '{}'),
    (pb,  mb, 'Test023 Robinet mitigeur', 'bricolage', 'bricolage-plomberie', 24000, 'pièce', '{}'),
    (pe,  me, 'Test023 Câble', 'bricolage', 'bricolage-electricite', 18000, 'rouleau', '{"section": 2.5}');

  -- ------------------------------------------------------------ état après migration (non-régression des données)
  select count(*) into n from public.categories where parent_id is null and id in (
    'legumes','fruits','poisson','cereales','restauration','boulangerie','bricolage','epicerie','high-tech','maison',
    'mode','beaute','auto-moto','bebe','livres','jeux','sport','industrie','chr','numerique');
  perform pg_temp.t_ok('positif', n = 20, 'S9 Les 20 identifiants de famille actuels existent en base');
  select count(*) into n from public.categories c
   where c.parent_id is not null and not exists (select 1 from public.categories f where f.id = c.parent_id and f.parent_id is null);
  perform pg_temp.t_ok('positif', n = 0, 'S9 Toute sous-catégorie a une famille pour parent');
  select count(*) into n from (select lower(label) from public.categories group by parent_id, lower(label) having count(*) > 1) d;
  perform pg_temp.t_ok('positif', n = 0, 'S9 Aucun libellé en double dans une même famille');
  select count(*) into n from public.products p join public.merchants m on m.id = p.merchant_id where m.name = 'Bâti Plus Gabon';
  select count(*) into n2 from public.products p join public.merchants m on m.id = p.merchant_id where m.name = 'CECADO';
  -- 87 Bâti Plus depuis 025 (30 avant), 24 CECADO au 19/10/2026 : comptés en base, non codés en dur.
  perform pg_temp.t_ok('positif', n = bp_before and n2 = cecado_before and n > 0 and n2 > 0,
    'S7 Bâti Plus et CECADO : catalogue présent et rattaché (comptes lus en base)');
  select count(*) into n from public.products p join public.categories s on s.id = p.subcategory_id where s.parent_id <> p.category;
  perform pg_temp.t_ok('positif', n = 0, 'S9 Aucune sous-catégorie incohérente avec la famille du produit');

  -- ============================================================ S1 Plusieurs marchands dans « Plomberie »
  perform pg_temp.t_anon();
  select count(distinct merchant_id) into n from public.products where subcategory_id = 'bricolage-plomberie';
  perform pg_temp.t_ok('positif', n >= 3, 'S1 Anonyme : au moins 3 commerçants dans Plomberie (Bâti Plus, A, B)');
  select count(*) into n from public.visible_categories('bricolage') where id = 'bricolage-plomberie' and product_count >= 6;
  perform pg_temp.t_ok('positif', n = 1, 'S1 Plomberie visible avec les produits de plusieurs commerçants');

  -- ============================================================ S2 Enseigne électricité sans mode ni cosmétique
  perform pg_temp.t_as(oc);
  insert into public.storefront_categories (merchant_id, category_id, sort_order) values (me, 'bricolage-electricite', 0);
  perform pg_temp.t_ok('positif', true, 'S2 Le propriétaire met en avant Électricité pour sa boutique');
  perform pg_temp.t_err('S2 Le propriétaire ne met rien en avant pour la boutique d''un autre',
    format('insert into public.storefront_categories (merchant_id, category_id) values (%L, %L)', ma, 'mode'),
    'row-level security');
  perform pg_temp.t_err('S2 Le propriétaire ne modifie pas les catégories d''une enseigne',
    'insert into public.storefront_categories (market_id, category_id) values (''mkt-bati-plus'', ''mode'')',
    'row-level security');
  perform pg_temp.t_err('S2 Ligne à la fois enseigne et boutique refusée',
    format('insert into public.storefront_categories (market_id, merchant_id, category_id) values (''mkt-bati-plus'', %L, ''beaute'')', me),
    'violates');
  perform pg_temp.t_anon();
  select count(*) into n from public.storefront_categories s join public.categories c on c.id = s.category_id
   where s.merchant_id = me and (c.id in ('mode','beaute') or c.parent_id in ('mode','beaute'));
  select count(*) into n2 from public.storefront_categories where merchant_id = me and category_id = 'bricolage-electricite';
  perform pg_temp.t_ok('positif', n = 0 and n2 = 1, 'S2 Boutique électricité : aucune catégorie mode ou cosmétique');
  select count(*) into n from public.products p join public.categories c on c.id = p.category
   where p.merchant_id = me and p.category in ('mode','beaute');
  perform pg_temp.t_ok('positif', n = 0, 'S2 Aucun produit mode ou cosmétique rattaché à la boutique électricité');
  select count(*) into n from public.storefront_categories where market_id = 'mkt-bati-plus' and category_id in ('mode','beaute');
  perform pg_temp.t_ok('positif', n = 0, 'S2 Enseigne Bâti Plus : aucune catégorie mode ou cosmétique mise en avant');
  perform pg_temp.t_as(adm);
  insert into public.storefront_categories (market_id, category_id, sort_order) values ('mkt-centre-affaires', 'epicerie', 0);
  perform pg_temp.t_ok('positif', true, 'S2 L''administrateur met en avant une catégorie pour une enseigne');
  perform pg_temp.t_err('S2 Identifiant d''enseigne mal formé refusé',
    'insert into public.storefront_categories (market_id, category_id) values (''Bati Plus'', ''epicerie'')',
    'check constraint');

  -- ============================================================ S3 Rubrique « Promotions » sans changer la catégorie globale
  perform pg_temp.t_as(oa);
  insert into public.merchant_sections (merchant_id, name, sort_order) values (ma, 'Promotions', 0) returning id into sa;
  insert into public.merchant_sections (merchant_id, name, sort_order) values (ma, 'Nouveautés', 1) returning id into sa2;
  insert into public.merchant_section_products (section_id, product_id, merchant_id) values (sa, pa, ma), (sa2, pa, ma), (sa, pa2, ma);
  select category, subcategory_id, price into v_cat, v_sub, v_price from public.products where id = pa;
  perform pg_temp.t_ok('positif', v_cat = 'bricolage' and v_sub = 'bricolage-plomberie' and v_price = 25000,
    'S3 Produit en « Promotions » : catégorie, sous-catégorie et prix inchangés');
  select count(*) into n from public.products where id = pa;
  select count(*) into n2 from public.merchant_section_products where product_id = pa;
  perform pg_temp.t_ok('positif', n = 1 and n2 = 2, 'S3 Un produit dans deux rubriques sans duplication');
  perform pg_temp.t_err('S3 Deux rubriques du même nom refusées',
    format('insert into public.merchant_sections (merchant_id, name) values (%L, '' promotions '')', ma), 'duplicate key');
  perform pg_temp.t_err('S3 Nom de rubrique vide refusé',
    format('insert into public.merchant_sections (merchant_id, name) values (%L, '' '')', ma), 'check constraint');
  update public.merchant_sections set is_visible = false where id = sa2;
  perform pg_temp.t_anon();
  select count(*) into n from public.merchant_sections where merchant_id = ma;
  perform pg_temp.t_ok('positif', n = 1, 'S3 Anonyme : seule la rubrique visible est lue');
  select count(*) into n from public.merchant_section_products where section_id = sa2;
  perform pg_temp.t_ok('positif', n = 0, 'S3 Anonyme : liaisons d''une rubrique masquée non lues');
  perform pg_temp.t_as(oa);
  select count(*) into n from public.merchant_sections where merchant_id = ma;
  perform pg_temp.t_ok('positif', n = 2, 'S3 Le propriétaire lit aussi sa rubrique masquée');

  -- ============================================================ S4 Isolation des vendeurs
  perform pg_temp.t_as(ob);
  insert into public.merchant_sections (merchant_id, name) values (mb, 'Promotions') returning id into sb;
  perform pg_temp.t_ok('positif', sb is not null, 'S4 Le commerçant B crée sa propre rubrique « Promotions »');
  perform pg_temp.t_err('S4 B ne crée pas de rubrique chez A',
    format('insert into public.merchant_sections (merchant_id, name) values (%L, ''Intrus'')', ma), 'row-level security');
  perform pg_temp.t_err('S4 B ne lie pas son produit à une rubrique de A',
    format('insert into public.merchant_section_products (section_id, product_id, merchant_id) values (%L, %L, %L)', sa, pb, mb),
    'foreign key');
  perform pg_temp.t_err('S4 B ne lie pas un produit de A en se déclarant A',
    format('insert into public.merchant_section_products (section_id, product_id, merchant_id) values (%L, %L, %L)', sa, pa, ma),
    'row-level security');
  perform pg_temp.t_ok('negatif',
    pg_temp.t_rows(format('update public.merchant_sections set name = ''Pirate'' where id = %L', sa)) = 0,
    'S4 B ne renomme pas la rubrique de A (0 ligne)');
  perform pg_temp.t_ok('negatif',
    pg_temp.t_rows(format('delete from public.merchant_section_products where section_id = %L', sa)) = 0,
    'S4 B ne retire pas les produits de la rubrique de A (0 ligne)');
  perform pg_temp.t_ok('negatif',
    pg_temp.t_rows(format('update public.products set subcategory_id = ''bricolage-materiaux'' where id = %L', pa)) = 0,
    'S4 B ne reclasse pas un produit de A (0 ligne)');
  perform pg_temp.t_as(oa);
  perform pg_temp.t_err('S4 A ne lie pas le produit de B à sa rubrique (même commerçant exigé)',
    format('insert into public.merchant_section_products (section_id, product_id, merchant_id) values (%L, %L, %L)', sa, pb, ma),
    'foreign key');
  perform pg_temp.t_err('S4 A ne lie rien à la rubrique de B',
    format('insert into public.merchant_section_products (section_id, product_id, merchant_id) values (%L, %L, %L)', sb, pb, mb),
    'row-level security');
  perform pg_temp.t_as(cx);
  perform pg_temp.t_err('S4 Un client sans commerce ne crée pas de rubrique',
    format('insert into public.merchant_sections (merchant_id, name) values (%L, ''Client'')', ma), 'row-level security');
  perform pg_temp.t_as(adm);
  select count(*) into n from public.merchant_sections where merchant_id in (ma, mb);
  perform pg_temp.t_ok('positif', n = 3, 'S4 L''administrateur lit toutes les rubriques');

  -- ============================================================ S5 Recherche multi-marchands
  perform pg_temp.t_anon();
  select count(*), count(distinct p.merchant_id), string_agg(distinct m.name, ' | ') into n, n2, v_text
  from public.products p join public.merchants m on m.id = p.merchant_id
  where p.name ilike '%test023 robinet%';
  perform pg_temp.t_ok('positif', n = 2 and n2 = 2 and v_text like '%Quincaillerie A%' and v_text like '%Quincaillerie B%',
    'S5 Recherche « robinet » : 2 résultats, 2 vendeurs identifiés');
  select count(*) into n from public.products p where p.merchant_id = ma;
  perform pg_temp.t_ok('positif', n = 2, 'S5 Rubriques sans effet sur le nombre de résultats (pas de doublon)');
  select count(*) into n from public.products p
   where p.category = 'bricolage' and p.name ilike '%test023%';
  perform pg_temp.t_ok('positif', n = 4, 'S5 Page catégorie Bricolage : produits des 3 commerçants de test');

  -- ============================================================ S6 Catégories vides masquées
  perform pg_temp.t_anon();
  select count(*) into n from public.visible_categories() where id in ('bricolage', 'epicerie');
  perform pg_temp.t_ok('positif', n = 2, 'S6 Familles avec produits publiables visibles (Bricolage, Épicerie)');
  select count(*) into n from public.visible_categories() where id in ('mode', 'numerique');
  perform pg_temp.t_ok('positif', n = 0, 'S6 Familles sans produit masquées (Mode, Produits numériques)');
  select count(*) into n from public.visible_categories() where id = 'legumes';
  perform pg_temp.t_ok('positif', n = 0, 'S6 Produits de démonstration non comptés (Légumes masquée)');
  select count(*) into n from public.visible_categories('bricolage') where id = 'bricolage-menuiserie';
  perform pg_temp.t_ok('positif', n = 0, 'S6 Sous-catégorie vide masquée (Menuiserie)');
  perform pg_temp.t_as(adm);
  update public.categories set is_featured = true where id = 'mode';
  perform pg_temp.t_anon();
  select count(*) into n from public.visible_categories() where id = 'mode';
  perform pg_temp.t_ok('positif', n = 1, 'S6 Indicateur éditorial : Mode affichée sans produit');
  perform pg_temp.t_as(adm);
  update public.categories set is_active = false where id = 'mode';
  perform pg_temp.t_anon();
  select count(*) into n from public.visible_categories() where id = 'mode';
  select count(*) into n2 from public.categories where id = 'mode';
  perform pg_temp.t_ok('positif', n = 0 and n2 = 0, 'S6 Famille désactivée : masquée et non lue par l''anonyme');

  -- ============================================================ S7 Aucune perte de produit, prix, stock ou commande
  perform pg_temp.t_as(oa);
  update public.products set category = 'maison', subcategory_id = 'maison-cuisine' where id = pa2;
  select price, unit, merchant_id into v_price, v_unit, v_mid from public.products where id = pa2;
  perform pg_temp.t_ok('positif', v_price = 3000 and v_unit = 'barre' and v_mid = ma,
    'S7 Changement de catégorie : prix, unité et propriétaire inchangés');
  update public.products set category = 'bricolage', subcategory_id = 'bricolage-materiaux' where id = pa2;
  perform pg_temp.t_err('S7 Changer de famille en gardant une sous-catégorie étrangère est refusé',
    format('update public.products set category = ''maison'' where id = %L', pa), 'n''appartient pas');
  delete from public.merchant_sections where id = sa;
  select count(*) into n from public.products where id in (pa, pa2);
  perform pg_temp.t_ok('positif', n = 2, 'S7 Supprimer une rubrique ne supprime aucun produit');
  perform pg_temp.t_as(adm);
  perform pg_temp.t_err('S7 Supprimer une famille utilisée est refusé (pas de cascade)',
    'delete from public.categories where id = ''bricolage''', 'foreign key');
  perform pg_temp.t_err('S7 Supprimer une famille qui a des sous-catégories est refusé',
    'delete from public.categories where id = ''bebe''', 'foreign key');
  delete from public.categories where id = 'bricolage-plomberie';
  select count(*), sum(price) into n, n2 from public.products where id in (pa, pb);
  select count(*) into v_price from public.products where subcategory_id = 'bricolage-plomberie';
  perform pg_temp.t_ok('positif', n = 2 and n2 = 49000 and v_price = 0,
    'S7 Supprimer une sous-catégorie : produits gardés au niveau famille, prix intacts');
  select category into v_cat from public.products where id = pa;
  perform pg_temp.t_ok('positif', v_cat = 'bricolage', 'S7 Le produit garde sa famille après retrait de la sous-catégorie');
  select count(*) into n from public.products p join public.merchants m on m.id = p.merchant_id where m.name = 'Bâti Plus Gabon';
  perform pg_temp.t_ok('positif', n = bp_before,
    'S7 Retrait de la sous-catégorie Plomberie : Bâti Plus garde tous ses produits');
  update public.categories set is_active = false where id = 'bricolage-electricite';
  select count(*) into n from public.products where id = pe and subcategory_id = 'bricolage-electricite';
  perform pg_temp.t_ok('positif', n = 1, 'S7 Désactiver une sous-catégorie garde l''historique des produits');
  perform pg_temp.t_as(oc);
  update public.products set price = 19000 where id = pe;
  select price into v_price from public.products where id = pe;
  perform pg_temp.t_ok('positif', v_price = 19000, 'S7 Produit d''une sous-catégorie désactivée : modification du prix possible');
  perform pg_temp.t_err('S7 Nouvelle attribution d''une sous-catégorie désactivée refusée',
    format('insert into public.products (merchant_id, name, category, subcategory_id, price, unit) values (%L, ''Test023 X'', ''bricolage'', ''bricolage-electricite'', 1000, ''pièce'')', me),
    'désactivée');
  perform pg_temp.t_postgres();
  select count(*), coalesce(sum(p.price), 0) into n, n2
  from public.products p join public.merchants m on m.id = p.merchant_id
  where not m.is_demo and p.name not ilike 'test023%';
  perform pg_temp.t_ok('positif', n = real_products and n2 = real_price_sum,
    'S7 Produits réels : nombre et somme des prix identiques à l''état initial');
  select count(*) into n from public.products p join public.merchants m on m.id = p.merchant_id where m.is_demo;
  perform pg_temp.t_ok('positif', n = demo_products, 'S7 Produits de démonstration conservés');
  select count(*) into n from public.orders;
  perform pg_temp.t_ok('positif', n = orders_before, 'S7 Aucune commande créée ni supprimée');

  -- ============================================================ S8 Filtres tolérants aux attributs absents
  perform pg_temp.t_anon();
  select count(*) into n from public.products
   where category = 'bricolage' and name ilike 'test023%' and (attributes ->> 'section')::numeric = 2.5;
  perform pg_temp.t_ok('positif', n = 1, 'S8 Filtre Section = 2,5 : seul le produit renseigné');
  select count(*) into n from public.products
   where category = 'bricolage' and name ilike 'test023%' and not (attributes ? 'section');
  perform pg_temp.t_ok('positif', n = 3, 'S8 Produits sans attribut toujours lus (aucune erreur)');
  select count(*) into n from public.products p
   where p.subcategory_id = 'bricolage-materiaux' and (p.attributes ->> 'diametre') is not null;
  select count(*) into n2 from public.products p where p.subcategory_id = 'bricolage-materiaux';
  perform pg_temp.t_ok('positif', n = mat_diam_before and n2 = mat_before + 1 and n2 > n,
    'S8 Diamètre : seuls les fers renseignés filtrés, le produit de test sans valeur reste listé');
  perform pg_temp.t_as(oa);
  perform pg_temp.t_err('S8 Attributs qui ne sont pas un objet refusés',
    format('update public.products set attributes = ''[1,2]'' where id = %L', pa), 'check constraint');

  -- ============================================================ S9 Non-régression et contrôles d'écriture
  perform pg_temp.t_as(oa);
  insert into public.products (merchant_id, name, category, price, unit) values (ma, 'Test023 Sans sous-catégorie', 'bricolage', 1500, 'pièce');
  perform pg_temp.t_ok('positif', true, 'S9 Ajout de produit à l''ancienne (famille seule) accepté');
  perform pg_temp.t_err('S9 Famille inconnue refusée',
    format('insert into public.products (merchant_id, name, category, price, unit) values (%L, ''Test023 Y'', ''inconnue'', 1, ''pièce'')', ma),
    'inconnue');
  perform pg_temp.t_err('S9 Sous-catégorie donnée comme famille refusée',
    format('insert into public.products (merchant_id, name, category, price, unit) values (%L, ''Test023 Y'', ''bricolage-ciment'', 1, ''pièce'')', ma),
    'sous-catégorie');
  perform pg_temp.t_err('S9 Sous-catégorie d''une autre famille refusée',
    format('insert into public.products (merchant_id, name, category, subcategory_id, price, unit) values (%L, ''Test023 Y'', ''bricolage'', ''mode-femme'', 1, ''pièce'')', ma),
    'n''appartient pas');
  perform pg_temp.t_err('S9 Commerçant avec une catégorie inconnue refusé',
    format('update public.merchants set categories = array[''bricolage'', ''inconnue''] where id = %L', ma), 'inconnue');
  perform pg_temp.t_err('S9 Un commerçant ne crée pas de catégorie globale',
    'insert into public.categories (id, label) values (''test023-cat'', ''Test 023'')', 'row-level security');
  perform pg_temp.t_ok('negatif',
    pg_temp.t_rows('update public.categories set label = ''Pirate'' where id = ''epicerie''') = 0,
    'S9 Un commerçant ne renomme pas une catégorie (0 ligne)');
  perform pg_temp.t_err('S9 Un commerçant ne crée pas d''attribut',
    'insert into public.category_attributes (category_id, key, label) values (''bricolage'', ''test'', ''Test'')', 'row-level security');
  perform pg_temp.t_anon();
  select count(*) into n from public.products where merchant_id = '10000000-0000-0000-0000-000000000001';
  perform pg_temp.t_ok('positif', n = 0, 'S9 Anonyme : produits de démonstration toujours invisibles (020)');
  select count(*) into n from public.categories where is_active = false;
  perform pg_temp.t_ok('positif', n = 0, 'S9 Anonyme : aucune catégorie désactivée lue');
  perform pg_temp.t_as(adm);
  insert into public.categories (id, parent_id, label, sort_order) values ('bricolage-test023', 'bricolage', 'Test023 Sous-catégorie', 999);
  perform pg_temp.t_ok('positif', true, 'S9 L''administrateur crée une sous-catégorie');
  perform pg_temp.t_err('S9 Troisième niveau refusé',
    'insert into public.categories (id, parent_id, label) values (''test023-niveau3'', ''bricolage-test023'', ''Niveau trois'')',
    'Deux niveaux');
  perform pg_temp.t_err('S9 Identifiant de catégorie immuable',
    'update public.categories set id = ''quincaillerie'' where id = ''bricolage''', 'ne se modifie pas');
  perform pg_temp.t_err('S9 Famille utilisée : pas de changement de niveau',
    'update public.categories set parent_id = ''maison'' where id = ''epicerie''', 'ne peut pas devenir');
  insert into public.category_attributes (category_id, key, label, value_type, unit) values ('bricolage-test023', 'longueur', 'Longueur', 'nombre', 'm');
  perform pg_temp.t_ok('positif', true, 'S9 L''administrateur ajoute un attribut');
  perform pg_temp.t_err('S9 Type d''attribut inconnu refusé',
    'insert into public.category_attributes (category_id, key, label, value_type) values (''bricolage'', ''x_test'', ''X'', ''date'')',
    'check constraint');

  perform pg_temp.t_postgres();
end $$;

select kind, count(*) as nombre from t_results group by kind order by kind;

rollback;
