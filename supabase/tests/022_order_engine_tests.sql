-- Tests du moteur de commande (022).
--
-- Exécution : dans UNE transaction annulée, après le corps de 022 (sans son begin/commit) :
--   begin;
--   <contenu de supabase/022_order_engine.sql sans les lignes "begin;" et "commit;">
--   <contenu de ce fichier>
--   rollback;
-- Si 022 est déjà appliquée : begin; <ce fichier> rollback;
-- Prérequis : 020 appliquée. Dernière exécution : 18/10/2026, 45 positifs + 69 négatifs = 114, tous passés.
--
-- Chaque assertion lève une exception en cas d'échec (la transaction échoue alors en entier).
-- Les rôles sont simulés par "set local role authenticated" + "set local request.jwt.claims".
-- Aucune donnée ne reste : tout est annulé par le rollback final.
-- Prix utilisés : prix de magasin fictifs de test (aucun prix officiel DGCCRF).

create temporary table t_results (id serial, kind text, name text);
grant all on t_results to authenticated, anon;
grant usage on sequence t_results_id_seq to authenticated, anon;

create function pg_temp.t_as(p_uid uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  execute format('set local request.jwt.claims = %L',
                 json_build_object('sub', p_uid, 'role', 'authenticated')::text);
  execute 'set local role authenticated';
end $$;

create function pg_temp.t_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''{"role":"anon"}''';
  execute 'set local role anon';
end $$;

create function pg_temp.t_postgres() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ''''';
end $$;

create function pg_temp.t_ok(p_kind text, p_cond boolean, p_name text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'ECHEC [%] %', p_kind, p_name;
  end if;
  insert into t_results (kind, name) values (p_kind, p_name);
end $$;

-- Exécute p_sql et exige une erreur dont le message contient p_fragment.
create function pg_temp.t_err(p_name text, p_sql text, p_fragment text) returns void language plpgsql as $$
declare
  v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is null then
    raise exception 'ECHEC [negatif] % : aucune erreur levée', p_name;
  end if;
  if v_msg not ilike '%' || p_fragment || '%' then
    raise exception 'ECHEC [negatif] % : erreur inattendue « % »', p_name, v_msg;
  end if;
  insert into t_results (kind, name) values ('negatif', p_name);
end $$;


do $$
declare
  -- Comptes de test (supprimés par le rollback)
  c   uuid := '22000000-0000-0000-0000-00000000000c';  -- client (aussi livreur LC)
  mo  uuid := '22000000-0000-0000-0000-0000000000a1';  -- propriétaire du commerce MA (aussi livreur LM)
  mo2 uuid := '22000000-0000-0000-0000-0000000000a2';  -- propriétaire du commerce suspendu MS
  l1  uuid := '22000000-0000-0000-0000-0000000000b1';  -- livreur approuvé
  l2  uuid := '22000000-0000-0000-0000-0000000000b2';  -- second livreur approuvé
  x   uuid := '22000000-0000-0000-0000-0000000000ff';  -- utilisateur sans lien
  adm uuid;
  ma  uuid := '22000000-0000-0000-0000-0000000001a1';
  ms  uuid := '22000000-0000-0000-0000-0000000001a2';
  p1  uuid := '22000000-0000-0000-0000-0000000002a1';
  p2  uuid := '22000000-0000-0000-0000-0000000002a2';
  p3  uuid := '22000000-0000-0000-0000-0000000002a3';
  px  uuid := '22000000-0000-0000-0000-0000000002a4';
  liv1 uuid; liv2 uuid; livc uuid; livm uuid;
  o public.orders%rowtype;
  o_gps uuid; o_nogps uuid; o_pick uuid; o_big uuid; o_adj1 uuid; o_adj2 uuid; o_adj3 uuid; o_adj4 uuid;
  n int; v int; r record; j jsonb; rid uuid; o2 public.orders%rowtype;
begin
  select id into adm from auth.users where email = 'thibiosang@gmail.com';
  if adm is null then raise exception 'Compte admin introuvable'; end if;

  -- ------------------------------------------------------------ jeu de données (rôle postgres)
  insert into auth.users (id, email) values
    (c, 'test022-client@example.invalid'), (mo, 'test022-merchant@example.invalid'),
    (mo2, 'test022-merchant2@example.invalid'), (l1, 'test022-l1@example.invalid'),
    (l2, 'test022-l2@example.invalid'), (x, 'test022-x@example.invalid');

  insert into public.merchants (id, owner_id, name, market_id, categories, address, status) values
    (ma, mo, 'Test022 Etal', 'mkt-mont-bouet', array['legumes'], 'Marché Mont-Bouët', 'approved'),
    (ms, mo2, 'Test022 Suspendu', 'mkt-oloumi', array['legumes'], 'Marché Oloumi', 'suspended');
  insert into public.products (id, merchant_id, name, category, price, unit, variant_label) values
    (p1, ma, 'Tomates', 'legumes', 1500, 'kg', null),
    (p2, ma, 'Gombo', 'legumes', 2000, 'tas', 'gros'),
    (p3, ma, 'Groupe test', 'legumes', 60000, 'pièce', null),
    (px, ms, 'Piment', 'legumes', 500, 'tas', null);
  insert into public.livreurs (owner_id, name, phone, vehicle, status) values
    (l1, 'Test L1', '+24177000001', 'moto', 'approved'),
    (l2, 'Test L2', '+24177000002', 'moto', 'approved'),
    (c,  'Test LC', '+24177000003', 'moto', 'approved'),
    (mo, 'Test LM', '+24177000004', 'moto', 'approved');
  select id into liv1 from public.livreurs where owner_id = l1;
  select id into liv2 from public.livreurs where owner_id = l2;
  select id into livc from public.livreurs where owner_id = c;
  select id into livm from public.livreurs where owner_id = mo;

  -- ------------------------------------------------------------ 0. inscription forcée en attente
  perform pg_temp.t_as(x);
  insert into public.merchants (owner_id, name, market_id, categories, address, status, rating, review_count)
  values (x, 'Test022 Pirate', 'mkt-akebe', array['legumes'], 'Akébé', 'approved', 4.9, 900);
  select count(*) into n from public.merchants where owner_id = x and status = 'pending' and rating = 0 and review_count = 0;
  perform pg_temp.t_ok('negatif', n = 1, 'Commerçant inséré "approved" avec fausse note : forcé pending, note par défaut');
  insert into public.livreurs (owner_id, name, phone, vehicle, status) values (x, 'Pirate', '+24100000000', 'moto', 'approved');
  select count(*) into n from public.livreurs where owner_id = x and status = 'pending';
  perform pg_temp.t_ok('negatif', n = 1, 'Livreur inséré "approved" : forcé pending');
  perform pg_temp.t_as(adm);
  insert into public.merchants (owner_id, name, market_id, categories, address, status)
  values (adm, 'Test022 Admin', 'mkt-akebe', array['legumes'], 'Akébé', 'approved');
  select count(*) into n from public.merchants where name = 'Test022 Admin' and status = 'approved';
  perform pg_temp.t_ok('positif', n = 1, 'Admin : insertion approuvée conservée');
  perform pg_temp.t_as(mo);
  update public.merchants set rating = 4.9, review_count = 99, phone = '+24177999999' where id = ma;
  select count(*) into n from public.merchants where id = ma and rating = 0 and review_count = 0 and phone = '+24177999999';
  perform pg_temp.t_ok('negatif', n = 1, 'Propriétaire : note et nombre d''avis non modifiables (autres champs oui)');
  perform pg_temp.t_as(adm);
  update public.merchants set rating = 3 where id = ma;
  select count(*) into n from public.merchants where id = ma and rating = 3;
  perform pg_temp.t_ok('positif', n = 1, 'Admin : correction de note possible');
  update public.merchants set rating = 0 where id = ma;

  -- ------------------------------------------------------------ D3. create_order
  perform pg_temp.t_as(c);
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 2),
                                                 jsonb_build_object('variant_id', p2, 'quantity', 1)),
                           'livraison', 'Demain · Matin', '+241 77 12 34 56', 'airtel_money',
                           'Quartier Louis, rue des Ambassades', 0.41, 9.47, 'Face à la pharmacie', 'Maison · Louis, Libreville');
  o_gps := o.id;
  perform pg_temp.t_ok('positif', o.subtotal = 5000 and o.service_fee = 250 and o.delivery_fee = 2843 and o.total = 8093
                       and o.status = 'en_preparation' and o.fulfillment_mode = 'livraison'
                       and o.merchant_share = 5000 and o.courier_share = 2843 and o.platform_share = 250
                       and o.deposit_amount = 0 and o.deposit_status = 'non_requis'
                       and o.payment_method = 'airtel_money' and o.payment_status = 'du'
                       and o.client_phone = '+24177123456' and round(o.distance_km, 3) = 2.812,
                       'Livraison GPS : montants recalculés serveur identiques à pricing.ts (8093 F)');
  perform pg_temp.t_ok('positif', (o.items -> 1 ->> 'productName') = 'Gombo gros' and (o.items -> 0 ->> 'unitPrice')::int = 1500,
                       'Articles figés depuis les prix en base (nom + variante)');
  select count(*) into n from public.order_delivery_details where order_id = o_gps and landmark = 'Face à la pharmacie' and lat = 0.41;
  perform pg_temp.t_ok('positif', n = 1, 'Adresse, GPS et repère enregistrés et lisibles par le client');
  select count(*) into n from public.order_status_history where order_id = o_gps and new_status = 'en_preparation' and actor_role = 'client' and changed_by = c;
  perform pg_temp.t_ok('positif', n = 1, 'Historique : création tracée (client)');

  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1),
                                                 jsonb_build_object('product_id', p1, 'quantity', 2)),
                           'livraison', 'Demain · Soir', '077123456', 'especes', 'Akébé, derrière l''école');
  o_nogps := o.id;
  perform pg_temp.t_ok('positif', o.delivery_fee = 1500 and o.subtotal = 4500 and o.service_fee = 225 and o.total = 6225
                       and jsonb_array_length(o.items) = 1 and (o.items -> 0 ->> 'quantity')::int = 3,
                       'Sans GPS : forfait 1500 F au total ; lignes identiques fusionnées');

  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p2, 'quantity', 2)),
                           'retrait', 'Demain · Retrait sur stand', '077123456', 'moov_money',
                           'ignoré', 1, 1, 'ignoré');
  o_pick := o.id;
  perform pg_temp.t_ok('positif', o.delivery_fee = 0 and o.distance_km is null and o.total = 4200 and o.address_label = 'Retrait sur stand'
                       and o.fulfillment_mode = 'retrait',
                       'Retrait : livraison 0 F, adresse non requise');
  select count(*) into n from public.order_delivery_details where order_id = o_pick;
  perform pg_temp.t_ok('positif', n = 0, 'Retrait : aucune adresse ni GPS stockés');

  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p3, 'quantity', 2)),
                           'livraison', 'Demain · Matin', '077123456', 'especes', 'Oloumi, entrepôt');
  o_big := o.id;
  perform pg_temp.t_ok('positif', o.subtotal = 120000 and o.service_fee = 6000 and o.total = 127500
                       and o.deposit_amount = 6375 and o.deposit_status = 'du',
                       'Total 127500 F > 100000 F : acompte 5 % du total = 6375 F');
  rid := gen_random_uuid();
  o := public.create_order(rid, ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1)),
                           'livraison', 's', '077123456', 'especes', 'adresse ok');
  o2 := public.create_order(rid, ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 5)),
                            'livraison', 's', '077123456', 'especes', 'adresse ok');
  select count(*) into n from public.orders where client_request_id = rid;
  perform pg_temp.t_ok('positif', o2.id = o.id and o2.subtotal = 1500 and n = 1,
                       'Idempotence : même identifiant de tentative, une seule commande renvoyée');
  perform pg_temp.t_err('Identifiant de tentative absent',
    format('select public.create_order(null, %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1))),
    'Identifiant de tentative');

  perform pg_temp.t_err('Insert direct dans orders par un client',
    format('insert into public.orders (user_id, merchant_id, merchant_name, items, subtotal, delivery_fee, total, status, slot_label, address_label) values (%L, %L, ''x'', ''[]'', 1, 0, 1, ''en_preparation'', ''x'', ''x'')', c, ma),
    'permission denied');
  perform pg_temp.t_err('Produit d''un autre commerçant',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''livraison'', ''s'', ''077123456'', ''especes'', ''adresse ok'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1), jsonb_build_object('product_id', px, 'quantity', 1))),
    'un seul commerçant');
  perform pg_temp.t_err('Commerce suspendu',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''livraison'', ''s'', ''077123456'', ''especes'', ''adresse ok'')', ms,
           jsonb_build_array(jsonb_build_object('product_id', px, 'quantity', 1))),
    'indisponible');
  perform pg_temp.t_err('Quantité 0',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''livraison'', ''s'', ''077123456'', ''especes'', ''adresse ok'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 0))),
    'quantité');
  perform pg_temp.t_err('Prix envoyé par le navigateur ignoré / clé inconnue refusée',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''livraison'', ''s'', ''077123456'', ''especes'', ''adresse ok'')', ma,
           jsonb_build_array(jsonb_build_object('price', 1, 'quantity', 1))),
    'Article invalide');
  perform pg_temp.t_err('Livraison sans adresse',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''livraison'', ''s'', ''077123456'', ''especes'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1))),
    'Adresse de livraison obligatoire');
  perform pg_temp.t_err('Téléphone invalide',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''12ab'', ''especes'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1))),
    'téléphone');
  perform pg_temp.t_err('Moyen de paiement inconnu',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''carte'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1))),
    'paiement');
  perform pg_temp.t_err('Vidéo hors du dossier du client',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'', null, null, null, null, null, %L)', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1)),
           'https://ukaauidavtmtjithahmn.supabase.co/storage/v1/object/public/shopping-videos/' || x || '/v.mp4'),
    'vidéo');
  perform pg_temp.t_err('GPS incomplet',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''livraison'', ''s'', ''077123456'', ''especes'', ''adresse ok'', 0.4, null)', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1))),
    'GPS');
  perform pg_temp.t_anon();
  perform pg_temp.t_err('Anonyme : create_order refusé',
    format('select public.create_order(gen_random_uuid(), %L, %L, ''retrait'', ''s'', ''077123456'', ''especes'')', ma,
           jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1))),
    'permission denied');

  -- ------------------------------------------------------------ D5. machine à états (livraison)
  perform pg_temp.t_as(l1);
  perform pg_temp.t_err('Livreur : accepter une commande encore en préparation',
    format('select public.set_order_status(%L, ''en_livraison'')', o_gps), 'introuvable');
  perform pg_temp.t_as(c);
  perform pg_temp.t_err('Client : marquer prête',
    format('select public.set_order_status(%L, ''prete_a_livrer'')', o_gps), 'non autorisée');
  perform pg_temp.t_err('Client : UPDATE direct du statut',
    format('update public.orders set status = ''annulee'' where id = %L', o_gps), 'permission denied');
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Commerçant : UPDATE direct du statut',
    format('update public.orders set status = ''livree'' where id = %L', o_gps), 'permission denied');
  perform pg_temp.t_err('Commerçant : UPDATE direct du montant (ancien chemin MerchantSpace)',
    format('update public.orders set subtotal = 1 where id = %L', o_gps), 'permission denied');
  perform pg_temp.t_err('Commerçant : statut de retrait sur une livraison',
    format('select public.set_order_status(%L, ''prete_a_retirer'')', o_gps), 'non autorisée');

  o := public.set_order_status(o_gps, 'prete_a_livrer');
  select count(*) into n from public.order_status_history
   where order_id = o_gps and old_status = 'en_preparation' and new_status = 'prete_a_livrer' and actor_role = 'commercant' and changed_by = mo and event = 'commande_prete';
  perform pg_temp.t_ok('positif', o.status = 'prete_a_livrer' and n = 1, 'Commerçant : en_preparation -> prete_a_livrer, historique complet');

  perform pg_temp.t_as(l1);
  select count(*) into n from public.list_available_deliveries() d where d.order_id = o_gps and d.courier_gain = 2843 and d.amount_to_collect = 8093;
  perform pg_temp.t_ok('positif', n = 1, 'Livreur : course disponible avec gain et montant à encaisser');
  select count(*) into n from public.orders where id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Livreur non affecté : ligne commande (téléphone client) non lisible');
  select count(*) into n from public.order_delivery_details where order_id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Livreur non affecté : adresse complète et GPS non lisibles');

  perform pg_temp.t_as(c);
  select count(*) into n from public.list_available_deliveries() d where d.order_id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Livreur-client : sa propre commande absente des courses disponibles');
  perform pg_temp.t_err('Livreur-client : accepter sa propre commande',
    format('select public.set_order_status(%L, ''en_livraison'')', o_gps), 'propre commande');
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Livreur-commerçant : accepter une commande de son commerce',
    format('select public.set_order_status(%L, ''en_livraison'')', o_gps), 'propre commande');

  perform pg_temp.t_as(l1);
  o := public.set_order_status(o_gps, 'en_livraison');
  perform pg_temp.t_ok('positif', o.status = 'en_livraison' and o.livreur_id = liv1 and o.livreur_name = 'Test L1' and o.accepted_at is not null,
                       'Livreur : acceptation -> en_livraison, identité imposée par la base');
  select count(*) into n from public.order_delivery_details where order_id = o_gps;
  perform pg_temp.t_ok('positif', n = 1, 'Livreur affecté en course : adresse, GPS et repère lisibles');
  select count(*) into n from public.orders where id = o_gps and client_phone = '+24177123456';
  perform pg_temp.t_ok('positif', n = 1, 'Livreur affecté en course : téléphone du client lisible');
  select count(*) into n from public.order_ledger where order_id = o_gps and event = 'attribution_livreur' and beneficiary_ref = liv1::text and amount = 2843;
  perform pg_temp.t_ok('positif', n = 1, 'Journal : part livraison attribuée au livreur');

  perform pg_temp.t_as(l2);
  perform pg_temp.t_err('Second livreur : course déjà prise',
    format('select public.set_order_status(%L, ''en_livraison'')', o_gps), 'introuvable');
  perform pg_temp.t_err('Second livreur : marquer livrée la course d''un autre',
    format('select public.set_order_status(%L, ''livree'')', o_gps), 'introuvable');
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Commerçant : marquer livrée',
    format('select public.set_order_status(%L, ''livree'')', o_gps), 'non autorisée');
  perform pg_temp.t_err('Commerçant : ajuster après départ',
    format('select public.adjust_order_amount(%L, 5100, ''prix du jour'')', o_gps), 'verrouillé');
  perform pg_temp.t_as(c);
  perform pg_temp.t_err('Client : annuler une commande en livraison',
    format('select public.set_order_status(%L, ''annulee'', ''trop long'')', o_gps), 'non autorisée');
  perform pg_temp.t_err('Client : encaissement',
    format('select public.record_payment(%L, ''solde'', ''especes'')', o_gps), 'Seul le livreur');

  perform pg_temp.t_as(l1);
  o := public.set_order_status(o_gps, 'livree');
  perform pg_temp.t_ok('positif', o.status = 'livree', 'Livreur affecté : en_livraison -> livree');
  select count(*) into n from public.order_delivery_details where order_id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Livreur après livraison : adresse et GPS de nouveau masqués');
  select count(*) into n from public.orders where id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Livreur après livraison : ligne commande (téléphone client) masquée');
  select count(*) into n from public.list_my_deliveries() d where d.order_id = o_gps and d.status = 'livree' and d.courier_gain = 2843;
  perform pg_temp.t_ok('positif', n = 1, 'Livreur : historique de ses courses sans téléphone ni adresse');
  o := public.record_payment(o_gps, 'solde', 'especes');
  select count(*) into n from public.order_ledger where order_id = o_gps and entry_type = 'encaissement' and amount = 8093 and beneficiary = 'livreur' and state = 'encaisse';
  perform pg_temp.t_ok('positif', o.payment_status = 'encaisse' and o.payment_method = 'especes' and n = 1, 'Livreur : solde encaissé (espèces) tracé au journal');
  perform pg_temp.t_err('Double encaissement', format('select public.record_payment(%L, ''solde'', ''especes'')', o_gps), 'déjà encaissé');

  -- ------------------------------------------------------------ D2. retrait sur stand
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Retrait : statut livraison refusé au commerçant',
    format('select public.set_order_status(%L, ''prete_a_livrer'')', o_pick), 'non autorisée');
  o := public.set_order_status(o_pick, 'prete_a_retirer');
  perform pg_temp.t_ok('positif', o.status = 'prete_a_retirer', 'Retrait : en_preparation -> prete_a_retirer');
  perform pg_temp.t_as(c);
  select status into strict r from public.orders where id = o_pick;
  perform pg_temp.t_ok('positif', r.status = 'prete_a_retirer', 'Client : voit que la commande est prête à retirer');
  perform pg_temp.t_as(l1);
  select count(*) into n from public.list_available_deliveries() d where d.order_id = o_pick;
  perform pg_temp.t_ok('negatif', n = 0, 'Retrait : jamais proposé aux livreurs');
  perform pg_temp.t_err('Livreur : prendre une commande retrait',
    format('select public.set_order_status(%L, ''en_livraison'')', o_pick), 'introuvable');
  perform pg_temp.t_as(mo);
  o := public.record_payment(o_pick, 'solde', 'moov_money');
  o := public.set_order_status(o_pick, 'retiree');
  perform pg_temp.t_ok('positif', o.status = 'retiree' and o.payment_status = 'encaisse', 'Retrait : encaissé puis retiree validée par le commerçant');
  perform pg_temp.t_err('Retrait : ajustement après retiree',
    format('select public.adjust_order_amount(%L, 4000, ''erreur'')', o_pick), 'verrouillé');

  -- ------------------------------------------------------------ annulations
  perform pg_temp.t_as(c);
  perform pg_temp.t_err('Client : annulation sans motif',
    format('select public.set_order_status(%L, ''annulee'')', o_nogps), 'Motif');
  o := public.set_order_status(o_nogps, 'annulee', 'Je me suis trompé');
  perform pg_temp.t_ok('positif', o.status = 'annulee' and o.cancelled_at is not null and o.cancel_reason = 'Je me suis trompé',
                       'Client : annulation en préparation avec motif');
  perform pg_temp.t_as(mo);
  select count(*) into n from public.order_ledger where order_id = o_nogps and event = 'annulation';
  select coalesce(sum(amount), 0) into v from public.order_ledger where order_id = o_nogps and entry_type in ('commande', 'livraison', 'commission');
  perform pg_temp.t_ok('positif', n = 3 and v = 0, 'Journal : annulation contre-passée (solde des créances = 0)');
  perform pg_temp.t_err('Commande annulée : plus de transition commerçant',
    format('select public.set_order_status(%L, ''prete_a_livrer'')', o_nogps), 'non autorisée');

  perform pg_temp.t_as(c);
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 4)),
                           'livraison', 's', '077123456', 'especes', 'adresse ok');
  o_adj4 := o.id;
  perform pg_temp.t_as(mo);
  o := public.set_order_status(o_adj4, 'prete_a_livrer');
  perform pg_temp.t_as(c);
  perform pg_temp.t_err('Client : annuler une commande prête (sans ajustement)',
    format('select public.set_order_status(%L, ''annulee'', ''changement'')', o_adj4), 'non autorisée');
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Commerçant : annulation sans motif',
    format('select public.set_order_status(%L, ''annulee'')', o_adj4), 'Motif');
  o := public.set_order_status(o_adj4, 'annulee', 'Rupture de stock');
  perform pg_temp.t_ok('positif', o.status = 'annulee' and o.cancel_reason = 'Rupture de stock', 'Commerçant : annulation avant départ avec motif');

  -- ------------------------------------------------------------ suspensions
  perform pg_temp.t_as(c);
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 1)),
                           'livraison', 's', '077123456', 'especes', 'adresse ok');
  o_adj3 := o.id;
  perform pg_temp.t_as(adm);
  update public.merchants set status = 'suspended' where id = ma;
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Commerçant suspendu : aucune transition',
    format('select public.set_order_status(%L, ''prete_a_livrer'')', o_adj3), 'suspendu');
  perform pg_temp.t_err('Commerçant suspendu : aucun ajustement',
    format('select public.adjust_order_amount(%L, 1400, ''prix'')', o_adj3), 'suspendu');
  perform pg_temp.t_as(adm);
  update public.merchants set status = 'approved' where id = ma;
  perform pg_temp.t_as(mo);
  o := public.set_order_status(o_adj3, 'prete_a_livrer');
  perform pg_temp.t_as(adm);
  update public.livreurs set status = 'suspended' where id = liv2;
  perform pg_temp.t_as(l2);
  perform pg_temp.t_err('Livreur suspendu : aucune transition',
    format('select public.set_order_status(%L, ''en_livraison'')', o_adj3), 'suspendu');
  perform pg_temp.t_err('Livreur suspendu : liste des courses refusée',
    'select * from public.list_available_deliveries()', 'approuvé requis');

  -- ------------------------------------------------------------ administrateur
  perform pg_temp.t_as(adm);
  perform pg_temp.t_err('Admin : correction sans motif',
    format('select public.set_order_status(%L, ''en_preparation'')', o_nogps), 'Motif obligatoire');
  perform pg_temp.t_err('Admin : statut incompatible avec le mode retrait',
    format('select public.set_order_status(%L, ''en_livraison'', ''test'')', o_pick), 'incompatible');
  o := public.set_order_status(o_nogps, 'en_preparation', 'Annulation par erreur, rétablie à la demande du client');
  select count(*) into n from public.order_status_history where order_id = o_nogps and actor_role = 'admin' and changed_by = adm and reason like 'Annulation par erreur%';
  select coalesce(sum(amount), 0) into v from public.order_ledger where order_id = o_nogps and entry_type in ('commande', 'livraison', 'commission');
  perform pg_temp.t_ok('positif', o.status = 'en_preparation' and o.cancelled_at is null and n = 1 and v = o.total,
                       'Admin : rétablit une commande annulée, motif tracé, créances reprises');
  j := public.admin_orders(p_statuses => array['livree'], p_merchant_id => ma::text);
  perform pg_temp.t_ok('positif', (j ->> 'total')::int = 1 and jsonb_array_length(j -> 'rows') = 1
                       and (j -> 'rows' -> 0 ->> 'id')::uuid = o_gps
                       and jsonb_array_length(j -> 'rows' -> 0 -> 'history') = 4
                       and (j -> 'rows' -> 0 -> 'delivery_details' ->> 'landmark') = 'Face à la pharmacie'
                       and (j -> 'rows' -> 0 -> 'livreur' ->> 'name') = 'Test L1',
                       'Admin : admin_orders filtré (statut, commerçant) avec historique, adresse, livreur');
  j := public.admin_orders(p_search => 'Test022', p_mode => 'retrait', p_limit => 1);
  perform pg_temp.t_ok('positif', (j ->> 'total')::int = 1 and (j -> 'rows' -> 0 ->> 'fulfillment_mode') = 'retrait'
                       and jsonb_array_length(j -> 'rows' -> 0 -> 'ledger') >= 2,
                       'Admin : recherche + filtre mode + pagination, journal inclus');
  perform pg_temp.t_as(c);
  perform pg_temp.t_err('Non-admin : admin_orders', 'select public.admin_orders()', 'administrateur');
  perform pg_temp.t_err('Non-admin : record_payout',
    format('select public.record_payout(%L, ''livreur'', ''commercant'', 100, ''especes'')', o_gps), 'administrateur');

  -- ------------------------------------------------------------ D1. ajustements
  perform pg_temp.t_as(c);
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 4)),
                           'livraison', 's', '077123456', 'especes', 'adresse ok');   -- 6000 F
  o_adj1 := o.id;
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 4)),
                           'livraison', 's', '077123456', 'especes', 'adresse ok');
  o_adj2 := o.id;
  perform pg_temp.t_err('Client : ajuster le montant',
    format('select public.adjust_order_amount(%L, 6100, ''x'')', o_adj1), 'Seul le commerçant');

  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Ajustement sans motif',
    format('select public.adjust_order_amount(%L, 6100, ''  '')', o_adj1), 'Motif obligatoire');
  o := public.adjust_order_amount(o_adj1, 6600, 'Tomates plus chères au marché ce matin');   -- +10 % pile
  perform pg_temp.t_ok('positif', o.subtotal = 6600 and o.service_fee = 330 and o.total = 6600 + 330 + 1500
                       and o.initial_subtotal = 6000 and o.adjustment_status = 'applique' and o.merchant_share = 6600,
                       'Ajustement +10 % appliqué directement, commission et total recalculés');
  select count(*) into n from public.order_amount_adjustments
   where order_id = o_adj1 and old_subtotal = 6000 and new_subtotal = 6600 and decision = 'applique' and requested_by = mo;
  perform pg_temp.t_ok('positif', n = 1, 'Historique d''ajustement (ancien, nouveau, motif, auteur)');
  select coalesce(sum(amount), 0) into v from public.order_ledger where order_id = o_adj1 and entry_type in ('commande', 'livraison', 'commission');
  perform pg_temp.t_ok('positif', v = o.total, 'Journal : écarts d''ajustement enregistrés (créances = nouveau total)');
  perform pg_temp.t_err('Second ajustement', format('select public.adjust_order_amount(%L, 6000, ''retour'')', o_adj1), 'une seule fois');

  o := public.adjust_order_amount(o_adj3, 1000, 'Tomates abîmées retirées');   -- baisse sur commande prête
  perform pg_temp.t_ok('positif', o.subtotal = 1000 and o.service_fee = 50 and o.adjustment_status = 'applique',
                       'Baisse toujours autorisée (commande prête, avant départ)');

  o := public.adjust_order_amount(o_adj2, 7800, 'Gros arrivage au prix fort');   -- +30 %
  perform pg_temp.t_ok('positif', o.subtotal = 6000 and o.total = 6000 + 300 + 1500 and o.adjustment_status = 'en_attente'
                       and o.proposed_subtotal = 7800,
                       'Ajustement +30 % : en attente du client, montant inchangé');
  perform pg_temp.t_err('Commande prête bloquée pendant l''attente',
    format('select public.set_order_status(%L, ''prete_a_livrer'')', o_adj2), 'en attente');
  perform pg_temp.t_err('Commerçant : répondre à sa propre demande',
    format('select public.respond_to_adjustment(%L, true)', o_adj2), 'introuvable');
  perform pg_temp.t_as(c);
  o := public.respond_to_adjustment(o_adj2, true);
  perform pg_temp.t_ok('positif', o.subtotal = 7800 and o.service_fee = 390 and o.total = 7800 + 390 + 1500 and o.adjustment_status = 'accepte',
                       'Client accepte : nouveau montant appliqué et recalculé');
  perform pg_temp.t_err('Répondre deux fois', format('select public.respond_to_adjustment(%L, false)', o_adj2), 'Aucun ajustement');

  -- refus puis annulation possible même commande prête
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p1, 'quantity', 2)),
                           'livraison', 's', '077123456', 'especes', 'adresse ok');   -- 3000 F
  o_adj1 := o.id;
  perform pg_temp.t_as(mo);
  o := public.set_order_status(o_adj1, 'prete_a_livrer');
  o := public.adjust_order_amount(o_adj1, 4500, 'Prix du marché');
  perform pg_temp.t_as(l1);
  select count(*) into n from public.list_available_deliveries() d where d.order_id = o_adj1;
  perform pg_temp.t_ok('negatif', n = 0, 'Course retirée de la liste livreur pendant l''attente d''accord');
  perform pg_temp.t_err('Livreur : accepter pendant l''attente d''accord',
    format('select public.set_order_status(%L, ''en_livraison'')', o_adj1), 'en attente');
  perform pg_temp.t_as(x);
  perform pg_temp.t_err('Tiers : répondre à l''ajustement', format('select public.respond_to_adjustment(%L, true)', o_adj1), 'introuvable');
  perform pg_temp.t_as(c);
  o := public.respond_to_adjustment(o_adj1, false);
  perform pg_temp.t_ok('positif', o.subtotal = 3000 and o.adjustment_status = 'refuse', 'Client refuse : montant initial conservé');
  o := public.set_order_status(o_adj1, 'annulee', 'Ajustement refusé');
  perform pg_temp.t_ok('positif', o.status = 'annulee', 'Après refus : le client peut annuler (même commande prête)');

  -- ------------------------------------------------------------ journaux et visibilité
  perform pg_temp.t_as(c);
  select count(*) into n from public.order_ledger where order_id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Client : journal financier non lisible');
  select count(*) into n from public.order_status_history where order_id = o_gps;
  perform pg_temp.t_ok('positif', n = 4, 'Client : historique des statuts lisible');
  perform pg_temp.t_err('Client : écrire dans le journal',
    format('insert into public.order_ledger (order_id, entry_type, event, amount, beneficiary, state, actor_role) values (%L, ''commande'', ''x'', 1, ''client'', ''du'', ''client'')', o_gps),
    'permission denied');
  perform pg_temp.t_as(mo);
  select count(*) into n from public.order_ledger where order_id = o_gps;
  perform pg_temp.t_ok('positif', n >= 5, 'Commerçant : journal de sa commande lisible');
  perform pg_temp.t_as(x);
  select count(*) into n from public.order_status_history where order_id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Tiers : historique non lisible');
  select count(*) into n from public.order_delivery_details where order_id = o_gps;
  perform pg_temp.t_ok('negatif', n = 0, 'Tiers : adresse non lisible');

  perform pg_temp.t_postgres();
  perform pg_temp.t_err('Journal append-only : UPDATE (même propriétaire)',
    format('update public.order_ledger set amount = 0 where order_id = %L', o_gps), 'ajout seul');
  perform pg_temp.t_err('Historique append-only : DELETE (même propriétaire)',
    format('delete from public.order_status_history where order_id = %L', o_gps), 'ajout seul');

  -- Trigger de garde : même si une policy et un droit UPDATE étaient rouverts par erreur.
  execute 'grant update on public.orders to authenticated';
  execute 'create policy t022_tmp on public.orders for update to authenticated using (true) with check (true)';
  perform pg_temp.t_as(mo);
  perform pg_temp.t_err('Trigger de garde : UPDATE direct du statut refusé',
    format('update public.orders set status = ''livree'' where id = %L', o_adj3), 'set_order_status');
  perform pg_temp.t_postgres();
  execute 'drop policy t022_tmp on public.orders';
  execute 'revoke update on public.orders from authenticated';

  -- ------------------------------------------------------------ paramètres, litiges, acompte
  perform pg_temp.t_as(c);
  begin
    update public.app_settings set value = 0 where key = 'service_fee_rate';
  exception when insufficient_privilege then null;
  end;
  select value into strict r from public.app_settings where key = 'service_fee_rate';
  perform pg_temp.t_ok('negatif', r.value = 0.05, 'Client : barème non modifiable');
  perform pg_temp.t_as(adm);
  update public.app_settings set value = 0.10 where key = 'deposit_rate';
  perform pg_temp.t_as(c);
  o := public.create_order(gen_random_uuid(), ma, jsonb_build_array(jsonb_build_object('product_id', p3, 'quantity', 2)),
                           'retrait', 's', '077123456', 'especes');
  perform pg_temp.t_ok('positif', o.total = 126000 and o.deposit_amount = 12600, 'Admin modifie le taux d''acompte : appliqué par la base aux nouvelles commandes');
  perform pg_temp.t_as(mo);
  o := public.record_payment(o_big, 'acompte', 'airtel_money');
  perform pg_temp.t_ok('positif', o.deposit_status = 'encaisse', 'Commerçant : acompte encaissé (Airtel Money)');
  perform pg_temp.t_as(c);
  insert into public.order_disputes (order_id, reason) values (o_gps, 'Un article manquait à la livraison');
  select count(*) into n from public.order_disputes where order_id = o_gps;
  perform pg_temp.t_ok('positif', n = 1, 'Client : ouvre un litige sur sa commande');
  perform pg_temp.t_as(x);
  perform pg_temp.t_err('Tiers : litige sur la commande d''autrui',
    format('insert into public.order_disputes (order_id, reason) values (%L, ''abus abus'')', o_gps), 'row-level security');

  -- ------------------------------------------------------------ reprise des données existantes
  perform pg_temp.t_postgres();
  select count(*) into n from public.orders where status = 'en_livraison' and livreur_id is null;
  perform pg_temp.t_ok('positif', n = 0, 'Reprise : aucune commande en_livraison sans livreur');
  select count(*) into n from public.orders oo
   where not exists (select 1 from public.order_status_history h where h.order_id = oo.id);
  perform pg_temp.t_ok('positif', n = 0, 'Reprise : chaque commande a un historique');
  select count(*) into n from public.orders where total <> subtotal - discount_amount + service_fee + delivery_fee;
  perform pg_temp.t_ok('positif', n = 0, 'Cohérence des montants sur toutes les commandes');
end $$;

reset role;
select kind, count(*) as nb from t_results group by kind
union all select 'total', count(*) from t_results
order by 1;
