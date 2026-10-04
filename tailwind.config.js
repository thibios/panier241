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
        accent: token('accent'),
        header: token('header'),
        'on-header': token('on-header'),
        category: {
          legumes: token('cat-legumes'),
          fruits: token('cat-fruits'),
          poisson: token('cat-poisson'),
          cereales: token('cat-cereales'),
          bricolage: token('cat-bricolage'),
          epicerie: token('cat-epicerie'),
        },
      },
      fontFamily: {
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 2px 10px -4px rgb(var(--color-ink) / 0.10)',
      },
      transitionTimingFunction: {
        // Courbe « spring » douce : léger dépassement puis stabilisation.
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
