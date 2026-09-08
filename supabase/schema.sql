-- Panier 241 — schéma de base de données
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

-- 1. Profils (rempli automatiquement à l'inscription)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Un utilisateur peut lire son propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Un utilisateur peut modifier son propre profil"
  on public.profiles for update
  using (auth.uid() = id);

-- Création automatique du profil à l'inscription, à partir des métadonnées passées à signUp()
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Adresses
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  full_address text not null,
  neighborhood text not null,
  city text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

create policy "Un utilisateur gere ses propres adresses"
  on public.addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Favoris (merchant_id reference le catalogue mocke cote client, ex. "mch-maman-adjoua")
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, merchant_id)
);

alter table public.favorites enable row level security;

create policy "Un utilisateur gere ses propres favoris"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Commandes
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_id text not null,
  merchant_name text not null,
  items jsonb not null,
  subtotal integer not null,
  delivery_fee integer not null,
  total integer not null,
  status text not null check (status in ('en_preparation', 'en_livraison', 'livree')),
  slot_label text not null,
  address_label text not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Un utilisateur gere ses propres commandes"
  on public.orders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
