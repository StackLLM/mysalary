import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())

// jsdom n'implémente pas matchMedia : on simule « pas de préférence ».
if (!window.matchMedia) {
  window.matchMedia = (requete: string) =>
    ({
      matches: false,
      media: requete,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

/**
 * Node 25+ expose son propre `localStorage` global (inutilisable sans fichier) qui masque
 * celui de jsdom. On installe un stockage en mémoire, vidé après chaque test.
 */
class StockageMemoire implements Storage {
  private donnees = new Map<string, string>()
  get length() {
    return this.donnees.size
  }
  clear() {
    this.donnees.clear()
  }
  getItem(cle: string) {
    return this.donnees.get(cle) ?? null
  }
  key(index: number) {
    return [...this.donnees.keys()][index] ?? null
  }
  removeItem(cle: string) {
    this.donnees.delete(cle)
  }
  setItem(cle: string, valeur: string) {
    this.donnees.set(cle, String(valeur))
  }
}
const stockage = new StockageMemoire()
Object.defineProperty(globalThis, 'localStorage', { value: stockage, configurable: true, writable: true })
Object.defineProperty(window, 'localStorage', { value: stockage, configurable: true, writable: true })
afterEach(() => stockage.clear())

// jsdom ne fournit pas ResizeObserver, utilisé par les interrupteurs Radix.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
