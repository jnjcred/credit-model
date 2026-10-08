// Én AI-kørsel med løbende tekst (memo_ai.jsx: useAiRun, L706-732). Bruges af afsnitsassistenten og
// sagschatten i det indbyggede memo.
//
//   const runner = useAiRun()      reaktivt objekt, som før { running, text, error, done, run, stop, reset }
//   runner.text        hele teksten indtil nu (AI.stream kalder onDelta(stykke, heleTeksten), og det er hele
//                      teksten, der vises)
//   runner.run({ system, messages, maxTokens, effort })  → svaret (tekst), eller null ved fejl og Stop
//   runner.stop()      afbryder (AbortController). Den tekst, der nåede at komme, bliver stående
//   runner.reset()     tilbage til start
//
// Som før: en fejl giver error = fejlens tekst (AI-lagets venlige beskeder) og done = false; Stop (fejlkoden
// 'abort') giver hverken fejl eller done. Kørslen afbrydes ikke, når komponenten forsvinder (fx når
// assistenten lukkes), som i prototypen.
// AbortController'en er et DOM-objekt og ligger derfor i en almindelig variabel, aldrig i Vue's reaktivitet.
import { reactive } from 'vue'
import { AI } from '@/domain/ai'

export function useAiRun () {
  let abortCtrl = null

  async function run ({ system, messages, maxTokens, effort }) {
    const ctrl = new AbortController()
    abortCtrl = ctrl
    Object.assign(runner, { running: true, text: '', error: null, done: false })
    try {
      const res = await AI.stream({
        system, messages, maxTokens, effort, signal: ctrl.signal,
        onDelta: (_d, all) => { runner.text = all },
      })
      Object.assign(runner, { running: false, text: res.text, error: null, done: true })
      return res.text
    } catch (e) {
      if (e && e.code === 'abort') { Object.assign(runner, { running: false, done: false }); return null }
      Object.assign(runner, { running: false, error: e.message || String(e), done: false })
      return null
    } finally { abortCtrl = null }
  }

  const stop = () => { if (abortCtrl) abortCtrl.abort() }
  const reset = () => { Object.assign(runner, { running: false, text: '', error: null, done: false }) }

  const runner = reactive({ running: false, text: '', error: null, done: false, run, stop, reset })
  return runner
}
