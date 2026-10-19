-- Tests de l'isolement des données de démonstration (020).
--
-- Exécution : migrations 020 à 026 appliquées (état de production). Le fichier porte lui-même
-- sa transaction : "begin;" en tête, "rollback;" en fin ; il s'exécute tel quel (SQL editor, psql,
-- execute_sql). Le dernier SELECT avant le rollback donne le décompte positifs / négatifs.
-- Dernière exécution contre la production : 19/10/2026, 25 positifs + 15 négatifs = 40, tous passés,
-- aucune donnée restante (comptes des tables identiques avant / après).
--
-- Chaque assertion lève une exception en cas d'échec (la transaction échoue alors en entier).
-- Les rôles sont simulés par "set local role" + "set local request.jwt.claims".
-- Depuis 027 : sessions simulées en aal2 (is_admin() exige aal2 et une ligne admin_users ; sans effet pour les non-admins).
-- Aucune donnée ne reste : tout est annulé par le rollback final.
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

do $$
declare
  demo_ids uuid[] := array[
    '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006',
    'c8f0355b-497f-41df-8458-0b9f35aea535']::uuid[];
  kiosk uuid := 'c8f0355b-497f-41df-8458-0b9f35aea535';
  -- Comptes et lignes de test (supprimés par le rollback)
  op  uuid := '20000000-0000-0000-0000-0000000000a1';  -- propriétaire du commerce en attente MP
  x   uuid := '20000000-0000-0000-0000-0000000000ff';  -- client sans commerce
  mp  uuid := '20000000-0000-0000-0000-0000000001a1';  -- commerce en attente (non démo)
  mr  uuid := '20000000-0000-0000-0000-0000000001a2';  -- commerce approuvé de test (notes)
  pp  uuid := '20000000-0000-0000-0000-0000000002a1';
  o1  uuid := '20000000-0000-0000-0000-0000000003a1';
  o2  uuid := '20000000-0000-0000-0000-0000000003a2';
  r1  uuid := '20000000-0000-0000-0000-0000000004a1';
  r2  uuid := '20000000-0000-0000-0000-0000000004a2';
  adm uuid;
  kiosk_owner uuid;
  n int; n2 int; v_status text; v_rating numeric; v_count int;
  approved_products int; demo_products int;
begin
  -- ------------------------------------------------------------ jeu de données (rôle postgres)
  perform pg_temp.t_postgres();
  select id into adm from auth.users where lower(email) = 'thibiosang@gmail.com';
  if adm is null then raise exception 'Compte admin introuvable'; end if;
  select owner_id into kiosk_owner from public.merchants where id = kiosk;
  if kiosk_owner is null then raise exception 'Propriétaire du kiosque de test introuvable'; end if;

  select count(*) into approved_products from public.products p join public.merchants m on m.id = p.merchant_id
   where m.status = 'approved' and not m.is_demo;
  select count(*) into demo_products from public.products where merchant_id = any (demo_ids);

  insert into auth.users (id, email) values
    (op, 'test020-owner@example.invalid'), (x, 'test020-x@example.invalid');
  insert into public.merchants (id, owner_id, name, market_id, categories, address, status) values
    (mp, op, 'Test020 En attente', 'mkt-mont-bouet', array['legumes'], 'Marché Mont-Bouët', 'pending'),
    (mr, null, 'Test020 Notes', 'mkt-mont-bouet', array['legumes'], 'Marché Mont-Bouët', 'approved');
  insert into public.products (id, merchant_id, name, category, price, unit) values
    (pp, mp, 'Tomates test', 'legumes', 1500, 'kg');  -- prix de magasin fictif

  -- ------------------------------------------------------------ état après migration
  select count(*) into n from public.merchants where is_demo;
  perform pg_temp.t_ok('positif', n = 7, 'Migration : 7 commerçants marqués is_demo');
  select count(*) into n from public.merchants where is_demo and status = 'approved';
  perform pg_temp.t_ok('positif', n = 0, 'Migration : aucun commerçant démo approuvé');
  select count(*) into n from public.merchants where id = any (demo_ids);
  select count(*) into n2 from public.products where merchant_id = any (demo_ids);
  perform pg_temp.t_ok('positif', n = 7 and n2 = demo_products, 'Migration : aucun commerçant ni produit démo supprimé');
  perform pg_temp.t_ok('positif',
    (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'merchants' and column_name = 'rating') = '0',
    'Défaut de merchants.rating à 0');
  select rating, review_count into v_rating, v_count from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', v_rating = 0 and v_count = 0, 'Nouveau commerçant : note 0, 0 avis');
  select count(*) into n from public.merchants m
   where m.review_count <> (select count(*) from public.reviews r where r.merchant_id = m.id)
      or m.rating <> coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.merchant_id = m.id), 0);
  perform pg_temp.t_ok('positif', n = 0, 'Recalcul : note et nombre d''avis égaux à la table reviews pour tous');
  select count(*) into n from public.favorites f
   where not exists (select 1 from public.merchants m where m.id::text = f.merchant_id);
  perform pg_temp.t_ok('positif', n = 0, 'Favoris orphelins supprimés');
  select count(*) into n from public.orders o
   where not exists (select 1 from public.merchants m where m.id::text = o.merchant_id);
  perform pg_temp.t_ok('positif', n = 2, 'Commandes orphelines conservées (2)');

  -- ------------------------------------------------------------ anon
  perform pg_temp.t_anon();
  select count(*) into n from public.merchants where id = any (demo_ids);
  perform pg_temp.t_ok('negatif', n = 0, 'Anon : aucun commerçant démo visible');
  select count(*) into n from public.products where merchant_id = any (demo_ids);
  perform pg_temp.t_ok('negatif', n = 0, 'Anon : aucun produit de commerçant démo visible');
  select count(*) into n from public.products where merchant_id = mp;
  perform pg_temp.t_ok('negatif', n = 0, 'Anon : produits d''un commerçant en attente invisibles');
  select count(*) into n from public.merchants where name in ('Bâti Plus Gabon', 'CECADO');
  perform pg_temp.t_ok('positif', n = 2, 'Anon : Bâti Plus Gabon et CECADO visibles');
  select count(*) into n from public.products p join public.merchants m on m.id = p.merchant_id
   where m.status = 'approved';
  perform pg_temp.t_ok('positif', n = approved_products, 'Anon : tous les produits des commerçants approuvés visibles');
  select count(*) into n from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', n = 1, 'Anon : commerçant approuvé de test visible');

  -- ------------------------------------------------------------ propriétaire réel (non démo)
  perform pg_temp.t_as(op);
  select count(*) into n from public.merchants where id = mp;
  select count(*) into n2 from public.products where merchant_id = mp;
  perform pg_temp.t_ok('positif', n = 1 and n2 = 1, 'Propriétaire : voit son commerce en attente et ses produits');
  update public.merchants set name = 'Test020 En attente modifie' where id = mp;
  get diagnostics n = row_count;
  perform pg_temp.t_ok('positif', n = 1, 'Propriétaire : modifie son commerce non démo');
  insert into public.products (merchant_id, name, category, price, unit)
    values (mp, 'Oignons test', 'legumes', 1200, 'kg');  -- prix de magasin fictif
  select count(*) into n from public.products where merchant_id = mp;
  perform pg_temp.t_ok('positif', n = 2, 'Propriétaire : ajoute un produit à son commerce non démo');
  perform pg_temp.t_err('Propriétaire : se marquer is_demo',
    format('update public.merchants set is_demo = true where id = %L', mp), 'migration');
  perform pg_temp.t_err('Authentifié : créer un commerçant is_demo',
    format('insert into public.merchants (owner_id, name, market_id, categories, address, is_demo) '
           'values (%L, ''Test020 Demo'', ''mkt-mont-bouet'', array[''legumes''], ''x'', true)', op), 'migration');

  -- ------------------------------------------------------------ autre authentifié
  perform pg_temp.t_as(x);
  select count(*) into n from public.products where merchant_id = mp;
  perform pg_temp.t_ok('negatif', n = 0, 'Tiers : produits d''un commerçant en attente invisibles');
  select count(*) into n from public.merchants where id = any (demo_ids);
  perform pg_temp.t_ok('negatif', n = 0, 'Tiers : aucun commerçant démo visible');

  -- ------------------------------------------------------------ propriétaire du kiosque de test (démo)
  perform pg_temp.t_as(kiosk_owner);
  select count(*) into n from public.merchants where id = kiosk;
  select count(*) into n2 from public.products where merchant_id = kiosk;
  perform pg_temp.t_ok('negatif', n = 0 and n2 = 0, 'Propriétaire d''un démo : ni le commerçant ni ses produits visibles');
  update public.merchants set status = 'approved' where id = kiosk;
  get diagnostics n = row_count;
  perform pg_temp.t_ok('negatif', n = 0, 'Non-admin : passage d''un démo en approved sans effet');
  delete from public.merchants where id = kiosk;
  get diagnostics n = row_count;
  perform pg_temp.t_ok('negatif', n = 0, 'Propriétaire d''un démo : suppression sans effet');
  perform pg_temp.t_postgres();
  select status into v_status from public.merchants where id = kiosk;
  perform pg_temp.t_ok('negatif', v_status = 'suspended', 'Démo toujours suspendu après tentative non-admin');

  -- ------------------------------------------------------------ admin
  perform pg_temp.t_as(adm);
  select count(*) into n from public.merchants where id = any (demo_ids);
  perform pg_temp.t_ok('positif', n = 7, 'Admin : voit les 7 commerçants démo');
  select count(*) into n from public.products where merchant_id = any (demo_ids);
  perform pg_temp.t_ok('positif', n = demo_products, 'Admin : voit les produits des commerçants démo');
  perform pg_temp.t_err('Admin : passer un démo en approved',
    format('update public.merchants set status = ''approved'' where id = %L', kiosk), 'ne peut pas être approuvé');
  perform pg_temp.t_err('Admin : retirer le marquage démo par l''API',
    format('update public.merchants set is_demo = false where id = %L', kiosk), 'migration');
  update public.merchants set status = 'approved' where id = mp;
  get diagnostics n = row_count;
  perform pg_temp.t_ok('positif', n = 1, 'Admin : approuve un commerçant réel en attente');
  perform pg_temp.t_postgres();
  perform pg_temp.t_err('Rôle postgres : passer un démo en approved',
    'update public.merchants set status = ''approved'' where id = ''10000000-0000-0000-0000-000000000001''',
    'ne peut pas être approuvé');
  perform pg_temp.t_anon();
  select count(*) into n from public.products where merchant_id = mp;
  perform pg_temp.t_ok('positif', n = 2, 'Anon : produits visibles une fois le commerçant approuvé');

  -- ------------------------------------------------------------ notes (insert / update / delete)
  -- Depuis 022, l'API ne crée plus de commande en direct (create_order() seulement) : on le vérifie,
  -- puis les deux commandes « livrées » servant de support aux avis sont posées en fixture sous le
  -- rôle postgres (chemin d'administration autorisé par guard_order_direct_write), avec initial_subtotal
  -- (NOT NULL depuis 022). Montants cohérents : 1000 + 5 % (50) + 2000 = 3050 F (prix de magasin fictifs).
  perform pg_temp.t_as(x);
  perform pg_temp.t_err('Client : insert direct dans orders refusé (create_order obligatoire, 022)',
    format('insert into public.orders (id, user_id, merchant_id, merchant_name, items, subtotal, initial_subtotal, service_fee, delivery_fee, total, status, slot_label, address_label) '
           'values (%L, %L, %L, ''Test020 Notes'', ''[]'', 1000, 1000, 50, 2000, 3050, ''livree'', ''test'', ''test'')', o1, x, mr),
    'permission denied');
  perform pg_temp.t_postgres();
  insert into public.orders (id, user_id, merchant_id, merchant_name, items, subtotal, initial_subtotal, service_fee, delivery_fee, total, status, slot_label, address_label)
  values (o1, x, mr::text, 'Test020 Notes', '[]'::jsonb, 1000, 1000, 50, 2000, 3050, 'livree', 'test', 'test'),
         (o2, x, mr::text, 'Test020 Notes', '[]'::jsonb, 1000, 1000, 50, 2000, 3050, 'livree', 'test', 'test');
  insert into public.reviews (id, order_id, merchant_id, user_id, rating) values (r1, o1, mr, x, 4);
  select rating, review_count into v_rating, v_count from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', v_rating = 4 and v_count = 1, 'Avis inséré : note 4, 1 avis');
  insert into public.reviews (id, order_id, merchant_id, user_id, rating) values (r2, o2, mr, x, 1);
  select rating, review_count into v_rating, v_count from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', v_rating = 2.5 and v_count = 2, 'Second avis : note 2,5, 2 avis');
  update public.reviews set rating = 5 where id = r2;
  select rating, review_count into v_rating, v_count from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', v_rating = 4.5 and v_count = 2, 'Avis modifié : note 4,5');
  update public.reviews set merchant_id = mp where id = r2;
  select rating, review_count into v_rating, v_count from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', v_rating = 4 and v_count = 1, 'Avis déplacé : ancien commerçant recalculé');
  select rating, review_count into v_rating, v_count from public.merchants where id = mp;
  perform pg_temp.t_ok('positif', v_rating = 5 and v_count = 1, 'Avis déplacé : nouveau commerçant recalculé');
  delete from public.reviews where id = r2;
  select rating, review_count into v_rating, v_count from public.merchants where id = mp;
  perform pg_temp.t_ok('positif', v_rating = 0 and v_count = 0, 'Dernier avis supprimé : note 0, 0 avis (pas null)');
  delete from public.reviews where id = r1;
  select rating, review_count into v_rating, v_count from public.merchants where id = mr;
  perform pg_temp.t_ok('positif', v_rating = 0 and v_count = 0, 'Avis supprimé : note 0, 0 avis');
end $$;

reset role;
select kind, count(*) as nb from t_results group by kind
union all select 'total', count(*) from t_results
order by 1;

rollback;
