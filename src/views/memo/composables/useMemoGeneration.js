// "Generér memo": AI skriver de valgte afsnit forfra, ét ad gangen (WSMemo i memo.jsx L6475-6538, ordret).
// For hvert afsnit tages ét snapshot ('write'), før streamingen begynder; teksten males løbende (højst hvert
// 140. ms, gemmes ikke) og gemmes til sidst som udkast. Et tomt svar rulles tilbage og springes over. Stop
// afbryder stille; enhver anden fejl stopper hele kørslen og vises.
//
//   const g = useMemoGeneration({ sections, apis, scrollTo, onStarted, onWritten })
//   g.gen (ref): { keys, index, label, running, error, written, skipped?, finished? } eller null
//   g.runGeneration(keys), g.stopGeneration()
//   sections: MEMO_SECTIONS; apis: afsnittenes API-register (Map, nøgle → API fra MemoSection);
//   scrollTo(k): ruller til afsnittet; onStarted(): dialogen lukkes; onWritten(k): afsnittet er rettet
import { ref } from 'vue'
import { AI } from '@/domain/ai'
import { cleanHtml, markAsDraft, writeSectionPrompt } from '@/domain/memo/memoAi'

export function useMemoGeneration ({ sections, apis, scrollTo, onStarted, onWritten }) {
  const gen = ref(null)
  // AbortController for kørslen: aldrig i Vue's reaktivitet
  let genAbort = null
  const update = (fn) => { gen.value = fn(gen.value) }

  async function runGeneration (keys) {
    const ctrl = new AbortController()
    genAbort = ctrl
    onStarted()
    gen.value = { keys, index: 0, label: '', running: true, error: null, written: [] }

    for (let i = 0; i < keys.length; i++) {
      if (ctrl.signal.aborted) break
      const s = sections.find(x => x.k === keys[i])
      if (!s) continue
      update(g => ({ ...g, index: i, label: s.label }))
      scrollTo(s.k)

      const api = apis.get(s.k)
      const p = writeSectionPrompt(s.k, s.label, s.num)
      let lastPaint = 0
      // Ét snapshot per afsnit, taget før streamingen begynder at male
      if (api && api.snapshot) api.snapshot('write')

      try {
        const res = await AI.stream({
          system: p.system,
          messages: [{ role: 'user', content: p.content }],
          maxTokens: 20000,
          effort: 'high',
          signal: ctrl.signal,
          onDelta: (_d, all) => {
            // Mal med i takt med at teksten kommer, men ikke oftere end øjet kan følge
            const now = Date.now()
            if (api && now - lastPaint > 140) {
              lastPaint = now
              try { api.paint(markAsDraft(cleanHtml(all))) } catch (e) {}
            }
          },
        })
        const html = cleanHtml(res.text)
        // Tomt svar må ikke overskrive afsnittet. Rul tilbage til det der stod.
        if (!html.trim()) {
          if (api && api.undo) api.undo()
          update(g => ({ ...g, skipped: (g.skipped || []).concat([s.label]) }))
          continue
        }
        if (api) api.commit(markAsDraft(html))
        update(g => ({ ...g, written: g.written.concat([s.k]) }))
        onWritten(s.k)
      } catch (e) {
        if (e && e.code === 'abort') break
        update(g => ({ ...g, error: e.message || String(e), running: false }))
        genAbort = null
        return
      }
    }

    genAbort = null
    update(g => (g ? { ...g, running: false, finished: true } : null))
  }

  function stopGeneration () {
    if (genAbort) genAbort.abort()
    genAbort = null
    update(g => (g ? { ...g, running: false, finished: true } : null))
  }

  return { gen, runGeneration, stopGeneration }
}
