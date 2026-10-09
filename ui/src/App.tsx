import * as Tooltip from '@radix-ui/react-tooltip'
import { AnimatePresence, motion } from 'framer-motion'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { GardeCompte } from './components/GardeCompte'
import { MiseEnPage } from './components/MiseEnPage'
import { Notifications } from './components/Notifications'
import { PageAVenir } from './features/a-venir/PageAVenir'
import { FournisseurSaisieRapide, useSaisieRapide } from './features/depenses/SaisieRapide'
import { PageMois } from './features/mois/PageMois'
import { PageEditionObjectif } from './features/objectifs/PageEditionObjectif'
import { PageObjectif } from './features/objectifs/PageObjectif'
import { PageObjectifs } from './features/objectifs/PageObjectifs'
import { PagePlan } from './features/plan/PagePlan'
import { PageProfils } from './features/profils/PageProfils'
import { PageReglages } from './features/reglages/PageReglages'
import { useReglages } from './features/reglages/requetes'
import { transitionVue, transitionVueSobre } from './lib/animations'
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
  const { animations } = useAnimations()
  const { ouvrir } = useSaisieRapide()
  const transition = animations ? transitionVue : transitionVueSobre

  return (
    <MiseEnPage simple={emplacement.pathname === '/profils'} onSaisie={() => ouvrir()}>
      <AnimatePresence mode="wait">
        <motion.div key={emplacement.pathname} {...transition}>
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
            <Route path="/reglages" element={compte(<PageReglages />)} />
            <Route path="/plan" element={compte(<PagePlan />)} />
            <Route path="/mois" element={compte(<PageMois />)} />
            <Route path="/objectifs" element={compte(<PageObjectifs />)} />
            <Route path="/objectifs/nouveau" element={compte(<PageEditionObjectif />)} />
            <Route path="/objectifs/:id" element={compte(<PageObjectif />)} />
            <Route path="/objectifs/:id/modifier" element={compte(<PageEditionObjectif />)} />
            {DESTINATIONS.filter((d) => !['/plan', '/mois', '/objectifs'].includes(d.chemin)).map((d) => (
              <Route key={d.chemin} path={d.chemin} element={compte(<PageAVenir titre={d.libelle} lot={d.lot} />)} />
            ))}
            <Route path="*" element={<PageAVenir titre="Page introuvable" />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
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
