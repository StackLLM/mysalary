import * as Tooltip from '@radix-ui/react-tooltip'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ErreurPage } from './components/ErreurPage'
import { GardeCompte } from './components/GardeCompte'
import { MiseEnPage } from './components/MiseEnPage'
import { Notifications } from './components/Notifications'
import { PageAVenir } from './features/a-venir/PageAVenir'
import { PageAujourdhui } from './features/aujourdhui/PageAujourdhui'
import { PageCalendrier } from './features/calendrier/PageCalendrier'
import { FournisseurSaisieRapide, useSaisieRapide } from './features/depenses/SaisieRapide'
import { PageMois } from './features/mois/PageMois'
import { PageEditionObjectif } from './features/objectifs/PageEditionObjectif'
import { PageObjectif } from './features/objectifs/PageObjectif'
import { PageObjectifs } from './features/objectifs/PageObjectifs'
import { PageSimulateur } from './features/simulateur/PageSimulateur'
import { PagePlan } from './features/plan/PagePlan'
import { PageProfils } from './features/profils/PageProfils'
import { PageReglages } from './features/reglages/PageReglages'
import { useReglages } from './features/reglages/requetes'
import { DESTINATIONS } from './lib/navigation'
import { FournisseurAnimations, useAnimations } from './state/animations'
import { FournisseurCompte } from './state/compte'

// Chargée à la demande : elle embarque les graphiques (lourds).
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

const compte = (page: ReactNode) => <GardeCompte>{page}</GardeCompte>

function Vues() {
  const emplacement = useLocation()
  const { ouvrir } = useSaisieRapide()

  return (
    <MiseEnPage simple={emplacement.pathname === '/profils'} onSaisie={() => ouvrir()}>
      {/*
        Nouvelle page affichée tout de suite, avec une apparition en CSS. L'ancienne transition attendait la fin de
        l'animation de sortie (AnimatePresence « wait ») : une navigation rapide pouvait laisser la page blanche.
        Une erreur dans une page reste dans la page (ErreurPage), sans blanchir toute l'application.
      */}
      <div key={emplacement.pathname} className="apparition-vue">
        <ErreurPage cle={emplacement.pathname}>
          <Routes location={emplacement}>
            <Route path="/profils" element={<PageProfils />} />
            <Route
              path="/vitrine"
              element={
                <Suspense fallback={<div className="py-16 text-center text-texte-sm text-gris">Chargement…</div>}>
                  <PageVitrine />
                </Suspense>
              }
            />
            <Route path="/" element={compte(<PageAujourdhui />)} />
            <Route path="/calendrier" element={compte(<PageCalendrier />)} />
            <Route path="/reglages" element={compte(<PageReglages />)} />
            <Route path="/plan" element={compte(<PagePlan />)} />
            <Route path="/mois" element={compte(<PageMois />)} />
            <Route path="/objectifs" element={compte(<PageObjectifs />)} />
            <Route path="/objectifs/nouveau" element={compte(<PageEditionObjectif />)} />
            <Route path="/objectifs/:id" element={compte(<PageObjectif />)} />
            <Route path="/objectifs/:id/modifier" element={compte(<PageEditionObjectif />)} />
            <Route path="/simulateur" element={compte(<PageSimulateur />)} />
            {DESTINATIONS.filter((d) => !['/', '/plan', '/mois', '/objectifs', '/calendrier'].includes(d.chemin)).map((d) => (
              <Route key={d.chemin} path={d.chemin} element={compte(<PageAVenir titre={d.libelle} lot={d.lot} />)} />
            ))}
            <Route path="*" element={<PageAVenir titre="Page introuvable" />} />
          </Routes>
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
