import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('garde la couleur et la taille personnalisées ensemble', () => {
    expect(cn('text-lien', 'text-texte')).toBe('text-lien text-texte')
  })
  it('remplace deux tailles en conflit', () => {
    expect(cn('text-texte', 'text-bouton')).toBe('text-bouton')
  })
})
