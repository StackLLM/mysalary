import { LogOut, Settings } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUtilisateurCourant } from '../features/profils/requetes'
import { cn } from '../lib/cn'
import { DESTINATIONS } from '../lib/navigation'
import { useCompte } from '../state/compte'
import { Avatar } from './Elements'
import { IconeCloche, IconeEngrenage } from './icones'
import { Menu } from './Menu'

/**
 * Barre de navigation du template : logo, liens icône + texte, onglet actif souligné,
 * deux boutons ronds gris, séparateur, avatar.
 * `simple` : écran Profils, sans navigation ni compte.
 */
export function Entete({ simple = false }: { simple?: boolean }) {
  const utilisateur = useUtilisateurCourant()
  const { quitter } = useCompte()
  const naviguer = useNavigate()

  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-5 lg:px-14">
        <NavLink to="/" className="shrink-0 text-logo text-lien">
          MySalary<span className="text-primaire">.</span>
        </NavLink>

        {!simple && (
        <nav aria-label="Navigation principale" className="ml-6 hidden h-full items-stretch gap-2 lg:flex xl:ml-12 xl:gap-4">
          {DESTINATIONS.map(({ chemin, libelle, Icone }) => (
            <NavLink
              key={chemin}
              to={chemin}
              end={chemin === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-2.5 px-3 text-nav transition-colors xl:px-4',
                  isActive ? 'text-lien' : 'text-encre hover:text-lien',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icone className={cn('h-5 w-5 transition-colors', isActive ? 'text-primaire' : 'text-gris-icone group-hover:text-primaire')} />
                  {libelle}
                  <span
                    className={cn(
                      'absolute inset-x-0 bottom-0 h-0.5 rounded-t-pilule bg-primaire transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        )}

        {!simple && (
        <div className="ml-auto flex items-center gap-3 lg:gap-5">
          <button
            type="button"
            aria-label="Notifications"
            className="grid h-11 w-11 place-items-center rounded-pilule bg-gris-bouton text-gris-icone transition-colors hover:text-lien"
          >
            <IconeCloche />
          </button>
          <NavLink
            to="/reglages"
            aria-label="Réglages"
            className="grid h-11 w-11 place-items-center rounded-pilule bg-gris-bouton text-gris-icone transition-colors hover:text-lien"
          >
            <IconeEngrenage />
          </NavLink>
          <span className="hidden h-10 w-px bg-filet sm:block" aria-hidden />
          <Menu
            declencheur={
              <button type="button" aria-label={`Compte : ${utilisateur?.prenom ?? '…'}`} className="rounded-pilule transition-transform hover:scale-[1.03]">
                <Avatar initiale={utilisateur?.prenom.charAt(0).toUpperCase() ?? '·'} taille={44} />
              </button>
            }
            entete={
              utilisateur && (
                <>
                  <div className="text-texte font-semibold text-encre">{utilisateur.prenom}</div>
                  <div className="text-mention text-gris">Compte {utilisateur.devise}</div>
                </>
              )
            }
            actions={[
              { libelle: 'Réglages', icone: <Settings className="h-4 w-4 text-gris" />, onSelect: () => naviguer('/reglages') },
              {
                libelle: 'Changer de compte',
                icone: <LogOut className="h-4 w-4 text-gris" />,
                onSelect: () => {
                  quitter()
                  naviguer('/profils')
                },
              },
            ]}
          />
        </div>
        )}
      </div>
    </header>
  )
}
