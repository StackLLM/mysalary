import type { SVGProps } from 'react'

/**
 * Icônes pleines du template (navigation, boutons ronds, actions).
 * Couleur via `currentColor` ; les détails intérieurs sont « percés » en blanc.
 */
type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({ width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true, ...p })

export const IconeGrille = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <rect x="3" y="3" width="8" height="8" rx="2.5" />
    <rect x="13" y="3" width="8" height="8" rx="2.5" />
    <rect x="3" y="13" width="8" height="8" rx="2.5" />
    <rect x="13" y="13" width="8" height="8" rx="2.5" />
  </svg>
)

export const IconeMois = (p: P) => (
  <svg {...base(p)}>
    <path fill="currentColor" d="M7 2h7.6L20 7.4V19a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" />
    <path stroke="#fff" strokeWidth="1.8" strokeLinecap="round" d="M8 12h8M8 16h5" />
  </svg>
)

export const IconeAnnee = (p: P) => (
  <svg {...base(p)}>
    <rect fill="currentColor" x="3" y="3" width="18" height="18" rx="4" />
    <path stroke="#fff" strokeWidth="2" strokeLinecap="round" d="M8 16v-3M12 16V8M16 16v-5" />
  </svg>
)

export const IconeObjectif = (p: P) => (
  <svg {...base(p)}>
    <circle fill="currentColor" cx="12" cy="12" r="9.5" />
    <circle stroke="#fff" strokeWidth="1.8" fill="none" cx="12" cy="12" r="5.2" />
    <circle fill="#fff" cx="12" cy="12" r="1.8" />
  </svg>
)

export const IconeCalendrier = (p: P) => (
  <svg {...base(p)}>
    <rect fill="currentColor" x="3" y="4.5" width="18" height="16.5" rx="4" />
    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M8 2.5v4M16 2.5v4" />
    <path stroke="#fff" strokeWidth="1.8" strokeLinecap="round" d="M3.5 10h17" />
    <circle fill="#fff" cx="8.5" cy="14.5" r="1.2" />
    <circle fill="#fff" cx="12" cy="14.5" r="1.2" />
  </svg>
)

export const IconePortefeuille = (p: P) => (
  <svg {...base(p)}>
    <path fill="currentColor" d="M5 5h12.5A2.5 2.5 0 0 1 20 7.5V8h-1.5H5.5a1 1 0 0 0 0 2H21v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2Z" />
    <rect fill="#fff" x="14.5" y="12.5" width="5" height="4" rx="2" />
    <circle fill="currentColor" cx="16.6" cy="14.5" r="0.9" />
  </svg>
)

export const IconeCloche = (p: P) => (
  <svg {...base(p)} fill="currentColor">
    <path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5v3.6l-1.6 2.6A1.2 1.2 0 0 0 5 17h14a1.2 1.2 0 0 0 1.1-1.8l-1.6-2.6V9A6.5 6.5 0 0 0 12 2.5Z" />
    <path d="M9.2 18.5h5.6a2.8 2.8 0 0 1-5.6 0Z" />
  </svg>
)

export const IconeEngrenage = (p: P) => (
  <svg {...base(p)}>
    <path
      fill="currentColor"
      d="M13.7 2.6 14.3 5a7.5 7.5 0 0 1 1.8 1l2.4-.7 1.7 3-1.8 1.7a7.6 7.6 0 0 1 0 2.1l1.8 1.7-1.7 3-2.4-.7a7.5 7.5 0 0 1-1.8 1l-.6 2.4h-3.4l-.6-2.4a7.5 7.5 0 0 1-1.8-1l-2.4.7-1.7-3 1.8-1.7a7.6 7.6 0 0 1 0-2.1L3.8 8.3l1.7-3 2.4.7a7.5 7.5 0 0 1 1.8-1l.6-2.4h3.4Z"
    />
    <circle fill="#fff" cx="12" cy="12" r="3" />
  </svg>
)

export const IconeOeil = (p: P) => (
  <svg {...base(p)}>
    <path fill="currentColor" d="M12 5c5 0 8.6 4.2 9.7 6.2a1.6 1.6 0 0 1 0 1.6C20.6 14.8 17 19 12 19s-8.6-4.2-9.7-6.2a1.6 1.6 0 0 1 0-1.6C3.4 9.2 7 5 12 5Z" />
    <circle fill="#fff" cx="12" cy="12" r="3.6" />
    <circle fill="currentColor" cx="12" cy="12" r="1.7" />
  </svg>
)

export const IconeTelecharger = (p: P) => (
  <svg {...base(p)}>
    <path fill="currentColor" d="M7 2h7.6L20 7.4V19a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" />
    <path stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 10v6.5M9.3 14l2.7 2.7 2.7-2.7" />
  </svg>
)

export const IconeReglerFiltre = (p: P) => (
  <svg {...base(p)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 7h9M18 7h2M4 17h2M11 17h9" />
    <circle cx="15.5" cy="7" r="2.5" />
    <circle cx="8.5" cy="17" r="2.5" />
  </svg>
)

export const IconePlusRond = (p: P) => (
  <svg {...base(p)}>
    <circle fill="currentColor" cx="12" cy="12" r="10" />
    <path stroke="#fff" strokeWidth="2.2" strokeLinecap="round" d="M12 7.5v9M7.5 12h9" />
  </svg>
)

export const IconeVerifie = (p: P) => (
  <svg {...base(p)}>
    <path
      fill="currentColor"
      d="m12 2 2.4 1.7 2.9-.2.9 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-.9 2.8-2.9-.2L12 22l-2.4-1.7-2.9.2-.9-2.8-2.4-1.7.9-2.8-.9-2.8 2.4-1.7.9-2.8 2.9.2Z"
    />
    <path stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" d="m8.5 12.2 2.3 2.3 4.7-4.8" />
  </svg>
)
