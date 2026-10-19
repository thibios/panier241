-- 024 : forfait de livraison sans GPS porté à 2 000 F au total (décision du propriétaire, 19/10/2026).
-- Le forfait n'est plus inférieur à la partie fixe avec GPS (2 000 F + 300 F/km) : un client n'a plus
-- intérêt à masquer sa position. Les commandes déjà créées gardent leurs montants.
-- Côté front, l'estimation (src/lib/pricing.ts, FALLBACK_DELIVERY_FEE) est alignée dans le même commit.

update public.app_settings
   set value = 2000,
       label = 'Livraison sans GPS : forfait total (F CFA)'
 where key = 'delivery_fallback_fee';

do $$
begin
  if (select value from public.app_settings where key = 'delivery_fallback_fee') <> 2000 then
    raise exception '024 : forfait sans GPS non mis à jour';
  end if;
end $$;
