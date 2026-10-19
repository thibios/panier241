-- 025 : produits Bâti Plus relevés sur factures et devis réels (transmis par le propriétaire le 19/10/2026).
-- PRIX DU MAGASIN (Bâti Plus Oloumi), TTC, PAS des prix officiels DGCCRF (aucun de ces articles n'est dans official_prices).
-- Sources : factures LA260058226 (29/09/2026), FA260019051 et FA260019052 (30/09/2026) : PU TTC imprimé ;
--           devis DEV260089357 et DEV260089228 (15/10/2026, valables jusqu'au 14/11/2026) : PU HT x 1,19 (TVA 18 % + CSS 1 %).
-- Quand un article figure sur une facture et sur un devis, le prix le plus récent (devis du 15/10) est retenu.
-- Aucune donnée client des documents n'est enregistrée. Aucun produit existant n'est modifié ni supprimé.
-- Rejouable : un produit (nom + variante) déjà présent chez Bâti Plus n'est pas réinséré.

do $$
declare
  v_merchant uuid;
begin
  select id into v_merchant from public.merchants
   where market_id = 'mkt-bati-plus' and status = 'approved' and not is_demo;
  if v_merchant is null then
    raise exception '025 : commerçant Bâti Plus introuvable';
  end if;

  insert into public.products (merchant_id, name, variant_label, price, unit, category, subcategory_id, product_type, attributes)
  select v_merchant, x.name, x.variant, x.price, x.unit, 'bricolage', x.sub, x.ptype, x.attrs::jsonb
  from (values
  ('Tube PVC gris évacuation (importé)', 'Diamètre 32', 4900, 'tube', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"19579"}', 'facture FA260019052 du 30/09/2026'),
  ('Coude PVC 87° MF', 'D32', 300, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"17051"}', 'facture FA260019052 du 30/09/2026'),
  ('Coude PVC 87° MF', 'D40', 500, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"17052"}', 'devis DEV260089357 du 15/10/2026'),
  ('Collier de fixation PVC', 'Diamètre 32 (CNM32G)', 600, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"33140"}', 'facture FA260019052 du 30/09/2026'),
  ('Colle PVC Gebsoplast', 'Boîte 500 ml', 7400, 'boîte', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"10772"}', 'facture FA260019052 du 30/09/2026'),
  ('Colle PVC Gebsoplast', 'Gel, boîte 1 L', 14400, 'boîte', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"10773"}', 'devis DEV260089357 du 15/10/2026'),
  ('Réduction PVC excentrée', '40/32', 900, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"17103"}', 'devis DEV260089357 du 15/10/2026'),
  ('Raccord extensible SP100', 'D32 x 1"1/4', 3900, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"17169"}', 'facture FA260019051 du 30/09/2026'),
  ('Jeu de fixation lavabo et chauffe-eau', 'L12 (R/AF5012)', 1350, 'jeu', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"17845"}', 'facture FA260019051 du 30/09/2026'),
  ('Coude égal FF PPR 90°', '32 mm (P36)', 325, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"35733"}', 'devis DEV260089357 du 15/10/2026'),
  ('Té égal PPR', '32 mm (P48)', 425, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"35867"}', 'devis DEV260089357 du 15/10/2026'),
  ('Manchon FF PPR', '32 mm (P15)', 225, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"35745"}', 'devis DEV260089357 du 15/10/2026'),
  ('Mamelon laiton MM', '1/2"', 1075, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"16676"}', 'devis DEV260089357 du 15/10/2026'),
  ('Pack WC blanc Ekla Ideo, sortie droite (complet)', 'W4201', 195000, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"37800"}', 'devis DEV260089357 du 15/10/2026'),
  ('Ensemble de douche Mistral avec mitigeur', 'BZ8813-3C (Rousseau)', 93000, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"28186"}', 'devis DEV260089357 du 15/10/2026'),
  ('Brosse WC chromée', 'TN9205', 18000, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"39524"}', 'devis DEV260089357 du 15/10/2026'),
  ('Porte-rouleau papier toilette chromé', 'TN9208', 14500, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"39525"}', 'devis DEV260089357 du 15/10/2026'),
  ('Porte-serviette rond', 'RED-002', 18000, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"37361"}', 'devis DEV260089357 du 15/10/2026'),
  ('Miroir LED 60 x 80 cm', 'SPB126080_60', 64000, 'pièce', 'bricolage-plomberie', 'Plomberie', '{"ref_batiplus":"36992"}', 'devis DEV260089357 du 15/10/2026'),
  ('Câble R2V 3 x 6 mm² (Touret)', 'Au mètre', 3600, 'm', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"10993","section":6}', 'devis DEV260089228 du 15/10/2026'),
  ('Câble de terre mono nu 16 mm²', 'Au mètre', 2700, 'm', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"11068","section":16}', 'devis DEV260089228 du 15/10/2026'),
  ('Scotch électricien noir', '18 mm, épaisseur 0,19 mm', 600, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"36110"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur Easy9 1P+N courbe C 4,5 kA', '10 A', 5750, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26617"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur Easy9 1P+N courbe C 4,5 kA', '20 A', 5400, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26717"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur mini bipolaire Acti9 iK60N courbe C 6 kA', '16 A', 9200, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"32252"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur bipolaire iC60N courbe C 400 V', '40 A (A9F79240)', 23000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26665"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur différentiel 30 mA P/N', '16 A', 89000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"13458"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur différentiel 30 mA P/N', '25 A', 75300, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"13460"}', 'devis DEV260089228 du 15/10/2026'),
  ('Disjoncteur différentiel 30 mA P/N', '32 A', 78500, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"13461"}', 'devis DEV260089228 du 15/10/2026'),
  ('Parafoudre 1P+N 40 kA 230 V', 'IPRD40R', 200000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26713"}', 'devis DEV260089228 du 15/10/2026'),
  ('Télérupteur bipolaire 16 A 230 V', 'A9C15507', 46500, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26923"}', 'devis DEV260089228 du 15/10/2026'),
  ('Répartiteur tétrapolaire 4 barreaux', '100 A', 25500, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"13389"}', 'devis DEV260089228 du 15/10/2026'),
  ('Peigne pour disjoncteurs 1P+N DT40', '6 modules', 10500, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26671"}', 'devis DEV260089228 du 15/10/2026'),
  ('Barrette de terre à coupure sur platine', null, 18500, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"13727"}', 'devis DEV260089228 du 15/10/2026'),
  ('Interrupteur encastré Cubic blanc', 'Va-et-vient (E60)', 2250, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26074"}', 'devis DEV260089228 du 15/10/2026'),
  ('Interrupteur encastré Cubic blanc', 'Simple allumage (E62)', 2000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26073"}', 'devis DEV260089228 du 15/10/2026'),
  ('Interrupteur encastré Cubic blanc', 'Double va-et-vient', 3750, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26075"}', 'devis DEV260089228 du 15/10/2026'),
  ('Interrupteur encastré Cubic blanc', 'Poussoir rond lumineux', 4700, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26072"}', 'devis DEV260089228 du 15/10/2026'),
  ('Prise encastrée Cubic blanc', '2P+T', 3400, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26069"}', 'devis DEV260089228 du 15/10/2026'),
  ('Prise encastrée Cubic blanc', 'RJ45 cat. 6 FTP', 6450, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"29820"}', 'devis DEV260089228 du 15/10/2026'),
  ('Prise 2P+T Plexo étanche IP55 250 V', null, 10000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"14089"}', 'devis DEV260089228 du 15/10/2026'),
  ('Applique de douche avec interrupteur et prise 2P+T', null, 23000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"14049"}', 'devis DEV260089228 du 15/10/2026'),
  ('Applique plafonnier Scalea1 E27 1 x 60 W', 'Acier blanc', 14000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"31676"}', 'devis DEV260089228 du 15/10/2026'),
  ('Applique Liva 1 x E27', null, 13000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"39572"}', 'devis DEV260089228 du 15/10/2026'),
  ('Hublot rond étanche en verre E27', null, 4600, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"13174"}', 'devis DEV260089228 du 15/10/2026'),
  ('Lampe LED A60 E27 11 W', 'Blanc', 1800, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"34686"}', 'devis DEV260089228 du 15/10/2026'),
  ('Tube LED Linolite 0,40 m 6 W', 'Blanc', 3250, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"31920"}', 'devis DEV260089228 du 15/10/2026'),
  ('Panel LED 60 x 60 cm 40 W', 'Blanc (LEDCD40B)', 36000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"35036"}', 'devis DEV260089228 du 15/10/2026'),
  ('Cadre de montage apparent pour panel 60 x 60', null, 13600, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"34965"}', 'devis DEV260089228 du 15/10/2026'),
  ('Détecteur de fumée Kidde avec sirène intégrée', '29FR', 20000, 'pièce', 'bricolage-electricite', 'Électricité', '{"ref_batiplus":"26393"}', 'devis DEV260089228 du 15/10/2026'),
  ('Cheville plastique', '8 mm (E31), paquet', 1120, 'paquet', 'bricolage-quincaillerie', 'Outillage', '{"ref_batiplus":"13048"}', 'devis DEV260089228 du 15/10/2026'),
  ('Cheville plastique', '12 mm, paquet de 50', 1600, 'paquet', 'bricolage-quincaillerie', 'Outillage', '{"ref_batiplus":"13050"}', 'facture FA260019052 du 30/09/2026'),
  ('Patte à vis à bois', '6 x 40 mm, à la pièce', 50, 'pièce', 'bricolage-quincaillerie', 'Outillage', '{"ref_batiplus":"32785"}', 'facture FA260019052 du 30/09/2026'),
  ('Tire-fond A2', '8 x 60 mm, paquet de 100', 12500, 'paquet', 'bricolage-quincaillerie', 'Outillage', '{"ref_batiplus":"20624"}', 'facture FA260019052 du 30/09/2026'),
  ('Vis Rocket tête fraisée Pozi', '4 x 50 mm, paquet de 500', 18300, 'paquet', 'bricolage-quincaillerie', 'Outillage', '{"ref_batiplus":"20646"}', 'devis DEV260089228 du 15/10/2026'),
  ('Enduit Fibacryl souple', '1 kg', 13900, 'pièce', 'bricolage-peinture', 'Peinture', '{"ref_batiplus":"25248"}', 'facture LA260058226 du 29/09/2026'),
  ('Ciment colle Sikaceram 103/100 blanc', 'Sac de 25 kg', 10700, 'sac', 'bricolage-carrelage', 'Ciment', '{"ref_batiplus":"25073"}', 'facture FA260019051 du 30/09/2026')
  ) as x(name, variant, price, unit, sub, ptype, attrs, source)
  where not exists (
    select 1 from public.products p
    where p.merchant_id = v_merchant and p.name = x.name and p.variant_label is not distinct from x.variant
  );
end $$;
