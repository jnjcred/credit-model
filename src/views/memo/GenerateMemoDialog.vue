<script setup>
// "Generér memoet" (memo.jsx: GenerateMemoDialog L4290-4361): rådgiveren vælger de afsnit, AI'en skal skrive,
// før den går i gang. Alle 14 er valgt fra start; "Vælg alle" og "Fravælg alle". Et afsnit, rådgiveren har
// rettet i, er mærket "redigeret", og er nogle af dem valgt, advarer dialogen om, at de bliver overskrevet.
// "Skriv n afsnit" er slået fra, når intet er valgt (som før). Selve skrivningen kører på siden
// (useMemoGeneration) med de valgte afsnits nøgler.
// Dialogen vises, så længe den er monteret (siden bruger v-if). Ved åbning får "Vælg alle" fokus (det første
// felt, som før); dialogen husker selv, hvad der havde fokus, og giver det fokus igen, når den lukkes.
//
// Props: sections (MEMO_SECTIONS), modified ({ afsnit: true } for afsnit med rådgiverens egne rettelser).
// Emits: cancel, start(nøgler).
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { t } from '@/i18n'
import { dialogBodyStyle } from '@/components/common/dialogBody'

const props = defineProps({
  sections: { type: Array, required: true },
  modified: { type: Object, required: true },
})
const emit = defineEmits(['cancel', 'start'])

const picked = ref((() => {
  const m = {}
  props.sections.forEach(s => { m[s.k] = true })
  return m
})())
const chosen = computed(() => props.sections.filter(s => picked.value[s.k]))
const overwritten = computed(() => chosen.value.filter(s => props.modified[s.k]))

function toggle (k) { picked.value = { ...picked.value, [k]: !picked.value[k] } }
function setAll (v) {
  const m = {}
  props.sections.forEach(s => { m[s.k] = v })
  picked.value = m
}

// Fokus: "Vælg alle" ved åbning; det, der havde fokus før, igen ved lukning
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
    :title="t('Generér memoet')"
    :width="572"
    :wrap-props="{ 'aria-modal': 'true' }"
    :body-style="dialogBodyStyle"
    @cancel="emit('cancel')"
  >
    <a-typography-paragraph type="secondary">
      {{ t('Hvert afsnit skrives ud fra sagens dokumenter, de realiserede periodetal og årsregnskaberne. Teksten kommer med kildehenvisninger, så du kan se hvor hvert tal stammer fra.') }}
    </a-typography-paragraph>

    <div
      ref="head"
      class="memo-gen-pick"
    >
      <a-typography-text type="secondary">
        {{ chosen.length + ' ' + t('af') + ' ' + sections.length + ' ' + t('valgt') }}
      </a-typography-text>
      <a-space :size="4">
        <a-button
          class="cw-link"
          type="link"
          size="small"
          @click="setAll(true)"
        >
          {{ t('Vælg alle') }}
        </a-button>
        <a-button
          class="cw-link"
          type="link"
          size="small"
          @click="setAll(false)"
        >
          {{ t('Fravælg alle') }}
        </a-button>
      </a-space>
    </div>

    <a-list
      size="small"
      bordered
      :data-source="sections"
      row-key="k"
      class="memo-gen-list"
    >
      <template #renderItem="{ item: s }">
        <a-list-item>
          <a-checkbox
            :checked="!!picked[s.k]"
            @change="toggle(s.k)"
          >
            <a-typography-text
              type="secondary"
              class="memo-gen-num"
            >
              {{ s.num }}
            </a-typography-text>{{ ' ' + t(s.label) + (modified[s.k] ? ' ' : '') }}<a-tag
              v-if="modified[s.k]"
            >
              {{ t('redigeret') }}
            </a-tag>
          </a-checkbox>
        </a-list-item>
      </template>
    </a-list>

    <a-alert
      v-if="overwritten.length > 0"
      type="warning"
      show-icon
      class="memo-gen-warn"
      :message="overwritten.length + ' ' + t('af de valgte afsnit er redigeret manuelt. De bliver overskrevet. Du kan fravælge dem ovenfor.')"
    />

    <template #footer>
      <a-button @click="emit('cancel')">
        {{ t('Annullér') }}
      </a-button>
      <a-button
        type="primary"
        :disabled="!chosen.length"
        @click="emit('start', chosen.map(s => s.k))"
      >
        {{ t('Skriv') + ' ' + chosen.length + ' ' + t('afsnit') }}
      </a-button>
    </template>
  </a-modal>
</template>

<style scoped>
/* "x af 14 valgt" til venstre, "Vælg alle" og "Fravælg alle" til højre */
.memo-gen-pick {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

/* Afsnitsnummeret står i en fast kolonne, så titlerne flugter */
.memo-gen-num {
  display: inline-block;
  min-width: 22px;
}

.memo-gen-warn {
  margin-top: 12px;
}
</style>
