import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FournisseurAnimations, useAnimations } from '../state/animations'
import { BadgeNature, BadgeRisque } from './Badges'
import { BarreProgression } from './BarreProgression'
import { Bouton } from './Bouton'
import { Champ } from './Champ'
import { Montant } from './Montant'

const avecAnimations = (ui: React.ReactNode) => render(<FournisseurAnimations>{ui}</FournisseurAnimations>)

describe('Montant', () => {
  it('annonce le montant formaté aux lecteurs d’écran', () => {
    const { container } = avecAnimations(<Montant valeur={1_000_000} />)
    expect(container.querySelector('.sr-only')?.textContent).toBe('10\u00A0000\u00A0DH')
  })
  it('affiche le vrai signe moins', () => {
    const { container } = avecAnimations(<Montant valeur={-120_000} />)
    expect(container.querySelector('.sr-only')?.textContent).toBe('\u22121\u00A0200\u00A0DH')
  })
})

describe('Badges', () => {
  it('le réel n’a pas de badge, la projection est nommée', () => {
    const { container } = render(<BadgeNature nature="reel" />)
    expect(container).toBeEmptyDOMElement()
    render(<BadgeNature nature="projete" />)
    expect(screen.getByText('projection')).toBeInTheDocument()
  })
  it('le risque porte toujours un libellé, pas seulement une couleur', () => {
    render(<BadgeRisque risque="horsPortee" />)
    expect(screen.getByText('Hors de portée')).toBeInTheDocument()
  })
})

describe('BarreProgression', () => {
  it('borne la valeur entre 0 et 100 %', () => {
    render(<BarreProgression valeur={1.4} libelle="Objectif" />)
    expect(screen.getByRole('progressbar', { name: 'Objectif' })).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('Bouton', () => {
  it('se désactive et s’annonce occupé pendant le chargement', () => {
    render(<Bouton chargement>Enregistrer</Bouton>)
    const bouton = screen.getByRole('button', { name: 'Enregistrer' })
    expect(bouton).toBeDisabled()
    expect(bouton).toHaveAttribute('aria-busy', 'true')
  })
})

describe('Champ', () => {
  it('relie le message d’erreur au champ', () => {
    render(<Champ libelle="Montant" erreur="Entre un montant supérieur à 0." />)
    const champ = screen.getByLabelText('Montant')
    expect(champ).toHaveAttribute('aria-invalid', 'true')
    expect(champ).toHaveAccessibleDescription('Entre un montant supérieur à 0.')
  })
})

describe('Animations', () => {
  it('le réglage coupe et rétablit les animations sur toute la page', () => {
    function Bascule() {
      const { animations, definir } = useAnimations()
      return <button onClick={() => definir(!animations)}>{animations ? 'on' : 'off'}</button>
    }
    avecAnimations(<Bascule />)
    fireEvent.click(screen.getByRole('button', { name: 'on' }))
    expect(document.documentElement).toHaveClass('sans-animations')
    fireEvent.click(screen.getByRole('button', { name: 'off' }))
    expect(document.documentElement).not.toHaveClass('sans-animations')
  })
})
