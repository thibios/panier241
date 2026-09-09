-- Panier 241 — approbation admin des marchands et livreurs
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from auth.users where id = auth.uid() and email = 'thibiosang@gmail.com'
  );
$$;

-- 1. Marchands
alter table public.merchants add column status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected', 'suspended'));

update public.merchants set status = 'approved' where owner_id is null;

drop policy if exists "Lecture publique des marchands" on public.merchants;
create policy "Lecture des marchands approuves, du proprietaire ou de l'admin"
  on public.merchants for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

create policy "L'admin gere tous les marchands"
  on public.merchants for update
  using (public.is_admin());

create function public.prevent_merchant_self_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger prevent_merchant_self_approval
  before update on public.merchants
  for each row execute procedure public.prevent_merchant_self_status_change();

-- 2. Livreurs
alter table public.livreurs add column status text not null default 'pending'
  check (status in ('pending', 'approved', 'rejected', 'suspended'));

drop policy if exists "Lecture publique des livreurs" on public.livreurs;
create policy "Lecture des livreurs approuves, du proprietaire ou de l'admin"
  on public.livreurs for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

create policy "L'admin gere tous les livreurs"
  on public.livreurs for update
  using (public.is_admin());

create function public.prevent_livreur_self_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger prevent_livreur_self_approval
  before update on public.livreurs
  for each row execute procedure public.prevent_livreur_self_status_change();
