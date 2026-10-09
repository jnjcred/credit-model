<script setup>
// Kundens valgfrie bemærkning til EIFO, når kunden sender filer eller forbinder regnskabsprogrammet.
// Samme mønster som på uploadpunkterne (PortalUpload): et "Tilføj en bemærkning"-link, der åbner feltet.
// Er der allerede skrevet en bemærkning, står feltet åbent. Teksten bor hos siden, der bruger det (v-model).
// Props: value (teksten), hint (en kort grå linje under feltet, valgfri).
// Emits: update:value.
import { ref } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { ncFill } from '@/domain/new_case_portal'

const props = defineProps({
  value: { type: String, default: '' },
  hint: { type: String, default: '' },
  // Id'et skal være unikt på siden, når feltet står to gange (efter regnskabsprogrammet og efter saldobalancen)
  fieldId: { type: String, default: 'cwp-comment' },
})
const emit = defineEmits(['update:value'])
const adv = 'EIFO'   // kunden skriver til og hører fra EIFO
const FULL = { span: 24 }
// Åbent, når kunden har klikket, eller når der allerede står en tekst (også fra den anden instans på siden)
const open = ref(false)
function openNote () {
  open.value = true
  CW.focusSoon('#' + props.fieldId)
}
</script>

<template>
  <div class="portal-comment">
    <a-form-item
      v-if="open || value"
      :label="ncFill(t('Bemærkning til {adv} (valgfri)'), { adv })"
      :html-for="fieldId"
      :label-col="FULL"
      :colon="false"
    >
      <a-textarea
        :id="fieldId"
        :value="value"
        :rows="2"
        :placeholder="t('F.eks. hvilken version det er, eller hvad der mangler')"
        @update:value="(v) => emit('update:value', v)"
      />
      <template
        v-if="hint"
        #extra
      >
        {{ hint }}
      </template>
    </a-form-item>
    <a-button
      v-else
      type="text"
      class="portal-note-btn"
      @click="openNote"
    >
      <template #icon>
        <PlusOutlined aria-hidden="true" />
      </template>
      {{ t('Tilføj en bemærkning') }}
    </a-button>
  </div>
</template>

<style scoped>
.portal-comment {
  margin-top: 16px;
  margin-bottom: 0;
}

/* "Tilføj en bemærkning" er tekst, der kan klikkes, ikke en svævende knap: ingen kasse, ingen indrykning */
.portal-note-btn {
  height: auto;
  padding: 0;
  margin-left: 0;
  background: transparent;
  box-shadow: none;
  color: inherit;
}

.portal-note-btn:hover {
  color: #1677ff;
  background: transparent;
}
</style>
