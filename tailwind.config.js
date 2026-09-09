/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité de marque Panier 241
        brand: {
          DEFAULT: '#2A4FD8', // bleu profond — actions, en-têtes
          dark: '#14245C', // titres foncés
          light: '#EAF0FF', // fonds de carte clairs
        },
        surface: '#F3F5FB', // fond général de l'app
        // Accents par catégorie de produit
        category: {
          legumes: '#3FAE5C',
          fruits: '#F2994A',
          poisson: '#E8543A',
          cereales: '#C08A3E',
          bricolage: '#5B7C99',
          epicerie: '#2FA3A3',
        },
      },
      fontFamily: {
        display: ['Sora', 'ui-rounded', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 16px -4px rgba(20, 36, 92, 0.12)',
      },
    },
  },
  plugins: [],
}
