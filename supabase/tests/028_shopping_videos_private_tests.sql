-- Tests de 028 (vidéos de liste de courses privées).
--
-- Exécution : dans UNE transaction annulée, 028 appliquée juste avant ce fichier :
--   begin;  <contenu de 028_shopping_videos_private.sql>  <contenu de ce fichier>
-- Le "begin;" ci-dessous ne fait alors qu'un avertissement ; le "rollback;" final annule la
-- migration ET les données de test. Une fois 028 en production, le fichier s'exécute seul.
-- Les rôles sont simulés par "set local role" + "request.jwt.claims" (comme 022 et 026).
-- Admin : claims avec "aal":"aal2" pour rester compatible avec 027 (MFA) en préparation.
-- La suppression directe dans storage.objects est simulée comme le fait l'API Storage
-- (storage.allow_delete_query = true, local à la transaction).
-- Aucune donnée ne reste : tout est annulé par le rollback final. Prix : prix de magasin fictifs de test.

begin;

create temporary table t28_results (id serial, kind text, name text);
grant all on t28_results to authenticated, anon;
grant usage on sequence t28_results_id_seq to authenticated, anon;

create function pg_temp.t28_as(p_uid uuid, p_extra jsonb default '{}'::jsonb) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute format('set local request.jwt.claims = %L',
                 (jsonb_build_object('sub', p_uid, 'role', 'authenticated') || p_extra)::text);
  execute 'set local role authenticated';
end $$;

create function pg_temp.t28_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''{"role":"anon"}''';
  execute 'set local role anon';
end $$;

create function pg_temp.t28_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end $$;

create function pg_temp.t28_ok(p_kind text, p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'ECHEC [%] %', p_kind, p_name;
  end if;
  insert into t28_results (kind, name) values (p_kind, p_name);
end $$;

create function pg_temp.t28_err(p_name text, p_sql text, p_fragment text) returns void language plpgsql as $$
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
  insert into t28_results (kind, name) values ('negatif', p_name);
end $$;

-- Nombre d'objets du bucket visibles par le rôle courant (filtre facultatif sur le nom).
create function pg_temp.t28_seen(p_name text default null) returns int language sql as $$
  select count(*)::int from storage.objects
  where bucket_id = 'shopping-videos' and (p_name is null or name = p_name);
$$;
grant execute on function pg_temp.t28_seen(text) to authenticated, anon;

do $$
declare
  c   uuid := '28000000-0000-0000-0000-00000000000c';  -- client
  c2  uuid := '28000000-0000-0000-0000-0000000000c2';  -- second client
  mo  uuid := '28000000-0000-0000-0000-0000000000a1';  -- propriétaire du commerce MA
  mo2 uuid := '28000000-0000-0000-0000-0000000000a2';  -- propriétaire du commerce MB
  l1  uuid := '28000000-0000-0000-0000-0000000000b1';  -- livreur qui prend la course
  l2  uuid := '28000000-0000-0000-0000-0000000000b2';  -- autre livreur approuvé
  x   uuid := '28000000-0000-0000-0000-0000000000ff';  -- tiers sans lien
  adm uuid;
  ma  uuid := '28000000-0000-0000-0000-0000000001a1';
  mb  uuid := '28000000-0000-0000-0000-0000000001a2';
  pa  uuid := '28000000-0000-0000-0000-0000000002a1';
  pb  uuid := '28000000-0000-0000-0000-0000000002a2';
  v1  text := '28000000-0000-0000-0000-00000000000c/1-liste.mp4';      -- vidéo de la commande oa
  v1b text := '28000000-0000-0000-0000-00000000000c/2-ancienne.mp4';   -- envoyée sous forme d'URL publique
  vor text := '28000000-0000-0000-0000-00000000000c/3-orpheline.mp4';  -- non référencée
  v2  text := '28000000-0000-0000-0000-0000000000c2/1-liste.mp4';      -- vidéo de la commande ob
  pub text := 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/shopping-videos/';
  o public.orders%rowtype;
  oa uuid; ob uuid; ol uuid;
  n int;
begin
  -- ------------------------------------------------------------ 028 appliquée
  select count(*) into n from storage.buckets where id = 'shopping-videos' and public = false;
  perform pg_temp.t28_ok('positif', n = 1, 'Bucket shopping-videos privé');
  select count(*) into n from storage.buckets where id in ('avatars', 'kiosk-photos', 'product-photos') and public = true;
  perform pg_temp.t28_ok('positif', n = 3, 'Autres buckets inchangés (toujours publics)');
  select count(*) into n from public.orders where shopping_video_url like 'http%';
  perform pg_temp.t28_ok('positif', n = 0, 'Reprise : plus aucune URL publique en base, chemins seulement');

  select id into adm from auth.users where lower(email) = 'thibiosang@gmail.com';
  if adm is null then raise exception 'Préalable : compte admin introuvable'; end if;

  -- ------------------------------------------------------------ jeu de données (rôle postgres)
  insert into auth.users (id, email) values
    (c, 'test028-client@example.invalid'), (c2, 'test028-client2@example.invalid'),
    (mo, 'test028-merchant@example.invalid'), (mo2, 'test028-merchant2@example.invalid'),
    (l1, 'test028-l1@example.invalid'), (l2, 'test028-l2@example.invalid'),
    (x, 'test028-x@example.invalid');
  insert into public.merchants (id, owner_id, name, market_id, categories, address, status) values
    (ma, mo,  'Test028 Etal A', 'mkt-mont-bouet', array['legumes'], 'Marché Mont-Bouët', 'approved'),
    (mb, mo2, 'Test028 Etal B', 'mkt-oloumi',     array['legumes'], 'Marché Oloumi',     'approved');
  insert into public.products (id, merchant_id, name, category, price, unit) values
    (pa, ma, 'Tomates', 'legumes', 1500, 'kg'),
    (pb, mb, 'Gombo',   'legumes', 1000, 'tas');
  insert into public.livreurs (owner_id, name, phone, vehicle, status) values
    (l1, 'Test028 L1', '+24177280001', 'moto', 'approved'),
    (l2, 'Test028 L2', '+24177280002', 'moto', 'approved');

  -- ------------------------------------------------------------ envoi par le client (policy INSERT)
  perform pg_temp.t28_as(c);
  insert into storage.objects (bucket_id, name, owner) values
    ('shopping-videos', v1, c), ('shopping-videos', v1b, c), ('shopping-videos', vor, c);
  perform pg_temp.t28_ok('positif', true, 'Client : envoie ses vidéos dans son dossier');
  perform pg_temp.t28_err('Client : envoi dans le dossier d''un autre',
    format('insert into storage.objects (bucket_id, name) values (''shopping-videos'', %L)', c2 || '/pirate.mp4'),
    'row-level security');
  perform pg_temp.t28_as(c2);
  insert into storage.objects (bucket_id, name, owner) values ('shopping-videos', v2, c2);

  -- ------------------------------------------------------------ create_order et chemin
  perform pg_temp.t28_as(c);
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)),
                           'livraison', 'Demain · Matin', '077123456', 'especes', 'Quartier Louis, Libreville',
                           null, null, null, null, v1);
  oa := o.id;
  perform pg_temp.t28_ok('positif', o.shopping_video_url = v1, 'create_order : chemin du dossier du client accepté et enregistré tel quel');
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)),
                           'retrait', 'Demain · Matin', '077123456', 'especes', null, null, null, null, null, pub || v1b);
  ol := o.id;
  perform pg_temp.t28_ok('positif', o.shopping_video_url = v1b, 'create_order : ancienne URL publique convertie en chemin');
  perform pg_temp.t28_err('create_order : chemin d''un autre utilisateur',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'', null, null, null, null, null, %L)',
           ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)), v2),
    'vidéo');
  perform pg_temp.t28_err('create_order : URL publique d''un autre utilisateur',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'', null, null, null, null, null, %L)',
           ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)), pub || v2),
    'vidéo');
  perform pg_temp.t28_err('create_order : fichier inexistant',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'', null, null, null, null, null, %L)',
           ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)), c || '/absente.mp4'),
    'vidéo');
  perform pg_temp.t28_err('create_order : chemin avec sous-dossier ou remontée',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'', null, null, null, null, null, %L)',
           ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)), c || '/../' || v2),
    'vidéo');
  perform pg_temp.t28_err('create_order : URL externe',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'', null, null, null, null, null, %L)',
           ma, jsonb_build_array(jsonb_build_object('product_id', pa, 'quantity', 1)), 'https://exemple.invalid/' || v1),
    'vidéo');
  perform pg_temp.t28_as(c2);
  o := public.create_order(gen_random_uuid(), mb, jsonb_build_array(jsonb_build_object('product_id', pb, 'quantity', 1)),
                           'livraison', 'Demain · Soir', '077654321', 'especes', 'Quartier Nzeng-Ayong, Libreville',
                           null, null, null, null, v2);
  ob := o.id;

  -- ------------------------------------------------------------ lecture
  perform pg_temp.t28_anon();
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen() = 0, 'Anonyme : aucun objet du bucket lisible');

  perform pg_temp.t28_as(x);
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen() = 0, 'Tiers connecté : aucun objet du bucket lisible');

  perform pg_temp.t28_as(c);
  perform pg_temp.t28_ok('positif', pg_temp.t28_seen(v1) = 1 and pg_temp.t28_seen(v1b) = 1 and pg_temp.t28_seen(vor) = 1,
                         'Client : lit ses vidéos (référencées ou non)');
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen(v2) = 0 and pg_temp.t28_seen() = 3, 'Client : ne lit pas la vidéo d''un autre client');
  select count(*) into n from public.orders where id = oa and shopping_video_url = v1;
  perform pg_temp.t28_ok('positif', n = 1, 'Client : lit le chemin de la vidéo sur sa commande');

  perform pg_temp.t28_as(mo);
  perform pg_temp.t28_ok('positif', pg_temp.t28_seen(v1) = 1 and pg_temp.t28_seen(v1b) = 1, 'Commerçant : lit la vidéo de ses commandes');
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen(v2) = 0, 'Commerçant : ne lit pas la vidéo d''une commande d''un autre commerce');
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen(vor) = 0, 'Commerçant : ne lit pas une vidéo du client non liée à une commande');

  perform pg_temp.t28_as(l1);
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen() = 0, 'Livreur : aucune vidéo avant d''avoir pris la course');

  perform pg_temp.t28_as(mo);
  o := public.set_order_status(oa, 'prete_a_livrer');
  perform pg_temp.t28_as(l1);
  o := public.set_order_status(oa, 'en_livraison');
  perform pg_temp.t28_ok('positif', o.status = 'en_livraison', 'Préalable : course prise par le livreur 1');
  perform pg_temp.t28_ok('positif', pg_temp.t28_seen(v1) = 1, 'Livreur affecté, course en cours : lit la vidéo de la course');
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen() = 1, 'Livreur affecté : ne lit aucune autre vidéo');

  perform pg_temp.t28_as(l2);
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen() = 0, 'Autre livreur : ne lit pas la vidéo de la course d''un collègue');

  perform pg_temp.t28_as(adm, jsonb_build_object('email', 'thibiosang@gmail.com', 'aal', 'aal2'));
  perform pg_temp.t28_ok('positif', pg_temp.t28_seen(v1) = 1 and pg_temp.t28_seen(v2) = 1 and pg_temp.t28_seen(v1b) = 1,
                         'Admin (aal2) : lit les vidéos référencées par une commande');
  perform pg_temp.t28_ok('negatif', pg_temp.t28_seen(vor) = 0, 'Admin : vidéo non référencée non lisible');

  -- ------------------------------------------------------------ suppression (simulée comme l'API Storage)
  perform set_config('storage.allow_delete_query', 'true', true);
  perform pg_temp.t28_as(x);
  delete from storage.objects where bucket_id = 'shopping-videos' and name = v1;
  get diagnostics n = row_count;
  perform pg_temp.t28_ok('negatif', n = 0, 'Tiers : ne supprime pas la vidéo d''un client');
  perform pg_temp.t28_as(mo);
  delete from storage.objects where bucket_id = 'shopping-videos' and name = v1;
  get diagnostics n = row_count;
  perform pg_temp.t28_ok('negatif', n = 0, 'Commerçant : lit mais ne supprime pas la vidéo');
  perform pg_temp.t28_as(c);
  delete from storage.objects where bucket_id = 'shopping-videos' and name = vor;
  get diagnostics n = row_count;
  perform pg_temp.t28_ok('positif', n = 1, 'Client : supprime une vidéo de son dossier');
  perform set_config('storage.allow_delete_query', 'false', true);

  perform pg_temp.t28_postgres();
end $$;

reset role;
select kind, count(*) as nb from t28_results group by kind
union all select 'total', count(*) from t28_results
order by 1;

rollback;
