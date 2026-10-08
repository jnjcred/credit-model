import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'data/**', 'uploads/**', 'external_material/**', 'prompts/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // SheetJS is loaded as a classic script in index.html (same build as before the migration)
        XLSX: 'readonly',
      },
    },
    rules: {
      // The existing code swallows storage/quota errors on purpose: `try { ... } catch (e) {}`
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
  {
    // Domain logic kept verbatim from the prototype: it shares state through window globals
    files: ['src/domain/**/*.js', 'src/i18n/**/*.js'],
    languageOptions: {
      globals: { t: 'readonly', DATA: 'readonly', CW: 'readonly', CASE_DOCS: 'readonly', CASE_FACTS: 'readonly', CW_MAP: 'readonly', AI: 'readonly' },
    },
  },
  {
    // Pre-existing findings in code that the migration keeps byte-identical (calculations,
    // dictionaries, dev server). Reported as warnings so they stay visible without changing
    // behaviour; fixing them is a separate clean-up, not part of the UI migration.
    files: ['src/domain/**/*.js', 'src/i18n/**/*.js', 'devserver.js'],
    rules: {
      'no-unused-vars': ['warn', { caughtErrors: 'none' }],
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'preserve-caught-error': 'warn',
      'no-dupe-keys': 'warn',
    },
  },
  {
    files: ['devserver.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['vite.config.mjs', 'eslint.config.mjs', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
]
