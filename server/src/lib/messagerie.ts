import nodemailer from 'nodemailer'
import { masquerAdresse } from './journaux'

export interface Message {
  a: string
  sujet: string
  texte: string
  /** Même contenu, mis en page. */
  html?: string
}

export type Messagerie = (message: Message) => Promise<void>

/**
 * Envoi des e-mails (liens de mot de passe et de vérification). Avec `SMTP_URL` (ex. smtps://utilisateur:motdepasse@smtp.exemple.com:465),
 * par SMTP, et le journal ne reçoit que l'adresse masquée et le sujet ; sinon le message entier est écrit dans le journal :
 * utile en local, où l'on lit le lien dans le terminal. La production exige SMTP_URL (`config.ts`).
 */
export function creerMessagerie({ smtp, expediteur, journal }: { smtp?: string; expediteur: string; journal: (texte: string) => void }): Messagerie {
  if (!smtp) {
    return async ({ a, sujet, texte }) => journal(`E-mail non envoyé (SMTP_URL absent) — à ${a} — ${sujet}\n${texte}`)
  }
  const transport = nodemailer.createTransport(smtp)
  return async ({ a, sujet, texte, html }) => {
    await transport.sendMail({ from: expediteur, to: a, subject: sujet, text: texte, ...(html ? { html } : {}) })
    journal(`E-mail envoyé à ${masquerAdresse(a)} : ${sujet}`)
  }
}
