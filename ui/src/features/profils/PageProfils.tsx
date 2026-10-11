import { DEVISES, schemaCreationUtilisateur, type Devise, type Utilisateur } from '@mysalary/partage'
import { motion } from 'framer-motion'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Bouton } from '../../components/Bouton'
import { Carte, TitreSection } from '../../components/Carte'
import { Champ } from '../../components/Champ'
import { Avatar, Pastille } from '../../components/Elements'
import { FilAriane } from '../../components/FilAriane'
import { Menu } from '../../components/Menu'
import { Panneau } from '../../components/Panneau'
import { Pilule } from '../../components/Pilule'
import { ErreurApi } from '../../lib/api'
import { conteneurCascade, elementApparition } from '../../lib/animations'
import { dateCourte } from '../../lib/dates'
import { useCompte } from '../../state/compte'
import {
  useCreerUtilisateur,
  useOuvrirUtilisateur,
  useRenommerUtilisateur,
  useUtilisateurs,
} from './requetes'
import { ConnexionCompte } from '../authentification/ConnexionCompte'
import { ImportCompte } from '../sauvegarde/ImportCompte'
import { SuppressionCompte } from './SuppressionCompte'

const ID_FORMULAIRE = 'formulaire-nouveau-compte'

/** Écran Profils (UX.md § 4.0 et § 5.0) dans la structure du template. */
export function PageProfils() {
  const naviguer = useNavigate()
  const compte = useCompte()
  const utilisateurs = useUtilisateurs()
  const ouvrir = useOuvrirUtilisateur()
  const [aRenommer, setARenommer] = useState<Utilisateur | null>(null)
  const [aSupprimer, setASupprimer] = useState<Utilisateur | null>(null)
  const [aConnecter, setAConnecter] = useState<{ u: Utilisateur; nouveau: boolean } | null>(null)

  function ouvrirCompte(u: Utilisateur, nouveau = false) {
    ouvrir.mutate(u.id, {
      onSuccess: () => {
        compte.choisir(u.id)
        // Un compte qu'on vient de créer commence par la mise en route (lot 19).
        naviguer(nouveau ? '/onboarding' : '/')
      },
      onError: (e) => {
        // Compte protégé : le mot de passe d'abord, puis le compte s'ouvre.
        if (e instanceof ErreurApi && e.code === 'SESSION_REQUISE') setAConnecter({ u, nouveau })
        else toast('Impossible d’ouvrir ce compte. Réessaie.')
      },
    })
  }

  return (
    <motion.div variants={conteneurCascade} initial="cache" animate="visible">
      <motion.div variants={elementApparition}>
        <FilAriane
          etapes={[{ libelle: 'Profils' }]}
          action={
            <Bouton variante="menu" taille="menu" onClick={() => document.getElementById(`${ID_FORMULAIRE}-prenom`)?.focus()}>
              Nouveau compte
            </Bouton>
          }
        />
      </motion.div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_352px] xl:gap-12">
        <motion.div variants={elementApparition} className="min-w-0">
          <Carte espacement="large">
            <TitreSection
              titre="Choisis ton compte"
              sousTitre="Un compte protégé demande son mot de passe à l’ouverture."
            />
            <div className="mt-6">
              <ListeComptes
                etat={utilisateurs}
                courant={compte.id}
                ouverture={ouvrir.isPending ? ouvrir.variables : undefined}
                onOuvrir={ouvrirCompte}
                onRenommer={setARenommer}
                onSupprimer={setASupprimer}
              />
            </div>
          </Carte>
        </motion.div>

        <motion.div variants={elementApparition} className="flex min-w-0 flex-col gap-8">
          <NouveauCompte onCree={(u) => ouvrirCompte(u, true)} />
          <ImportCompte />
        </motion.div>
      </div>

      <Renommer utilisateur={aRenommer} onFermer={() => setARenommer(null)} />
      <ConnexionCompte utilisateur={aConnecter?.u ?? null} onFermer={() => setAConnecter(null)} onConnecte={(u) => ouvrirCompte(u, aConnecter?.nouveau)} />
      <SuppressionCompte utilisateur={aSupprimer} onFermer={() => setASupprimer(null)} />
    </motion.div>
  )
}

function ListeComptes({
  etat,
  courant,
  ouverture,
  onOuvrir,
  onRenommer,
  onSupprimer,
}: {
  etat: ReturnType<typeof useUtilisateurs>
  courant: string | null
  ouverture: string | undefined
  onOuvrir: (u: Utilisateur) => void
  onRenommer: (u: Utilisateur) => void
  onSupprimer: (u: Utilisateur) => void
}) {
  if (etat.isPending) {
    return (
      <ul className="flex flex-col gap-3" aria-label="Chargement des comptes">
        {[0, 1].map((i) => (
          <li key={i} className="h-[76px] animate-pulse rounded-bouton bg-teinte" />
        ))}
      </ul>
    )
  }

  if (etat.isError) {
    return (
      <div className="rounded-bouton bg-alerte-fond p-5">
        <p className="text-texte font-medium text-alerte">Connexion au serveur perdue.</p>
        <p className="mt-1 text-texte-sm text-encre-2">Tes données ne sont pas perdues. Vérifie que MySalary est lancé.</p>
        <Bouton variante="contour" taille="sm" className="mt-4" onClick={() => void etat.refetch()}>
          Réessayer
        </Bouton>
      </div>
    )
  }

  if (etat.data.length === 0) {
    return (
      <div className="rounded-bouton border border-dashed border-filet-fort p-8 text-center">
        <p className="text-texte font-medium text-encre">Aucun compte pour l’instant.</p>
        <p className="mt-1 text-texte-sm text-gris">Crée ton compte à droite pour commencer à suivre ton salaire.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {etat.data.map((u) => (
        <li key={u.id} className="flex items-center gap-3 rounded-bouton border border-filet bg-white p-3 pr-2 transition-colors hover:border-filet-fort sm:p-4">
          <button
            type="button"
            onClick={() => onOuvrir(u)}
            disabled={ouverture !== undefined}
            className="flex min-w-0 flex-1 items-center gap-4 rounded-champ text-left disabled:opacity-60"
          >
            <Avatar initiale={u.prenom.charAt(0).toUpperCase()} taille={48} />
            <span className="min-w-0">
              <span className="block truncate text-titre text-encre">{u.prenom}</span>
              <span className="block text-texte-sm text-gris">
                {u.derniereOuverture ? `Ouvert le ${dateCourte(u.derniereOuverture)}` : 'Jamais ouvert'} · {u.devise}
              </span>
            </span>
          </button>
          {u.id === courant && (
            <span className="hidden sm:block">
              <Pastille ton="neutre">Compte actuel</Pastille>
            </span>
          )}
          <Menu
            declencheur={
              <button type="button" aria-label={`Options du compte ${u.prenom}`} className="rounded-pilule p-2 text-gris-icone hover:bg-teinte hover:text-encre">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            }
            actions={[
              { libelle: 'Renommer', icone: <Pencil className="h-4 w-4 text-gris" />, onSelect: () => onRenommer(u) },
              { libelle: 'Supprimer', icone: <Trash2 className="h-4 w-4" />, danger: true, onSelect: () => onSupprimer(u) },
            ]}
          />
        </li>
      ))}
    </ul>
  )
}

function NouveauCompte({ onCree }: { onCree: (u: Utilisateur) => void }) {
  const creer = useCreerUtilisateur()
  const [prenom, setPrenom] = useState('')
  const [devise, setDevise] = useState<Devise>('MAD')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault()
    // Même schéma que le serveur : l'erreur s'affiche sans aller-retour.
    const resultat = schemaCreationUtilisateur.safeParse({ prenom, devise, ...(motDePasse ? { motDePasse } : {}) })
    if (!resultat.success) {
      setErreurs(Object.fromEntries(resultat.error.issues.map((i) => [String(i.path[0] ?? '_'), i.message])))
      return
    }
    setErreurs({})
    creer.mutate(resultat.data, {
      onSuccess: (u) => {
        setPrenom('')
        setMotDePasse('')
        toast(`Compte de ${u.prenom} créé.`)
        onCree(u)
      },
      onError: (e) => setErreurs(e instanceof ErreurApi && e.champs ? e.champs : { _: e.message }),
    })
  }

  return (
    <>
      <Carte titre="Nouveau compte">
        <form id={ID_FORMULAIRE} onSubmit={soumettre} noValidate className="flex flex-col gap-5">
          <Champ
            id={`${ID_FORMULAIRE}-prenom`}
            libelle="Prénom"
            placeholder="Ton prénom"
            autoComplete="given-name"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            erreur={erreurs.prenom}
          />
          <Champ
            libelle="Mot de passe (facultatif)"
            type="password"
            autoComplete="new-password"
            aide="8 caractères au moins."
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            erreur={erreurs.motDePasse}
          />
          <fieldset>
            <legend className="mb-2 text-texte-sm text-gris">Devise</legend>
            <div className="flex gap-2">
              {DEVISES.map((d) => (
                <Pilule key={d} active={devise === d} onClick={() => setDevise(d)}>
                  {d}
                </Pilule>
              ))}
            </div>
            <p className="mt-2 text-mention text-gris">Elle ne pourra plus être changée ensuite.</p>
          </fieldset>
          {erreurs._ && <p className="text-texte-sm text-alerte">{erreurs._}</p>}
        </form>
      </Carte>
      <Bouton type="submit" form={ID_FORMULAIRE} className="w-full" chargement={creer.isPending}>
        Créer le compte
      </Bouton>
    </>
  )
}

function Renommer({ utilisateur, onFermer }: { utilisateur: Utilisateur | null; onFermer: () => void }) {
  const renommer = useRenommerUtilisateur()
  const [prenom, setPrenom] = useState('')
  const [erreur, setErreur] = useState<string>()
  const [ouvertPour, setOuvertPour] = useState<string | null>(null)

  // Pré-remplit le champ à chaque ouverture.
  if (utilisateur && ouvertPour !== utilisateur.id) {
    setOuvertPour(utilisateur.id)
    setPrenom(utilisateur.prenom)
    setErreur(undefined)
  }
  if (!utilisateur && ouvertPour !== null) setOuvertPour(null)

  function enregistrer() {
    if (!utilisateur) return
    renommer.mutate(
      { id: utilisateur.id, prenom },
      {
        onSuccess: () => {
          toast('Compte renommé.')
          onFermer()
        },
        onError: (e) => setErreur(e instanceof ErreurApi ? (e.champs?.prenom ?? e.message) : 'Erreur inattendue.'),
      },
    )
  }

  return (
    <Panneau
      ouvert={utilisateur !== null}
      onFermer={onFermer}
      titre="Renommer le compte"
      pied={
        <>
          <Bouton variante="contour" taille="md" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton taille="md" onClick={enregistrer} chargement={renommer.isPending}>
            Enregistrer
          </Bouton>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          enregistrer()
        }}
      >
        <Champ libelle="Prénom" autoFocus value={prenom} onChange={(e) => setPrenom(e.target.value)} erreur={erreur} />
      </form>
    </Panneau>
  )
}
