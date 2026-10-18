-- 1. Annulation d'une commande par le client, tant qu'elle est en préparation.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check check (status in ('en_preparation', 'en_livraison', 'livree', 'annulee'));
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists cancel_reason text check (char_length(cancel_reason) <= 300);

create policy "Le client annule sa commande en preparation"
  on public.orders for update
  using (auth.uid() = user_id and status = 'en_preparation')
  with check (auth.uid() = user_id and status = 'annulee');

-- Le déclencheur de protection : une commande annulée ne revient plus en arrière,
-- et la date d'annulation est fixée par la base.
create or replace function public.protect_order_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  me public.livreurs%rowtype;
begin
  if public.is_admin() then
    return new;
  end if;

  if old.status = 'annulee' then
    return old;
  end if;

  new.user_id := old.user_id;
  new.merchant_id := old.merchant_id;
  new.merchant_name := old.merchant_name;
  new.items := old.items;
  new.subtotal := old.subtotal;
  new.service_fee := old.service_fee;
  new.delivery_fee := old.delivery_fee;
  new.distance_km := old.distance_km;
  new.total := old.total;
  new.slot_label := old.slot_label;
  new.address_label := old.address_label;
  new.client_phone := old.client_phone;
  new.shopping_video_url := old.shopping_video_url;
  new.created_at := old.created_at;

  if new.status = 'annulee' then
    new.cancelled_at := now();
  else
    new.cancelled_at := old.cancelled_at;
    new.cancel_reason := old.cancel_reason;
  end if;

  if new.livreur_id is distinct from old.livreur_id
     or new.livreur_name is distinct from old.livreur_name
     or new.livreur_phone is distinct from old.livreur_phone then
    select * into me from public.livreurs where owner_id = auth.uid() and status = 'approved';
    if old.livreur_id is null and me.id is not null and new.livreur_id = me.id then
      new.livreur_name := me.name;
      new.livreur_phone := me.phone;
    else
      new.livreur_id := old.livreur_id;
      new.livreur_name := old.livreur_name;
      new.livreur_phone := old.livreur_phone;
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_order_columns() from public, anon, authenticated;

-- 2. Prix officiels : liste des produits défiscalisés à prix bloqués publiée par la
--    DGCCRF du Gabon (page « Écho des marchés », relevée le 18 octobre 2026).
--    Prix de gros et demi-gros : par carton ou colis indiqué ; prix de détail : par unité vendue.

create table if not exists public.official_prices (
  id serial primary key,
  numero int not null,
  categorie text not null,
  designation text not null,
  prix_gros int,
  prix_demi_gros int,
  prix_detail int not null,
  unite_detail text not null,
  regime_fiscal text not null default 'Produit défiscalisé : droits et taxes suspendus, prix plafond toutes taxes comprises',
  source text not null default 'DGCCRF Gabon, liste des 67 produits défiscalisés à prix bloqués',
  source_url text not null default 'https://dgccrf.ga/echo-liste-produit',
  releve_le date not null default '2026-10-18'
);

alter table public.official_prices enable row level security;

create policy "Lecture publique des prix officiels"
  on public.official_prices for select
  using (true);

create policy "L'admin met a jour les prix officiels"
  on public.official_prices for all
  using (public.is_admin())
  with check (public.is_admin());

revoke truncate, trigger, references on public.official_prices from anon, authenticated;

insert into public.official_prices (numero, categorie, designation, prix_gros, prix_demi_gros, prix_detail, unite_detail) values
  (1, 'Viande de porc', 'Cotis de porc viandé', 16340, 16990, 1875, 'le kg'),
  (2, 'Viande de porc', 'Cotis de porc semi viandé', 13350, 13900, 1550, 'le kg'),
  (3, 'Viande de porc', 'Rognons emballage bloc', 9250, 9500, 1000, 'le kg'),
  (4, 'Volaille', 'Cuisses de poulet (USA)', 9300, 9650, 1050, 'le kg'),
  (5, 'Volaille', 'Cuisses de poulet (Brésil)', 9550, 9950, 1100, 'le kg'),
  (6, 'Volaille', 'Pilons de poulet (USA)', 10145, 10460, 1150, 'le kg'),
  (7, 'Volaille', 'Ailes de poulet 3 phalanges B', 10700, 11100, 1200, 'le kg'),
  (8, 'Volaille', 'Ailes de poule', 12465, 12990, 1445, 'le kg'),
  (9, 'Volaille', 'Ailes de dinde 3 phalanges', 14290, 15030, 1650, 'le kg'),
  (10, 'Poisson surgelé', 'Maquereaux 300 g - 500 g (Asie)', 15300, 16065, 1800, 'le kg'),
  (11, 'Poisson surgelé', 'Bar Amérique du Sud (y compris Corvina ou Yellow Croaker)', 15600, 16250, 1800, 'le kg'),
  (12, 'Poisson surgelé', 'Tilapia 300 g - 500 g (Asie)', 11890, 12490, 1375, 'le kg'),
  (13, 'Conserves de poisson', 'Sardines à l''huile Princesse 125 g x 50 (Afrique du Nord)', 13795, 14210, 310, 'la boîte'),
  (14, 'Conserves de poisson', 'Sardines à l''huile BELMA 125 g x 50', 17085, 17615, 385, 'la boîte'),
  (15, 'Conserves de poisson', 'Sardines à la tomate BELMA 425 g x 24', 16450, 16955, 775, 'la boîte'),
  (16, 'Conserves de poisson', 'Maquereaux BELMA et Africa Queen bande rouge 425 g x 24', 20120, 20595, 880, 'la boîte'),
  (17, 'Conserves de poisson', 'Maquereaux Africa Queen bande bleue 425 g x 24', 13300, 13935, 650, 'la boîte'),
  (18, 'Conserves de poisson', 'Maquereaux TOMACK 425 g x 24', 12060, 12695, 600, 'la boîte'),
  (19, 'Conserves de légumes', 'Tomate double concentrée SALSA 70 g x 100', 10260, 10565, 115, 'la boîte'),
  (20, 'Conserves de légumes', 'Tomate double concentrée ALBA 70 g x 100', 10020, 10320, 115, 'la boîte'),
  (21, 'Conserves de légumes', 'Tomate double concentrée ABC 70 g x 100', 10685, 11015, 120, 'la boîte'),
  (22, 'Conserves de légumes', 'Tomate entière pelée SALSA 400 g x 24', 9445, 9820, 450, 'la boîte'),
  (23, 'Conserves de légumes', 'Tomate entière pelée ALBA 400 g x 24', 11250, 11600, 530, 'la boîte'),
  (24, 'Conserves de légumes', 'Tomate entière pelée ABC 400 g x 24', 9680, 9980, 455, 'la boîte'),
  (25, 'Conserves de légumes', 'Tomate entière pelée TOP BUDGET 400 g x 12', 4625, 4770, 435, 'la boîte'),
  (26, 'Pâtes alimentaires', 'Spaghetti sans œufs ALIX 250 g x 40', 6060, 6240, 170, 'le paquet'),
  (27, 'Pâtes alimentaires', 'Spaghetti sans œufs RINO 250 g x 40', 6065, 6250, 175, 'le paquet'),
  (28, 'Pâtes alimentaires', 'Spaghetti sans œufs PASTA ROMA 500 g x 20', 5335, 5495, 300, 'le paquet'),
  (29, 'Pâtes alimentaires', 'Spaghetti sans œufs ALIX 500 g x 20', 5345, 5505, 300, 'le paquet'),
  (30, 'Produits laitiers', 'Lait concentré non sucré BOCAGE 160 g x 48', 12760, 13230, 315, 'la boîte'),
  (31, 'Produits laitiers', 'Lait concentré sucré BONNET ROUGE 1 kg x 24', 36270, 37355, 1680, 'la boîte'),
  (32, 'Produits laitiers', 'Lait en poudre BONNET ROUGE 16 g x 120', 10200, 10510, 95, 'le sachet'),
  (33, 'Produits laitiers', 'Lait en poudre BRIDEL 400 g x 24', 44210, 46555, 2205, 'la boîte'),
  (34, 'Produits laitiers', 'Lait en poudre BRIDEL 900 g x 12', 51900, 54650, 5175, 'la boîte'),
  (35, 'Produits laitiers', 'Lait en poudre COWBELL 18 g x 120', 9225, 9500, 85, 'le sachet'),
  (36, 'Produits laitiers', 'Lait en poudre COWBELL 400 g x 12', 44880, 47160, 2125, 'la boîte'),
  (37, 'Produits laitiers', 'Lait concentré sucré BOCAGE 397 g x 48', 23000, 24250, 575, 'la boîte'),
  (38, 'Produits laitiers', 'Lait concentré sucré BOCAGE 1 kg x 24', 25400, 26750, 1275, 'la boîte'),
  (39, 'Produits laitiers', 'Lait concentré sucré BONNET ROUGE (nouveau) 397 g x 24', 14530, 14970, 680, 'la boîte'),
  (40, 'Produits laitiers', 'Lait concentré sucré BONNET ROUGE (nouveau) 1 kg x 24', 33670, 34130, 1550, 'la boîte'),
  (41, 'Produits laitiers', 'Lait en poudre BOCAGE 400 g x 24', 43100, 45365, 2150, 'la boîte'),
  (42, 'Produits laitiers', 'Lait en poudre BOCAGE 900 g x 12', 46000, 48400, 4600, 'la boîte'),
  (43, 'Produits laitiers', 'Guigoz 1er et 2e âge 400 g x 12', 27150, 28250, 2600, 'la boîte'),
  (44, 'Produits laitiers', 'NIDO 1+ 400 g x 12', 30000, 30750, 2750, 'la boîte'),
  (45, 'Riz parfumé au jasmin', 'Riz parfumé ELEPHANT 10 lbs (4,54 kg) x 10', 39650, 41735, 4745, 'le sac de 4,54 kg'),
  (46, 'Riz parfumé au jasmin', 'Riz parfumé ELEPHANT 25 lbs (11,375 kg) x 4', 37550, 39115, 10865, 'le sac de 11,375 kg'),
  (47, 'Riz parfumé au jasmin', 'Riz parfumé ELEPHANT 50 lbs (22,68 kg)', 18990, 19985, 22715, 'le sac de 22,68 kg'),
  (48, 'Riz parfumé au jasmin', 'Riz parfumé SUPER ELEPHANT 20 lbs (9,1 kg) x 5', 33275, 35270, 7560, 'le sac de 9,1 kg'),
  (49, 'Riz parfumé au jasmin', 'Riz parfumé SUPER ELEPHANT 44,1 lbs (20 kg)', 14010, 14850, 16100, 'le sac de 20 kg'),
  (50, 'Riz parfumé au jasmin', 'Riz parfumé SUPER ELEPHANT 96,7 lbs (44 kg)', 30300, 32115, 35000, 'le sac de 44 kg'),
  (51, 'Huile raffinée', 'Huile de palme Cuisin''or 0,9 L', 10705, 11025, 1000, 'la bouteille'),
  (52, 'Huile raffinée', 'Huile de palme Cuisin''or 2 L', 10690, 11000, 2000, 'la bouteille'),
  (53, 'Sucre', 'Sucre blanc morceaux 1 kg (carton de 25 paquets)', 22750, null, 925, 'le paquet de 1 kg'),
  (54, 'Sucre', 'Sucre blanc morceaux 1 kg (carton de 20 paquets)', 18150, null, 925, 'le paquet de 1 kg'),
  (55, 'Sucre', 'Sucre roux morceaux 1 kg (carton de 25 paquets)', 21375, null, 875, 'le paquet de 1 kg'),
  (56, 'Sucre', 'Sucre roux morceaux 1 kg (carton de 20 paquets)', 17175, null, 875, 'le paquet de 1 kg'),
  (57, 'Sucre', 'Sucre blanc granulé 1 kg (carton de 25 paquets)', 22100, null, 900, 'le paquet de 1 kg'),
  (58, 'Sucre', 'Sucre blanc granulé 1 kg (carton de 20 paquets)', 17650, null, 900, 'le paquet de 1 kg'),
  (59, 'Sucre', 'Sucre roux granulé 1 kg (carton de 25 paquets)', 20150, null, 825, 'le paquet de 1 kg'),
  (60, 'Sucre', 'Sucre roux granulé 1 kg (carton de 20 paquets)', 16200, null, 825, 'le paquet de 1 kg');
