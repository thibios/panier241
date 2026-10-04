import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { applyBaseTheme } from './theme/tokens'
import './index.css'

// Les design tokens sont posés avant le premier rendu pour éviter tout flash de couleur.
applyBaseTheme(document.documentElement)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
