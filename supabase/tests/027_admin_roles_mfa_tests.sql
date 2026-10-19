-- Tests de la migration 027 (rôle administrateur en base + double authentification aal2).
-- Exécution : après application de 027 (ou dans la même transaction, migration collée après "begin;").
-- Le script porte sa transaction : "begin;" en tête, "rollback;" en fin. Aucune donnée ne reste.
-- Rôles simulés par "set local role" + "request.jwt.claims" incluant le claim "aal".
-- Le dernier SELECT avant le rollback donne le décompte positifs / négatifs.

begin;

create temporary table t_results (id serial, kind text, name text);
grant all on t_results to authenticated, anon;
grant usage on sequence t_results_id_seq to authenticated, anon;

create function pg_temp.t_as(p_uid uuid, p_aal text) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text);
  execute 'set local role authenticated';
end $$;

create function pg_temp.t_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''{"role":"anon"}''';
  execute 'set local role anon';
end $$;

create function pg_temp.t_ok(p_kind text, p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'ECHEC [%] %', p_kind, p_name;
  end if;
  insert into t_results (kind, name) values (p_kind, p_name);
end $$;

-- Écriture refusée : erreur attendue, quel que soit le message (droit refusé ou RLS).
create function pg_temp.t_denied(p_name text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when insufficient_privilege then
    insert into t_results (kind, name) values ('negatif', p_name);
    return;
  end;
  raise exception 'ECHEC [negatif] % : aucune erreur levée', p_name;
end $$;

do $$
declare
  adm uuid;
  other uuid := gen_random_uuid();
  n int;
  b boolean;
begin
  select user_id into adm from public.admin_users limit 1;
  if adm is null then raise exception 'Préalable : admin_users vide après la migration'; end if;

  -- 1. Administrateur en aal2 : is_admin vrai, lit la liste et les commerçants démo.
  perform pg_temp.t_as(adm, 'aal2');
  select public.is_admin() into b;
  perform pg_temp.t_ok('positif', b, 'Admin en aal2 : is_admin() vrai');
  select count(*) into n from public.admin_users;
  perform pg_temp.t_ok('positif', n >= 1, 'Admin en aal2 : lit admin_users');
  select count(*) into n from public.merchants where is_demo;
  perform pg_temp.t_ok('positif', n > 0, 'Admin en aal2 : policy existante (commerçants démo) accordée');

  -- 2. Administrateur en aal1 : is_admin faux, ne voit que sa propre ligne, plus les démos.
  perform pg_temp.t_as(adm, 'aal1');
  select public.is_admin() into b;
  perform pg_temp.t_ok('negatif', not b, 'Admin en aal1 : is_admin() faux');
  select count(*) into n from public.admin_users where user_id <> adm;
  perform pg_temp.t_ok('negatif', n = 0, 'Admin en aal1 : ne lit pas les autres administrateurs');
  select count(*) into n from public.admin_users where user_id = adm;
  perform pg_temp.t_ok('positif', n = 1, 'Admin en aal1 : lit sa propre ligne (message « activez la double authentification »)');
  select count(*) into n from public.merchants where is_demo;
  perform pg_temp.t_ok('negatif', n = 0, 'Admin en aal1 : policy existante (commerçants démo) refusée');

  -- 2b. Administrateur sans claim aal (ancien jeton) : faux.
  execute 'reset role';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', adm, 'role', 'authenticated')::text);
  execute 'set local role authenticated';
  select public.is_admin() into b;
  perform pg_temp.t_ok('negatif', not b, 'Admin sans claim aal : is_admin() faux');

  -- 3. Non-admin en aal2 : is_admin faux, admin_users illisible, démos invisibles.
  perform pg_temp.t_as(other, 'aal2');
  select public.is_admin() into b;
  perform pg_temp.t_ok('negatif', not b, 'Non-admin en aal2 : is_admin() faux');
  select count(*) into n from public.admin_users;
  perform pg_temp.t_ok('negatif', n = 0, 'Non-admin en aal2 : admin_users illisible');
  select count(*) into n from public.merchants where is_demo;
  perform pg_temp.t_ok('negatif', n = 0, 'Non-admin en aal2 : commerçants démo invisibles');

  -- 4. Aucune écriture par l'API dans admin_users (non-admin, admin aal2).
  perform pg_temp.t_denied('Non-admin : s''inscrire dans admin_users',
    format('insert into public.admin_users (user_id) values (%L)', other));
  perform pg_temp.t_as(adm, 'aal2');
  perform pg_temp.t_denied('Admin en aal2 : insertion dans admin_users par l''API',
    format('insert into public.admin_users (user_id) values (%L)', other));
  perform pg_temp.t_denied('Admin en aal2 : modification de admin_users par l''API',
    format('update public.admin_users set created_by = %L where user_id = %L', adm, adm));
  perform pg_temp.t_denied('Admin en aal2 : suppression dans admin_users par l''API',
    format('delete from public.admin_users where user_id = %L', adm));

  -- 5. Anonyme : is_admin faux, admin_users inaccessible, aucune écriture.
  perform pg_temp.t_anon();
  select public.is_admin() into b;
  perform pg_temp.t_ok('negatif', not b, 'Anon : is_admin() faux');
  perform pg_temp.t_denied('Anon : lecture de admin_users', 'select count(*) from public.admin_users');
  perform pg_temp.t_denied('Anon : insertion dans admin_users',
    format('insert into public.admin_users (user_id) values (%L)', other));

  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';

  -- 6. Rôle postgres sans JWT : is_admin faux (comportement inchangé) ; la ligne admin est intacte.
  select public.is_admin() into b;
  perform pg_temp.t_ok('negatif', not b, 'Sans JWT (postgres) : is_admin() faux');
  select count(*) into n from public.admin_users where user_id = adm;
  perform pg_temp.t_ok('positif', n = 1, 'Ligne administrateur intacte après les tentatives d''écriture');
end $$;

select count(*) filter (where kind = 'positif') as positifs,
       count(*) filter (where kind = 'negatif') as negatifs,
       count(*) as total
from t_results;

rollback;
