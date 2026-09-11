-- Panier 241 — variantes de produits (tailles, diametres, formats...)
-- A executer dans Supabase : Dashboard > SQL Editor > New query > Run

alter table public.products add column variant_label text;

-- 1. Bati Plus Gabon : eclate certains produits en variantes realistes
delete from public.products
where merchant_id = (select id from public.merchants where name = 'Bâti Plus Gabon')
  and name in ('Fer à béton 12mm', 'Sac de ciment 50kg', 'Câble électrique 2.5mm (100m)',
               'Carrelage sol 60x60', 'Peinture murale 20L', 'Robinetterie Hansgrohe',
               'Groupe électrogène 3.5kVA', 'Perceuse électroportative');

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Bâti Plus Gabon') m,
(values
  ('Fer à béton', 'bricolage', 2200, 'barre', '🏗️', '6mm'),
  ('Fer à béton', 'bricolage', 2800, 'barre', '🏗️', '8mm'),
  ('Fer à béton', 'bricolage', 3500, 'barre', '🏗️', '10mm'),
  ('Fer à béton', 'bricolage', 4500, 'barre', '🏗️', '12mm'),
  ('Fer à béton', 'bricolage', 5800, 'barre', '🏗️', '14mm'),
  ('Fer à béton', 'bricolage', 7200, 'barre', '🏗️', '16mm'),
  ('Sac de ciment', 'bricolage', 3200, 'sac', '🧱', '25kg'),
  ('Sac de ciment', 'bricolage', 6000, 'sac', '🧱', '50kg'),
  ('Câble électrique (100m)', 'bricolage', 18000, 'rouleau', '🔌', '1.5mm²'),
  ('Câble électrique (100m)', 'bricolage', 35000, 'rouleau', '🔌', '2.5mm²'),
  ('Câble électrique (100m)', 'bricolage', 62000, 'rouleau', '🔌', '6mm²'),
  ('Carrelage sol 60x60', 'bricolage', 8500, 'm²', '🔲', 'Gris'),
  ('Carrelage sol 60x60', 'bricolage', 8500, 'm²', '🔲', 'Beige'),
  ('Carrelage sol 60x60', 'bricolage', 9200, 'm²', '🔲', 'Blanc'),
  ('Peinture murale 20L', 'bricolage', 45000, 'seau', '🎨', 'Blanc'),
  ('Peinture murale 20L', 'bricolage', 47000, 'seau', '🎨', 'Gris clair'),
  ('Peinture murale 20L', 'bricolage', 47000, 'seau', '🎨', 'Beige'),
  ('Robinetterie Hansgrohe', 'bricolage', 65000, 'pièce', '🚿', 'Mitigeur lavabo'),
  ('Robinetterie Hansgrohe', 'bricolage', 85000, 'pièce', '🚿', 'Mitigeur douche'),
  ('Robinetterie Hansgrohe', 'bricolage', 95000, 'pièce', '🚿', 'Mitigeur cuisine'),
  ('Groupe électrogène', 'bricolage', 220000, 'pièce', '⚡', '2kVA'),
  ('Groupe électrogène', 'bricolage', 380000, 'pièce', '⚡', '3.5kVA'),
  ('Groupe électrogène', 'bricolage', 520000, 'pièce', '⚡', '5kVA'),
  ('Perceuse électroportative', 'bricolage', 35000, 'pièce', '🛠️', '500W'),
  ('Perceuse électroportative', 'bricolage', 45000, 'pièce', '🛠️', '750W'),
  ('Perceuse électroportative', 'bricolage', 55000, 'pièce', '🛠️', '1000W')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 2. CECADO
delete from public.products
where merchant_id = (select id from public.merchants where name = 'CECADO')
  and name in ('Riz importé 25kg', 'Huile de cuisine 5L', 'Eau minérale 1.5L',
               'Lessive en poudre 1kg', 'Papier toilette (pack de 6)', 'Savon de toilette',
               'Jus de fruit 1L');

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'CECADO') m,
(values
  ('Riz importé', 'epicerie', 4000, 'sac', '🍚', '5kg'),
  ('Riz importé', 'epicerie', 7500, 'sac', '🍚', '10kg'),
  ('Riz importé', 'epicerie', 18000, 'sac', '🍚', '25kg'),
  ('Riz importé', 'epicerie', 34000, 'sac', '🍚', '50kg'),
  ('Huile de cuisine', 'epicerie', 2200, 'bidon', '🫙', '1L'),
  ('Huile de cuisine', 'epicerie', 4200, 'bidon', '🫙', '2L'),
  ('Huile de cuisine', 'epicerie', 7500, 'bidon', '🫙', '5L'),
  ('Eau minérale', 'epicerie', 300, 'bouteille', '💧', '0.5L'),
  ('Eau minérale', 'epicerie', 600, 'bouteille', '💧', '1.5L'),
  ('Eau minérale', 'epicerie', 1800, 'bouteille', '💧', '5L'),
  ('Lessive en poudre', 'epicerie', 1800, 'paquet', '🧴', '1kg'),
  ('Lessive en poudre', 'epicerie', 4500, 'paquet', '🧴', '3kg'),
  ('Lessive en poudre', 'epicerie', 7000, 'paquet', '🧴', '5kg'),
  ('Papier toilette', 'epicerie', 2200, 'pack', '🧻', 'pack de 6'),
  ('Papier toilette', 'epicerie', 4000, 'pack', '🧻', 'pack de 12'),
  ('Savon de toilette', 'epicerie', 800, 'unité', '🧼', 'Neutre'),
  ('Savon de toilette', 'epicerie', 900, 'unité', '🧼', 'Lavande'),
  ('Savon de toilette', 'epicerie', 900, 'unité', '🧼', 'Citron'),
  ('Jus de fruit', 'epicerie', 1500, 'bouteille', '🧃', 'Orange'),
  ('Jus de fruit', 'epicerie', 1500, 'bouteille', '🧃', 'Ananas'),
  ('Jus de fruit', 'epicerie', 1500, 'bouteille', '🧃', 'Mangue')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 3. Épicerie Traditionnelle Akébé
delete from public.products
where merchant_id = (select id from public.merchants where name = 'Épicerie Traditionnelle Akébé')
  and name in ('Riz local', 'Pâte d’arachide', 'Poivre de Penja');

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Épicerie Traditionnelle Akébé') m,
(values
  ('Riz local', 'cereales', 900, 'kg', '🍚', '1kg'),
  ('Riz local', 'cereales', 4000, 'kg', '🍚', '5kg'),
  ('Riz local', 'cereales', 18000, 'kg', '🍚', '25kg'),
  ('Pâte d’arachide', 'cereales', 1500, 'pot', '🥜', 'Petit pot'),
  ('Pâte d’arachide', 'cereales', 2500, 'pot', '🥜', 'Grand pot'),
  ('Poivre de Penja', 'cereales', 1800, '100g', '🧂', '50g'),
  ('Poivre de Penja', 'cereales', 3000, '100g', '🧂', '100g')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 4. Boucherie Centrale Oloumi
delete from public.products
where merchant_id = (select id from public.merchants where name = 'Boucherie Centrale Oloumi')
  and name = 'Viande de bœuf';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Boucherie Centrale Oloumi') m,
(values
  ('Viande de bœuf', 'poisson', 5500, 'kg', '🥩', 'Filet'),
  ('Viande de bœuf', 'poisson', 4800, 'kg', '🥩', 'Bavette'),
  ('Viande de bœuf', 'poisson', 5200, 'kg', '🥩', 'Entrecôte')
) as p(name, category, price, unit, image_emoji, variant_label);

-- 5. Poissonnerie de Nkembo
delete from public.products
where merchant_id = (select id from public.merchants where name = 'Poissonnerie de Nkembo')
  and name = 'Crevettes fraîches';

insert into public.products (merchant_id, name, category, price, unit, image_emoji, variant_label)
select m.id, p.name, p.category, p.price, p.unit, p.image_emoji, p.variant_label
from (select id from public.merchants where name = 'Poissonnerie de Nkembo') m,
(values
  ('Crevettes fraîches', 'poisson', 3500, 'kg', '🦐', 'Petites'),
  ('Crevettes fraîches', 'poisson', 4500, 'kg', '🦐', 'Moyennes'),
  ('Crevettes fraîches', 'poisson', 5800, 'kg', '🦐', 'Grosses')
) as p(name, category, price, unit, image_emoji, variant_label);
