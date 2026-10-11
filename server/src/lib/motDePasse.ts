import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'

/** Coût de scrypt (N = 2^15) : ~50 ms ici, trop long à deviner à grande échelle. */
const COUT = 32768
const LONGUEUR = 64

const deriver = (mot: string, sel: Buffer, cout: number) =>
  new Promise<Buffer>((resolve, reject) => scrypt(mot, sel, LONGUEUR, { N: cout, maxmem: 128 * cout * 8 * 2 }, (e, cle) => (e ? reject(e) : resolve(cle))))

/** `scrypt$N$sel$empreinte` (base64) : le mot de passe n'est jamais stocké. */
export async function hacher(mot: string): Promise<string> {
  const sel = randomBytes(16)
  return `scrypt$${COUT}$${sel.toString('base64')}$${(await deriver(mot, sel, COUT)).toString('base64')}`
}

export async function verifier(mot: string, enregistre: string): Promise<boolean> {
  const [algo, cout, sel, empreinte] = enregistre.split('$')
  if (algo !== 'scrypt' || !cout || !sel || !empreinte) return false
  const attendu = Buffer.from(empreinte, 'base64')
  const calcule = await deriver(mot, Buffer.from(sel, 'base64'), Number(cout))
  return attendu.length === calcule.length && timingSafeEqual(attendu, calcule)
}

/** Jeton de session aléatoire (cookie) et son empreinte (seule valeur gardée en base). */
export const nouveauJeton = () => randomBytes(32).toString('base64url')
export const empreinteJeton = (jeton: string) => createHash('sha256').update(jeton).digest('hex')
