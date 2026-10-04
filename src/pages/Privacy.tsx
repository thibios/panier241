import LegalPage, { LegalSection, LEGAL_CONTACT_EMAIL } from '../components/layout/LegalPage'

const list = 'list-disc space-y-1 pl-5'

export default function Privacy() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="4 octobre 2026">
      <p>
        Panier 241 est un service de commande et de livraison de produits de marchés et de commerces à
        Libreville (Gabon). Cette page explique quelles données personnelles nous collectons, pourquoi, avec
        qui elles sont partagées et comment exercer vos droits.
      </p>

      <LegalSection title="Responsable du traitement">
        <p>
          Le responsable du traitement est l'exploitant de Panier 241, à Libreville (Gabon). Pour toute
          question relative à vos données : <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Données que nous collectons">
        <ul className={list}>
          <li>Compte : prénom, nom, adresse email, numéro de téléphone, mot de passe (stocké chiffré).</li>
          <li>
            Livraison : adresses enregistrées, quartier, et position GPS uniquement si vous l'autorisez en
            ajoutant une adresse.
          </li>
          <li>Commandes : produits, montants, créneau, adresse de livraison, statut et historique.</li>
          <li>Vidéo de liste de courses, si vous choisissez d'en joindre une à une commande.</li>
          <li>Avis et notes que vous laissez sur un commerçant, et vos commerçants favoris.</li>
          <li>
            Commerçants : nom de la boutique, téléphone, adresse, photo du kiosque, produits et prix.
          </li>
          <li>Livreurs : nom, téléphone et type de véhicule.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Pourquoi nous les utilisons">
        <ul className={list}>
          <li>Créer et sécuriser votre compte.</li>
          <li>Transmettre votre commande au commerçant et organiser sa livraison.</li>
          <li>Calculer les frais de livraison à partir de la distance.</li>
          <li>Vous informer de l'avancement de vos commandes.</li>
          <li>Valider les comptes commerçants et livreurs et prévenir les abus.</li>
        </ul>
        <p>
          Ces traitements reposent sur l'exécution du service que vous demandez et, pour la position GPS,
          sur votre consentement. Nous ne vendons pas vos données et nous n'affichons pas de publicité
          ciblée.
        </p>
      </LegalSection>

      <LegalSection title="Avec qui elles sont partagées">
        <ul className={list}>
          <li>
            Le commerçant voit le contenu de la commande, le créneau, l'adresse de livraison et la vidéo
            éventuelle.
          </li>
          <li>
            Le livreur voit la commande, l'adresse de livraison et votre numéro de téléphone pour vous
            joindre.
          </li>
          <li>Une fois la livraison acceptée, vous voyez le nom et le numéro du livreur.</li>
          <li>
            Nos prestataires techniques : Supabase (base de données, authentification et fichiers, hébergés
            dans l'Union européenne), Vercel (hébergement du site), Google Fonts (polices d'écriture) et
            Pexels (photos d'illustration, sans transmission de données personnelles).
          </li>
        </ul>
        <p>
          Les boutons WhatsApp ouvrent l'application WhatsApp : les messages que vous y envoyez relèvent des
          conditions de WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="Stockage sur votre appareil">
        <p>
          Nous n'utilisons pas de cookies publicitaires ni de traceurs d'audience. Le navigateur conserve
          uniquement ce qui est nécessaire au fonctionnement : votre session de connexion, votre panier en
          cours et l'état de lecture de vos notifications.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Vos données sont conservées tant que votre compte est actif. Vous pouvez demander la suppression
          de votre compte et de vos données à tout moment ; certaines informations de commande peuvent être
          conservées plus longtemps lorsque la loi l'exige.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous pouvez demander l'accès à vos données, leur rectification, leur suppression, la limitation
          ou l'opposition à leur traitement, ainsi qu'une copie de vos données. Écrivez-nous à{' '}
          <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> : nous
          répondons dans un délai d'un mois.
        </p>
        <p>
          Ces droits sont prévus par la loi gabonaise relative à la protection des données à caractère
          personnel et, si vous résidez dans l'Union européenne, par le Règlement général sur la protection
          des données (RGPD). Vous pouvez aussi saisir l'autorité gabonaise de protection des données
          personnelles ou l'autorité de votre pays de résidence.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Cette politique peut évoluer. La date de dernière mise à jour figure en haut de la page ; en cas
          de changement important, nous vous en informons dans l'application.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
