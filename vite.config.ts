import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // served from https://<user>.github.io/serviceops-bom/ — without this every
  // asset resolves against the domain root and the page renders blank
  base: '/serviceops-bom/',
  plugins: [react(), tailwindcss()],
  server: { port: 5190 },
  preview: { port: 5190 },
  build: { outDir: 'dist', sourcemap: true },
})
