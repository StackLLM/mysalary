/**
 * Tokens MySalary — calqués sur le template Templates/image.png (ux-ui.md (UI) § 1).
 * Le violet du template est remplacé par la sauge #7D8C82. Aucune couleur en dur dans les composants.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Rôle « violet vif » du template (#3633BF) : bouton principal, soulignement actif, bouton +
        primaire: { DEFAULT: '#7D8C82', survol: '#6F7E74' },
        // Rôle « indigo foncé » du template : liens, onglet actif, texte des boutons teintés
        lien: '#4F6D5C',
        // Rôle « lilas pâle » du template (#F4F5FC) : boutons teintés, puces
        teinte: { DEFAULT: '#F3F5F3', fort: '#E7ECE8' },
        // Bandeau héro (dégradé + cercles du template)
        bandeau: { debut: '#56635A', fin: '#647369', cercle: '#8D9B92' },
        sauge: {
          50: '#F3F6F4', 100: '#E6ECE8', 200: '#CFD9D2', 300: '#BBC3BE', 400: '#9EA9A1',
          DEFAULT: '#7D8C82', 500: '#7D8C82', 600: '#69776E', 700: '#545F57', 800: '#3F4641',
        },
        page: '#F9FAFB',
        encre: { DEFAULT: '#121413', 2: '#3D4140' },
        gris: { DEFAULT: '#6F7276', icone: '#9AA0A6', bouton: '#F6F7F9' },
        filet: { DEFAULT: '#EEEEEE', fort: '#E2E4E7' },
        interne: '#FBFCFC',
        interrupteur: '#EDEFF3',
        // Pastille rouge du template (« Due on … »)
        alerte: { DEFAULT: '#BF4040', fond: '#FCEFEF' },
        positif: { DEFAULT: '#2F7A5A', fond: '#E7F2EC' },
        attention: { DEFAULT: '#8F6218', fond: '#F7EFDF' },
        info: { DEFAULT: '#4F6B8A', fond: '#EAEFF5' },
        peche: { clair: '#F5BEA2', fonce: '#F09463' },
        serie: { revenus: '#3A74B8', depenses: '#D08A2E', epargne: '#9C4F8C' },
      },
      fontSize: {
        logo: ['22px', { lineHeight: '28px', fontWeight: '800', letterSpacing: '-0.01em' }],
        nav: ['15px', { lineHeight: '20px', fontWeight: '500' }],
        montant: ['30px', { lineHeight: '36px', fontWeight: '700', letterSpacing: '-0.01em' }],
        titre: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'titre-carte': ['16px', { lineHeight: '22px', fontWeight: '500' }],
        texte: ['15px', { lineHeight: '22px' }],
        'texte-sm': ['14px', { lineHeight: '20px' }],
        mention: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        bouton: ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'bouton-plein': ['18px', { lineHeight: '24px', fontWeight: '700' }],
      },
      borderRadius: {
        champ: '12px', bouton: '16px', bandeau: '24px', carte: '24px', pilule: '999px',
      },
      boxShadow: {
        carte: '0 4px 30px -6px rgba(17, 20, 19, 0.04)',
        bouton: '0 2px 12px -2px rgba(17, 20, 19, 0.05)',
        bandeau: '0 22px 40px -22px rgba(74, 86, 78, 0.55)',
        flottant: '0 8px 24px -6px rgba(17, 20, 19, 0.16)',
        focus: '0 0 0 3px rgba(125, 140, 130, 0.30)',
      },
      backgroundImage: {
        bandeau: 'linear-gradient(100deg, #535F57 0%, #5E6C63 55%, #647369 100%)',
      },
    },
  },
  plugins: [],
}
