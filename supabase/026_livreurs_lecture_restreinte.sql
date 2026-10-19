-- 026 : la fiche d'un livreur (nom, téléphone, véhicule) n'est plus lisible publiquement.
-- Audit 2026-10 (docs/audit-2026-10/REGISTRE_RISQUES.md, tâche U01) : la policy de 006 laissait
-- anon et tout compte lire les livreurs « approved », téléphone compris.
-- Lecture désormais réservée au livreur lui-même et à l'administrateur.
-- Sans impact sur l'application : les écrans lisent la fiche par owner_id (Profile, CourierSpace) ou
-- depuis l'espace admin ; le client voit le livreur via orders.livreur_name / livreur_phone ; les
-- fonctions du moteur de commande (022, security definer) ne dépendent pas de cette policy.
-- Retour arrière : recréer la policy de 006 (using status = 'approved' or owner_id = auth.uid() or is_admin()).

drop policy if exists "Lecture des livreurs approuves, du proprietaire ou de l'admin" on public.livreurs;

create policy "Lecture du livreur par lui-meme ou par l'admin"
  on public.livreurs for select
  using (owner_id = auth.uid() or public.is_admin());
