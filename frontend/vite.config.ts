import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // VITE_API_BASE_URL is injected by Vite from .env files.
    // No additional config needed.
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
})