-- 021 : complétude et corrections de la table official_prices (prix plafonds DGCCRF).
-- PRÉPARÉE, NON APPLIQUÉE. Voir docs/audits/AUDIT_PRIX_OFFICIELS.md.
--
-- Source : https://dgccrf.ga/echo-liste-produit (« Liste des 67 produits défiscalisés à prix bloqués »).
-- Le site était injoignable le 2026-10-18 (connexion refusée sur les ports 80 et 443).
-- Comparaison faite sur la copie archivée du 2026-01-15, identique à celle du 2025-06-23 :
--   http://web.archive.org/web/20260115121039/https://dgccrf.ga/echo-liste-produit
--
-- Produits manquants : AUCUN INSERT.
--   La page annonce 67 produits mais n'en publie que 60 (numéros 1 à 60). Le tableau
--   « Poisson de pêche locale (pêche artisanale) » est présent mais vide : aucun nom ni prix.
--   Les 7 produits manquants n'existent donc pas dans la source publiée et ne sont pas inventés ici.
--   Les ajouter seulement quand la DGCCRF publie leur désignation et leurs prix (ou à partir de l'arrêté).
--
-- Prix : les 60 lignes ont les mêmes prix gros, demi-gros et détail que la source. Aucune correction de prix.
--
-- Corrections de catégorie prouvées (intitulés de tableau de la source) :
--   n° 3  « Rognons emballage bloc » : tableau « VIANDE DE BOEUF », pas « Viande de porc ».
--   n° 10 à 12 : tableau « POISSON » ; le mot « surgelé » n'apparaît pas dans la source.

begin;

update public.official_prices
   set categorie = 'Viande de bœuf'
 where numero = 3
   and designation = 'Rognons emballage bloc'
   and categorie = 'Viande de porc';

update public.official_prices
   set categorie = 'Poisson'
 where numero in (10, 11, 12)
   and categorie = 'Poisson surgelé';

-- Contrôle : la table doit toujours contenir exactement les 60 produits publiés, sans doublon de numéro.
do $$
declare
  n int;
  d int;
begin
  select count(*), count(distinct numero) into n, d from public.official_prices;
  if n <> 60 or d <> 60 then
    raise exception 'official_prices : % lignes / % numéros distincts, 60 attendus', n, d;
  end if;
end;
$$;

commit;
