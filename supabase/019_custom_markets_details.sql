-- Ajout d'un marché de proximité : type de marché, adresse ou repère, photo du marché.

alter table public.custom_markets add column if not exists market_type text check (char_length(market_type) <= 60);
alter table public.custom_markets add column if not exists address text check (char_length(address) <= 200);
alter table public.custom_markets add column if not exists photo_url text check (
  photo_url is null
  or photo_url like 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/kiosk-photos/%'
);
