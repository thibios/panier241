-- 027 : rôle administrateur en base et double authentification obligatoire pour l'administration.
-- Audit 2026-10 (docs/audit-2026-10/REGISTRE_RISQUES.md R02, CHECKLIST_PROGRESSION P05-1 / P05-2, tâches U12 / U03) :
-- is_admin() reconnaissait un seul compte par son e-mail codé en dur, sans second facteur.
--
-- Après cette migration :
--   - les administrateurs sont listés dans public.admin_users (gestion par migration uniquement :
--     aucune écriture possible par l'API, ni anon ni authenticated) ;
--   - public.is_admin() renvoie vrai seulement si l'utilisateur est dans admin_users ET que sa session
--     est en aal2 (code TOTP vérifié, Supabase Auth MFA). Même signature (aucun argument, boolean,
--     security definer) : les policies et fonctions de 003 à 026 qui l'appellent restent inchangées.
--
-- À appliquer EN MÊME TEMPS que le front qui gère la double authentification (MfaSettings / MfaChallenge) :
-- sans lui, l'administrateur ne peut pas passer en aal2 et perd l'accès à l'administration.
--
-- Ajouter un administrateur (éditeur SQL, rôle postgres) :
--   insert into public.admin_users (user_id) select id from auth.users where lower(email) = '<e-mail>';
-- Retirer : delete from public.admin_users where user_id = '<uuid>';
--
-- Retour arrière : recréer is_admin() de 006 (lecture de l'e-mail dans auth.users), puis
-- drop table public.admin_users.

-- 1. Table des administrateurs ------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.admin_users is
  'Administrateurs de la plateforme. Gestion par migration ou éditeur SQL (rôle postgres) uniquement.';

alter table public.admin_users enable row level security;

-- Aucune écriture par l'API : pas de droit d'écriture et aucune policy insert / update / delete.
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

-- Lecture : un administrateur voit sa propre ligne (même en aal1, pour que l'application lui indique
-- d'activer la double authentification) ; un administrateur en aal2 voit toute la liste.
-- Un compte non administrateur ne voit aucune ligne.
drop policy if exists "Lecture des administrateurs par un administrateur" on public.admin_users;
create policy "Lecture des administrateurs par un administrateur"
  on public.admin_users for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- 2. Initialisation : l'administrateur reconnu jusqu'ici par is_admin() (même e-mail) -------------

insert into public.admin_users (user_id)
select id from auth.users where lower(email) = 'thibiosang@gmail.com'
on conflict (user_id) do nothing;

-- 3. is_admin() : membre de admin_users ET session en aal2 ----------------------------------------
-- security definer : lit admin_users sans dépendre de la policy ci-dessus (pas de récursion).
-- Sans JWT (rôle postgres, triggers lancés par l'éditeur SQL) : auth.uid() est nul, résultat faux,
-- comme avant.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
