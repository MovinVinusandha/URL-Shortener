import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/url': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/shorten': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
