import * as Switch from '@radix-ui/react-switch'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { IconeVerifie } from './icones'

/** Interrupteur du template (« Also attach pdf in mail »). */
export function Interrupteur({ libelle, actif, onChange }: { libelle: string; actif: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-texte text-encre">{libelle}</span>
      <Switch.Root
        checked={actif}
        aria-label={libelle}
        onCheckedChange={onChange}
        className="relative h-[30px] w-[58px] shrink-0 rounded-pilule bg-interrupteur transition-colors data-[state=checked]:bg-primaire"
      >
        <Switch.Thumb className="block h-6 w-6 translate-x-[3px] rounded-pilule bg-white shadow-bouton transition-transform duration-200 data-[state=checked]:translate-x-[31px]" />
      </Switch.Root>
    </label>
  )
}

/** Pastille d'état du template (« Due on Jan 20, 2022 »). */
export function Pastille({ ton = 'alerte', children }: { ton?: 'alerte' | 'positif' | 'info' | 'neutre'; children: ReactNode }) {
  const tons = {
    alerte: 'bg-alerte-fond text-alerte',
    positif: 'bg-positif-fond text-positif',
    info: 'bg-info-fond text-info',
    neutre: 'bg-teinte text-lien',
  }
  return <span className={cn('inline-flex h-10 items-center rounded-pilule px-5 text-texte font-medium', tons[ton])}>{children}</span>
}

/** Avatar rond du template (dégradé pêche avec formes). */
export function Avatar({ initiale, taille = 52 }: { initiale: string; taille?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-pilule bg-gradient-to-br from-peche-clair to-peche-fonce font-semibold text-white"
      style={{ width: taille, height: taille, fontSize: taille * 0.38 }}
      aria-hidden
    >
      <span className="absolute -bottom-1/3 left-1/4 h-3/4 w-3/4 rounded-full bg-white/25" />
      <span className="relative">{initiale}</span>
    </span>
  )
}

/** Identité en tête de carte : avatar + nom + ligne grise. */
export function Identite({ initiale, nom, detail, verifie }: { initiale: string; nom: string; detail?: string; verifie?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar initiale={initiale} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-titre text-encre">
          {nom}
          {verifie && <IconeVerifie className="h-4 w-4 text-info" />}
        </div>
        {detail && <div className="truncate text-texte text-gris">{detail}</div>}
      </div>
    </div>
  )
}

/** Bouton rond flottant au bord droit (le « › » du template). */
export function BoutonFlottant({ libelle, onClick }: { libelle: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={libelle}
      className="fixed right-0 top-1/2 z-20 hidden h-[50px] w-[50px] translate-x-1/3 place-items-center rounded-pilule bg-white text-gris shadow-flottant transition-transform hover:translate-x-1/4 xl:grid"
    >
      <ChevronRight className="-ml-2 h-5 w-5" />
    </button>
  )
}

export interface LigneTotal {
  libelle: string
  valeur: ReactNode
  fort?: boolean
}

/** Bloc de totaux du template : libellés à gauche, montants à droite, filet, total final. */
export function BlocTotaux({ lignes, total }: { lignes: LigneTotal[]; total: LigneTotal }) {
  return (
    <dl className="chiffres flex flex-col gap-4 text-texte">
      {lignes.map((l) => (
        <div key={l.libelle} className="flex items-center justify-between gap-4">
          <dt className={l.fort ? 'font-semibold text-encre' : 'text-gris'}>{l.libelle}</dt>
          <dd className="font-semibold text-encre">{l.valeur}</dd>
        </div>
      ))}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-filet pt-6">
        <dt className="text-[17px] text-gris">{total.libelle}</dt>
        <dd className="text-[17px] font-bold text-encre">{total.valeur}</dd>
      </div>
    </dl>
  )
}

/** Paire « clé grise : valeur foncée » (bloc « Wire Transfer » du template). */
export function Paire({ cle, valeur }: { cle: string; valeur: ReactNode }) {
  return (
    <p className="text-texte-sm">
      <span className="text-gris">{cle} : </span>
      <span className="font-semibold text-encre">{valeur}</span>
    </p>
  )
}
