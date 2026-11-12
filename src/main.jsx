import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import PwaUpdate from './components/PwaUpdate'
import { initPwa } from './lib/pwa'
import { initScrollLock } from './lib/scrollLock'
import './styles/global.css'

initPwa()
initScrollLock()

// Ponto de entrada. A ordem importa: o Router e o AuthProvider "envolvem" o App,
// então qualquer componente lá dentro pode usar rotas e saber quem está logado.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <App />
          <PwaUpdate />
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
