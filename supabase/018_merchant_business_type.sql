-- Inscription commerçant enrichie : type de commerce, quartier, plusieurs photos du kiosque,
-- et type de chaque produit (plat, boisson, gâteau, légume...).
-- Un commerçant indépendant (non rattaché à un marché ou un magasin) a market_id = 'independant'.

alter table public.merchants add column if not exists business_type text check (char_length(business_type) <= 60);
alter table public.merchants add column if not exists neighborhood text check (char_length(neighborhood) <= 80);
alter table public.merchants add column if not exists kiosk_photos text[] not null default '{}';
alter table public.products add column if not exists product_type text check (char_length(product_type) <= 60);
