-- Panier 241 — tarification livraison reelle (GPS) + montant ajustable
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

alter table public.addresses add column lat numeric;
alter table public.addresses add column lng numeric;

alter table public.orders add column service_fee integer not null default 0;
alter table public.orders add column distance_km numeric;
