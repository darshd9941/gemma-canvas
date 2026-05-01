import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3005,
    strictPort: true,
    proxy: {
      '/api/mimo': {
        target: 'https://token-plan-sgp.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mimo/, '/v1'),
      },
      '/api/mimo-anthropic': {
        target: 'https://token-plan-sgp.xiaomimimo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mimo-anthropic/, '/anthropic'),
      },
    },
  }
})
