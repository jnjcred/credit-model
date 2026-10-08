// Hvilken AI er forbundet? Fælles for Prompt-værkstedet, Regnskab og det indbyggede memo
// (før migrationen MemoAI.useAiStatus i memo_ai.jsx).
//
//   const status = useAiStatus()
//   status.value.ready     AI.isReady(): der er en nøgle (og evt. adresse), eller den lokale bro svarer
//   status.value.provider  posten i AI.PROVIDERS (label, vendor, …) for den valgte udbyder
//   status.value.model     den valgte model (for den lokale bro: 'claude' eller 'codex')
// I skabelonen: status.ready. Læs kun; indstillingerne ændres med AI.setConfig (AiSettingsDialog.vue).
//
// Følger 'cw-ai-config-changed' (AI.setConfig/clearConfig og den lokale bros første svar ved start)
// og 'storage' (indstillingerne ændret i en anden fane), som før.
import { shallowRef } from 'vue'
import { AI } from '@/domain/ai'
import { useWindowEvent } from '@/composables/useWindowEvent'

export function useAiStatus () {
  const read = () => {
    const cfg = AI.getConfig()
    return { ready: AI.isReady(cfg), provider: AI.provider(cfg), model: AI.activeModel(cfg) }
  }
  const state = shallowRef(read())
  const on = () => { state.value = read() }
  useWindowEvent('cw-ai-config-changed', on)
  useWindowEvent('storage', on)
  return state
}
