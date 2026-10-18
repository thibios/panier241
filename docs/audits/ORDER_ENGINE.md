# Moteur de commande serveur (migration 022)

Fichiers : `supabase/022_order_engine.sql`, `supabase/tests/022_order_engine_tests.sql`.
État : **non appliquée en production**. Prérequis : 020 appliquée (`merchants.is_demo`, note par défaut 0) ; les policies de 020 ne sont pas modifiées.
Tests : 114 assertions (45 positives, 69 négatives), toutes passées le 18/10/2026 dans une transaction annulée sur la base de production (`ukaauidavtmtjithahmn`, état post-020). Vérifié ensuite : aucune table, fonction ou donnée de test restante.
Front prêt pour 022 (non déployé) : `npm run build` passe. Il ne fonctionne PAS sans 022 (colonnes et RPC absentes) : voir section 6.

Montants manipulés : prix du magasin (`products.price`), jamais le prix officiel DGCCRF.

## 1. Barème (`app_settings`, modifiable par l'admin seulement)

| Clé | Valeur | Rôle |
|---|---|---|
| `delivery_base_fee` | 2000 | Livraison avec GPS : partie fixe |
| `delivery_rate_per_km` | 300 | Livraison avec GPS : par km (haversine depuis `market_locations`) |
| `delivery_fallback_fee` | 1500 | Livraison sans GPS (lieu ou adresse) : **forfait total** (confirmé) |
| `service_fee_rate` | 0.05 | Commission plateforme sur le sous-total |
| `deposit_threshold` | 100000 | Acompte dû si le **total** dépasse ce seuil |
| `deposit_rate` | 0.05 | Acompte = 5 % du total (confirmé) |
| `adjustment_auto_max_rate` | 0.10 | Ajustement commerçant appliqué sans accord jusqu'à +10 % |

À faire côté front (étape suivante) : `src/lib/pricing.ts` calcule encore 2000 + 1500 sans GPS ; il doit devenir un simple affichage d'estimation, aligné sur ces valeurs (lecture de `app_settings`).

`market_locations` : coordonnées des 4 lieux de `src/data/markets.ts`. Les autres marchés (Oloumi, Nkembo, Akébé, marchés ajoutés) n'ont pas de coordonnées : forfait sans GPS.

## 2. Tables

| Table | Contenu | Écriture | Lecture |
|---|---|---|---|
| `orders` (colonnes ajoutées) | `fulfillment_mode`, `discount_amount`, `merchant_share`/`courier_share`/`platform_share` (calculées), `deposit_amount`/`deposit_status`, `payment_method`/`payment_status`, `initial_subtotal`, `adjustment_status`/`proposed_subtotal`, `accepted_at`, `updated_at`, `client_request_id` (unique par client) | fonctions seulement (INSERT/UPDATE/DELETE révoqués) | inchangée pour client et commerçant ; livreur : **sa course en cours seulement** (`en_livraison`) |
| `order_delivery_details` | adresse complète, GPS, repère | `create_order` | client, commerçant, admin ; livreur affecté seulement en `prete_a_livrer`/`en_livraison` |
| `order_status_history` | ancien/nouveau statut, auteur, rôle, événement, motif, date (trigger, append-only) | trigger | participants de la commande |
| `order_ledger` | journal financier append-only : commande, livraison, commission, acompte, encaissement, reversement, bénéficiaire, moyen, état | triggers + fonctions | commerçant, livreur affecté, admin |
| `order_amount_adjustments` | un ajustement par commande (ancien, nouveau, motif, auteur, décision) | fonctions | client, commerçant, admin |
| `order_disputes` | litiges minimaux (sans interface) | participant : création ; admin : traitement | auteur, admin |

Contraintes ajoutées : total = sous-total − réduction + commission + livraison ; statuts cohérents avec le mode ; retrait sans livreur ni frais.

Corrections complémentaires :
- **Idempotence** : `create_order` exige `p_client_request_id` ; un second appel avec le même identifiant (double clic, nouvel essai réseau, appels simultanés) renvoie la commande déjà créée, sans en créer une autre. Le front génère un identifiant par tentative et le renouvelle dès que le panier, le créneau, l'adresse, le paiement ou le repère changent.
- **Notes** : trigger `lock_merchant_rating` : `rating` et `review_count` ne changent plus par l'API hors administrateur ; seul le recalcul depuis `reviews` (020) les modifie. Policies de 020 inchangées.
- **Données du client côté livreur** (choix : masquage immédiat, plutôt qu'un délai de 24 h) : le livreur ne lit la ligne `orders` (téléphone compris) et `order_delivery_details` (adresse, GPS, repère) que pendant sa course `en_livraison`. Dès `livree` ou `annulee`, il ne voit plus que `list_my_deliveries()` (enseigne, zone, statut, gain, total, paiement), sans téléphone ni adresse.

## 3. Machine à états (`set_order_status`)

| De → Vers | Client | Commerçant approuvé | Livreur approuvé | Admin |
|---|---|---|---|---|
| en_preparation → annulee | oui, motif | oui, motif | — | oui, motif |
| en_preparation → prete_a_livrer (livraison) | — | oui | — | oui |
| en_preparation → prete_a_retirer (retrait) | — | oui | — | oui |
| prete_a_livrer → en_livraison | — | — | accepte (pas sa commande ni celle de son commerce) | oui |
| prete_a_livrer / prete_a_retirer → annulee | seulement si ajustement en attente ou refusé | oui, motif | — | oui |
| en_livraison → livree | — | — | livreur affecté seulement | oui |
| prete_a_retirer → retiree | — | oui | — | oui |
| tout → tout | — | — | — | oui, motif obligatoire, cohérent avec le mode |

Commerçant ou livreur suspendu : aucune transition. Ajustement en attente : ni « prête », ni acceptation, ni « retirée ». Reprise des données : `en_livraison` sans livreur → `prete_a_livrer` (2 commandes ce jour), un historique `reprise_migration_022` par commande, montants existants repris au journal tels quels.

## 4. Contrat RPC pour le front

| Fonction | Paramètres | Retour | Remplace |
|---|---|---|---|
| `create_order` | `p_client_request_id uuid (obligatoire), p_merchant_id uuid, p_items jsonb [{product_id|variant_id, quantity}], p_mode 'livraison'|'retrait', p_slot_label, p_phone, p_payment_method 'airtel_money'|'moov_money'|'especes', p_address?, p_lat?, p_lng?, p_landmark?, p_address_label?, p_shopping_video_url?` | ligne `orders` | `supabase.from('orders').insert` (OrdersContext) |
| `set_order_status` | `p_order_id, p_new_status, p_reason?` | ligne `orders` | `update({status})` (MerchantSpace, CourierSpace, cancelOrder) et l'acceptation livreur |
| `adjust_order_amount` | `p_order_id, p_new_subtotal, p_reason` | ligne `orders` | `update({subtotal,...})` de MerchantSpace (bloqué en silence aujourd'hui) |
| `respond_to_adjustment` | `p_order_id, p_accept` | ligne `orders` | nouveau (écran client) |
| `record_payment` | `p_order_id, p_part 'solde'|'acompte', p_method` | ligne `orders` | nouveau |
| `list_available_deliveries` | — | lignes sans téléphone ni adresse complète (gain, montant à encaisser, zone) | `select ... eq('status','en_livraison').is('livreur_id', null)` (CourierSpace) |
| `list_my_deliveries` | — | historique des courses du livreur, sans téléphone ni adresse | `select ... not('livreur_id','is',null)` (CourierSpace) |
| `admin_orders` | recherche, statuts[], mode, dates, commerçant, livreur, limit ≤ 200, offset | `{total, rows[]}` avec client, commerçant, livreur, adresse, historique, journal, ajustements, litiges | nouveau |
| `record_payout` (admin) | commande, de, vers, montant, moyen, note | id d'écriture | nouveau |

Erreurs : messages en français, codes `42501` (droit), `22023` (saisie), `55000` (état), `P0002` (introuvable).
Type front : `OrderStatus` doit inclure `prete_a_livrer`, `prete_a_retirer`, `retiree`.

## 5. Front adapté (prêt, non déployé)

| Fichier | Changement |
|---|---|
| `src/lib/pricing.ts` | Barème d'ESTIMATION aligné : 2 000 F + 300 F/km avec GPS, forfait total 1 500 F sans GPS, 0 F en retrait, 5 %, acompte 5 % du total au-delà de 100 000 F |
| `src/lib/orderEngine.ts` (nouveau) | Colonnes lues, conversion des lignes, libellés de statut, codes de paiement, identifiant de tentative, traduction des erreurs en français |
| `src/types/index.ts` | `OrderStatus` à 7 valeurs, champs mode/acompte/paiement/ajustement sur `Order`, `OrderDeliveryDetails` |
| `src/context/CartContext.tsx` | Mode déduit du créneau (retrait sur stand = 0 F), acompte estimé |
| `src/context/OrdersContext.tsx` | `placeOrder` (create_order), `cancelOrder` (set_order_status), `respondToAdjustment`, `fetchHistory` |
| `src/pages/Cart.tsx` | Appel `create_order` avec identifiant de tentative ; retrait : ni adresse ni GPS ; point de repère ; acompte affiché ; erreurs serveur affichées ; montants marqués « estimés » |
| `src/pages/DeliverySlot.tsx` | Adresse non exigée pour un retrait |
| `src/pages/Orders.tsx` | Nouveaux statuts, frise livraison ou retrait, bandeau d'ajustement Accepter / Refuser, annulation par RPC, historique des statuts, détail des montants, acompte, paiement |
| `src/pages/MerchantSpace.tsx` | Transitions autorisées seulement (prête, prête à retirer, remise au client, annulation avec motif), ajustement par RPC (motif obligatoire, seuil +10 % expliqué), encaissement acompte et retrait, erreurs de la base affichées |
| `src/pages/CourierSpace.tsx` | « Disponibles » via `list_available_deliveries` (jamais de retrait), mission : adresse complète, repère, lien carte GPS, appel client ; livrée et paiement par RPC ; historique via `list_my_deliveries` |
| `src/components/admin/AdminOrders.tsx` (nouveau) + `src/pages/AdminSpace.tsx` | Module Commandes via `admin_orders` (recherche, filtres statut/mode/dates/commerçant/livreur, pagination, dossier complet, correction de statut avec motif) ; erreurs de la base affichées (ex. approbation refusée d'un commerçant démo) |
| `src/components/ui/StatusBadge.tsx`, `OrderProgress.tsx` | Libellés des 7 statuts (badge rectangulaire, plus de pilule), frise retrait |

Impacts si 022 est appliquée SANS ce front : création, annulation, « prête », acceptation livreur et ajustement échouent ; la liste « Disponibles » est vide. Si le front est déployé SANS 022 : la lecture des commandes et toutes les RPC échouent. Les deux vont ensemble.

## 6. Procédure d'application conjointe

1. Vérifier que 020 est appliquée ; prévenir les commerçants et livreurs d'une coupure de quelques minutes ; idéalement aucune commande en cours de saisie.
2. Appliquer `supabase/022_order_engine.sql` (une transaction ; elle échoue en entier en cas de problème).
3. Immédiatement après, pousser le front (build de cette branche) sur Vercel.
4. Rejouer `supabase/tests/022_order_engine_tests.sql` dans `begin; ... rollback;` et vérifier qu'aucune donnée de test ne reste.

Vérifications manuelles après déploiement (comptes réels de test, puis suppression des commandes de test par l'admin) :
- Client : commande en livraison avec GPS (total = estimation), sans GPS (forfait 1 500 F), en retrait (0 F, pas d'adresse) ; double clic sur « Passer la commande » = une seule commande ; commande > 100 000 F : acompte affiché.
- Client : annulation en préparation (motif) ; refus puis acceptation d'un ajustement > +10 % ; historique visible ; « Prête à retirer » visible pour un retrait.
- Commerçant : prête / prête à retirer / remise au client ; ajustement ≤ +10 % appliqué, > +10 % en attente ; annulation avec motif ; compte suspendu : actions refusées avec message.
- Livreur : la commande prête apparaît (sans téléphone ni adresse) ; acceptation ; adresse, repère, lien carte et téléphone visibles ; livrée ; ensuite plus de téléphone ni d'adresse ; retrait jamais proposé ; sa propre commande jamais proposée.
- Admin : module Commandes (filtres, pagination, détail, journal) ; correction de statut avec motif ; approbation d'un commerçant démo refusée avec message.
- Barème : modifier `deposit_rate` dans `app_settings` puis le remettre ; l'estimation du front reste à 5 % (constantes de `pricing.ts`) : la réaligner si le barème change.

## 7. Retour arrière

```sql
begin;
drop function if exists public.create_order(uuid, uuid, jsonb, text, text, text, text, text, double precision, double precision, text, text, text),
  public.set_order_status(uuid, text, text), public.adjust_order_amount(uuid, integer, text),
  public.respond_to_adjustment(uuid, boolean), public.record_payment(uuid, text, text),
  public.record_payout(uuid, text, text, integer, text, text), public.list_available_deliveries(), public.list_my_deliveries(),
  public.admin_orders(text, text[], text, timestamptz, timestamptz, text, uuid, integer, integer),
  public.order_engine_apply_subtotal(uuid, integer, text), public.order_engine_deposit(integer),
  public.order_engine_commission(integer), public.order_engine_set_ctx(text, text, text);
drop trigger if exists order_audit on public.orders;
drop trigger if exists guard_order_direct_write on public.orders;
drop policy if exists "Le livreur voit sa course en cours" on public.orders;
drop trigger if exists lock_merchant_rating on public.merchants;
-- Statuts : retour aux 4 valeurs (perte du distinguo retrait, conservé dans order_status_history si on garde la table)
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders drop constraint if exists orders_mode_status_consistent;
alter table public.orders drop constraint if exists orders_pickup_without_courier;
alter table public.orders drop constraint if exists orders_amounts_consistent;
alter table public.orders disable trigger protect_order_columns;
update public.orders set status = 'en_livraison' where status = 'prete_a_livrer';
update public.orders set status = 'en_preparation' where status = 'prete_a_retirer';
update public.orders set status = 'livree' where status = 'retiree';
alter table public.orders enable trigger protect_order_columns;
alter table public.orders add constraint orders_status_check check (status in ('en_preparation','en_livraison','livree','annulee'));
-- Puis rejouer les sections 1 à 4 de 014 et la section 1 de 016 (policies insert/update orders, policy livreur,
-- protect_order_columns), et la policy avis de 014 section 5.
grant insert, update on public.orders to authenticated;
commit;
```

Retour arrière du front : redéployer la version Vercel précédente en même temps.

Les tables d'audit (`order_status_history`, `order_ledger`, `order_amount_adjustments`, `order_disputes`, `order_delivery_details`), `app_settings`, `market_locations` et les colonnes ajoutées peuvent être conservées (inertes) pour ne perdre aucune trace ; les supprimer seulement après export.

## 8. Risques et points ouverts

- Coupure fonctionnelle si la base et le front ne sont pas déployés ensemble (sections 5 et 6).
- **Limite connue (non corrigée)** : les coordonnées GPS viennent de l'adresse enregistrée par le client ; un client peut déclarer une position plus proche pour réduire ses frais (au plus jusqu'à 2 000 F, ou choisir l'absence de GPS : forfait 1 500 F). Aucune vérification serveur n'est possible sans géocodage.
- Le forfait sans GPS (1 500 F) est inférieur à la livraison avec GPS de base (2 000 F) : un client a intérêt à ne pas donner sa position (décision du propriétaire, à surveiller).
- Les constantes de `src/lib/pricing.ts` dupliquent `app_settings` pour l'estimation : à réaligner si l'admin change le barème.
- Le bénéficiaire de l'acompte est le commerçant (recommandation D4 du PRD) ; le reversement est saisi par l'admin (`record_payout`, sans écran pour l'instant).
- Les marchés sans coordonnées dans `market_locations` (Oloumi, Nkembo, Akébé, marchés ajoutés) appliquent toujours le forfait.
