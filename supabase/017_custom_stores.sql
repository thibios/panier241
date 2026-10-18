-- Magasins et enseignes ajoutés depuis l'application : même circuit que les marchés
-- (proposition puis validation par l'administrateur), avec un logo obligatoire
-- hébergé dans le bucket kiosk-photos du projet.

alter table public.custom_markets
  add column if not exists kind text not null default 'marche' check (kind in ('marche', 'supermarche'));
alter table public.custom_markets
  add column if not exists logo_url text check (
    logo_url is null
    or logo_url like 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/kiosk-photos/%'
  );
alter table public.custom_markets
  add constraint custom_markets_store_needs_logo check (kind = 'marche' or logo_url is not null);
