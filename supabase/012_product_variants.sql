-- Panier 241 — variantes de produits (tailles, diametres, formats...)
-- A executer dans Supabase : Dashboard > SQL Editor > New query > Run
--
-- Chaque produit eclate en variantes garde son id d'origine pour UNE des
-- variantes (update en place, plutot que delete+insert) : un panier deja en
-- cours referencant l'ancien produit continue de pointer vers une ligne
-- valide. Les autres variantes sont de nouvelles lignes. `in (select ...)`
-- est utilise plutot que `= (select ...)` pour ne jamais lever d'erreur si
-- un nom de marchand devait un jour ne plus etre unique.

alter table public.products add column variant_label text;

-- 1. Bati Plus Gabon
update public.products set name = 'Fer à béton', variant_label = '12mm'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Fer à béton 12mm';

update public.products set name = 'Sac de ciment', variant_label = '50kg'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Sac de ciment 50kg';

update public.products set name = 'Câble électrique (100m)', variant_label = '2.5mm²'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Câble électrique 2.5mm (100m)';

update public.products set variant_label = 'Gris'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Carrelage sol 60x60';

update public.products set variant_label = 'Blanc'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Peinture murale 20L';

update public.products set variant_label = 'Mitigeur douche'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Robinetterie Hansgrohe';

update public.products set name = 'Groupe électrogène', variant_label = '3.5kVA'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Groupe électrogène 3.5kVA';

update public.products set variant_label = '1000W'
where merchant_id in (select id from public.merchants where name = 'Bâti Plus Gabon') and name = 'Perceuse électroportative';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Bâti Plus Gabon') m,
(values
  ('Fer à béton', 'bricolage', 2200, 'barre', '🏗️', '6mm'),
  ('Fer à béton', 'bricolage', 2800, 'barre', '🏗️', '8mm'),
  ('Fer à béton', 'bricolage', 3500, 'barre', '🏗️', '10mm'),
  ('Fer à béton', 'bricolage', 5800, 'barre', '🏗️', '14mm'),
  ('Fer à béton', 'bricolage', 7200, 'barre', '🏗️', '16mm'),
  ('Sac de ciment', 'bricolage', 3200, 'sac', '🧱', '25kg'),
  ('Câble électrique (100m)', 'bricolage', 18000, 'rouleau', '🔌', '1.5mm²'),
  ('Câble électrique (100m)', 'bricolage', 62000, 'rouleau', '🔌', '6mm²'),
  ('Carrelage sol 60x60', 'bricolage', 8500, 'm²', '🔲', 'Beige'),
  ('Carrelage sol 60x60', 'bricolage', 9200, 'm²', '🔲', 'Blanc'),
  ('Peinture murale 20L', 'bricolage', 47000, 'seau', '🎨', 'Gris clair'),
  ('Peinture murale 20L', 'bricolage', 47000, 'seau', '🎨', 'Beige'),
  ('Robinetterie Hansgrohe', 'bricolage', 65000, 'pièce', '🚿', 'Mitigeur lavabo'),
  ('Robinetterie Hansgrohe', 'bricolage', 95000, 'pièce', '🚿', 'Mitigeur cuisine'),
  ('Groupe électrogène', 'bricolage', 220000, 'pièce', '⚡', '2kVA'),
  ('Groupe électrogène', 'bricolage', 520000, 'pièce', '⚡', '5kVA'),
  ('Perceuse électroportative', 'bricolage', 35000, 'pièce', '🛠️', '500W'),
  ('Perceuse électroportative', 'bricolage', 45000, 'pièce', '🛠️', '750W')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 2. CECADO
update public.products set name = 'Riz importé', variant_label = '25kg'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Riz importé 25kg';

update public.products set name = 'Huile de cuisine', variant_label = '5L'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Huile de cuisine 5L';

update public.products set name = 'Eau minérale', variant_label = '1.5L'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Eau minérale 1.5L';

update public.products set name = 'Lessive en poudre', variant_label = '1kg'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Lessive en poudre 1kg';

update public.products set name = 'Papier toilette', variant_label = 'pack de 6'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Papier toilette (pack de 6)';

update public.products set variant_label = 'Neutre'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Savon de toilette';

update public.products set name = 'Jus de fruit', variant_label = 'Orange'
where merchant_id in (select id from public.merchants where name = 'CECADO') and name = 'Jus de fruit 1L';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'CECADO') m,
(values
  ('Riz importé', 'epicerie', 4000, 'sac', '🍚', '5kg'),
  ('Riz importé', 'epicerie', 7500, 'sac', '🍚', '10kg'),
  ('Riz importé', 'epicerie', 34000, 'sac', '🍚', '50kg'),
  ('Huile de cuisine', 'epicerie', 2200, 'bidon', '🫙', '1L'),
  ('Huile de cuisine', 'epicerie', 4200, 'bidon', '🫙', '2L'),
  ('Eau minérale', 'epicerie', 300, 'bouteille', '💧', '0.5L'),
  ('Eau minérale', 'epicerie', 1800, 'bouteille', '💧', '5L'),
  ('Lessive en poudre', 'epicerie', 4500, 'paquet', '🧴', '3kg'),
  ('Lessive en poudre', 'epicerie', 7000, 'paquet', '🧴', '5kg'),
  ('Papier toilette', 'epicerie', 4000, 'pack', '🧻', 'pack de 12'),
  ('Savon de toilette', 'epicerie', 900, 'unité', '🧼', 'Lavande'),
  ('Savon de toilette', 'epicerie', 900, 'unité', '🧼', 'Citron'),
  ('Jus de fruit', 'epicerie', 1500, 'bouteille', '🧃', 'Ananas'),
  ('Jus de fruit', 'epicerie', 1500, 'bouteille', '🧃', 'Mangue')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 3. Épicerie Traditionnelle Akébé
update public.products set variant_label = '1kg', price = 900
where merchant_id in (select id from public.merchants where name = 'Épicerie Traditionnelle Akébé') and name = 'Riz local';

update public.products set variant_label = 'Grand pot'
where merchant_id in (select id from public.merchants where name = 'Épicerie Traditionnelle Akébé') and name = 'Pâte d’arachide';

update public.products set variant_label = '100g'
where merchant_id in (select id from public.merchants where name = 'Épicerie Traditionnelle Akébé') and name = 'Poivre de Penja';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Épicerie Traditionnelle Akébé') m,
(values
  ('Riz local', 'cereales', 4000, 'kg', '🍚', '5kg'),
  ('Riz local', 'cereales', 18000, 'kg', '🍚', '25kg'),
  ('Pâte d’arachide', 'cereales', 1500, 'pot', '🥜', 'Petit pot'),
  ('Poivre de Penja', 'cereales', 1800, '100g', '🧂', '50g')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 4. Boucherie Centrale Oloumi
update public.products set variant_label = 'Filet'
where merchant_id in (select id from public.merchants where name = 'Boucherie Centrale Oloumi') and name = 'Viande de bœuf';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Boucherie Centrale Oloumi') m,
(values
  ('Viande de bœuf', 'poisson', 4800, 'kg', '🥩', 'Bavette'),
  ('Viande de bœuf', 'poisson', 5200, 'kg', '🥩', 'Entrecôte')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 5. Poissonnerie de Nkembo
update public.products set variant_label = 'Moyennes'
where merchant_id in (select id from public.merchants where name = 'Poissonnerie de Nkembo') and name = 'Crevettes fraîches';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Poissonnerie de Nkembo') m,
(values
  ('Crevettes fraîches', 'poisson', 3500, 'kg', '🦐', 'Petites'),
  ('Crevettes fraîches', 'poisson', 5800, 'kg', '🦐', 'Grosses')
) as p(name, category, price, unit, image_emoji, variant_label);
