-- Panier 241 — contact WhatsApp, telephone marchand, liste de courses filmee
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

alter table public.merchants add column phone text;
alter table public.orders add column shopping_video_url text;
alter table public.orders add column livreur_phone text;

-- Policies pour le nouveau bucket "shopping-videos" (a creer manuellement dans
-- Storage > New bucket > nom "shopping-videos" > cocher "Public bucket")
create policy "Lecture publique des videos de liste de courses"
  on storage.objects for select
  using (bucket_id = 'shopping-videos');

create policy "Les utilisateurs connectes envoient leurs videos de liste de courses"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'shopping-videos');
