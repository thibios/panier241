-- Panier 241 — catalogues reels pour Bati Plus Gabon et CECADO
-- A executer dans Supabase : Dashboard > SQL Editor > New query > Run

-- 1. Bati Plus Gabon (materiaux de construction, plomberie, electricite, outillage...)
with new_merchant as (
  insert into public.merchants (name, market_id, categories, rating, review_count, address, image_emoji, banner_color, status, phone)
  values ('Bâti Plus Gabon', 'mkt-bati-plus', array['bricolage'], 4.6, 0, 'Oloumi, Libreville', '🔨', '#5B7C99', 'approved', null)
  returning id
)
insert into public.products (merchant_id, name, category, price, unit, image_emoji)
select id, p.name, p.category, p.price, p.unit, p.image_emoji
from new_merchant, (values
  ('Fer à béton 12mm', 'bricolage', 4500, 'barre', '🏗️'),
  ('Sac de ciment 50kg', 'bricolage', 6000, 'sac', '🧱'),
  ('Robinetterie Hansgrohe', 'bricolage', 85000, 'pièce', '🚿'),
  ('Pommeau de douche', 'bricolage', 15000, 'pièce', '🚰'),
  ('Câble électrique 2.5mm (100m)', 'bricolage', 35000, 'rouleau', '🔌'),
  ('Luminaire LED plafonnier', 'bricolage', 12000, 'pièce', '💡'),
  ('Carrelage sol 60x60', 'bricolage', 8500, 'm²', '🔲'),
  ('Peinture murale 20L', 'bricolage', 45000, 'seau', '🎨'),
  ('Perceuse électroportative', 'bricolage', 55000, 'pièce', '🛠️'),
  ('Coffre-fort de sécurité', 'bricolage', 120000, 'pièce', '🔒'),
  ('Groupe électrogène 3.5kVA', 'bricolage', 380000, 'pièce', '⚡'),
  ('Surpresseur pour piscine', 'bricolage', 95000, 'pièce', '💧')
) as p(name, category, price, unit, image_emoji);

-- 2. CECADO (enseigne de proximite du groupe Ceca-Gadis : epicerie, frais, menager, boissons, hygiene)
with new_merchant as (
  insert into public.merchants (name, market_id, categories, rating, review_count, address, image_emoji, banner_color, status, phone)
  values ('CECADO', 'mkt-ceca-gadis', array['epicerie'], 4.3, 0, 'Nombakélé, Libreville', '🛒', '#2FA3A3', 'approved', null)
  returning id
)
insert into public.products (merchant_id, name, category, price, unit, image_emoji)
select id, p.name, p.category, p.price, p.unit, p.image_emoji
from new_merchant, (values
  ('Riz importé 25kg', 'epicerie', 18000, 'sac', '🍚'),
  ('Huile de cuisine 5L', 'epicerie', 7500, 'bidon', '🫙'),
  ('Pain de boulangerie', 'epicerie', 300, 'unité', '🍞'),
  ('Jambon de charcuterie', 'epicerie', 3500, 'kg', '🥓'),
  ('Tomates locales', 'epicerie', 1200, 'kg', '🍅'),
  ('Lessive en poudre 1kg', 'epicerie', 1800, 'paquet', '🧴'),
  ('Papier toilette (pack de 6)', 'epicerie', 2200, 'pack', '🧻'),
  ('Eau minérale 1.5L', 'epicerie', 600, 'bouteille', '💧'),
  ('Jus de fruit 1L', 'epicerie', 1500, 'bouteille', '🧃'),
  ('Savon de toilette', 'epicerie', 800, 'unité', '🧼')
) as p(name, category, price, unit, image_emoji);
