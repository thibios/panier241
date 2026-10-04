/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité de marque Panier 241
        brand: {
          DEFAULT: '#DB5A22', // orange du flyer — actions, accents
          dark: '#25282C', // anthracite — en-têtes, titres
          light: '#FBEBE2', // orange très clair — fonds de champs
        },
        surface: '#F7F5F1', // fond général : blanc cassé
        // Vert menthe du flyer — étiquettes de marchés et de commerçants
        mint: { DEFAULT: '#C6EBDB', dark: '#1F6B4E' },
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
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
      },
      boxShadow: {
        card: '0 4px 16px -4px rgba(37, 40, 44, 0.14)',
      },
    },
  },
  plugins: [],
}
