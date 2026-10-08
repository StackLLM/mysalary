import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: './test/preparation-globale.ts',
    // Une seule base de test partagée : les fichiers s'exécutent l'un après l'autre.
    fileParallelism: false,
  },
})
