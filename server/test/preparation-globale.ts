import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GlobalSetupContext } from 'vitest/node'

declare module 'vitest' {
  interface ProvidedContext {
    urlBaseTest: string
  }
}

/** Crée une base SQLite jetable avec le schéma courant, puis la supprime à la fin. */
export default function preparer({ provide }: GlobalSetupContext) {
  const dossier = mkdtempSync(join(tmpdir(), 'mysalary-test-'))
  const url = `file:${join(dossier, 'test.db')}`
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'pipe',
  })
  provide('urlBaseTest', url)
  return () => rmSync(dossier, { recursive: true, force: true })
}
