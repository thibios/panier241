-- Panier 241 — espace livreur
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

-- 1. Livreurs
create table public.livreurs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  vehicle text not null,
  created_at timestamptz not null default now()
);

alter table public.livreurs enable row level security;

create policy "Lecture publique des livreurs"
  on public.livreurs for select
  using (true);

create policy "Le proprietaire cree son profil livreur"
  on public.livreurs for insert
  with check (auth.uid() = owner_id);

create policy "Le proprietaire modifie son profil livreur"
  on public.livreurs for update
  using (auth.uid() = owner_id);

-- 2. Commandes : colonnes pour le suivi de livraison
alter table public.orders add column livreur_id uuid references public.livreurs (id);
alter table public.orders add column livreur_name text;

-- 3. Policies supplementaires (s'ajoutent aux policies existantes, combinees en OR)
create policy "Le livreur voit les livraisons disponibles ou les siennes"
  on public.orders for select
  using (
    livreur_id = (select id from public.livreurs where owner_id = auth.uid())
    or (
      livreur_id is null
      and status = 'en_livraison'
      and exists (select 1 from public.livreurs where owner_id = auth.uid())
    )
  );

create policy "Le livreur accepte et met a jour sa livraison"
  on public.orders for update
  using (
    (
      livreur_id is null
      and status = 'en_livraison'
      and exists (select 1 from public.livreurs where owner_id = auth.uid())
    )
    or livreur_id = (select id from public.livreurs where owner_id = auth.uid())
  )
  with check (
    livreur_id = (select id from public.livreurs where owner_id = auth.uid())
  );
