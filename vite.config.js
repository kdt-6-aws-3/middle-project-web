import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/petclinic/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://192.168.91.29:8080',
        changeOrigin: true,
      },
    },
  },
})
