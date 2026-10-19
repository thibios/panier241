-- Tests de 026, à exécuter dans une transaction annulée (aucune donnée ne reste).
begin;

do $$
declare
  v_owner uuid;
  v_id uuid;
  n int;
begin
  -- Un livreur approuvé existant sert de référence (lecture seule).
  select owner_id, id into v_owner, v_id from public.livreurs where status = 'approved' and owner_id is not null limit 1;
  if v_owner is null then
    raise exception 'Préalable : aucun livreur approuvé en base';
  end if;

  -- 1. anon ne lit aucun livreur.
  set local role anon;
  select count(*) into n from public.livreurs;
  if n <> 0 then raise exception 'ECHEC 1 : anon lit % livreur(s)', n; end if;
  reset role;

  -- 2. un compte quelconque (ni propriétaire ni admin) ne lit aucun livreur.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'email', 'tiers@example.com', 'role', 'authenticated')::text, true);
  select count(*) into n from public.livreurs;
  if n <> 0 then raise exception 'ECHEC 2 : un tiers lit % livreur(s)', n; end if;
  reset role;

  -- 3. le livreur lit sa propre fiche, et seulement elle.
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);
  select count(*) into n from public.livreurs;
  if n < 1 then raise exception 'ECHEC 3 : le livreur ne lit pas sa fiche'; end if;
  select count(*) into n from public.livreurs where owner_id <> v_owner;
  if n <> 0 then raise exception 'ECHEC 3b : le livreur lit % autre(s) fiche(s)', n; end if;
  reset role;

  -- 4. l'administrateur lit toutes les fiches (is_admin() lit l'e-mail dans auth.users).
  select id into v_id from auth.users where lower(email) = 'thibiosang@gmail.com';
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_id::text, 'role', 'authenticated')::text, true);
  select count(*) into n from public.livreurs;
  if n < 1 then raise exception 'ECHEC 4 : l''admin ne lit pas les livreurs'; end if;
  reset role;

  raise notice '026 : 4 scénarios réussis';
end $$;

rollback;
