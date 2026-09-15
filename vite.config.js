import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Single source of truth for the version: package.json. The header and the
// README badge both quote this, so they cannot drift apart.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/-crypto_portfolio/' : '/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
})
