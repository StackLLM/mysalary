import * as Tooltip from '@radix-ui/react-tooltip'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { styleBouton } from './components/Bouton'
import { Carte } from './components/Carte'
import { ErreurPage } from './components/ErreurPage'
import { FilAriane } from './components/FilAriane'
import { GardeCompte } from './components/GardeCompte'
import { MiseEnPage } from './components/MiseEnPage'
import { Notifications } from './components/Notifications'
import { useSession } from './features/compte/requetes'
import { suiteSure } from './features/connexion/saisie'
import { FournisseurSaisieRapide, useSaisieRapide } from './features/depenses/SaisieRapide'
import { useReglages } from './features/reglages/requetes'
import { FournisseurAnimations, useAnimations } from './state/animations'
import { FournisseurCompte } from './state/compte'

// Chaque page est chargée à la demande : le premier écran ne porte que ce qu'il affiche.
const PageAnnee = lazy(() => import('./features/annee/PageAnnee').then((m) => ({ default: m.PageAnnee })))
const PageAujourdhui = lazy(() => import('./features/aujourdhui/PageAujourdhui').then((m) => ({ default: m.PageAujourdhui })))
const PageCalendrier = lazy(() => import('./features/calendrier/PageCalendrier').then((m) => ({ default: m.PageCalendrier })))
const PageOnboarding = lazy(() => import('./features/onboarding/PageOnboarding').then((m) => ({ default: m.PageOnboarding })))
const PageMois = lazy(() => import('./features/mois/PageMois').then((m) => ({ default: m.PageMois })))
const PageEditionObjectif = lazy(() => import('./features/objectifs/PageEditionObjectif').then((m) => ({ default: m.PageEditionObjectif })))
const PageObjectif = lazy(() => import('./features/objectifs/PageObjectif').then((m) => ({ default: m.PageObjectif })))
const PageObjectifs = lazy(() => import('./features/objectifs/PageObjectifs').then((m) => ({ default: m.PageObjectifs })))
const PageSimulateur = lazy(() => import('./features/simulateur/PageSimulateur').then((m) => ({ default: m.PageSimulateur })))
const PagePlan = lazy(() => import('./features/plan/PagePlan').then((m) => ({ default: m.PagePlan })))
const PageReglages = lazy(() => import('./features/reglages/PageReglages').then((m) => ({ default: m.PageReglages })))
// Écrans d'authentification (lot 23), hors de la mise en page de l'app.
const PageConnexion = lazy(() => import('./features/connexion/PageConnexion').then((m) => ({ default: m.PageConnexion })))
const PageInscription = lazy(() => import('./features/connexion/PageInscription').then((m) => ({ default: m.PageInscription })))
const PageMotDePasseOublie = lazy(() => import('./features/connexion/PageMotDePasseOublie').then((m) => ({ default: m.PageMotDePasseOublie })))
const PageVerificationEmail = lazy(() => import('./features/connexion/PageVerificationEmail').then((m) => ({ default: m.PageVerificationEmail })))
const PageNouveauMotDePasse = lazy(() => import('./features/connexion/PageNouveauMotDePasse').then((m) => ({ default: m.PageNouveauMotDePasse })))
// La vitrine du design system n'existe qu'en développement.
const PageVitrine = lazy(() => import('./features/vitrine/PageVitrine').then((m) => ({ default: m.PageVitrine })))

/** Le réglage « animations » du compte ouvert pilote la bascule globale. */
function SynchroAnimations() {
  const { data } = useReglages()
  const { definir } = useAnimations()
  const actives = data?.animations
  useEffect(() => {
    if (actives !== undefined) definir(actives)
  }, [actives, definir])
  return null
}

function PageIntrouvable() {
  return (
    <>
      <FilAriane etapes={[{ libelle: 'Page introuvable' }]} />
      <Carte espacement="large" className="max-w-2xl">
        <h1 className="text-titre text-encre">Cette page n’existe pas.</h1>
        <Link to="/" className={styleBouton({ variante: 'teinte', taille: 'md', className: 'mt-6' })}>
          Retour à Aujourd’hui
        </Link>
      </Carte>
    </>
  )
}

const compte = (page: ReactNode) => <GardeCompte>{page}</GardeCompte>

/**
 * Écrans publics : un compte déjà connecté va directement à l'app (ou à la page demandée).
 * `vers` : destination d'un compte dont la mise en route n'est pas finie (juste après l'inscription).
 */
function Public({ children, vers }: { children: ReactNode; vers?: string }) {
  const session = useSession()
  const [params] = useSearchParams()
  if (session.isPending) return null
  if (session.data) return <Navigate to={vers && !session.data.onboardingTermine ? vers : suiteSure(params.get('suite'))} replace />
  return children
}

const CHEMINS_PUBLICS = ['/connexion', '/inscription', '/mot-de-passe/oubli', '/mot-de-passe/nouveau', '/email/verification']

/** Les écrans publics ont leur propre mise en page ; le reste est l'app, derrière la garde. */
function Racine() {
  const emplacement = useLocation()
  if (!CHEMINS_PUBLICS.includes(emplacement.pathname)) return <Vues />
  const page = { '/connexion': <PageConnexion />, '/inscription': <PageInscription />, '/mot-de-passe/oubli': <PageMotDePasseOublie />, '/mot-de-passe/nouveau': <PageNouveauMotDePasse />, '/email/verification': <PageVerificationEmail /> }[emplacement.pathname]
  // Les liens d'un e-mail (mot de passe, confirmation d'adresse) s'ouvrent aussi connecté.
  if (emplacement.pathname === '/mot-de-passe/nouveau' || emplacement.pathname === '/email/verification') return <Suspense fallback={null}>{page}</Suspense>
  return (
    <Suspense fallback={null}>
      <Public vers={emplacement.pathname === '/inscription' ? '/onboarding' : undefined}>{page}</Public>
    </Suspense>
  )
}

function Vues() {
  const emplacement = useLocation()
  const { ouvrir } = useSaisieRapide()

  return (
    <MiseEnPage simple={emplacement.pathname === '/onboarding'} onSaisie={() => ouvrir()}>
      {/*
        Nouvelle page affichée tout de suite, avec une apparition en CSS. L'ancienne transition attendait la fin de
        l'animation de sortie (AnimatePresence « wait ») : une navigation rapide pouvait laisser la page blanche.
        Une erreur dans une page reste dans la page (ErreurPage), sans blanchir toute l'application.
      */}
      <div key={emplacement.pathname} className="apparition-vue">
        <ErreurPage cle={emplacement.pathname}>
          <Suspense fallback={<div className="py-16 text-center text-texte-sm text-gris" role="status">Chargement…</div>}>
          <Routes location={emplacement}>
            {import.meta.env.DEV && <Route path="/vitrine" element={<PageVitrine />} />}
            <Route path="/" element={compte(<PageAujourdhui />)} />
            <Route path="/onboarding" element={compte(<PageOnboarding />)} />
            <Route path="/annee" element={compte(<PageAnnee />)} />
            <Route path="/calendrier" element={compte(<PageCalendrier />)} />
            <Route path="/reglages" element={compte(<PageReglages />)} />
            <Route path="/plan" element={compte(<PagePlan />)} />
            <Route path="/mois" element={compte(<PageMois />)} />
            <Route path="/objectifs" element={compte(<PageObjectifs />)} />
            <Route path="/objectifs/nouveau" element={compte(<PageEditionObjectif />)} />
            <Route path="/objectifs/:id" element={compte(<PageObjectif />)} />
            <Route path="/objectifs/:id/modifier" element={compte(<PageEditionObjectif />)} />
            <Route path="/simulateur" element={compte(<PageSimulateur />)} />
            <Route path="*" element={<PageIntrouvable />} />
          </Routes>
          </Suspense>
        </ErreurPage>
      </div>
    </MiseEnPage>
  )
}

export function App() {
  return (
    <FournisseurAnimations>
      <FournisseurCompte>
        <SynchroAnimations />
        <Tooltip.Provider delayDuration={250}>
          <BrowserRouter>
            <FournisseurSaisieRapide>
              <Racine />
            </FournisseurSaisieRapide>
          </BrowserRouter>
          <Notifications />
        </Tooltip.Provider>
      </FournisseurCompte>
    </FournisseurAnimations>
  )
}
