-- Photo de profil : une colonne sur profiles et un bucket public "avatars".
-- Chaque utilisateur n'écrit que dans son propre dossier (avatars/<son id>/...).

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Lecture publique des photos de profil"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Chacun envoie sa photo de profil"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun remplace sa photo de profil"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Chacun supprime sa photo de profil"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
