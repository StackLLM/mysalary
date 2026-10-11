import * as Tooltip from '@radix-ui/react-tooltip'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { styleBouton } from './components/Bouton'
import { Carte } from './components/Carte'
import { ErreurPage } from './components/ErreurPage'
import { FilAriane } from './components/FilAriane'
import { GardeCompte } from './components/GardeCompte'
import { MiseEnPage } from './components/MiseEnPage'
import { Notifications } from './components/Notifications'
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
const PageProfils = lazy(() => import('./features/profils/PageProfils').then((m) => ({ default: m.PageProfils })))
const PageReglages = lazy(() => import('./features/reglages/PageReglages').then((m) => ({ default: m.PageReglages })))
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

function Vues() {
  const emplacement = useLocation()
  const { ouvrir } = useSaisieRapide()

  return (
    <MiseEnPage simple={emplacement.pathname === '/profils' || emplacement.pathname === '/onboarding'} onSaisie={() => ouvrir()}>
      {/*
        Nouvelle page affichée tout de suite, avec une apparition en CSS. L'ancienne transition attendait la fin de
        l'animation de sortie (AnimatePresence « wait ») : une navigation rapide pouvait laisser la page blanche.
        Une erreur dans une page reste dans la page (ErreurPage), sans blanchir toute l'application.
      */}
      <div key={emplacement.pathname} className="apparition-vue">
        <ErreurPage cle={emplacement.pathname}>
          <Suspense fallback={<div className="py-16 text-center text-texte-sm text-gris" role="status">Chargement…</div>}>
          <Routes location={emplacement}>
            <Route path="/profils" element={<PageProfils />} />
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
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <FournisseurSaisieRapide>
              <Vues />
            </FournisseurSaisieRapide>
          </BrowserRouter>
          <Notifications />
        </Tooltip.Provider>
      </FournisseurCompte>
    </FournisseurAnimations>
  )
}
