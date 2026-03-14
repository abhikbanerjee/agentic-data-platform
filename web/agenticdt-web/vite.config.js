import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In development, proxy /api calls to the local backend so you don't need
  // VITE_BACKEND_URL set during `npm run dev`.  In production (Vercel) the
  // env var points at your Railway backend URL.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Emit source maps for easier debugging in production
    sourcemap: false,
    // Raise the chunk size warning limit slightly (the app is intentionally large)
    chunkSizeWarningLimit: 1000,
  },
})
