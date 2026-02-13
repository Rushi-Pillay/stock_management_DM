import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  // Use relative base path to ensure assets load correctly on any subdirectory
  base: './',
})
