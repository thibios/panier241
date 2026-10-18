-- Marchés de proximité ajoutés depuis l'application (bouton « + » de l'accueil).
-- Un utilisateur propose un marché (en attente) ; l'administrateur l'approuve ou le refuse.
-- L'administrateur peut aussi l'ajouter directement comme approuvé.

create table if not exists public.custom_markets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  neighborhood text not null check (char_length(trim(neighborhood)) between 2 and 80),
  city text not null default 'Libreville' check (char_length(trim(city)) between 2 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.custom_markets enable row level security;

create policy "Lecture des marches approuves, des siens ou par l'admin"
  on public.custom_markets for select
  using (status = 'approved' or created_by = auth.uid() or public.is_admin());

create policy "Un utilisateur connecte propose un marche"
  on public.custom_markets for insert
  to authenticated
  with check (created_by = auth.uid() and (status = 'pending' or public.is_admin()));

create policy "L'admin valide les marches"
  on public.custom_markets for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "L'admin supprime les marches"
  on public.custom_markets for delete
  using (public.is_admin());

revoke truncate, trigger, references on public.custom_markets from anon, authenticated;
