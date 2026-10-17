import { VERSION_CONDITIONS, formaterDate, type InfosPubliquesDto } from '@mysalary/partage'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

/**
 * Conditions d'utilisation et politique de confidentialité (lot P3, prod.md § 7.4). Pages publiques, lisibles connecté ou non.
 * Elles décrivent ce que fait réellement l'app : à relire dès qu'un traitement change (hébergeur, e-mails, analyse).
 */
function useInfos() {
  return useQuery({ queryKey: ['infos'], queryFn: () => api.lire<InfosPubliquesDto>('/infos'), staleTime: Infinity })
}

function Contact() {
  const { data } = useInfos()
  if (!data?.contact) return <>l’adresse de contact indiquée par le responsable de cette installation</>
  return (
    <a href={`mailto:${data.contact}`} className="font-semibold text-lien hover:underline">
      {data.contact}
    </a>
  )
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-titre text-encre">{titre}</h2>
      <div className="mt-3 flex flex-col gap-3 text-texte text-encre-2">{children}</div>
    </section>
  )
}

function Liste({ elements }: { elements: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {elements.map((e, i) => (
        <li key={i}>{e}</li>
      ))}
    </ul>
  )
}

function MiseEnPageLegale({ titre, autre, children }: { titre: string; autre: { libelle: string; vers: string }; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page px-4 py-10 sm:px-10">
      <article className="apparition-vue mx-auto w-full max-w-2xl">
        <Link to="/connexion" className="text-logo text-lien">
          MySalary<span className="text-primaire">.</span>
        </Link>
        <h1 className="mt-10 text-[28px] font-bold leading-9 tracking-tight text-encre">{titre}</h1>
        <p className="mt-2 text-texte-sm text-gris">Version du {formaterDate(VERSION_CONDITIONS)} · MySalary est en version de test.</p>
        <div className="mt-8 rounded-carte bg-white p-6 shadow-carte sm:p-8">{children}</div>
        <p className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-texte-sm">
          <Link to={autre.vers} className="font-semibold text-lien hover:underline">
            {autre.libelle}
          </Link>
          <Link to="/" className="font-semibold text-lien hover:underline">
            Retour à MySalary
          </Link>
        </p>
      </article>
    </div>
  )
}

export function PageConditions() {
  return (
    <MiseEnPageLegale titre="Conditions d’utilisation" autre={{ libelle: 'Politique de confidentialité', vers: '/confidentialite' }}>
      <p className="text-texte text-encre-2">En créant un compte, tu acceptes ces conditions. Elles sont courtes : lis-les.</p>
      <Section titre="1. Le service">
        <p>MySalary t’aide à suivre ton budget à partir de ton salaire : ce qui te reste, tes charges, ton épargne et tes objectifs. C’est une version de test, gratuite, proposée pour recueillir des avis.</p>
      </Section>
      <Section titre="2. Qui le propose">
        <p>
          MySalary est édité par Oussama Al Mouallim El Kanouni. Pour toute question : <Contact />.
        </p>
      </Section>
      <Section titre="3. Ton compte">
        <Liste
          elements={[
            'Un compte par personne, avec ta propre adresse e-mail.',
            'Ton mot de passe est personnel : ne le partage pas.',
            'Tu peux supprimer ton compte à tout moment depuis Réglages ; tout est alors effacé.',
          ]}
        />
      </Section>
      <Section titre="4. Ce que MySalary n’est pas">
        <Liste
          elements={[
            'Ce n’est ni une banque ni un conseil financier : MySalary n’accède à aucun compte bancaire et ne déplace aucun argent.',
            'Les chiffres viennent de ce que tu saisis. Les projections (dates d’objectif, scénarios) sont des estimations, pas des promesses.',
            'Tes décisions financières restent les tiennes.',
          ]}
        />
      </Section>
      <Section titre="5. Version de test">
        <p>
          Le service peut être interrompu, changer ou s’arrêter, sans garantie de disponibilité. Pense à exporter tes données de temps en temps (Réglages › Exporter mes données). Si
          le service s’arrête, tu en seras prévenu par e-mail avant, pour pouvoir les récupérer.
        </p>
      </Section>
      <Section titre="6. Bon usage">
        <p>N’essaie pas d’accéder au compte d’une autre personne ni de perturber le service. Un compte utilisé de cette façon peut être fermé.</p>
      </Section>
      <Section titre="7. Changements et droit applicable">
        <p>Si ces conditions changent, la nouvelle version te sera présentée avant de s’appliquer. Elles sont soumises au droit marocain.</p>
      </Section>
    </MiseEnPageLegale>
  )
}

export function PageConfidentialite() {
  return (
    <MiseEnPageLegale titre="Politique de confidentialité" autre={{ libelle: 'Conditions d’utilisation', vers: '/conditions' }}>
      <p className="text-texte text-encre-2">Ce que MySalary garde sur toi, pourquoi, et comment le récupérer ou l’effacer.</p>
      <Section titre="1. Responsable">
        <p>
          Oussama Al Mouallim El Kanouni, éditeur de MySalary. Contact : <Contact />.
        </p>
      </Section>
      <Section titre="2. Ce qui est gardé">
        <Liste
          elements={[
            'Ton compte : prénom, adresse e-mail, devise, et ton mot de passe sous forme chiffrée (illisible, même pour nous).',
            'Ce que tu saisis : salaire et primes, autres revenus, charges, enveloppes, dépenses, dettes, épargne, objectifs, scénarios et réglages.',
            'Le strict nécessaire au fonctionnement : ta session de connexion, la date de ta dernière visite, et un compteur d’essais de connexion (gardé sous forme d’empreinte, sans ton e-mail ni ton adresse IP en clair).',
          ]}
        />
        <p>Aucune donnée bancaire : MySalary ne se connecte à aucune banque.</p>
      </Section>
      <Section titre="3. Pourquoi">
        <p>
          Uniquement pour faire fonctionner l’app : calculer ton budget et t’envoyer les e-mails de ton compte (confirmation d’adresse, mot de passe oublié, alertes de sécurité,
          confirmation de suppression).
        </p>
        <p>Pas de publicité, pas de revente, pas de pistage, pas d’outil de mesure d’audience. Tes données ne servent qu’à toi.</p>
      </Section>
      <Section titre="4. Cookie">
        <p>Un seul cookie, indispensable : il garde ta session ouverte. Aucun cookie publicitaire ni de mesure d’audience.</p>
      </Section>
      <Section titre="5. Qui y a accès">
        <p>
          Toi seulement dans l’app : chaque compte est isolé des autres. Côté technique, l’éditeur administre le serveur et n’y accède que pour faire fonctionner ou réparer le
          service. Pendant la version de test, les données sont hébergées sur un serveur administré par l’éditeur. Avant tout changement d’hébergeur, cette page sera mise à jour et
          tu en seras prévenu.
        </p>
      </Section>
      <Section titre="6. Combien de temps">
        <Liste
          elements={[
            'Tes données : tant que ton compte existe. Sa suppression les efface toutes, immédiatement.',
            'Une session : 30 jours sans visite au plus.',
            'Un lien reçu par e-mail : 1 heure (mot de passe) ou 24 heures (adresse).',
            'Un compteur d’essais de connexion : de 15 minutes à 1 heure.',
          ]}
        />
      </Section>
      <Section titre="7. Tes droits (loi 09-08)">
        <Liste
          elements={[
            'Accès et portabilité : Réglages › Exporter mes données te donne tout, dans un fichier.',
            'Rectification : modifie directement ce que tu as saisi.',
            'Effacement : Réglages › Supprimer ce compte efface tout ; tu reçois une confirmation.',
            <>
              Opposition ou toute autre demande : écris à <Contact />.
            </>,
          ]}
        />
        <p>Tu peux aussi t’adresser à la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP).</p>
      </Section>
      <Section titre="8. Changements">
        <p>Si cette politique change, la nouvelle version te sera présentée avant de s’appliquer.</p>
      </Section>
    </MiseEnPageLegale>
  )
}
