import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest'
import { construireApp } from '../src/app'
import { lireConfig } from '../src/config'
import { CHAMPS_MASQUES, erreurPourJournal, masquerAdresse } from '../src/lib/journaux'
import { creerMessagerie } from '../src/lib/messagerie'
import { creerCompte, MOT_DE_PASSE_TEST, pour, preparerApp, url } from './outils'

// Durcissement de la sécurité (prod.md, lot P2).

const sendMail = vi.fn()
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }))
beforeEach(() => sendMail.mockReset().mockResolvedValue(undefined))

const ctx = preparerApp()

const connecter = (app: FastifyInstance, email: string, motDePasse: string) =>
  app.inject({ method: 'POST', url: url('/auth/connexion'), payload: { email, motDePasse } })

describe('limites d’essais en base', () => {
  let autre: FastifyInstance
  let prisma: PrismaClient
  beforeAll(async () => {
    // Une deuxième instance du serveur, avec sa propre connexion, sur la même base.
    prisma = new PrismaClient({ datasourceUrl: inject('urlBaseTest') })
    autre = await construireApp({ prisma, auth: { messagerie: async () => undefined } })
  })
  afterAll(async () => {
    await autre.close()
    await prisma.$disconnect()
  })

  it('tiennent avec deux instances sur la même base, et ne gardent ni e-mail ni adresse IP en clair', async () => {
    await creerCompte(ctx.app, 'A', 'deux@exemple.test')
    for (const app of [ctx.app, autre, ctx.app, autre, ctx.app]) expect((await connecter(app, 'deux@exemple.test', 'non-non-non')).statusCode).toBe(401)
    for (const app of [autre, ctx.app]) expect((await connecter(app, 'deux@exemple.test', MOT_DE_PASSE_TEST)).statusCode).toBe(429)

    const lignes = JSON.stringify(await ctx.prisma.tentativeAcces.findMany())
    expect(lignes).not.toContain('deux@exemple.test')
    expect(lignes).not.toContain('127.0.0.1')
  })

  it('comptent chaque essai quand ils arrivent en même temps', async () => {
    await creerCompte(ctx.app, 'A', 'rafale@exemple.test')
    const reponses = await Promise.all(Array.from({ length: 8 }, (_, i) => connecter(i % 2 ? autre : ctx.app, 'rafale@exemple.test', 'non-non-non')))
    expect(reponses.every((r) => r.statusCode === 401 || r.statusCode === 429)).toBe(true)
    expect((await connecter(ctx.app, 'rafale@exemple.test', MOT_DE_PASSE_TEST)).statusCode).toBe(429)
  })

  it('une fenêtre passée repart de zéro', async () => {
    await creerCompte(ctx.app, 'A', 'fenetre@exemple.test')
    ctx.jour = '2027-01-10'
    for (let i = 0; i < 5; i++) await connecter(ctx.app, 'fenetre@exemple.test', 'non-non-non')
    expect((await connecter(ctx.app, 'fenetre@exemple.test', MOT_DE_PASSE_TEST)).statusCode).toBe(429)
    ctx.jour = '2027-01-11'
    expect((await connecter(ctx.app, 'fenetre@exemple.test', MOT_DE_PASSE_TEST)).statusCode).toBe(200)
  })
})

describe('mots de passe courants', () => {
  it('refusés à l’inscription, au changement et à la réinitialisation', async () => {
    const r = await ctx.app.inject({ method: 'POST', url: url('/auth/inscription'), payload: { prenom: 'A', email: 'courant@exemple.test', motDePasse: 'Azerty123' } })
    expect(r.statusCode).toBe(400)
    expect(r.json().erreur.champs.motDePasse).toBe('Ce mot de passe est trop courant : choisis-en un autre.')
    const compte = await creerCompte(ctx.app, 'A')
    const changement = await ctx.app.inject({ method: 'PUT', url: url('/compte/mot-de-passe'), headers: pour(compte.id), payload: { actuel: MOT_DE_PASSE_TEST, nouveau: 'password123' } })
    expect(changement.json().erreur.champs.nouveau).toBe('Ce mot de passe est trop courant : choisis-en un autre.')
    const reinit = await ctx.app.inject({ method: 'POST', url: url('/auth/mot-de-passe/reinitialisation'), payload: { jeton: 'x', motDePasse: '12345678' } })
    expect(reinit.json().erreur.champs.motDePasse).toBe('Ce mot de passe est trop courant : choisis-en un autre.')
  })
})

describe('configuration au démarrage', () => {
  const PROD = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://base', APP_URL: 'https://mysalary.test', SMTP_URL: 'smtps://u:secret@smtp.exemple.test:465' }

  it('en local, des valeurs par défaut suffisent', () => {
    expect(lireConfig({ DATABASE_URL: 'file:./base.db' })).toMatchObject({ production: false, port: 3010, urlApplication: 'http://127.0.0.1:6010', cookieSecurise: false })
  })

  it('en production, complète : cookie réservé à HTTPS', () => {
    expect(lireConfig(PROD)).toMatchObject({ production: true, cookieSecurise: true, smtp: PROD.SMTP_URL })
  })

  it('en production, incomplète : démarrage refusé, avec chaque variable fautive et sans valeur secrète', () => {
    const essai = () => lireConfig({ NODE_ENV: 'production', APP_URL: 'http://mysalary.test', COOKIE_SECURE: '0', SMTP_URL: '  ' })
    expect(essai).toThrow(/DATABASE_URL/)
    expect(essai).toThrow(/APP_URL/)
    expect(essai).toThrow(/SMTP_URL/)
    expect(essai).toThrow(/COOKIE_SECURE/)
    expect(() => lireConfig({ ...PROD, PORT: 'abc' })).toThrow(/PORT/)
    try {
      lireConfig({ ...PROD, APP_URL: 'pas-une-adresse' })
    } catch (e) {
      expect(String(e)).not.toContain('secret')
    }
  })
})

describe('journaux en production', () => {
  it('l’e-mail de mot de passe oublié : adresse masquée et sujet, jamais le lien ni le texte', async () => {
    const lignes: string[] = []
    const prisma = new PrismaClient({ datasourceUrl: inject('urlBaseTest') })
    const app: FastifyInstance = await construireApp({
      prisma,
      production: true,
      logger: { level: 'info', redact: { paths: CHAMPS_MASQUES, censor: '[masqué]' }, stream: { write: (l: string) => void lignes.push(l) } },
      auth: {
        urlApplication: 'https://mysalary.test',
        cookieSecurise: true,
        messagerie: creerMessagerie({ smtp: 'smtps://u:p@smtp.exemple.test:465', expediteur: 'MySalary <no-reply@exemple.test>', journal: (t) => app.log.info(t) }),
      },
    })
    await creerCompte(ctx.app, 'Léa', 'lea.secret@exemple.test')
    const r = await app.inject({ method: 'POST', url: url('/auth/mot-de-passe/oubli'), payload: { email: 'lea.secret@exemple.test' } })
    expect(r.statusCode).toBe(204)
    expect(sendMail).toHaveBeenCalledOnce()
    const journal = lignes.join('')
    expect(journal).toContain('l***@exemple.test')
    expect(journal).not.toContain('lea.secret')
    expect(journal).not.toContain('https://mysalary.test/')
    expect(journal).not.toContain(String(sendMail.mock.calls[0]![0].text).slice(0, 40))
    await app.close()
    await prisma.$disconnect()
  })

  it('une erreur interne : sans son message (Prisma y recopie montants et libellés), avec son type et sa pile', () => {
    const erreur = Object.assign(new Error('Invalid prisma.depense.create() : { montant: 350000, libelle: "Loyer" }'), { code: 'P2000' })
    const sortie = JSON.stringify(erreurPourJournal(erreur, true))
    expect(sortie).not.toContain('350000')
    expect(sortie).not.toContain('Loyer')
    expect(sortie).toContain('P2000')
    expect(sortie).toContain('at ')
    expect(erreurPourJournal(erreur, false)).toEqual({ err: erreur })
  })

  it('masque une adresse e-mail', () => {
    expect(masquerAdresse('lea@exemple.test')).toBe('l***@exemple.test')
    expect(masquerAdresse('pas-une-adresse')).toBe('***')
  })
})
