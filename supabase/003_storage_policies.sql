-- Panier 241 — policies de stockage pour le bucket kiosk-photos
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > Run

create policy "Lecture publique des photos de kiosque"
  on storage.objects for select
  using (bucket_id = 'kiosk-photos');

create policy "Les utilisateurs connectes envoient leurs photos de kiosque"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'kiosk-photos');
