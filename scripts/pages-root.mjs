// Cloudflare Pages-projektet bygger med `npm run build` og udgiver repoets rod (sådan blev prototypen
// udgivet). Indtil output-mappen i Pages er sat til `dist` (se MIGRATION.md, "Udgivelse på Cloudflare
// Pages"), lægges det byggede oven i roden på Cloudflares byggeserver, og node_modules fjernes, så det
// ikke kommer med i udgivelsen. Lokalt (uden CF_PAGES) gør scriptet ingenting.
import { cpSync, rmSync } from 'node:fs'

if (process.env.CF_PAGES) {
  cpSync('dist', '.', { recursive: true, force: true })
  rmSync('node_modules', { recursive: true, force: true })
  console.log('Cloudflare Pages: dist/ er lagt i roden')
}
