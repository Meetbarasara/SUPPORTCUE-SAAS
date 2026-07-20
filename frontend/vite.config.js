import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  // Environment variable prefix — all VITE_ vars are exposed to the frontend
  // Usage: import.meta.env.VITE_SOCKET_URL
  // Create a frontend/.env file with:
  //   VITE_SOCKET_URL=http://localhost:5000
  //   VITE_API_URL=/api
  define: {
    // Fallback values when env vars are not set
    '__SOCKET_URL__': JSON.stringify(process.env.VITE_SOCKET_URL || '')
  }
})
