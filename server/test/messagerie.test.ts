import { beforeEach, describe, expect, it, vi } from 'vitest'
import { composer } from '../src/lib/gabarits'
import { creerMessagerie } from '../src/lib/messagerie'

const sendMail = vi.fn()
vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }))

beforeEach(() => sendMail.mockReset().mockResolvedValue(undefined))

describe('messagerie', () => {
  it('avec SMTP_URL : envoie le texte et le HTML depuis l’expéditeur configuré', async () => {
    const envoyer = creerMessagerie({ smtp: 'smtps://u:p@smtp.exemple.test:465', expediteur: 'MySalary <no-reply@exemple.test>', journal: vi.fn() })
    await envoyer({ a: 'lea@exemple.test', sujet: 'Sujet', texte: 'Texte', html: '<p>Html</p>' })
    expect(sendMail).toHaveBeenCalledWith({ from: 'MySalary <no-reply@exemple.test>', to: 'lea@exemple.test', subject: 'Sujet', text: 'Texte', html: '<p>Html</p>' })
  })

  it('sans SMTP_URL : le message est écrit dans le journal et rien ne part', async () => {
    const journal = vi.fn()
    await creerMessagerie({ expediteur: 'x', journal })({ a: 'lea@exemple.test', sujet: 'Sujet', texte: 'Lien : https://x.test' })
    expect(journal).toHaveBeenCalledWith(expect.stringContaining('https://x.test'))
    expect(sendMail).not.toHaveBeenCalled()
  })
})

describe('gabarit', () => {
  it('le HTML échappe les textes et reprend le lien en clair ; le texte contient le lien', () => {
    const { texte, html } = composer({ titre: 'A <b>', paragraphes: ['Léa & Zoé'], bouton: { libelle: 'Ouvrir', lien: 'https://x.test/a?b=1&c=2' }, pied: 'Pied' })
    expect(html).toContain('A &lt;b&gt;')
    expect(html).toContain('Léa &amp; Zoé')
    expect(html).toContain('href="https://x.test/a?b=1&amp;c=2"')
    expect(html).not.toContain('<b>')
    expect(texte).toContain('https://x.test/a?b=1&c=2')
  })
})
