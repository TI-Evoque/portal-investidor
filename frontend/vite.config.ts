import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3020,
    // Proxy: o Vite repassa /api/* ao backend independente de qual IP o browser usa.
    // Isso evita CORS em dev — o browser sempre fala com o Vite (mesmo host/porta).
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
