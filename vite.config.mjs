import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const ROOT = fileURLToPath(new URL('.', import.meta.url))

// devserver.js owns the local AI bridge (/local-ai) and saving prompt files
// (/local-prompts). During `npm run dev` Vite forwards those paths to it, so
// start `node devserver.js` first (PORT defaults to 8080; set CW_API_PORT if not).
const API = process.env.CW_API || 'http://localhost:' + (process.env.CW_API_PORT || 8080)

// The app fetches two kinds of files at runtime: prompts/*.md (the AI prompts the
// Prompt-værksted edits in place) and data/*.xlsx (the demo trial balance). They stay
// where they are in the repo; the dev server serves them from the root, and the build
// copies them next to the app so the static deploy has them too.
function copyRuntimeFiles () {
  return {
    name: 'copy-runtime-files',
    apply: 'build',
    closeBundle () {
      for (const [dir, ext] of [['prompts', '.md'], ['data', '.xlsx']]) {
        const out = join(ROOT, 'dist', dir)
        mkdirSync(out, { recursive: true })
        for (const name of readdirSync(join(ROOT, dir))) {
          if (name.endsWith(ext) && existsSync(join(ROOT, dir, name))) cpSync(join(ROOT, dir, name), join(out, name))
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), copyRuntimeFiles()],
  // Vite's dependency cache lives outside the project: the repo sits in a synced Dropbox
  // folder, where renaming files under node_modules/.vite fails with EBUSY.
  cacheDir: process.env.VITE_CACHE_DIR || join(tmpdir(), 'vite-cache-credit-model'),
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  css: {
    preprocessorOptions: {
      // ant-design-vue 3.x theming: Less variables (https://3x.antdv.com/docs/vue/customize-theme).
      // Only CrediWire's deviations from the stock theme are set here; the values are the
      // ones the production app (frontend-app) renders, except the contrast group at the end.
      // Primary colour stays antd's #1890ff.
      less: {
        javascriptEnabled: true,
        modifyVars: {
          'font-family': "'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
          'border-radius-base': '4px',
          // Page titles are <h1> (focus moves there on navigation); CrediWire page titles are 30px.
          // Section headings (h2) match CrediWire's card titles (20px), sub-headings (h3) 16px, so the
          // hierarchy stays h1 > h2 > h3 (antd's defaults 30/24px would make sections look like pages)
          'heading-1-size': '30px',
          'heading-2-size': '20px',
          'heading-3-size': '16px',
          'card-head-font-size': '20px',
          'modal-header-title-font-size': '20px',
          // The page header bar (breadcrumb, search, notifications) sits on the content column
          'layout-header-background': '#fff',
          'layout-header-height': '56px',
          'layout-header-padding': '0 24px',
          // Contrast (WCAG 2.1 AA: 4.5:1 for text). A deliberate deviation from frontend-app, which keeps
          // antd's greys; the prototype's greys passed. Secondary text is 55 % black (#737373, 4.7:1 on
          // white and 4.6:1 on the grey page) instead of 45 % (3.4:1). Placeholders and the digits of
          // pending steps use the same grey instead of antd's light grey (1.8:1). Disabled controls keep
          // the light grey (they are exempt).
          'text-color-secondary': 'fade(@black, 55%)',
          'input-placeholder-color': '@text-color-secondary',
          'wait-icon-color': '@text-color-secondary',
          // Trustpilot's stars (a-rate) in antd's neutral grey 8 (#595959, 7:1) instead of gold (1.4:1),
          // close to the prototype's grey. 3.x has no @gray-8 variable, so it is mixed from black and white.
          'rate-star-color': 'mix(@black, @white, 65%)',
        },
      },
    },
  },
  server: {
    port: Number(process.env.VITE_PORT || 5173),
    proxy: {
      '/local-ai': API,
      '/local-prompts': API,
    },
  },
})
