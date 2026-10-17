import { CalendarDays, LockKeyhole, Target, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const ATOUTS = [
  { Icone: Wallet, texte: 'Ton salaire, tes charges et tes enveloppes, mois après mois.' },
  { Icone: CalendarDays, texte: 'Ce qui te reste aujourd’hui, cette semaine, ce mois-ci.' },
  { Icone: Target, texte: 'Tes objectifs d’épargne, avec la date où tu les atteins.' },
]

/**
 * Écrans d'authentification (lot 23) : le bandeau sauge de l'app à gauche (bureau), le formulaire à droite.
 * Sur mobile, le formulaire seul, sous le logo.
 */
export function MiseEnPageAuth({ titre, sousTitre, children, pied }: { titre: string; sousTitre?: ReactNode; children: ReactNode; pied?: ReactNode }) {
  return (
    <div className="min-h-screen bg-page lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative isolate hidden overflow-hidden bg-bandeau px-12 py-11 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <span className="absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full bg-black/[0.12]" aria-hidden />
        <span className="absolute -right-40 top-1/4 -z-10 h-[520px] w-[520px] rounded-full bg-bandeau-cercle/50" aria-hidden />
        <span className="absolute -bottom-32 left-1/4 -z-10 h-80 w-80 rounded-full bg-white/[0.04]" aria-hidden />
        <Link to="/connexion" className="text-logo text-white">
          MySalary<span className="text-white/60">.</span>
        </Link>
        <div className="max-w-md">
          <p className="text-[40px] font-bold leading-[48px] tracking-tight">Ton salaire, mois après mois.</p>
          <ul className="mt-10 flex flex-col gap-5">
            {ATOUTS.map(({ Icone, texte }) => (
              <li key={texte} className="flex items-start gap-4 text-texte text-white/90">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.12] ring-1 ring-white/20">
                  <Icone className="h-5 w-5" aria-hidden />
                </span>
                <span className="pt-2">{texte}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 text-texte-sm text-white/75">
          <LockKeyhole className="h-4 w-4" aria-hidden />
          Chaque compte est privé : personne d’autre ne voit tes données.
        </p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="apparition-vue w-full max-w-[420px]">
          <Link to="/connexion" className="mb-10 block text-logo text-lien lg:hidden">
            MySalary<span className="text-primaire">.</span>
          </Link>
          <h1 className="text-[28px] font-bold leading-9 tracking-tight text-encre">{titre}</h1>
          {sousTitre && <p className="mt-2 text-texte text-gris">{sousTitre}</p>}
          <div className="mt-8 rounded-carte bg-white p-6 shadow-carte sm:p-8">{children}</div>
          {pied && <div className="mt-6 text-center text-texte-sm text-gris">{pied}</div>}
          <p className="mt-8 flex justify-center gap-6 text-mention text-gris">
            <Link to="/conditions" className="hover:text-encre hover:underline">
              Conditions d’utilisation
            </Link>
            <Link to="/confidentialite" className="hover:text-encre hover:underline">
              Confidentialité
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
