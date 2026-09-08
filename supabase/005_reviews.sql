-- Panier 241 — avis clients
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Lecture publique des avis"
  on public.reviews for select
  using (true);

create policy "Le client note sa propre commande livree"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid() and o.status = 'livree'
    )
  );

create function public.update_merchant_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.merchants
  set
    review_count = (select count(*) from public.reviews where merchant_id = new.merchant_id),
    rating = (select round(avg(rating)::numeric, 1) from public.reviews where merchant_id = new.merchant_id)
  where id = new.merchant_id;
  return new;
end;
$$;

create trigger on_review_created
  after insert on public.reviews
  for each row execute procedure public.update_merchant_rating();
