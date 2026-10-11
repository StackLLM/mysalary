import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RaccourcisPeriode } from './RaccourcisPeriode'
import { MiseEnPage } from './MiseEnPage'
import { rendre as rendreApp } from '../test/outils'

describe('raccourcis ← →', () => {
  const rendre = (autour?: React.ReactNode) => {
    const precedent = vi.fn()
    const suivant = vi.fn()
    render(
      <>
        <RaccourcisPeriode precedent={precedent} suivant={suivant} />
        {autour}
      </>,
    )
    return { precedent, suivant }
  }

  it('← et → changent de période', () => {
    const { precedent, suivant } = rendre()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(precedent).toHaveBeenCalledTimes(1)
    expect(suivant).toHaveBeenCalledTimes(1)
  })

  it('rien dans un champ, sous une fenêtre ouverte, ou avec une touche de modification', () => {
    const { precedent, suivant } = rendre(
      <>
        <input aria-label="Montant" />
        <div role="dialog" hidden />
      </>,
    )
    fireEvent.keyDown(window, { key: 'ArrowLeft', metaKey: true })
    fireEvent.keyDown(screen.getByLabelText('Montant'), { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(precedent).not.toHaveBeenCalled()
    expect(suivant).not.toHaveBeenCalled()
  })
})

describe('lien d’évitement', () => {
  it('« Aller au contenu » mène au contenu principal', () => {
    rendreApp(
      <MiseEnPage onSaisie={() => {}}>
        <p>Page</p>
      </MiseEnPage>,
    )
    const lien = screen.getByRole('link', { name: 'Aller au contenu' })
    expect(lien).toHaveAttribute('href', '#contenu')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenu')
  })
})
