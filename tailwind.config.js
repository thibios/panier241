/** Couleur pilotée par un design token (variable CSS en canaux RGB), compatible avec les opacités Tailwind. */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Aucune couleur en dur : tout vient de src/theme/tokens.ts.
      colors: {
        brand: {
          DEFAULT: token('brand'), // actions, liens, états actifs
          dark: token('ink'), // texte et titres
          light: token('soft'), // champs, boutons secondaires
        },
        surface: token('surface'),
        card: token('card'),
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        muted: { DEFAULT: token('muted'), bg: token('muted-bg') },
        warn: { DEFAULT: token('warn'), ink: token('warn-ink') },
        danger: token('danger'),
        accent: { DEFAULT: token('accent'), ink: token('accent-ink') },
        header: token('header'),
        'on-header': token('on-header'),
        category: {
          legumes: token('cat-legumes'),
          fruits: token('cat-fruits'),
          poisson: token('cat-poisson'),
          cereales: token('cat-cereales'),
          restauration: token('cat-restauration'),
          boulangerie: token('cat-boulangerie'),
          bricolage: token('cat-bricolage'),
          epicerie: token('cat-epicerie'),
          'high-tech': token('cat-high-tech'),
          maison: token('cat-maison'),
          mode: token('cat-mode'),
          beaute: token('cat-beaute'),
          'auto-moto': token('cat-auto-moto'),
          bebe: token('cat-bebe'),
          livres: token('cat-livres'),
          jeux: token('cat-jeux'),
          sport: token('cat-sport'),
          industrie: token('cat-industrie'),
          chr: token('cat-chr'),
          numerique: token('cat-numerique'),
        },
      },
      fontFamily: {
        display: ['Quicksand', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
      },
      boxShadow: {
        card: '0 8px 20px -12px rgb(var(--color-brand) / 0.30)',
        float: '0 12px 30px -10px rgb(var(--color-brand) / 0.35)',
        field: '0 6px 18px -8px rgb(var(--color-brand) / 0.25)',
      },
      transitionTimingFunction: {
        // Courbe « spring » douce : léger dépassement puis stabilisation.
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
