alter table public.products add column image_url text;

create policy "Lecture publique des photos de produits"
  on storage.objects for select
  using (bucket_id = 'product-photos');

create policy "Les utilisateurs connectes envoient des photos de produits"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos');
