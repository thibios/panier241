import { Link } from 'react-router-dom'
import LegalPage, { LegalSection, LEGAL_CONTACT_EMAIL } from '../components/layout/LegalPage'

const list = 'list-disc space-y-1 pl-5'

export default function Terms() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updatedAt="4 octobre 2026">
      <LegalSection title="1. Objet">
        <p>
          Panier 241 met en relation des clients, des commerçants de marchés et de magasins, et des livreurs
          indépendants à Libreville (Gabon). Les présentes conditions encadrent l'utilisation de
          l'application par ces trois types d'utilisateurs. En créant un compte, vous les acceptez.
        </p>
      </LegalSection>

      <LegalSection title="2. Compte">
        <ul className={list}>
          <li>Vous fournissez des informations exactes et gardez votre mot de passe confidentiel.</li>
          <li>Un compte est personnel ; vous êtes responsable de l'usage qui en est fait.</li>
          <li>
            Les comptes commerçant et livreur sont soumis à validation par Panier 241 avant d'être actifs.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Rôle de Panier 241">
        <p>
          Panier 241 est un intermédiaire technique. Les produits sont vendus par les commerçants, qui en
          fixent les prix et en garantissent la qualité. La livraison est assurée par des livreurs
          indépendants.
        </p>
      </LegalSection>

      <LegalSection title="4. Commandes et prix">
        <ul className={list}>
          <li>
            Le sous-total affiché est une estimation : le prix des produits frais peut varier, et le
            commerçant peut ajuster le montant réel après préparation.
          </li>
          <li>Des frais de service de 5 % du sous-total s'ajoutent à chaque commande.</li>
          <li>
            Les frais de livraison comprennent un forfait de 2 000 F CFA et 300 F CFA par kilomètre entre le
            lieu de vente et l'adresse de livraison. Sans position GPS, un forfait par défaut s'applique.
          </li>
          <li>Le détail du calcul est présenté avant la validation de la commande.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Paiement">
        <p>
          Aucun paiement n'est encaissé dans l'application. La commande se règle à la livraison, en espèces
          ou par mobile money, directement auprès du livreur.
        </p>
      </LegalSection>

      <LegalSection title="6. Livraison">
        <p>
          La livraison a lieu sur le créneau et à l'adresse choisis. Vous vous engagez à être joignable et
          présent. En cas d'empêchement, prévenez le commerçant ou le livreur dès que possible.
        </p>
      </LegalSection>

      <LegalSection title="7. Engagements des commerçants et des livreurs">
        <ul className={list}>
          <li>Proposer des produits licites, conformes à leur description et à leur prix.</li>
          <li>Préparer et livrer les commandes acceptées avec soin et dans les délais.</li>
          <li>
            N'utiliser les coordonnées des clients que pour l'exécution de la commande concernée.
          </li>
        </ul>
        <p>
          Panier 241 peut suspendre un compte en cas de manquement, de fraude ou de comportement
          inapproprié.
        </p>
      </LegalSection>

      <LegalSection title="8. Avis">
        <p>
          Seul un client ayant reçu sa commande peut laisser un avis. Les avis doivent refléter une
          expérience réelle et rester respectueux ; les avis frauduleux ou injurieux peuvent être retirés.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilité">
        <p>
          Panier 241 s'efforce d'assurer la disponibilité du service mais ne garantit pas une disponibilité
          permanente. Sa responsabilité ne peut être engagée pour la qualité des produits vendus par les
          commerçants ni pour un retard dû à un tiers ou à un cas de force majeure.
        </p>
      </LegalSection>

      <LegalSection title="10. Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{' '}
          <Link to="/confidentialite" className="font-medium text-brand underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Modification et droit applicable">
        <p>
          Ces conditions peuvent être mises à jour ; la version en vigueur est celle publiée sur cette page.
          Elles sont soumises au droit gabonais. En cas de litige, contactez-nous d'abord à{' '}
          <a className="font-medium text-brand underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> pour
          rechercher une solution amiable.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
