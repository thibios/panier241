import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Les fonctions /api ne tournent que sur Vercel : en local, on les
    // relaie vers la production pour que les photos Pexels s'affichent aussi.
    proxy: {
      '/api': { target: 'https://panier241.vercel.app', changeOrigin: true },
    },
  },
})
