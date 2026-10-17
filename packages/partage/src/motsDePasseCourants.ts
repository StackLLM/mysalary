/**
 * Mots de passe de 8 caractères ou plus parmi les plus essayés par les attaques (listes publiques de fuites),
 * plus des variantes françaises et marocaines. Comparés en minuscules (lot P2, prod.md § 5.4).
 */
const LISTE = `
password password1 password123 password! passw0rd p@ssw0rd p@ssword 12345678 123456789 1234567890 12345678910
01234567 0123456789 11111111 00000000 22222222 33333333 44444444 55555555 66666666 77777777 88888888 99999999
87654321 987654321 123123123 11223344 12341234 12121212 13131313 10203040 147258369 123654789 159753456
741852963 963852741 qwertyuiop qwerty123 qwerty12 qwertyui asdfghjk zxcvbnm1 1234qwer q1w2e3r4 1q2w3e4r
1qaz2wsx zaq12wsx a1b2c3d4 abcd1234 abc12345 abcdefgh azertyuiop azerty123 azerty1234 azerty12 iloveyou
iloveyou1 sunshine princess football baseball superman starwars whatever trustno1 letmein1 welcome1
welcome123 admin123 administrator changeme motdepasse motdepasse1 motdepasse123 soleil123 bonjour1
bonjour123 doudou123 chouchou loulou123 marseille jetaime1 jetaime123 maroc123 morocco1 morocco123
casablanca marrakech rabat123 bismillah allahakbar mohammed1 mohamed123 20232023 20242024 20252025
20262026 mysalary mysalary1 mysalary123 salaire123
`

export const MOTS_DE_PASSE_COURANTS: ReadonlySet<string> = new Set(LISTE.split(/\s+/).filter(Boolean))

/** Trop courant : dans la liste, ou un seul caractère répété (« aaaaaaaa »). */
export function motDePasseTropCourant(valeur: string): boolean {
  const v = valeur.trim().toLowerCase()
  return MOTS_DE_PASSE_COURANTS.has(v) || /^(.)\1*$/.test(v)
}
