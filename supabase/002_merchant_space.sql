-- Panier 241 — espace marchand
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run
-- (à exécuter une fois, après supabase/schema.sql)

-- 1. Marchands (catalogue reel, remplace les donnees mockees cote client)
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  name text not null,
  market_id text not null,
  categories text[] not null,
  rating numeric not null default 5,
  review_count integer not null default 0,
  address text not null,
  image_emoji text not null default '🏪',
  banner_color text not null default '#2A4FD8',
  kiosk_photo_url text,
  created_at timestamptz not null default now()
);

alter table public.merchants enable row level security;

create policy "Lecture publique des marchands"
  on public.merchants for select
  using (true);

create policy "Le proprietaire cree son marchand"
  on public.merchants for insert
  with check (auth.uid() = owner_id);

create policy "Le proprietaire modifie son marchand"
  on public.merchants for update
  using (auth.uid() = owner_id);

create policy "Le proprietaire supprime son marchand"
  on public.merchants for delete
  using (auth.uid() = owner_id);

-- 2. Produits
create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  name text not null,
  category text not null,
  price integer not null,
  unit text not null,
  image_emoji text not null default '🛒',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Lecture publique des produits"
  on public.products for select
  using (true);

create policy "Le proprietaire gere ses produits"
  on public.products for all
  using (exists (select 1 from public.merchants m where m.id = merchant_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.merchants m where m.id = merchant_id and m.owner_id = auth.uid()));

-- 3. Commandes : remplace la policy unique de schema.sql par 3 policies distinctes
drop policy if exists "Un utilisateur gere ses propres commandes" on public.orders;

create policy "Le client voit ses commandes, le marchand voit celles qu'il recoit"
  on public.orders for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.merchants m where m.id::text = orders.merchant_id and m.owner_id = auth.uid())
  );

create policy "Seul le client cree sa commande"
  on public.orders for insert
  with check (auth.uid() = user_id);

create policy "Seul le marchand met a jour le statut de sa commande"
  on public.orders for update
  using (exists (select 1 from public.merchants m where m.id::text = orders.merchant_id and m.owner_id = auth.uid()));

-- 4. Seed : catalogue de demo actuel, non lie a un compte (owner_id null)
insert into public.merchants (id, owner_id, name, market_id, categories, rating, review_count, address, image_emoji, banner_color) values
  ('10000000-0000-0000-0000-000000000001', null, 'Chez Maman Adjoua', 'mkt-mont-bouet', array['legumes','fruits'], 4.8, 156, 'Marché Mont-Bouët, Allée B, Libreville', '👩🏾‍🌾', '#3FAE5C'),
  ('10000000-0000-0000-0000-000000000002', null, 'Étal Nguema Fruits', 'mkt-mont-bouet', array['fruits'], 4.6, 89, 'Marché Mont-Bouët, Entrée principale, Libreville', '🧑🏾‍🌾', '#F2994A'),
  ('10000000-0000-0000-0000-000000000003', null, 'Poissonnerie de Nkembo', 'mkt-nkembo', array['poisson'], 4.7, 121, 'Marché Nkembo, Quai poisson, Libreville', '🎣', '#E8543A'),
  ('10000000-0000-0000-0000-000000000004', null, 'Boucherie Centrale Oloumi', 'mkt-oloumi', array['poisson'], 4.5, 74, 'Marché Oloumi, Stand 12, Libreville', '🥩', '#E8543A'),
  ('10000000-0000-0000-0000-000000000005', null, 'Épicerie Traditionnelle Akébé', 'mkt-akebe', array['cereales','legumes'], 4.9, 203, 'Marché Akébé, Allée des épices, Libreville', '🌾', '#C08A3E'),
  ('10000000-0000-0000-0000-000000000006', null, 'Le Jardin de Mont-Bouët', 'mkt-mont-bouet', array['legumes'], 4.4, 62, 'Marché Mont-Bouët, Allée C, Libreville', '🥬', '#3FAE5C');

insert into public.products (merchant_id, name, category, price, unit, image_emoji) values
  -- Chez Maman Adjoua
  ('10000000-0000-0000-0000-000000000001', 'Tomates fraîches', 'legumes', 1500, 'kg', '🍅'),
  ('10000000-0000-0000-0000-000000000001', 'Oignons', 'legumes', 1200, 'kg', '🧅'),
  ('10000000-0000-0000-0000-000000000001', 'Gombo', 'legumes', 1000, 'tas', '🥒'),
  ('10000000-0000-0000-0000-000000000001', 'Piment frais', 'legumes', 500, 'tas', '🌶️'),
  ('10000000-0000-0000-0000-000000000001', 'Bananes plantain', 'fruits', 2000, 'régime', '🍌'),
  ('10000000-0000-0000-0000-000000000001', 'Mangues', 'fruits', 1000, 'kg', '🥭'),
  -- Étal Nguema Fruits
  ('10000000-0000-0000-0000-000000000002', 'Ananas de Libreville', 'fruits', 1500, 'pièce', '🍍'),
  ('10000000-0000-0000-0000-000000000002', 'Mangues', 'fruits', 1000, 'kg', '🥭'),
  ('10000000-0000-0000-0000-000000000002', 'Papayes', 'fruits', 1200, 'pièce', '🫐'),
  ('10000000-0000-0000-0000-000000000002', 'Safous (prunes locales)', 'fruits', 1500, 'tas', '🫒'),
  ('10000000-0000-0000-0000-000000000002', 'Oranges', 'fruits', 1800, 'kg', '🍊'),
  -- Poissonnerie de Nkembo
  ('10000000-0000-0000-0000-000000000003', 'Machoiron fumé', 'poisson', 3500, 'kg', '🐟'),
  ('10000000-0000-0000-0000-000000000003', 'Carpe fraîche', 'poisson', 3000, 'kg', '🐠'),
  ('10000000-0000-0000-0000-000000000003', 'Crevettes fraîches', 'poisson', 4500, 'kg', '🦐'),
  -- Boucherie Centrale Oloumi
  ('10000000-0000-0000-0000-000000000004', 'Poulet fermier', 'poisson', 6000, 'pièce', '🍗'),
  ('10000000-0000-0000-0000-000000000004', 'Viande de bœuf', 'poisson', 5500, 'kg', '🥩'),
  -- Épicerie Traditionnelle Akébé
  ('10000000-0000-0000-0000-000000000005', 'Riz local', 'cereales', 800, 'kg', '🍚'),
  ('10000000-0000-0000-0000-000000000005', 'Bâtons de manioc', 'cereales', 500, 'pièce', '🥖'),
  ('10000000-0000-0000-0000-000000000005', 'Pâte d’arachide', 'cereales', 2500, 'pot', '🥜'),
  ('10000000-0000-0000-0000-000000000005', 'Poivre de Penja', 'cereales', 3000, '100g', '🧂'),
  ('10000000-0000-0000-0000-000000000005', 'Gingembre frais', 'cereales', 1000, 'kg', '🫚'),
  ('10000000-0000-0000-0000-000000000005', 'Feuilles de manioc', 'legumes', 1000, 'botte', '🌿'),
  -- Le Jardin de Mont-Bouët
  ('10000000-0000-0000-0000-000000000006', 'Aubergines africaines', 'legumes', 1300, 'kg', '🍆'),
  ('10000000-0000-0000-0000-000000000006', 'Feuilles de manioc', 'legumes', 1000, 'botte', '🌿'),
  ('10000000-0000-0000-0000-000000000006', 'Gombo', 'legumes', 1000, 'tas', '🥒'),
  ('10000000-0000-0000-0000-000000000006', 'Piment frais', 'legumes', 500, 'tas', '🌶️');
