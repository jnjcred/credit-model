<script setup>
// Det blå "!" for et spørgsmål fra rådgiveren (new_case_portal.jsx: PortalAskMark, L1937–1940), på
// oversigtens række og i spørgsmålsboksen på punktets side. Dekorativt (aria-hidden): rækkens og boksens
// tekst siger det samme. Klassen cwp-ask er en krog, de gamle tests finder mærket med.
// Props: ingen.
import { ExclamationCircleTwoTone } from '@ant-design/icons-vue'
</script>

<template>
  <ExclamationCircleTwoTone
    class="cwp-ask"
    aria-hidden="true"
  />
</template>
