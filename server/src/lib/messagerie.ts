import nodemailer from 'nodemailer'

export interface Message {
  a: string
  sujet: string
  texte: string
}

export type Messagerie = (message: Message) => Promise<void>

/**
 * Envoi des e-mails (liens de mot de passe). Avec `SMTP_URL` (ex. smtps://utilisateur:motdepasse@smtp.exemple.com:465),
 * par SMTP ; sinon le message est écrit dans le journal du serveur : utile en local, où l'on lit le lien dans le terminal.
 */
export function creerMessagerie({ smtp, expediteur, journal }: { smtp?: string; expediteur: string; journal: (texte: string) => void }): Messagerie {
  if (!smtp) {
    return async ({ a, sujet, texte }) => journal(`E-mail non envoyé (SMTP_URL absent) — à ${a} — ${sujet}\n${texte}`)
  }
  const transport = nodemailer.createTransport(smtp)
  return async ({ a, sujet, texte }) => {
    await transport.sendMail({ from: expediteur, to: a, subject: sujet, text: texte })
  }
}
