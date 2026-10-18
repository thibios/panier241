# Le Panier 241 — Exigences de sécurité (pré-audit)

Date : 18 octobre 2026.
Périmètre : dépôt `panier241` (React 18 + Vite + TypeScript, Supabase Auth email/mot de passe, Postgres avec RLS, Storage, hébergement Vercel, fonction serveur `api/pexels.ts`).
Sources lues : `supabase/schema.sql`, migrations `002` à `019` (toutes déclarées appliquées en production), `src/lib/supabaseClient.ts`, `src/lib/avatar.ts`, `src/lib/storage.ts`, `src/context/*`, `src/pages/*`, `vercel.json`, `api/pexels.ts`, `.gitignore`, `.env.example`, `docs/PRD.md` (section 22, décisions D1 à D5).

Méthode : lecture du code uniquement. Aucune requête n'a été exécutée sur la base. L'état réel de la production (réglages du tableau de bord Supabase, buckets créés à la main, variables Vercel) n'est pas visible dans le dépôt. Chaque point marqué « à vérifier » doit être confirmé dans la console.

Règle de ce document : une protection est dite « Présente » seulement si le fichier ou la migration cité la contient. Aucune valeur de secret n'est reproduite ici.

---

## 1. Synthèse

| Criticité | Nombre | Risques |
|---|---|---|
| Critique | 4 | R07 auto-approbation à l'insertion, R10 montants fixés par le navigateur, R34 fraude à la commande, R35 fraude à la livraison |
| Élevée | 15 | R01, R04, R05, R06, R08, R09, R13, R14, R21, R22, R28, R30, R33, R36, R37 |
| Moyenne | 15 | R02, R03, R12, R15, R16, R17, R18, R19, R20, R23, R24, R25, R27, R29, R31 |
| Faible | 3 | R11, R26, R32 |

Constat principal, absent du PRD : les policies d'insertion sur `merchants` (`002`) et `livreurs` (`004`) vérifient seulement `auth.uid() = owner_id`. Le contrôle du statut ne s'applique qu'aux mises à jour (triggers `BEFORE UPDATE` de `006`). Un utilisateur peut donc créer son commerce ou son profil livreur directement avec `status = 'approved'` par un appel API. Un faux livreur ainsi approuvé lit l'adresse et le téléphone de tous les clients dont la commande attend un livreur (`014`, policy « Le livreur voit les livraisons disponibles ou les siennes »).

Les trois actions les plus urgentes :

1. Forcer `status = 'pending'`, `rating` et `review_count` par défaut à l'insertion sur `merchants` et `livreurs`, sauf administrateur ; verrouiller `rating` et `review_count` en mise à jour. Puis contrôler à la main chaque compte déjà approuvé.
2. Recalculer sous-total, frais et total dans la base à la création de la commande (D3) et contrôler les transitions de statut (D5).
3. Dans le tableau de bord Supabase : confirmation d'email, protection contre les mots de passe fuités, longueur minimale relevée, URL configuration, MFA pour l'administrateur, captcha à l'inscription et à la connexion.

---

## 2. Échelle utilisée

- Probabilité : 1 Faible, 2 Moyenne, 3 Élevée, 4 Très élevée (exploitable par un simple appel API avec la clé publique).
- Impact : 1 Faible, 2 Modéré, 3 Grave, 4 Majeur (perte d'argent, fuite massive de données, prise de contrôle).
- Criticité = Probabilité x Impact : 1 à 3 Faible ; 4 à 6 Moyenne ; 8 à 9 Élevée ; 12 à 16 Critique.
- État actuel : Présent (protection complète dans le code), Partiel (protection incomplète ou dépendante d'un réglage non vérifiable), Absent.

Rappel d'architecture : le navigateur parle directement à PostgREST avec la clé anonyme publique. Toute règle qui n'est pas dans une policy RLS, une contrainte ou un trigger peut être contournée. Les contrôles de l'interface (par exemple `isAdminEmail` dans `src/pages/AdminSpace.tsx`) ne protègent rien.

---

## 3. Analyse détaillée des 37 points

### R01. Authentification

- Menace : comptes créés avec une adresse email qui n'appartient pas à l'inscrit.
- Scénario : un attaquant s'inscrit avec l'email d'un commerçant connu, puis ouvre un commerce à ce nom. Le PRD (S3) indique que la confirmation d'email est désactivée.
- Impact : usurpation d'identité, faux commerces, emails de réinitialisation envoyés à des tiers.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : activer « Confirm email » dans Supabase Auth. Bloquer l'accès aux espaces commerçant et livreur tant que l'email n'est pas confirmé.
- Mesure corrective : purger ou faire confirmer les comptes non confirmés ; contacter les commerçants dont le nom est utilisé.
- Détection : requête périodique sur `auth.users` où `email_confirmed_at` est nul ; alerte sur création de commerce par un compte non confirmé.
- Test : s'inscrire avec une adresse non contrôlée ; vérifier que la connexion est refusée avant confirmation.
- État actuel : Partiel. Authentification email et mot de passe via Supabase (`src/context/AuthContext.tsx`, `signUp`, `signInWithPassword`). Confirmation d'email : Absente selon le PRD, réglage à faire dans le tableau de bord.

### R02. OTP

- Menace : numéro de téléphone non vérifié.
- Scénario : un client saisit un faux numéro à l'inscription. Le numéro est recopié dans `orders.client_phone` (`src/context/OrdersContext.tsx`). Le livreur ne peut pas joindre le client.
- Impact : livraisons perdues, commandes fantômes difficiles à sanctionner.
- Probabilité : 3. Impact : 2. Criticité : 6, Moyenne.
- Mesure préventive : OTP SMS ou WhatsApp sur le téléphone avant la première commande (Supabase Phone Auth ou fournisseur SMS local).
- Mesure corrective : marquer « non joignable » les comptes au numéro invalide ; bloquer la commande suivante.
- Détection : taux de commandes non livrées « client injoignable » par compte.
- Test : créer un compte avec un numéro inexistant et vérifier qu'une commande est refusée.
- État actuel : Absent. Aucun appel OTP dans `src/`. Le téléphone est une métadonnée libre (`schema.sql`, `handle_new_user`).

### R03. Sessions

- Menace : session laissée ouverte sur un appareil partagé.
- Scénario : « Rester connecté » est coché par défaut (`getRememberMe` retourne vrai si rien n'est stocké, `src/lib/supabaseClient.ts`). Sur un téléphone prêté ou un cybercafé, la personne suivante accède au compte, aux adresses et aux commandes.
- Impact : lecture des adresses, commandes passées au nom de la victime.
- Probabilité : 2. Impact : 3. Criticité : 6, Moyenne.
- Mesure préventive : décocher « Rester connecté » par défaut ; durée de session maximale et expiration après inactivité (réglages Supabase Auth « Time-box » et « Inactivity timeout » selon le plan).
- Mesure corrective : bouton « Se déconnecter de tous les appareils » (`signOut({ scope: 'global' })`) visible dans le profil.
- Détection : connexions simultanées depuis des appareils différents (journaux Auth Supabase).
- Test : se connecter, fermer le navigateur, rouvrir ; vérifier le comportement selon la case. Vérifier la révocation globale.
- État actuel : Partiel. Choix localStorage ou sessionStorage selon la case (`src/lib/supabaseClient.ts`), rafraîchissement automatique des jetons, panier effacé à la déconnexion (`AuthContext.tsx`). Pas d'expiration d'inactivité dans le code.

### R04. Mots de passe

- Menace : mots de passe faibles ou déjà fuités.
- Scénario : un compte commerçant utilise « 123456 ». Une attaque par dictionnaire réussit.
- Impact : prise de contrôle du compte, modification du catalogue et des prix, lecture des téléphones clients des commandes reçues.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : longueur minimale 10 caractères dans Supabase Auth ; exigences de complexité ; protection contre les mots de passe fuités (HaveIBeenPwned) ; alignement des attributs `minLength` des formulaires.
- Mesure corrective : forcer la réinitialisation des comptes concernés.
- Détection : échecs de connexion répétés dans les journaux Auth.
- Test : tenter une inscription avec un mot de passe de 6 caractères et avec un mot de passe connu comme fuité.
- État actuel : Partiel. Minimum de 6 caractères côté formulaire (`src/pages/Auth.tsx`, `src/pages/ResetPassword.tsx`, `minLength={6}`). Protection contre les fuites : à activer dans le tableau de bord. Réinitialisation par email avec `redirectTo` sur l'origine courante (`Auth.tsx`) : la liste des URL autorisées doit être réglée (URL configuration).

### R05. MFA / 2FA

- Menace : compromission du compte administrateur.
- Scénario : l'email de l'administrateur figure en clair dans le bundle JavaScript public (`src/context/AuthContext.tsx`, constante `ADMIN_EMAIL`) et dans `006` (`is_admin`). Un attaquant cible ce compte par hameçonnage ou force brute.
- Impact : contrôle total (approbation de faux livreurs, modification de toute commande, prix officiels). Le trigger `protect_order_columns` laisse tout passer pour l'admin (`016`).
- Probabilité : 2. Impact : 4. Criticité : 8, Élevée.
- Mesure préventive : MFA TOTP Supabase obligatoire pour l'admin ; `is_admin()` exige en plus `auth.jwt() ->> 'aal' = 'aal2'`.
- Mesure corrective : changer le mot de passe, révoquer les sessions, revoir les actions admin récentes.
- Détection : connexion admin depuis un nouvel appareil ou pays ; alerte email.
- Test : se connecter en admin sans second facteur et vérifier qu'aucune action admin n'aboutit.
- État actuel : Absent. Aucun appel `mfa` dans `src/`. `is_admin()` ne vérifie pas le niveau d'authentification (`006`).

### R06. RBAC

- Menace : modèle de rôles implicite et rigide.
- Scénario : l'admin est reconnu par un email codé en dur (`006`, `is_admin()` ; `AuthContext.tsx`). Les rôles commerçant et livreur sont déduits de la présence d'une ligne dans `merchants` ou `livreurs`. Si le compte admin est supprimé et l'email réinscrit (confirmation désactivée), le nouveau titulaire devient admin.
- Impact : impossibilité de déléguer sans migration ; risque de reprise du rôle admin.
- Probabilité : 2. Impact : 4. Criticité : 8, Élevée.
- Mesure préventive : table `user_roles (user_id, role)` modifiable seulement par migration ou par le rôle service ; `is_admin()` lit cette table par `user_id`, jamais par email.
- Mesure corrective : migrer vers la table de rôles ; retirer l'email du code front.
- Détection : revue mensuelle de la liste des admins.
- Test : vérifier qu'un compte non listé n'obtient aucun droit admin, même avec le même email après recréation.
- État actuel : Partiel. Séparation des droits par policies RLS (`002`, `004`, `006`, `014`). Admin par email : fragilité structurelle (PRD S3).

### R07. Permissions (auto-approbation)

- Menace : contournement de la validation par l'administrateur.
- Scénario : un utilisateur appelle `POST /rest/v1/livreurs` avec `status: 'approved'`. La policy d'insertion (`004`) ne vérifie que `owner_id`. Le trigger `prevent_livreur_self_status_change` (`006`) est `BEFORE UPDATE` seulement. Le faux livreur voit aussitôt toutes les commandes `en_livraison` sans livreur, avec adresse et téléphone du client (`014`), et peut les accepter. Même chose pour `merchants` (`002`, `006`) : le commerce apparaît publiquement sans validation, avec `rating` et `review_count` choisis.
- Impact : fuite de données clients, vols ou fausses livraisons, faux commerces bien notés.
- Probabilité : 4. Impact : 4. Criticité : 16, Critique.
- Mesure préventive : trigger `BEFORE INSERT` sur `merchants` et `livreurs` qui force `status = 'pending'` (et `rating = 5`, `review_count = 0` pour `merchants`) sauf si `is_admin()` ; ou clause `with check (status = 'pending')` dans les policies d'insertion.
- Mesure corrective : lister tous les commerces et livreurs approuvés et confirmer chacun à la main ; suspendre ceux que l'admin n'a pas validés.
- Détection : sans journal d'audit, impossible de savoir qui a approuvé. Ajouter un champ `approved_by` et `approved_at` rempli par la base.
- Test : avec un compte neuf et la clé anonyme, insérer un livreur `approved` ; le résultat attendu est `pending`.
- État actuel : Absent. Aucune policy ni trigger d'insertion ne contrôle `status` (vérifié dans `002`, `004`, `006`, `014`).

### R08. API

- Menace : lecture directe de données par PostgREST.
- Scénario : la policy select de `livreurs` autorise `status = 'approved'` sans rôle (`006`). Un visiteur anonyme récupère le nom et le téléphone de tous les livreurs approuvés. La table `reviews` est lisible par tous avec `user_id` et `order_id` (`005`). Les produits sont lisibles même si le commerce est en attente ou refusé (`002`, `using (true)`).
- Impact : collecte des numéros de livreurs (démarchage, harcèlement), corrélation des avis à des comptes.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : restreindre la lecture de `livreurs` au propriétaire, à l'admin et au client d'une commande attribuée ; exposer les avis par une vue sans `user_id` ; limiter la lecture des produits aux commerces approuvés.
- Mesure corrective : réécrire les policies ; prévenir les livreurs si une collecte est constatée.
- Détection : volume de requêtes anonymes sur `livreurs` dans les journaux API Supabase.
- Test : avec la seule clé anonyme, `GET /rest/v1/livreurs?select=*` doit renvoyer une liste vide.
- État actuel : Partiel. RLS activée sur toutes les tables lues (`schema.sql`, `002`, `004`, `005`, `015`, `016`). Exposition des livreurs et des `user_id` d'avis : Absente de protection.

### R09. Base de données

- Menace : colonnes sensibles modifiables par leur propriétaire.
- Scénario : le commerçant met à jour son commerce avec `rating = 5` et `review_count = 900`. La policy d'update (`014`) vérifie seulement `owner_id` ; le trigger de `006` ne protège que `status`. `orders.merchant_id` est un texte sans clé étrangère (`schema.sql`) : on peut créer une commande vers un commerce inexistant ou non approuvé.
- Impact : faux classement, perte de confiance, données incohérentes.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : trigger qui fige `rating`, `review_count`, `status`, `owner_id` hors admin et hors trigger d'avis ; clé étrangère ou contrôle d'existence d'un commerce approuvé à l'insertion d'une commande.
- Mesure corrective : recalculer `rating` et `review_count` à partir de `reviews`.
- Détection : écart entre `merchants.review_count` et `count(*)` de `reviews`.
- Test : en commerçant, `PATCH /rest/v1/merchants` sur `rating` ; la valeur doit rester inchangée.
- État actuel : Partiel. `search_path` figé, fonctions de trigger non exécutables par l'API, `TRUNCATE` retiré (`014` section 8 et 9). Colonnes de réputation : Absentes de protection.

### R10. Paiements (intégrité des montants)

- Menace : montant de commande falsifié.
- Scénario : le panier calcule `subtotal`, `service_fee`, `delivery_fee`, `distance_km`, `total` dans le navigateur (`src/pages/Cart.tsx`, `src/context/OrdersContext.tsx`). Un client modifie la requête et crée une commande à 100 F pour 100 000 F de produits. Le trigger `protect_order_columns` fige ensuite ce faux montant (`014`, `016`). Le livreur encaisse le montant affiché.
- Impact : perte d'argent pour le commerçant ou le livreur ; conflit à la livraison.
- Probabilité : 3. Impact : 4. Criticité : 12, Critique.
- Mesure préventive : fonction RPC `create_order` qui reçoit produits, quantités, adresse et créneau, et calcule tout en base (D3, option B). À défaut, trigger `BEFORE INSERT` qui recalcule et écrase.
- Mesure corrective : contrôle manuel du total par le commerçant avant préparation ; annulation des commandes incohérentes.
- Détection : requête quotidienne comparant `subtotal` à la somme `prix x quantité` des `items` selon les prix en base.
- Test : insérer une commande avec un total à 1 F ; le total enregistré doit être le total recalculé.
- État actuel : Partiel. Pas de paiement en ligne (paiement à la réception, `Cart.tsx`). Montants figés après création (`014`, `016`). Calcul serveur : Absent (PRD S1, RM-P7).

### R11. Webhooks

- Menace : aucune pour l'instant ; risque futur avec le mobile money (Phase 2).
- Scénario : un futur webhook de paiement non signé confirme un paiement inexistant.
- Impact : faible aujourd'hui.
- Probabilité : 1. Impact : 1. Criticité : 1, Faible.
- Mesure préventive : à la Phase 2, endpoint serveur unique, vérification de signature HMAC, horodatage, idempotence par identifiant de transaction, rapprochement.
- Mesure corrective : désactiver l'endpoint, rejouer depuis l'API du fournisseur.
- Détection : journaliser chaque appel avec résultat de vérification.
- Test : envoyer un appel non signé ; attendu 401 sans effet en base.
- État actuel : Absent (sans objet). Aucun webhook dans `api/` ni dans les migrations.

### R12. Upload de fichiers

- Menace : abus de stockage et fichiers non contrôlés.
- Scénario : tout compte connecté envoie autant de vidéos de 50 Mo qu'il veut dans `shopping-videos` (`014` : `video/*`, 52 428 800 octets). Tout compte, même non commerçant, écrit dans `product-photos` et `kiosk-photos`. Le nom d'origine du fichier vidéo est conservé dans le chemin (`Cart.tsx`).
- Impact : coût de stockage et de bande passante, dépassement de quota, nom de fichier personnel exposé.
- Probabilité : 3. Impact : 2. Criticité : 6, Moyenne.
- Mesure préventive : limiter `product-photos` aux propriétaires d'un commerce ; quota par utilisateur (fonction ou trigger sur `storage.objects`) ; liste fermée de types vidéo (`video/mp4`, `video/webm`, `video/quicktime`) ; nom de fichier généré, sans le nom d'origine ; compression de la vidéo avant envoi.
- Mesure corrective : script de purge des fichiers orphelins (non référencés par une ligne).
- Détection : volume par dossier utilisateur dans Storage.
- Test : envoyer un fichier `.exe` renommé `.mp4` ; envoyer 20 vidéos d'affilée.
- État actuel : Partiel. Dossier par utilisateur imposé (`013`, `014` section 7). Tailles et types limités (`013`, `014`). Compression des images (`src/lib/compressImage.ts`, `src/lib/avatar.ts`). Quota et restriction par rôle : Absents.

### R13. Documents livreurs

- Menace : livreurs non identifiés.
- Scénario : l'inscription livreur ne demande que nom, téléphone et véhicule (`src/pages/BecomeCourier.tsx`). L'admin approuve sans pièce. Un livreur disparaît avec la marchandise ou l'argent.
- Impact : vol, impossibilité de poursuivre, risque pour les clients à domicile.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : pièce d'identité, photo, permis et document du véhicule si motorisé, numéro mobile money ; bucket privé lisible par l'admin et le livreur seulement ; date d'expiration (PRD 18.4).
- Mesure corrective : suspension immédiate (`status = 'suspended'`), signalement.
- Détection : livraisons acceptées non terminées ; réclamations clients par livreur.
- Test : vérifier qu'un livreur sans pièce validée ne peut pas passer `approved` ; vérifier que le bucket documents refuse la lecture publique.
- État actuel : Absent (PRD 18.4 « Non implémentée »).

### R14. Données personnelles

- Menace : exposition excessive des données clients et livreurs.
- Scénario : tous les livreurs approuvés voient téléphone et adresse des clients des courses disponibles (`014`, PRD S5). Les téléphones des livreurs sont lisibles par tous (`006`, PRD S6). Les vidéos de liste de courses (intérieur du domicile, voix) sont dans un bucket public (`008`, PRD S4). Aucune suppression de compte en libre-service : la politique de confidentialité renvoie à une demande par email (`src/pages/Privacy.tsx`).
- Impact : non-conformité à la loi gabonaise sur la protection des données personnelles ; atteinte à la vie privée.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : vue « courses disponibles » sans téléphone ni adresse précise (quartier seulement) jusqu'à l'acceptation ; bucket vidéo privé et URL signées courtes ; suppression de compte avec effacement des fichiers ; durée de conservation des vidéos (par exemple 30 jours après livraison).
- Mesure corrective : procédure de réponse aux demandes d'accès et d'effacement ; registre des traitements.
- Détection : revue trimestrielle des policies select.
- Test : en livreur approuvé, lire une course disponible : le téléphone doit être absent. Ouvrir une URL de vidéo sans session : refus attendu.
- État actuel : Partiel. Profils et adresses lisibles par leur seul propriétaire (`schema.sql`, `014`). Pages légales présentes (`Privacy.tsx`, `Terms.tsx`). Restrictions ci-dessus : Absentes. Hébergement UE affirmé, à vérifier (PRD 22.3).

### R15. Géolocalisation

- Menace : coordonnées et distance fournies par le client.
- Scénario : `addresses.lat` et `lng` (`007`) sont saisis par le navigateur (`src/pages/Profile.tsx`, `getCurrentPosition`). `distance_km` et `delivery_fee` sont envoyés par le client. Un client place son adresse à 100 m du marché pour payer la livraison minimale.
- Impact : sous-paiement du livreur.
- Probabilité : 2. Impact : 2. Criticité : 4, Moyenne.
- Mesure préventive : calcul de la distance en base à partir des coordonnées du commerce et de l'adresse ; plafond de cohérence entre quartier déclaré et coordonnées.
- Mesure corrective : ajustement des frais par l'admin, avec trace.
- Détection : écart entre quartier et coordonnées.
- Test : créer une adresse dont les coordonnées contredisent le quartier ; vérifier le recalcul des frais.
- État actuel : Partiel. Adresses protégées par RLS (`schema.sql`). `Permissions-Policy: geolocation=(self)` (`vercel.json`). Calcul serveur : Absent.

### R16. Notifications

- Menace : messages non reçus ou usurpés.
- Scénario : les emails Auth passent par l'expéditeur par défaut de Supabase (débit faible, délivrabilité médiocre) : les réinitialisations de mot de passe n'arrivent pas. Les échanges passent par des liens WhatsApp (`src/lib/whatsapp.ts`) : un escroc se fait passer pour Panier 241 sur WhatsApp.
- Impact : comptes bloqués, hameçonnage.
- Probabilité : 2. Impact : 2. Criticité : 4, Moyenne.
- Mesure préventive : SMTP personnalisé sur le domaine propre avec SPF, DKIM, DMARC ; numéro WhatsApp Business vérifié ; message type « Panier 241 ne demande jamais votre mot de passe ».
- Mesure corrective : page d'alerte en cas d'usurpation.
- Détection : rapports DMARC ; signalements clients.
- Test : demander 5 réinitialisations ; vérifier réception et expéditeur.
- État actuel : Absent. Aucune notification applicative dans le code (PRD 20.1). Liens WhatsApp encodés avec `encodeURIComponent` (`whatsapp.ts`).

### R17. Stockage

- Menace : fichiers privés accessibles par URL.
- Scénario : `014` retire le listing public, mais les buckets restent publics : quiconque connaît l'URL d'une vidéo la lit. Le chemin contient l'identifiant de l'utilisateur. Aucune policy de suppression sur `shopping-videos`, `kiosk-photos`, `product-photos` : les fichiers s'accumulent sans fin.
- Impact : fuite de vidéos privées ; conservation illimitée.
- Probabilité : 2. Impact : 3. Criticité : 6, Moyenne.
- Mesure préventive : `shopping-videos` en bucket privé, lecture par URL signée réservée au client, au commerçant et au livreur de la commande ; tâche de purge après délai.
- Mesure corrective : rendre le bucket privé et régénérer les liens.
- Détection : inventaire mensuel des buckets publics.
- Test : ouvrir une URL de vidéo dans une fenêtre privée sans session ; refus attendu.
- État actuel : Partiel. Pas de listing public, écriture par dossier (`014` section 7). Bucket vidéo public selon la consigne de `008` : à vérifier dans le tableau de bord. URL signées : Absentes.

### R18. Secrets

- Menace : fuite d'une clé serveur.
- Scénario : la clé Pexels ou une future clé `service_role` est commise dans Git ou préfixée `VITE_`.
- Impact : abus de quota ; avec `service_role`, contournement total de la RLS.
- Probabilité : 1. Impact : 4. Criticité : 4, Moyenne.
- Mesure préventive : garder `service_role` hors du front ; scan de secrets (gitleaks) en pré-commit et en CI ; rotation planifiée.
- Mesure corrective : révoquer et régénérer la clé, purger l'historique Git.
- Détection : alertes GitHub secret scanning.
- Test : rechercher les motifs de clés dans le dépôt et dans `dist/`.
- État actuel : Présent. `.env.local` ignoré (`.gitignore` : `*.local` et entrée explicite), absent de l'historique Git. `.env.example` suivi avec des valeurs vides. Clé Pexels lue côté serveur seulement (`api/pexels.ts`, `process.env.PEXELS_API_KEY`). Aucune clé `service_role` dans le code. La clé anonyme Supabase est publique par conception. Scan automatisé : Absent.

### R19. Variables d'environnement

- Menace : mauvaise séparation des environnements.
- Scénario : les déploiements de prévisualisation Vercel pointent vers la base de production. Un test détruit ou pollue des données réelles.
- Impact : données de test en production, faux commerces visibles.
- Probabilité : 2. Impact : 2. Criticité : 4, Moyenne.
- Mesure préventive : projet Supabase distinct pour la prévisualisation ; variables Vercel par environnement ; aucune variable sensible préfixée `VITE_`.
- Mesure corrective : nettoyage des données de test.
- Détection : revue des variables Vercel par environnement.
- Test : déployer une prévisualisation et vérifier l'URL Supabase utilisée.
- État actuel : Partiel. Seules `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont exposées au navigateur (`src/lib/supabaseClient.ts`, `.env.example`). Arrêt explicite si elles manquent. Séparation des environnements : non vérifiable dans le dépôt.

### R20. Logs

- Menace : absence de traces exploitables, ou fuite d'informations par les erreurs.
- Scénario : `api/pexels.ts` renvoie `err.message` brut au client. Les pages affichent parfois le message d'erreur Supabase tel quel (`BecomeCourier.tsx`, `setError(insertError.message)`). Aucun journal applicatif.
- Impact : informations techniques révélées ; incidents non diagnostiqués.
- Probabilité : 2. Impact : 2. Criticité : 4, Moyenne.
- Mesure préventive : messages génériques au client, détail journalisé côté serveur ; collecte des erreurs front (Sentry ou équivalent, sans données personnelles).
- Mesure corrective : ajouter les journaux et une durée de rétention.
- Détection : tableau de bord d'erreurs.
- Test : provoquer une erreur réseau Pexels ; vérifier le message reçu.
- État actuel : Partiel. Journaux plateforme Supabase et Vercel (rétention selon le plan). Pas de `console.log` dans `src/` ni `api/`. Journalisation applicative : Absente.

### R21. Audit trail

- Menace : actions sensibles non traçables.
- Scénario : un commerce est passé `approved`, une commande `livree`, un prix officiel modifié. Personne ne sait qui l'a fait ni quand.
- Impact : litiges impossibles à trancher ; fraude interne invisible.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : table `audit_log` en insertion seule, alimentée par triggers sur `orders` (changement de statut, livreur), `merchants` et `livreurs` (statut), `official_prices` ; historique des statuts de commande.
- Mesure corrective : reconstituer à partir des journaux PostgREST tant qu'ils existent.
- Détection : rapport hebdomadaire des actions admin.
- Test : changer un statut et vérifier la ligne d'audit ; tenter de supprimer une ligne d'audit avec un compte normal.
- État actuel : Absent. Seul `cancelled_at` est fixé par la base (`016`).

### R22. Rate limiting

- Menace : volumes d'appels non bornés.
- Scénario : un script crée 10 000 commandes, propositions de marchés (`015`) ou fichiers. Un autre appelle `/api/pexels` avec des mots-clés variés et épuise le quota Pexels.
- Impact : saturation des commerçants, coût, indisponibilité des photos.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : limites Supabase Auth relevées à des valeurs adaptées ; limite de commandes en cours par client (trigger) ; Vercel Firewall ou limite par IP sur `/api/pexels` ; captcha.
- Mesure corrective : bannir les comptes et IP concernés, purger.
- Détection : nombre d'insertions par utilisateur et par heure.
- Test : boucle de 50 commandes en une minute ; attendu un refus après le seuil.
- État actuel : Partiel. Limites par défaut de Supabase Auth (plateforme, non visibles dans le dépôt). Cache CDN de 30 jours sur `/api/pexels` (`api/pexels.ts`, `s-maxage`). Limites sur la base et l'API Vercel : Absentes (PRD S9).

### R23. Anti-abus

- Menace : comptes jetables et contenus indésirables.
- Scénario : création massive de comptes sans captcha ; propositions de marchés insultantes (`015`, champs texte libres) ; commerçant qui publie de faux produits.
- Impact : modération coûteuse ; image dégradée.
- Probabilité : 3. Impact : 2. Criticité : 6, Moyenne.
- Mesure préventive : captcha (hCaptcha ou Turnstile, pris en charge par Supabase Auth) ; limite de propositions en attente par compte ; signalement de contenu.
- Mesure corrective : suspension du compte, suppression du contenu.
- Détection : propositions rejetées par compte.
- Test : 20 propositions de marché à la suite ; attendu un refus.
- État actuel : Partiel. Validation admin des marchés, commerces et livreurs (`006`, `015`), contournable pour les deux derniers (R07). Longueurs bornées (`015`, `018`, `019`). Captcha : Absent.

### R24. Injection

- Menace : injection SQL ou de paramètres.
- Scénario : un attaquant envoie des filtres PostgREST ou des caractères spéciaux.
- Impact : lecture ou modification hors droits.
- Probabilité : 1. Impact : 4. Criticité : 4, Moyenne.
- Mesure préventive : garder l'accès par le client Supabase (requêtes paramétrées) ; aucune requête SQL dynamique (`execute`) dans les fonctions ; pas d'interpolation dans les filtres `.or()`.
- Mesure corrective : corriger la fonction concernée.
- Détection : erreurs SQL inhabituelles dans les journaux.
- Test : rechercher `' or 1=1 --` dans la recherche et dans les champs texte.
- État actuel : Présent. Accès par `@supabase/supabase-js`. Fonctions PL/pgSQL sans SQL dynamique (`005`, `006`, `014`, `016`). Paramètre Pexels encodé (`api/pexels.ts`, `encodeURIComponent`, longueur bornée à 100).

### R25. XSS

- Menace : exécution de script dans le navigateur d'un autre utilisateur.
- Scénario : un client fixe `shopping_video_url` à une URL arbitraire à l'insertion. Le commerçant clique « Voir la vidéo » (`src/pages/MerchantSpace.tsx`, `href={order.shoppingVideoUrl}`). Un lien `javascript:` est bloqué par la CSP, mais un lien vers un site d'hameçonnage passe. Idem pour `products.image_url`, `merchants.kiosk_photos`, `profiles.avatar_url` sans contrainte de domaine.
- Impact : hameçonnage du commerçant ; vol de session si la CSP était assouplie.
- Probabilité : 2. Impact : 3. Criticité : 6, Moyenne.
- Mesure préventive : contraintes `check` sur toutes les colonnes d'URL (préfixe du projet Supabase), comme `logo_url` et `photo_url` (`017`, `019`) ; garder `script-src 'self'`.
- Mesure corrective : nettoyer les URL hors domaine.
- Détection : requête sur les URL ne commençant pas par le domaine Supabase du projet.
- Test : insérer une commande avec `shopping_video_url = 'javascript:alert(1)'` ; attendu refus par la base.
- État actuel : Partiel. Échappement React, aucun `dangerouslySetInnerHTML` ni `innerHTML` dans `src/`. CSP stricte `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'` (`vercel.json`). Contraintes d'URL seulement sur `custom_markets` (`017`, `019`).

### R26. CSRF

- Menace : requête forgée depuis un autre site.
- Scénario : un site tiers tente une action au nom de l'utilisateur.
- Impact : faible, l'authentification passe par un jeton dans l'en-tête `Authorization`, pas par cookie.
- Probabilité : 1. Impact : 2. Criticité : 2, Faible.
- Mesure préventive : ne jamais passer à une session par cookie sans jeton anti-CSRF ; garder `form-action 'self'`.
- Mesure corrective : sans objet aujourd'hui.
- Détection : sans objet.
- Test : depuis une autre origine, appeler l'API sans jeton ; refus attendu.
- État actuel : Présent par conception. Jetons gérés par `supabase-js` (`supabaseClient.ts`). `form-action 'self'` et `frame-ancestors 'none'` (`vercel.json`).

### R27. IDOR

- Menace : accès à l'objet d'un autre utilisateur par son identifiant.
- Scénario : un client change l'identifiant d'une commande ou d'une adresse dans la requête.
- Impact : lecture ou modification des données d'autrui.
- Probabilité : 2. Impact : 3. Criticité : 6, Moyenne.
- Mesure préventive : garder une policy RLS par table et par opération ; tests automatisés multi-comptes.
- Mesure corrective : corriger la policy fautive.
- Détection : tests de non-régression RLS à chaque migration.
- Test : avec le compte A, lire et modifier une adresse, une commande, un favori du compte B ; attendu zéro ligne.
- État actuel : Partiel. Adresses, favoris, profils, commandes protégés par `auth.uid()` (`schema.sql`, `002`, `014`). Exceptions : table `livreurs` (R08), produits des commerces non approuvés (R08).

### R28. Broken access control (transitions de statut)

- Menace : changement de statut de commande sans règle.
- Scénario : le commerçant passe directement une commande à `livree` ; le livreur attribué la repasse à `en_preparation` ou à `annulee`. Seul le retour depuis `annulee` est bloqué (`016`). L'avis devient possible sans livraison réelle.
- Impact : faux historique, litiges, avis déclenchés à tort.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : machine à états dans `protect_order_columns` (D5, option A) : `en_preparation` vers `en_livraison` par le commerçant ; `en_livraison` vers `livree` par le livreur attribué ; `annulee` par le client avant préparation ou par l'admin.
- Mesure corrective : corriger les commandes par l'admin, avec trace (R21).
- Détection : commandes `livree` sans `livreur_id`.
- Test : en commerçant, passer une commande `en_preparation` à `livree` ; attendu refus.
- État actuel : Partiel. Policies par rôle (`014`), annulation client bornée (`016`). Transitions : Absentes (PRD S2, D5).

### R29. API abuse

- Menace : aspiration du catalogue et des données publiques.
- Scénario : un concurrent aspire commerces, téléphones, produits et prix avec la clé anonyme. Un tiers utilise `/api/pexels` comme proxy gratuit.
- Impact : perte d'avantage concurrentiel, quota épuisé.
- Probabilité : 3. Impact : 2. Criticité : 6, Moyenne.
- Mesure préventive : pagination imposée ; limite de lignes par requête (réglage « Max rows » de l'API) ; vérification de l'origine et limite par IP sur `/api/pexels`.
- Mesure corrective : rotation de la clé anonyme si abus massif ; blocage d'IP.
- Détection : pics de trafic anonyme.
- Test : requête `select=*` sans limite sur `products` ; vérifier le plafond.
- État actuel : Partiel. Paramètres Pexels bornés (`page` 1 à 20, `query` 100 caractères). Pas de contrôle d'origine ni de limite par IP (`api/pexels.ts`). Chargement complet du catalogue (PRD 22.6).

### R30. Brute force

- Menace : essais massifs de mots de passe.
- Scénario : un script tente des milliers de mots de passe sur l'email administrateur, visible dans le bundle.
- Impact : prise de contrôle de comptes, dont l'admin.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : captcha à la connexion ; MFA admin (R05) ; mots de passe forts (R04) ; retrait de l'email admin du code front.
- Mesure corrective : réinitialisation forcée, révocation des sessions.
- Détection : échecs de connexion par compte et par IP (journaux Auth).
- Test : 30 tentatives erronées en une minute ; vérifier le blocage.
- État actuel : Partiel. Limites par défaut de Supabase Auth (non visibles dans le dépôt). Captcha : Absent.

### R31. Session hijacking

- Menace : vol des jetons de session.
- Scénario : les jetons sont dans `localStorage` (`supabaseClient.ts`). Une extension malveillante ou une faille XSS les lit et les rejoue.
- Impact : usurpation de compte jusqu'à révocation.
- Probabilité : 2. Impact : 3. Criticité : 6, Moyenne.
- Mesure préventive : CSP stricte maintenue ; durée de jeton d'accès courte ; rotation des jetons de rafraîchissement avec détection de réutilisation (réglage Supabase) ; déconnexion globale proposée.
- Mesure corrective : révoquer toutes les sessions du compte.
- Détection : rafraîchissement depuis deux IP éloignées.
- Test : copier le jeton de rafraîchissement, se déconnecter, tenter de le réutiliser ; refus attendu.
- État actuel : Partiel. CSP et HSTS (`vercel.json`). HTTPS forcé (`upgrade-insecure-requests`). Rotation : réglage plateforme à vérifier.

### R32. Webhook spoofing

- Menace : faux appel de confirmation de paiement.
- Scénario : sans objet aujourd'hui (aucun webhook).
- Impact : faible aujourd'hui.
- Probabilité : 1. Impact : 1. Criticité : 1, Faible.
- Mesure préventive : voir R11 avant toute intégration mobile money.
- Mesure corrective : voir R11.
- Détection : voir R11.
- Test : voir R11.
- État actuel : Absent (sans objet).

### R33. Fraude au paiement (espèces)

- Menace : détournement de l'argent collecté.
- Scénario : le client paie le livreur en espèces. Rien ne définit comment le commerçant est payé ni comment la plateforme perçoit ses 5 % (PRD 14.4, D4). Le livreur garde l'argent ou dit avoir reçu moins.
- Impact : pertes pour le commerçant et la plateforme ; conflits.
- Probabilité : 3. Impact : 3. Criticité : 9, Élevée.
- Mesure préventive : décider D4 (mobile money au commerçant, repli encaissement pour le commerçant) ; acompte au-delà d'un seuil ; reçu de remise ; rapprochement journalier par livreur.
- Mesure corrective : suspension du livreur, recouvrement.
- Détection : écart entre total des commandes livrées et sommes reversées.
- Test : simuler une journée de livraisons et vérifier le rapprochement.
- État actuel : Absent. Aucun suivi de l'encaissement dans le code ni dans les migrations.

### R34. Fraude à la commande

- Menace : commandes fantômes ou falsifiées.
- Scénario : sans engagement financier, un compte crée des dizaines de commandes vers un commerçant concurrent, avec un faux numéro (R02) et un faux montant (R10). Le commerçant prépare et perd sa marchandise.
- Impact : pertes directes pour les commerçants ; départ des commerçants.
- Probabilité : 4. Impact : 3. Criticité : 12, Critique.
- Mesure préventive : montants calculés en base (R10) ; limite de commandes en cours par client (par exemple 2) ; téléphone vérifié (R02) ; confirmation téléphonique au-delà d'un seuil ; suspension après N absences (PRD 22.4).
- Mesure corrective : annulation par l'admin, suspension du compte.
- Détection : commandes non livrées par client ; commandes multiples dans la même heure.
- Test : créer 10 commandes en cours avec un compte ; attendu refus après la limite.
- État actuel : Partiel. Création seulement en `en_preparation` sans livreur (`014`). Limites et vérifications : Absentes.

### R35. Fraude à la livraison

- Menace : faux livreur, fausse remise.
- Scénario : un compte s'auto-approuve livreur (R07), accepte une course, récupère la marchandise et disparaît. Ou un livreur réel marque `livree` sans remise. Aucune preuve de remise (PRD 15.5, D5).
- Impact : vol de marchandise et d'argent ; danger pour le client à domicile.
- Probabilité : 3. Impact : 4. Criticité : 12, Critique.
- Mesure préventive : corriger R07 ; pièces d'identité (R13) ; code de réception à 4 chiffres généré par la base et saisi par le livreur (D5) ; `livree` réservé au livreur attribué.
- Mesure corrective : suspension, signalement, dédommagement du client.
- Détection : réclamations « non reçu » ; délais anormaux entre acceptation et livraison.
- Test : en livreur attribué, passer `livree` sans code ; attendu refus.
- État actuel : Partiel. Seuls les livreurs `approved` voient et acceptent les courses ; l'identité du livreur est imposée par la base à l'acceptation (`014`, `016`). Contournable par R07. Preuve de remise : Absente.

### R36. Sauvegardes

- Menace : perte de données sans restauration possible.
- Scénario : une migration erronée ou une suppression massive efface les commandes. Sur l'offre gratuite de Supabase, aucune sauvegarde téléchargeable n'est fournie. Les fichiers Storage ne sont pas inclus dans les sauvegardes de base.
- Impact : perte de l'historique, des commerces, des photos.
- Probabilité : 2. Impact : 4. Criticité : 8, Élevée.
- Mesure préventive : offre avec sauvegardes quotidiennes, ou PITR ; export `pg_dump` hebdomadaire chiffré hors Supabase ; copie des buckets.
- Mesure corrective : restauration depuis la dernière sauvegarde, rejouer les migrations.
- Détection : vérification mensuelle de la date de la dernière sauvegarde.
- Test : restaurer une sauvegarde dans un projet de test et comparer les volumes.
- État actuel : Absent dans le dépôt. Plan Supabase et sauvegardes non vérifiables : à confirmer dans la console.

### R37. Disaster recovery

- Menace : impossibilité de reconstruire le service.
- Scénario : le projet Supabase est perdu. Les migrations permettent de recréer le schéma, mais plusieurs étapes sont manuelles (buckets créés à la main, `008`, `010` ; réglages Auth ; variables Vercel). Le domaine du projet est codé en dur dans les contraintes (`017`, `019`).
- Impact : indisponibilité de plusieurs jours.
- Probabilité : 2. Impact : 4. Criticité : 8, Élevée.
- Mesure préventive : procédure écrite de reconstruction ; création des buckets en migration ; liste des réglages du tableau de bord ; objectifs RTO et RPO ; contact de secours pour l'accès admin.
- Mesure corrective : exécuter la procédure, communiquer aux utilisateurs.
- Détection : exercice de reprise semestriel.
- Test : reconstruire un projet vide à partir du dépôt seul et chronométrer.
- État actuel : Partiel. Migrations versionnées dans `supabase/`. Procédure, buckets en migration (sauf `avatars`, `013`) et RTO/RPO : Absents.

---

## 4. Matrice des risques

| Risque | Probabilité | Impact | Criticité | Protection | Test |
|---|---|---|---|---|---|
| R07 Permissions : auto-approbation à l'insertion | 4 | 4 | 16 Critique | Absente | Insérer un livreur `approved` avec un compte neuf |
| R10 Paiements : montants fixés par le navigateur | 3 | 4 | 12 Critique | Partielle (`014`, `016` figent après création) | Insérer une commande à 1 F |
| R34 Fraude à la commande | 4 | 3 | 12 Critique | Partielle (`014`) | 10 commandes en cours avec un compte |
| R35 Fraude à la livraison | 3 | 4 | 12 Critique | Partielle (`014`, `016`) | Passer `livree` sans code |
| R01 Authentification | 3 | 3 | 9 Élevée | Partielle (Supabase Auth, confirmation désactivée) | Connexion sans email confirmé |
| R04 Mots de passe | 3 | 3 | 9 Élevée | Partielle (6 caractères) | Mot de passe court ou fuité |
| R08 API : lectures publiques excessives | 3 | 3 | 9 Élevée | Partielle (RLS, `006` livreurs ouverts) | `GET livreurs` en anonyme |
| R09 Base : colonnes de réputation modifiables | 3 | 3 | 9 Élevée | Partielle (`014` section 8 et 9) | `PATCH merchants.rating` |
| R13 Documents livreurs | 3 | 3 | 9 Élevée | Absente | Approbation sans pièce |
| R14 Données personnelles | 3 | 3 | 9 Élevée | Partielle (`schema.sql`, `Privacy.tsx`) | Lire le téléphone d'une course disponible |
| R21 Audit trail | 3 | 3 | 9 Élevée | Absente | Changer un statut, chercher la trace |
| R22 Rate limiting | 3 | 3 | 9 Élevée | Partielle (Auth par défaut, cache Pexels) | 50 commandes en une minute |
| R28 Transitions de statut | 3 | 3 | 9 Élevée | Partielle (`016` bloque après annulation) | Commerçant passe `livree` |
| R30 Brute force | 3 | 3 | 9 Élevée | Partielle (limites Auth par défaut) | 30 échecs de connexion |
| R33 Fraude au paiement en espèces | 3 | 3 | 9 Élevée | Absente | Rapprochement d'une journée |
| R05 MFA administrateur | 2 | 4 | 8 Élevée | Absente | Action admin sans second facteur |
| R06 RBAC par email codé en dur | 2 | 4 | 8 Élevée | Partielle (`006`) | Recréer un compte avec le même email |
| R36 Sauvegardes | 2 | 4 | 8 Élevée | Absente dans le dépôt | Restauration dans un projet de test |
| R37 Disaster recovery | 2 | 4 | 8 Élevée | Partielle (migrations versionnées) | Reconstruction depuis le dépôt |
| R02 OTP téléphone | 3 | 2 | 6 Moyenne | Absente | Commande avec numéro inexistant |
| R03 Sessions | 2 | 3 | 6 Moyenne | Partielle (`supabaseClient.ts`) | Fermer et rouvrir le navigateur |
| R12 Upload de fichiers | 3 | 2 | 6 Moyenne | Partielle (`013`, `014`) | 20 vidéos d'affilée |
| R17 Stockage public | 2 | 3 | 6 Moyenne | Partielle (`014`) | URL vidéo sans session |
| R23 Anti-abus | 3 | 2 | 6 Moyenne | Partielle (`006`, `015`) | 20 propositions de marché |
| R25 XSS | 2 | 3 | 6 Moyenne | Partielle (React, CSP `vercel.json`) | URL `javascript:` en base |
| R27 IDOR | 2 | 3 | 6 Moyenne | Partielle (RLS) | Compte A lit les données de B |
| R29 API abuse | 3 | 2 | 6 Moyenne | Partielle (`api/pexels.ts`) | `select=*` sans limite |
| R31 Session hijacking | 2 | 3 | 6 Moyenne | Partielle (CSP, HSTS) | Réutiliser un jeton révoqué |
| R15 Géolocalisation | 2 | 2 | 4 Moyenne | Partielle (`007`, RLS) | Coordonnées incohérentes |
| R16 Notifications | 2 | 2 | 4 Moyenne | Absente | 5 réinitialisations |
| R18 Secrets | 1 | 4 | 4 Moyenne | Présente (`.gitignore`, `api/pexels.ts`) | Recherche de clés dans le dépôt et `dist/` |
| R19 Variables d'environnement | 2 | 2 | 4 Moyenne | Partielle | URL Supabase d'une prévisualisation |
| R20 Logs | 2 | 2 | 4 Moyenne | Partielle (plateforme) | Erreur Pexels provoquée |
| R24 Injection | 1 | 4 | 4 Moyenne | Présente (`supabase-js`, PL/pgSQL statique) | Charge `' or 1=1 --` |
| R26 CSRF | 1 | 2 | 2 Faible | Présente (jeton en en-tête, `vercel.json`) | Appel inter-origine sans jeton |
| R11 Webhooks | 1 | 1 | 1 Faible | Sans objet | Appel non signé (Phase 2) |
| R32 Webhook spoofing | 1 | 1 | 1 Faible | Sans objet | Appel non signé (Phase 2) |

---

## 5. Exigences de sécurité (synthèse normative)

Les exigences ci-dessous sont obligatoires avant l'ouverture au public, sauf mention Phase 2.

- EX-01. Aucune donnée de statut, de réputation ou de montant n'est acceptée telle quelle du navigateur. La base la fixe ou la recalcule (R07, R09, R10, R15).
- EX-02. Chaque table exposée a une policy par opération. Toute nouvelle migration est accompagnée d'un test RLS multi-comptes (R08, R27).
- EX-03. L'administrateur est identifié par `user_id` dans une table de rôles, avec MFA obligatoire (R05, R06).
- EX-04. Les données personnelles d'un client ne sont visibles que des acteurs de sa commande, après attribution (R14).
- EX-05. Les fichiers privés (vidéos, documents livreurs) sont dans des buckets privés, lus par URL signée courte (R13, R17).
- EX-06. Les statuts suivent la machine à états D5 et chaque changement est tracé (R21, R28).
- EX-07. Les créations (comptes, commandes, propositions, fichiers) sont limitées par utilisateur et par période (R22, R23, R34).
- EX-08. Aucun secret serveur n'est préfixé `VITE_` ni commis ; scan automatisé (R18).
- EX-09. Sauvegardes quotidiennes vérifiées et procédure de reprise écrite (R36, R37).
- EX-10. Phase 2 : paiement en ligne seulement après EX-01, avec webhooks signés, idempotents et rapprochés (R11, R32).

---

## 6. Checklist de mise en production

Triée par criticité. Une case n'est cochée qu'avec une preuve (migration, capture du réglage, résultat de test).

### Critique

- [ ] Trigger ou policy d'insertion forçant `status = 'pending'` sur `merchants` et `livreurs` hors admin (R07).
- [ ] `rating` et `review_count` forcés à leur valeur par défaut à l'insertion, figés en mise à jour hors trigger d'avis (R07, R09).
- [ ] Revue manuelle de tous les commerces et livreurs `approved` en production ; suspension des non validés (R07).
- [ ] Calcul de `subtotal`, `service_fee`, `delivery_fee`, `distance_km`, `total` par la base à la création (D3) (R10).
- [ ] Limite de commandes en cours par client (R34).
- [ ] `livree` réservé au livreur attribué ; transitions de statut contrôlées (D5) (R28, R35).
- [ ] Test d'intrusion RLS rejoué avec la clé anonyme et quatre comptes (client, commerçant, livreur, admin).

### Élevée

- [ ] Confirmation d'email activée dans Supabase Auth (R01).
- [ ] Protection contre les mots de passe fuités activée ; longueur minimale 10 ; formulaires alignés (R04).
- [ ] URL configuration : Site URL et Redirect URLs limitées au domaine de production (R04).
- [ ] MFA TOTP activée pour l'admin ; `is_admin()` exige `aal2` (R05).
- [ ] Table de rôles ; `is_admin()` par `user_id` ; email admin retiré du bundle (R06, R30).
- [ ] Captcha à l'inscription et à la connexion (R23, R30).
- [ ] Lecture de `livreurs` restreinte ; avis exposés sans `user_id` ; produits limités aux commerces approuvés (R08).
- [ ] Téléphone et adresse précise du client masqués avant acceptation (R14).
- [ ] Table `audit_log` en insertion seule, alimentée par triggers (R21).
- [ ] Limite par IP sur `/api/pexels` (Vercel Firewall) et limites Supabase Auth revues (R22, R29).
- [ ] Pièces d'identité livreur exigées avant approbation, bucket privé (R13).
- [ ] Circuit de l'argent décidé (D4) et rapprochement journalier en place (R33).
- [ ] Plan Supabase avec sauvegardes quotidiennes ; export hebdomadaire hors Supabase ; restauration testée (R36).
- [ ] Procédure de reprise écrite ; buckets créés par migration ; RTO et RPO fixés (R37).
- [ ] Données de démonstration supprimées de la production (PRD S7).

### Moyenne

- [ ] Bucket `shopping-videos` privé, URL signées, purge après délai (R14, R17).
- [ ] Types vidéo en liste fermée ; nom de fichier généré ; quota par utilisateur ; `product-photos` réservé aux commerçants (R12).
- [ ] Contraintes de domaine sur `shopping_video_url`, `image_url`, `kiosk_photos`, `kiosk_photo_url`, `avatar_url` (R25).
- [ ] « Rester connecté » décoché par défaut ; déconnexion de tous les appareils ; rotation des jetons de rafraîchissement vérifiée (R03, R31).
- [ ] Vérification du téléphone par OTP avant la première commande (R02).
- [ ] SMTP personnalisé avec SPF, DKIM, DMARC (R16).
- [ ] Projet Supabase séparé pour les prévisualisations Vercel (R19).
- [ ] Messages d'erreur génériques côté client ; collecte d'erreurs sans données personnelles (R20).
- [ ] Distance de livraison calculée en base (R15).
- [ ] Plafond de lignes par requête PostgREST (R29).
- [ ] Limite de propositions de marchés en attente par compte (R23).
- [ ] Scan de secrets en pré-commit et en CI (R18).
- [ ] Suppression de compte en libre-service avec effacement des fichiers ; registre des traitements ; hébergement UE confirmé (R14).

### Faible

- [ ] Garder l'authentification par jeton en en-tête, sans cookie de session (R26).
- [ ] Spécification des webhooks signés et idempotents avant toute intégration mobile money (R11, R32).
- [ ] Ajouter `preload` à HSTS une fois le domaine définitif en place (`vercel.json`).
