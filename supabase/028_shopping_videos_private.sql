-- 028 : les vidéos de liste de courses ne sont plus publiques.
-- Audit 2026-10 (docs/audit-2026-10/REGISTRE_RISQUES.md, risque R05, tâche U10) : le bucket
-- shopping-videos était public, toute personne ayant l'URL voyait la vidéo.
--
--   1. Bucket shopping-videos privé (public = false) : l'URL /object/public/... ne répond plus.
--   2. Policies storage.objects du bucket : le client écrit, lit et supprime dans son dossier
--      <auth.uid()>/... ; lecture aussi pour le commerçant de la commande, le livreur affecté pendant
--      sa course (en_livraison) et l'admin, seulement pour une vidéo référencée par une commande
--      de ce client (fonction shopping_video_readable, s'appuie sur order_access_role de 022).
--   3. orders.shopping_video_url contient désormais le CHEMIN de l'objet (<uid>/<fichier>) et non
--      plus une URL : reprise des valeurs existantes (URL publique -> chemin), sans perte.
--   4. create_order (même signature) : accepte un chemin du dossier de l'appelant, fichier existant ;
--      une ancienne URL publique encore transmise est convertie en chemin.
-- Les autres buckets (avatars, kiosk-photos, product-photos) ne sont pas touchés.
-- Le front (Cart, MerchantSpace) doit être déployé en même temps : il enregistre le chemin et
-- affiche la vidéo par URL signée (createSignedUrl, 1 h).
-- Rejouable (if exists / or replace). Retour arrière : update storage.buckets set public = true
-- where id = 'shopping-videos' ; supprimer les trois policies et la fonction ; recréer create_order
-- de 022 ; les chemins restent lisibles par le front (il gère aussi l'ancienne URL).

-- 1. Bucket privé.
update storage.buckets set public = false where id = 'shopping-videos';

-- 2a. Chemin d'objet à partir d'une ancienne URL publique (sinon la valeur telle quelle).
create or replace function public.shopping_video_path(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_value like 'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/shopping-videos/%'
      then nullif(split_part(substr(p_value,
             char_length('https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/shopping-videos/') + 1),
             '?', 1), '')
    else p_value
  end;
$$;
revoke execute on function public.shopping_video_path(text) from public, anon, authenticated;

-- 2b. Lecture d'une vidéo par un participant de la commande qui la référence.
create or replace function public.shopping_video_readable(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.shopping_video_url = p_name
      and o.user_id::text = split_part(p_name, '/', 1)
      and case public.order_access_role(o.id)
            when 'admin' then true
            when 'commercant' then true
            when 'livreur' then o.status = 'en_livraison'
            else false
          end
  );
$$;
revoke execute on function public.shopping_video_readable(text) from public, anon;
grant execute on function public.shopping_video_readable(text) to authenticated;

create index if not exists orders_shopping_video_url_idx
  on public.orders (shopping_video_url) where shopping_video_url is not null;

-- 2c. Policies du bucket (la lecture publique de 008 a déjà été retirée par 014).
drop policy if exists "Lecture publique des videos de liste de courses" on storage.objects;

drop policy if exists "Chacun envoie sa video de liste de courses" on storage.objects;
create policy "Chacun envoie sa video de liste de courses"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'shopping-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chacun lit ses videos de liste de courses" on storage.objects;
create policy "Chacun lit ses videos de liste de courses"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'shopping-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Chacun supprime ses videos de liste de courses" on storage.objects;
create policy "Chacun supprime ses videos de liste de courses"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'shopping-videos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Participants de la commande lisent la video de liste de courses" on storage.objects;
create policy "Participants de la commande lisent la video de liste de courses"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'shopping-videos' and public.shopping_video_readable(name));

-- 3. Reprise : URL publique -> chemin, sans perte (comptes vérifiés avant / après).
do $$
declare
  v_before int;
  v_after int;
  v_left int;
begin
  select count(*) into v_before from public.orders where shopping_video_url is not null;
  update public.orders
     set shopping_video_url = public.shopping_video_path(shopping_video_url)
   where shopping_video_url like 'https://%';
  select count(*) into v_after from public.orders where shopping_video_url is not null;
  select count(*) into v_left from public.orders where shopping_video_url like 'http%';
  if v_after <> v_before or v_left <> 0 then
    raise exception '028 : reprise des vidéos incohérente (avant %, après %, URL restantes %)', v_before, v_after, v_left;
  end if;
  raise notice '028 : % commande(s) avec vidéo avant, % après', v_before, v_after;
end $$;

-- 4. create_order : corps de 022 inchangé hormis le contrôle de la vidéo (v_video).
create or replace function public.create_order(
  p_client_request_id uuid,
  p_merchant_id uuid,
  p_items jsonb,
  p_mode text,
  p_slot_label text,
  p_phone text,
  p_payment_method text,
  p_address text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_landmark text default null,
  p_address_label text default null,
  p_shopping_video_url text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  m public.merchants%rowtype;
  v_phone text;
  v_slot text := nullif(btrim(coalesce(p_slot_label, '')), '');
  v_address text := nullif(btrim(coalesce(p_address, '')), '');
  v_landmark text := nullif(btrim(coalesce(p_landmark, '')), '');
  v_label text := nullif(btrim(coalesce(p_address_label, '')), '');
  v_bad int;
  v_lines int;
  v_found int;
  v_items jsonb;
  v_subtotal bigint;
  v_discount integer := 0;   -- aucune réduction pour l'instant (codes promo : phase 2)
  v_service integer;
  v_delivery integer := 0;
  v_distance numeric := null;
  v_mlat double precision;
  v_mlng double precision;
  v_deposit integer;
  v_video text;
  o public.orders%rowtype;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  if p_client_request_id is null then
    raise exception 'Identifiant de tentative obligatoire' using errcode = '22023';
  end if;
  -- Même tentative déjà enregistrée (double clic, nouvel essai réseau) : renvoie la commande existante.
  select * into o from public.orders where user_id = v_uid and client_request_id = p_client_request_id;
  if found then
    return o;
  end if;
  if p_mode is null or p_mode not in ('livraison', 'retrait') then
    raise exception 'Mode inconnu : livraison ou retrait' using errcode = '22023';
  end if;
  if v_slot is null or char_length(v_slot) > 120 then
    raise exception 'Créneau obligatoire (120 caractères maximum)' using errcode = '22023';
  end if;
  v_phone := regexp_replace(coalesce(p_phone, ''), '[\s.\-()]', '', 'g');
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Numéro de téléphone invalide' using errcode = '22023';
  end if;
  if p_payment_method is null or p_payment_method not in ('airtel_money', 'moov_money', 'especes') then
    raise exception 'Moyen de paiement inconnu' using errcode = '22023';
  end if;
  -- 028 : la commande enregistre le CHEMIN de l'objet (<uid>/<fichier>) du bucket privé shopping-videos.
  --       Une ancienne URL publique encore envoyée est convertie en chemin. Le fichier doit exister
  --       et se trouver dans le dossier du client.
  v_video := nullif(btrim(coalesce(p_shopping_video_url, '')), '');
  if v_video is not null then
    v_video := public.shopping_video_path(v_video);
    if v_video is null
       or char_length(v_video) > 300
       or v_video !~ ('^' || v_uid::text || '/[^/]+$')
       or split_part(v_video, '/', 2) in ('.', '..')
       or not exists (select 1 from storage.objects so
                      where so.bucket_id = 'shopping-videos' and so.name = v_video) then
      raise exception 'Lien de vidéo non autorisé' using errcode = '22023';
    end if;
  end if;

  select * into m from public.merchants where id = p_merchant_id;
  if not found or m.status <> 'approved' or m.is_demo then
    raise exception 'Commerce introuvable ou indisponible' using errcode = 'P0002';
  end if;

  -- Articles : [{ "product_id" | "variant_id": uuid, "quantity": entier 1..1000 }]
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'Panier vide ou trop long (100 lignes maximum)' using errcode = '22023';
  end if;

  select count(*) into v_bad
  from jsonb_array_elements(p_items) e
  where jsonb_typeof(e) <> 'object'
     or coalesce(e ->> 'variant_id', e ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or case when coalesce(e ->> 'quantity', '') ~ '^[0-9]{1,4}$'
             then (e ->> 'quantity')::int not between 1 and 1000
             else true end;
  if v_bad > 0 then
    raise exception 'Article invalide (identifiant ou quantité entre 1 et 1000)' using errcode = '22023';
  end if;

  with raw as (
    select coalesce(e ->> 'variant_id', e ->> 'product_id')::uuid as product_id,
           (e ->> 'quantity')::int as quantity,
           ord
    from jsonb_array_elements(p_items) with ordinality as t(e, ord)
  ), merged as (
    select product_id, sum(quantity)::int as quantity, min(ord) as ord
    from raw group by product_id
  )
  select count(*),
         count(p.id),
         jsonb_agg(jsonb_build_object(
           'productId', p.id,
           'productName', p.name || coalesce(' ' || p.variant_label, ''),
           'quantity', mg.quantity,
           'unitPrice', p.price,
           'unit', p.unit) order by mg.ord) filter (where p.id is not null),
         coalesce(sum(p.price::bigint * mg.quantity), 0)
    into v_lines, v_found, v_items, v_subtotal
  from merged mg
  left join public.products p on p.id = mg.product_id and p.merchant_id = m.id;

  if v_found <> v_lines then
    raise exception 'Produit introuvable ou appartenant à un autre commerçant (un seul commerçant par commande)'
      using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(v_items) i where (i ->> 'quantity')::int > 1000) then
    raise exception 'Quantité maximale 1000 par produit' using errcode = '22023';
  end if;
  if v_subtotal <= 0 or v_subtotal > 100000000 then
    raise exception 'Montant de commande hors limites' using errcode = '22023';
  end if;

  v_service := public.order_engine_commission((v_subtotal - v_discount)::int);

  if p_mode = 'livraison' then
    if v_address is null or char_length(v_address) not between 3 and 300 then
      raise exception 'Adresse de livraison obligatoire (3 à 300 caractères)' using errcode = '22023';
    end if;
    if v_landmark is not null and char_length(v_landmark) > 200 then
      raise exception 'Point de repère trop long (200 caractères maximum)' using errcode = '22023';
    end if;
    if (p_lat is null) <> (p_lng is null)
       or (p_lat is not null and (p_lat not between -90 and 90 or p_lng not between -180 and 180)) then
      raise exception 'Coordonnées GPS invalides' using errcode = '22023';
    end if;
    v_label := left(coalesce(v_label, v_address), 160);

    select lat, lng into v_mlat, v_mlng from public.market_locations where market_id = m.market_id;
    if v_mlat is not null and p_lat is not null then
      v_distance := public.haversine_km(v_mlat, v_mlng, p_lat, p_lng);
      v_delivery := public.setting_value('delivery_base_fee')::int
                    + round(v_distance * public.setting_value('delivery_rate_per_km'))::int;
    else
      v_delivery := public.setting_value('delivery_fallback_fee')::int;
    end if;
  else
    v_label := 'Retrait sur stand';
    v_delivery := 0;
  end if;

  v_deposit := public.order_engine_deposit((v_subtotal - v_discount + v_service + v_delivery)::int);

  perform public.order_engine_set_ctx('client', 'creation', null);

  begin
    insert into public.orders (
      user_id, merchant_id, merchant_name, items, subtotal, initial_subtotal, discount_amount,
      service_fee, delivery_fee, distance_km, total, status, slot_label, address_label,
      client_phone, shopping_video_url, fulfillment_mode, deposit_amount, deposit_status,
      payment_method, payment_status, client_request_id
    ) values (
      v_uid, m.id::text, m.name, v_items, v_subtotal, v_subtotal, v_discount,
      v_service, v_delivery, v_distance, v_subtotal - v_discount + v_service + v_delivery,
      'en_preparation', v_slot, v_label,
      v_phone, v_video, p_mode, v_deposit,
      case when v_deposit > 0 then 'du' else 'non_requis' end,
      p_payment_method, 'du', p_client_request_id
    ) returning * into o;
  exception when unique_violation then
    -- Deux appels simultanés avec le même identifiant : le second renvoie la commande du premier.
    select * into o from public.orders where user_id = v_uid and client_request_id = p_client_request_id;
    perform public.order_engine_set_ctx(null, null, null);
    return o;
  end;

  if p_mode = 'livraison' then
    insert into public.order_delivery_details (order_id, full_address, landmark, lat, lng)
    values (o.id, v_address, v_landmark, p_lat, p_lng);
  end if;

  perform public.order_engine_set_ctx(null, null, null);
  return o;
end;
$$;
revoke execute on function public.create_order(uuid, uuid, jsonb, text, text, text, text, text, double precision, double precision, text, text, text) from public, anon;
grant execute on function public.create_order(uuid, uuid, jsonb, text, text, text, text, text, double precision, double precision, text, text, text) to authenticated;
