import { formaterDate, formaterMontant, type DetteDto } from '@mysalary/partage'
import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { BarreProgression } from '../../components/BarreProgression'
import { Bouton } from '../../components/Bouton'
import { Separateur } from '../../components/Carte'
import { Champ, ChampMontant } from '../../components/Champ'
import { Montant } from '../../components/Montant'
import { Panneau } from '../../components/Panneau'
import { ErreurApi } from '../../lib/api'
import { cn } from '../../lib/cn'
import { useAjouterPaiement, useSupprimerPaiement } from '../charges/requetes'
import { libelleFinDette, part, STATUTS_ECHEANCE } from '../charges/saisie'
import { lireMontant, versSaisie, type Ton } from '../salaire/saisie'

const TONS: Record<Ton, string> = { positif: 'text-positif', alerte: 'text-alerte', info: 'text-info', neutre: 'text-gris' }

/** Détail d'une dette : progression, échéancier, paiements, et saisie d'un paiement. */
export function PanneauDette({ dette, aujourdhui, onFermer }: { dette: DetteDto | null; aujourdhui: string; onFermer: () => void }) {
  return (
    <Panneau
      ouvert={dette !== null}
      onFermer={onFermer}
      titre={dette?.libelle ?? ''}
      description={dette ? `${dette.creancier ? `Auprès de ${dette.creancier} · ` : ''}${libelleFinDette(dette.etat)}` : undefined}
    >
      {dette && <Contenu key={dette.id} dette={dette} aujourdhui={aujourdhui} />}
    </Panneau>
  )
}

function Contenu({ dette, aujourdhui }: { dette: DetteDto; aujourdhui: string }) {
  const ajouter = useAjouterPaiement()
  const supprimer = useSupprimerPaiement()
  const { etat } = dette
  const [date, setDate] = useState(aujourdhui)
  const [montant, setMontant] = useState(etat.prochaine ? versSaisie(etat.prochaine.attendu) : '')
  const [erreurs, setErreurs] = useState<Record<string, string>>({})

  function payer(e: FormEvent) {
    e.preventDefault()
    const lu = lireMontant(montant)
    setErreurs('erreur' in lu ? { montant: lu.erreur } : {})
    if ('erreur' in lu) return
    ajouter.mutate(
      { detteId: dette.id, date, montant: lu.valeur },
      {
        onSuccess: ({ id }) => {
          toast(`Paiement de ${formaterMontant(lu.valeur)} noté.`, {
            action: { label: 'Annuler', onClick: () => supprimer.mutate({ detteId: dette.id, paiementId: id }) },
          })
          setMontant('')
        },
        onError: (erreur) => setErreurs(erreur instanceof ErreurApi ? { ...(erreur.champs ?? {}), _: erreur.message } : { _: 'Erreur inattendue.' }),
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-texte-sm text-gris">Reste dû</span>
          <Montant valeur={etat.restant} className="text-titre font-semibold text-encre" />
        </div>
        <BarreProgression className="mt-3" valeur={part(etat.paye, dette.montantTotal)} libelle={`Remboursé : ${Math.round(part(etat.paye, dette.montantTotal) * 100)} %`} />
        <p className="mt-2 text-texte-sm text-gris">
          <Montant valeur={etat.paye} /> remboursés sur <Montant valeur={dette.montantTotal} />
        </p>
      </div>

      {!etat.soldee && (
        <form onSubmit={payer} noValidate className="flex flex-col gap-3 rounded-bouton bg-interne p-4 shadow-bouton">
          <h3 className="text-texte font-semibold text-encre">Noter un paiement</h3>
          <div className="grid grid-cols-2 gap-3">
            <Champ libelle="Date" type="date" max={aujourdhui} value={date} onChange={(e) => setDate(e.target.value)} erreur={erreurs.date} />
            <ChampMontant libelle="Montant payé" value={montant} onChange={(e) => setMontant(e.target.value)} erreur={erreurs.montant} />
          </div>
          {erreurs._ && (
            <p role="alert" className="text-texte-sm font-medium text-alerte">
              {erreurs._}
            </p>
          )}
          <Bouton type="submit" taille="sm" chargement={ajouter.isPending} className="self-start">
            Noter ce paiement
          </Bouton>
        </form>
      )}

      <Separateur />

      <section>
        <h3 className="mb-3 text-texte font-semibold text-encre">Échéancier</h3>
        <ul className="flex flex-col gap-2" aria-label="Échéancier">
          {etat.echeances.map((e) => {
            const statut = STATUTS_ECHEANCE[e.statut]
            return (
              <li key={e.numero} className="flex items-center justify-between gap-3 text-texte-sm">
                <span className="min-w-0">
                  <span className="font-medium text-encre">{formaterDate(e.date)}</span>
                  <span className={cn('ml-2', TONS[statut.ton])}>{statut.texte}</span>
                </span>
                <span className="text-right">
                  <Montant valeur={e.montant} className={cn('font-semibold', e.statut === 'payee' ? 'text-gris' : 'text-encre')} />
                  {e.statut === 'partielle' && (
                    <span className="block text-mention text-gris">
                      reste <Montant valeur={e.attendu} />
                    </span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <Separateur />

      <section>
        <h3 className="mb-3 text-texte font-semibold text-encre">Paiements</h3>
        {dette.paiements.length === 0 ? (
          <p className="text-texte-sm text-gris">Aucun paiement noté.</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Paiements">
            {dette.paiements.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 text-texte-sm">
                <span className="font-medium text-encre">{formaterDate(p.date)}</span>
                <span className="flex items-center gap-2">
                  <Montant valeur={p.montant} className="font-semibold text-encre" />
                  <button
                    type="button"
                    aria-label={`Supprimer le paiement du ${formaterDate(p.date)}`}
                    className="rounded-pilule p-1 text-gris-icone hover:text-alerte"
                    onClick={() =>
                      supprimer.mutate(
                        { detteId: dette.id, paiementId: p.id },
                        {
                          onSuccess: () =>
                            toast('Paiement supprimé.', {
                              action: { label: 'Annuler', onClick: () => ajouter.mutate({ detteId: dette.id, date: p.date, montant: p.montant, ...(p.note ? { note: p.note } : {}) }) },
                            }),
                        },
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
