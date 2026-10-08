<script setup>
// Sprogvælgeren (shell.jsx: LanguageSwitcher). Bruges i sidebjælken, i kundeportalens sidehoved
// og på Crediwire-login-siden. setLang gemmer valget og genindlæser siden, som før.
// To knapper med aria-pressed i en gruppe, som prototypen: hver knap er et Tab-stop, og Enter eller
// Mellemrum skifter sprog. En radiogruppe ville skifte sprog (og genindlæse siden) allerede ved et tryk
// på en piletast. Det valgte sprog genindlæser ikke siden igen.
import { lang, setLang, t } from '@/i18n'

// size: 'small' som i prototypen; kundeportalen giver 'large' på telefoner (større trykflader)
defineProps({
  size: { type: String, default: 'small' },
})

const LANGS = [['da', 'DA'], ['en', 'EN']]
const choose = (code) => { if (code !== lang) setLang(code) }
</script>

<template>
  <a-button-group
    role="group"
    :aria-label="t('Sprog')"
    :size="size"
  >
    <a-button
      v-for="[code, label] in LANGS"
      :key="code"
      :type="lang === code ? 'primary' : 'default'"
      :ghost="lang === code"
      :aria-pressed="lang === code ? 'true' : 'false'"
      @click="choose(code)"
    >
      {{ label }}
    </a-button>
  </a-button-group>
</template>
