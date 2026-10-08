<script setup>
// Kildeviseren (memo.jsx: SourceViewer L5671-5857): åbner det dokument, en kildehenvisning peger på, på den
// side, der henvises til. Kun med kildevisningen slået til (window.CW_SOURCE_VIEW === true; ellers åbner
// siden den aldrig).
// - Øverst dokumentets navn og "Luk", type og dokumentdato, og en knap pr. side (en radiogruppe: piletasterne
//   skifter side). Pil højre/venstre skifter også side, når fokus ikke står i et felt (som før).
// - Findes dokumentet ikke under Dokumenter, står det i en rød note.
// - Hvad der blev sammenlignet (påstanden i memoet og passagen i kilden) og dommen: fundet ordret, bekræftet,
//   kontrollér sammenhængen, kilden siger det modsatte eller ikke fundet (med "Står på s. x", hvis en anden
//   side bekræfter det). Kontrollen køres på den side, der vises; første gang den side, henvisningen peger på
//   (checkCite i src/domain/memo/memoCite.js). Dommen er en statusmeddelelse (.memo-src-status, role="status").
// - Sidens tekst med fundene fremhævet; det første fund rulles ind i syne.
// Dialogen vises, så længe den er monteret (siden bruger v-if). "Luk" får fokus ved åbning (det første felt,
// som før); dialogen husker selv, hvad der havde fokus (henvisningen), og giver det fokus igen, når den lukkes.
// antdv's eget luk-kryds er slået fra: "Luk" står i titlen som før (oversat; krydsets navn kan ikke oversættes
// i 3.2.13).
//
// Props: doc (CASE_DOCS-dokumentet: { name, type, meta, pages: [{ ref, title, body }] }), page (henvisningens
//        side, fx 's. 9'), quote (henvisningens tekst), context (citeContext), alt (den danske udgave eller null),
//        inCase (dokumentet står under Dokumenter).
// Emits: close.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CheckCircleFilled, CloseCircleFilled, ExclamationCircleFilled, FileTextOutlined, QuestionCircleFilled } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { checkCite } from '@/domain/memo/memoCite'
import { memoRefLabel } from '@/domain/memo/memoFormat'
import { useWindowEvent } from '@/composables/useWindowEvent'

const props = defineProps({
  doc: { type: Object, required: true },
  page: { type: String, default: null },
  quote: { type: String, default: null },
  context: { type: Object, default: null },
  alt: { type: Object, default: null },
  inCase: { type: Boolean, default: null },
})
const emit = defineEmits(['close'])

const nameId = 'memo-src-name'
const pages = props.doc.pages || []
const startIdx = Math.max(0, pages.findIndex(p => p.ref === props.page))
const idx = ref(startIdx)
const cur = computed(() => pages[idx.value])

// Pil højre og venstre skifter side, også uden fokus på sideknapperne (ikke i et felt)
useWindowEvent('keydown', (e) => {
  if (e.target && /TEXTAREA|INPUT/.test(e.target.tagName)) return
  const i = idx.value
  if (e.key === 'ArrowRight' && i < pages.length - 1) idx.value = i + 1
  if (e.key === 'ArrowLeft' && i > 0) idx.value = i - 1
})

// Kontrollen køres på den side, der vises. Første gang er det den side, henvisningen peger på. (Dialogens
// props ændrer sig ikke, mens den er åben.)
const first = props.quote ? checkCite({ doc: props.doc, page: props.page, quote: props.quote, context: props.context, alt: props.alt }) : null
const res = computed(() => {
  if (!props.quote || !cur.value) return null
  return idx.value === startIdx ? first : checkCite({ doc: props.doc, page: cur.value.ref, quote: props.quote, context: props.context, alt: props.alt })
})

const body = computed(() => {
  const text = cur.value ? cur.value.body : ''
  const r = res.value
  if (!r || !r.hits.length) return [{ t: text, hit: false }]
  // Et fundet ord fremhæves helt, også når kun stammen blev sammenlignet
  const isL = (c) => !!c && /[A-Za-zÆØÅæøåÄÖÜäöü]/.test(c)
  const whole = (h) => {
    let a = h[0], z = h[1]
    if (!isL(text[a]) || !isL(text[z - 1])) return h
    while (a > 0 && isL(text[a - 1])) a--
    while (z < text.length && isL(text[z])) z++
    return [a, z]
  }
  // Flere fund: sortér og slå overlappende sammen
  const hs = r.hits.map(whole).sort((a, b) => a[0] - b[0]).reduce((acc, h) => {
    const last = acc[acc.length - 1]
    if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]); else acc.push([h[0], h[1]])
    return acc
  }, [])
  const out = []
  let pos = 0
  hs.forEach(h => { if (h[0] > pos) out.push({ t: text.slice(pos, h[0]), hit: false }); out.push({ t: text.slice(h[0], h[1]), hit: true }); pos = h[1] })
  if (pos < text.length) out.push({ t: text.slice(pos), hit: false })
  return out
})

// Første fund rulles ind i syne
const scroller = ref(null)
watch([idx, res], (_n, _o, onCleanup) => {
  const id = setTimeout(() => {
    const m = scroller.value && scroller.value.querySelector('mark')
    if (m) m.scrollIntoView({ block: 'center' })
  }, 30)
  onCleanup(() => clearTimeout(id))
}, { immediate: true, flush: 'post' })

const state = computed(() => (res.value ? res.value.state : null))
const green = computed(() => state.value === 'exact' || state.value === 'format')
const contra = computed(() => state.value === 'contra')
const list = (xs) => xs.slice(0, 6).join(', ') + (xs.length > 6 ? ' ' + t('og') + ' ' + (xs.length - 6) + ' ' + t('mere') : '')
const msg = computed(() => {
  const r = res.value
  const st = state.value
  let m = ''
  const curRef = cur.value ? memoRefLabel(cur.value.ref) : ''
  if (st === 'exact') m = t('Fundet ordret på') + ' ' + curRef + '. ' + t('Fremhævet nedenfor.')
  else if (st === 'format') {
    m = t('Bekræftet på') + ' ' + curRef + ': '
    if (r.basis === 'names') m += t('navnene står samlet i kilden. Selve formuleringen er memoets egen.')
    else if (r.basis === 'words') m += t('sætningens bærende ord står samlet i kilden. De er fremhævet.')
    else m += list(r.found) + ' ' + t('står i samme sætning eller tabelrække som påstandens nøgleord. Fremhævet nedenfor.')
    if (r.viaDa) m += ' ' + t('Kontrolleret mod memoets danske formulering, da kilden er på dansk.')
  } else if (st === 'context') {
    // Tallene eller ordene står der, men ikke i påstandens sammenhæng
    m = t('Kontrollér sammenhængen.') + ' '
    if (r.polar && r.polar.term) m += t('Tallene står på') + ' ' + curRef + ', ' + t('men kilden bekræfter ikke') + ' "' + r.polar.term + '".'
    else if (r.loose && r.loose.length) m += list(r.loose) + ' ' + t('står på') + ' ' + curRef + ', ' + t('men ikke i samme sætning eller række som påstandens nøgleord.')
    else if (r.basis === 'names') m += t('Navnene står på') + ' ' + curRef + ', ' + t('men ikke samlet.')
    else m += t('De bærende ord står på') + ' ' + curRef + ', ' + t('men ikke i samme sætning.')
    if (r.viaDa) m += ' ' + t('Kontrolleret mod memoets danske formulering, da kilden er på dansk.')
  } else if (st === 'contra') {
    m = t('Kilden siger det modsatte på') + ' ' + curRef + (r.polar && r.polar.src ? ': "' + r.polar.src + '"' : '') + '. ' +
      (r.polar && r.polar.term ? t('Memoet skriver') + ' "' + r.polar.term + '". ' : '') + t('Ret påstanden eller henvisningen.')
  } else if (st === 'missing') {
    m = r.basis === 'words'
      ? t('Ikke fundet på') + ' ' + curRef + '. ' + t('Kun') + ' ' + r.found.length + ' ' + t('af') + ' ' + (r.found.length + r.missing.length) + ' ' + t('bærende ord i sætningen står på siden. Gennemgå selv.')
      : r.missing.length
        ? t('Ikke fundet på') + ' ' + curRef + ': ' + list(r.missing) + '. ' + t('Gennemgå selv.')
        : t('Påstanden har ingen tal eller navne, der kan slås op automatisk. Gennemgå selv.')
    // Hvad kilden har ud for påstandens nøgleord: "Kilden har 41.100 på s. 6"
    if (r.suggest && r.suggest.length) m += ' ' + r.suggest.slice(0, 3).map(x => t('Kilden har') + ' ' + x.src + ' ' + t('på') + ' ' + curRef + ' (' + t('memoet skriver') + ' ' + x.claim + ')').join('; ') + '.'
  }
  return m
})

// Hvad der blev sammenlignet: påstanden i memoet og passagen i kilden
const claimText = computed(() => {
  const r = res.value
  return r.label && r.claim && r.claim !== props.quote
    ? t('Henvisningen') + ' "' + props.quote + '" ' + t('dækker påstanden:') + ' "' + r.claim + '"'
    : t('Påstand i memoet:') + ' "' + (r.claim || props.quote) + '"'
})
const passageText = computed(() => t('Sammenlignet med kilden:') + ' "' + res.value.passages.slice(0, 2).map(p => p.length > 220 ? p.slice(0, 217).replace(/\s+\S*$/, '') + ' …' : p).join('" · "') + '"')
// Dommens farve og ikon (✓ fundet, ? kontrollér sammenhængen, ! ikke fundet, kilden siger det modsatte)
const alertType = computed(() => (green.value ? 'success' : contra.value ? 'error' : 'warning'))
const verdictIcon = computed(() => (green.value ? CheckCircleFilled : contra.value ? CloseCircleFilled : state.value === 'context' ? QuestionCircleFilled : ExclamationCircleFilled))
const markClass = computed(() => (state.value === 'exact' ? 'memo-src-hit-exact' : green.value ? 'memo-src-hit-ok' : contra.value ? 'memo-src-hit-contra' : 'memo-src-hit-warn'))
const showElsewhere = computed(() => state.value === 'missing' && first && first.elsewhere >= 0 && first.elsewhere !== idx.value)
const typeLine = computed(() => t(props.doc.type) + (props.doc.meta ? ' · ' + t(props.doc.meta.split('·')[0].trim()) : ''))

// Fokus: "Luk" ved åbning; det, der havde fokus før (henvisningen), igen ved lukning
const prev = document.activeElement
const head = ref(null)
onMounted(() => nextTick(() => requestAnimationFrame(() => {
  const b = head.value && head.value.querySelector('button')
  if (b) b.focus()
})))
onBeforeUnmount(() => {
  if (prev && prev.focus && document.contains(prev)) { try { prev.focus() } catch (e) {} }
})
</script>

<template>
  <a-modal
    :visible="true"
    :width="860"
    :closable="false"
    :footer="null"
    :wrap-props="{ 'aria-modal': 'true', 'aria-labelledby': nameId }"
    @cancel="emit('close')"
  >
    <template #title>
      <div
        ref="head"
        class="memo-src-head"
      >
        <FileTextOutlined aria-hidden="true" />
        <span
          :id="nameId"
          class="memo-src-name"
        >{{ doc.name }}</span>
        <a-button
          size="small"
          @click="emit('close')"
        >
          {{ t('Luk') }}
        </a-button>
      </div>
    </template>

    <a-typography-paragraph type="secondary">
      {{ typeLine }}
    </a-typography-paragraph>
    <a-radio-group
      v-model:value="idx"
      option-type="button"
      button-style="solid"
      size="small"
      name="memo-src-page"
      role="radiogroup"
      :aria-labelledby="nameId"
      class="memo-src-pages"
    >
      <a-radio-button
        v-for="(p, i) in pages"
        :key="p.ref"
        :value="i"
      >
        {{ memoRefLabel(p.ref) }}
      </a-radio-button>
    </a-radio-group>

    <a-alert
      v-if="inCase === false"
      type="error"
      show-icon
      role="note"
      class="memo-src-note"
    >
      <template #icon>
        <ExclamationCircleFilled aria-hidden="true" />
      </template>
      <template #message>
        <strong>{{ t('Dokumentet findes ikke i sagen.') }}</strong>{{ ' ' + t('Det står ikke under Dokumenter, så komitéen kan ikke slå henvisningen op. Upload filen til sagen eller ret henvisningen.') }}
      </template>
    </a-alert>
    <a-alert
      v-if="quote && res"
      :type="alertType"
      show-icon
      role="none"
      class="memo-src-verdict"
    >
      <template #icon>
        <component
          :is="verdictIcon"
          aria-hidden="true"
        />
      </template>
      <template #message>
        <div class="memo-src-claim">
          {{ claimText }}
        </div>
        <div
          v-if="res.passages && res.passages.length > 0"
          class="memo-src-passage"
        >
          {{ passageText }}
        </div>
        <span
          class="memo-src-status"
          role="status"
          :data-state="state"
          :data-found="green ? '1' : '0'"
        >{{ msg }}</span>
        <a-button
          v-if="showElsewhere"
          type="link"
          size="small"
          @click="idx = first.elsewhere"
        >
          {{ t('Står på') + ' ' + memoRefLabel(pages[first.elsewhere].ref) }}
        </a-button>
      </template>
    </a-alert>

    <div
      ref="scroller"
      class="memo-src-page"
    >
      <div class="memo-src-page-h">
        <a-typography-text strong>
          {{ cur ? memoRefLabel(cur.ref) + ' · ' + cur.title : '' }}
        </a-typography-text>
      </div>
      <div class="memo-src-text">
        <template
          v-for="(b, i) in body"
          :key="i"
        >
          <mark
            v-if="b.hit"
            :class="markClass"
          >{{ b.t }}</mark>
          <span v-else>{{ b.t }}</span>
        </template>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Titlen: ikon, dokumentets navn og "Luk" på én linje */
.memo-src-head {
  display: flex;
  gap: 10px;
  align-items: center;
}

.memo-src-name {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.memo-src-pages,
.memo-src-note,
.memo-src-verdict {
  margin-bottom: 12px;
}

/* Sidens tekst ruller i sin egen boks, så sideknapperne og dommen bliver stående */
.memo-src-page {
  max-height: 50vh;
  overflow-y: auto;
}

.memo-src-page-h {
  margin-bottom: 8px;
}

.memo-src-text {
  line-height: 1.7;
  white-space: pre-wrap;
}

/* Fundene: gul for ordret, grøn for bekræftet, rød for modsagt, ellers advarselsfarven */
.memo-src-text mark {
  padding: 1px 2px;
  border-radius: 3px;
}

.memo-src-hit-exact {
  background: @gold-2;
}

.memo-src-hit-ok {
  background: @green-2;
}

.memo-src-hit-contra {
  background: @red-2;
}

.memo-src-hit-warn {
  background: @orange-2;
}
</style>
