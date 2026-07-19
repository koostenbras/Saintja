import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base is set to './' so the built site works when hosted from any subpath
export default defineConfig({
  plugins: [react()],
  base: './',
})
