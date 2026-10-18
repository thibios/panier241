-- Durcissement de sécurité (audit du 18 octobre 2026).

-- 1. Commandes : un client ne crée qu'une commande neuve, à son nom, sans livreur.
--    Empêche de créer une commande déjà « livrée » pour se laisser un faux avis.
drop policy if exists "Seul le client cree sa commande" on public.orders;
create policy "Seul le client cree sa commande"
  on public.orders for insert
  with check (
    auth.uid() = user_id
    and status = 'en_preparation'
    and livreur_id is null
    and livreur_name is null
    and livreur_phone is null
  );

-- 2. Livreurs : seuls les livreurs APPROUVÉS voient les livraisons disponibles
--    (adresse et téléphone du client) et peuvent les accepter.
drop policy if exists "Le livreur voit les livraisons disponibles ou les siennes" on public.orders;
create policy "Le livreur voit les livraisons disponibles ou les siennes"
  on public.orders for select
  using (
    livreur_id = (select l.id from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
    or (
      livreur_id is null
      and status = 'en_livraison'
      and exists (select 1 from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
    )
  );

drop policy if exists "Le livreur accepte et met a jour sa livraison" on public.orders;
create policy "Le livreur accepte et met a jour sa livraison"
  on public.orders for update
  using (
    (
      livreur_id is null
      and status = 'en_livraison'
      and exists (select 1 from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
    )
    or livreur_id = (select l.id from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
  )
  with check (
    livreur_id = (select l.id from public.livreurs l where l.owner_id = auth.uid() and l.status = 'approved')
  );

-- 3. Le marchand ne peut pas réattribuer une commande à un autre marchand.
drop policy if exists "Seul le marchand met a jour le statut de sa commande" on public.orders;
create policy "Seul le marchand met a jour le statut de sa commande"
  on public.orders for update
  using (exists (select 1 from public.merchants m where m.id::text = orders.merchant_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.merchants m where m.id::text = orders.merchant_id and m.owner_id = auth.uid()));

-- 4. Champs figés d'une commande : montants, articles, client, adresse... ne changent plus
--    après création (sauf administrateur). Le livreur affiché est toujours celui du compte qui accepte.
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

drop trigger if exists protect_order_columns on public.orders;
create trigger protect_order_columns
  before update on public.orders
  for each row execute function public.protect_order_columns();

-- 5. Avis : uniquement sur le marchand de la commande, et jamais sur son propre commerce.
drop policy if exists "Le client note sa propre commande livree" on public.reviews;
create policy "Le client note sa propre commande livree"
  on public.reviews for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.orders o
      where o.id = reviews.order_id
        and o.user_id = auth.uid()
        and o.status = 'livree'
        and o.merchant_id = reviews.merchant_id::text
    )
    and not exists (
      select 1 from public.merchants m where m.id = reviews.merchant_id and m.owner_id = auth.uid()
    )
  );

-- 6. Un propriétaire ne peut pas céder son commerce, son profil livreur ou changer d'identifiant de profil.
drop policy if exists "Le proprietaire modifie son marchand" on public.merchants;
create policy "Le proprietaire modifie son marchand"
  on public.merchants for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Le proprietaire modifie son profil livreur" on public.livreurs;
create policy "Le proprietaire modifie son profil livreur"
  on public.livreurs for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Un utilisateur peut modifier son propre profil" on public.profiles;
create policy "Un utilisateur peut modifier son propre profil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 7. Stockage : plus de listing public des fichiers (les URL publiques restent valides),
--    chacun n'écrit que dans son propre dossier, tailles et formats limités.
drop policy if exists "Lecture publique des photos de kiosque" on storage.objects;
drop policy if exists "Lecture publique des photos de produits" on storage.objects;
drop policy if exists "Lecture publique des videos de liste de courses" on storage.objects;
drop policy if exists "Lecture publique des photos de profil" on storage.objects;

create policy "Chacun lit sa propre photo de profil"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Les utilisateurs connectes envoient leurs photos de kiosque" on storage.objects;
create policy "Les utilisateurs connectes envoient leurs photos de kiosque"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'kiosk-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Les utilisateurs connectes envoient des photos de produits" on storage.objects;
create policy "Les utilisateurs connectes envoient des photos de produits"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Les utilisateurs connectes envoient leurs videos de liste de co" on storage.objects;
create policy "Chacun envoie sa video de liste de courses"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'shopping-videos' and (storage.foldername(name))[1] = auth.uid()::text);

update storage.buckets
  set file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  where id in ('kiosk-photos', 'product-photos');

update storage.buckets
  set file_size_limit = 52428800,
      allowed_mime_types = array['video/*']
  where id = 'shopping-videos';

-- 8. Fonctions : search_path figé, fonctions de déclencheur non appelables par l'API.
alter function public.prevent_merchant_self_status_change() set search_path = public;
alter function public.prevent_livreur_self_status_change() set search_path = public;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_merchant_rating() from public, anon, authenticated;
revoke execute on function public.protect_order_columns() from public, anon, authenticated;

-- 9. Droits inutiles retirés aux rôles de l'API (TRUNCATE n'est pas soumis aux règles RLS).
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
