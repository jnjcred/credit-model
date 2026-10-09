<script setup>
// "Kilde: ..." nederst i et kort på Virksomheden (Produkt, marked og branche, Trustpilot, Stamdata,
// Ejerskab): samme grå linje og samme ord som "Kilder: ..." under regnskabstabellen, så det er ens
// overalt, hvor tallene eller teksterne kommer fra. Kilderne adskilles af komma.
// Props:
//   sources  liste af kilder. En kilde er en tekst ('CVR API') eller { text, ai, title, onRemove, onClick, label }:
//            onClick = kilden er en knap (f.eks. AI-mærket, der åbner en forklaring); label = knappens navn for
//            skærmlæsere, når den kun er et ikon (text tom).
//            ai = AI-ikonet foran (AI-genereret), title = forklaring ved hover, onRemove = et lille kryds,
//            der fjerner kilden (f.eks. rådgiverens egne kilder, eller "AI-genereret", når rådgiveren selv
//            har skrevet teksten).
//   restore  { label, onClick }: en rolig tekstknap til højre, f.eks. "Tilføj AI-reference", når AI-mærket er fjernet.
//            Står ikke som et ikon i listen, så det ikke ligner, at kilden stadig er AI.
//   addable  rådgiveren kan tilføje en kilde ("+ Tilføj kilde"); emit add(tekst).
import { nextTick, ref } from 'vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import AiIcon from '@/components/common/AiIcon.vue'
import { t } from '@/i18n'

defineProps({
  sources: { type: Array, required: true },
  addable: { type: Boolean, default: false },
  restore: { type: Object, default: null },
  // flush: kortet har ingen indre luft (tabellen går ud til kanten), så linjen skal ikke trække sig ud
  flush: { type: Boolean, default: false },
})
const emit = defineEmits(['add'])

const item = (s) => (typeof s === 'string' ? { text: s } : s)
const adding = ref(false)
const draft = ref('')
const input = ref(null)
function startAdd () {
  adding.value = true
  draft.value = ''
  nextTick(() => { if (input.value) input.value.focus() })
}
function add () {
  const v = draft.value.trim()
  if (v) emit('add', v)
  adding.value = false
}
</script>

<template>
  <div :class="['fin-source-bar', { 'fin-source-bar-flush': flush }]">
    <a-typography-text type="secondary">
      {{ sources.length > 1 ? t('Kilder') : t('Kilde') }}:
    </a-typography-text>
    <span
      v-for="(s, i) in sources.map(item)"
      :key="s.text"
      class="fin-source"
    >
      <a-tooltip :title="s.title || undefined">
        <a-button
          v-if="s.onClick"
          type="text"
          size="small"
          class="fin-source-btn"
          :aria-label="s.label || s.text"
          @click="s.onClick()"
        >
          <template #icon>
            <AiIcon aria-hidden="true" />
          </template>
          {{ s.text }}
        </a-button>
        <a-typography-text
          v-else
          type="secondary"
        >
          <AiIcon
            v-if="s.ai"
            aria-hidden="true"
          />
          {{ (s.ai ? ' ' : '') + s.text }}
        </a-typography-text>
      </a-tooltip>
      <a-button
        v-if="s.onRemove"
        type="text"
        size="small"
        shape="circle"
        class="fin-source-x"
        :title="t('Fjern kilden')"
        :aria-label="t('Fjern kilden') + ': ' + s.text"
        @click="s.onRemove()"
      >
        <template #icon>
          <CloseOutlined aria-hidden="true" />
        </template>
      </a-button>
      <a-typography-text
        v-if="i < sources.length - 1"
        type="secondary"
      >,</a-typography-text>
    </span>
    <a-button
      v-if="restore"
      type="link"
      size="small"
      class="fin-source-restore"
      @click="restore.onClick()"
    >
      {{ restore.label }}
    </a-button>
    <template v-if="addable">
      <a-space
        v-if="adding"
        :size="4"
      >
        <a-input
          ref="input"
          v-model:value="draft"
          size="small"
          class="fin-source-input"
          :placeholder="t('F.eks. produktblad, hjemmeside eller link')"
          :aria-label="t('Ny kilde')"
          @press-enter="add"
          @keydown.esc.stop="adding = false"
        />
        <a-button
          size="small"
          type="primary"
          :disabled="!draft.trim()"
          @click="add"
        >
          {{ t('Tilføj') }}
        </a-button>
        <a-button
          size="small"
          @click="adding = false"
        >
          {{ t('Annullér') }}
        </a-button>
      </a-space>
      <a-button
        v-else
        type="link"
        size="small"
        class="fin-source-add"
        @click="startAdd"
      >
        <template #icon>
          <PlusOutlined aria-hidden="true" />
        </template>
        {{ t('Tilføj kilde') }}
      </a-button>
    </template>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Går ud til kortets kanter som tabellens fod og har samme farve og skillelinje */
.fin-source-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  align-items: center;
  margin: 16px -24px -24px;
  padding: 12px 24px;
  background: @table-footer-bg;
  border-top: @border-width-base @border-style-base @table-border-color;
}

/* Linjen går ud til kortets kanter (24 px negativ margen), og teksten står på linje med cellerne (24 + 16 px) */
.fin-source-bar-flush { margin: 0 -24px; padding-left: 40px; padding-right: 40px; }

.fin-source {
  display: inline-flex;
  align-items: center;
}

.fin-source-btn {
  padding: 0 4px;
  color: @text-color-secondary;
}

/* Lille rundt kryds: let og grå, og en rolig baggrund (og rød streg) ved hover og fokus */
.fin-source-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  min-width: 18px;
  height: 18px;
  margin-left: 2px;
  padding: 0;
  color: @text-color-secondary;
  border-radius: 50%;
  transition: background-color 0.15s, color 0.15s;
}

.fin-source-x :deep(.anticon) {
  font-size: 9px;
  font-weight: 600;
}

.fin-source-x:hover,
.fin-source-x:focus-visible {
  color: @error-color;
  background: @error-color-deprecated-bg;
}

.fin-source-input {
  width: 260px;
}

.fin-source-add {
  margin-left: auto;
}

/* Står til højre, lige før Tilføj kilde */
.fin-source-restore {
  margin-left: auto;
}

.fin-source-restore + .fin-source-add {
  margin-left: 0;
}
</style>
