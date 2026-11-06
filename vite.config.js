import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuração do Vite: só precisamos do plugin do React.
export default defineConfig({
  plugins: [react()],
})
