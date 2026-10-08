<script setup>
// Sagshovedet (WorkspaceShell i workspace.jsx L697–740): sagens navn (sidens h1), en grå linje med
// facilitet (andelen af bankens facilitet som tooltip), sagsnummer, CVR og dage i fasen (kun tæt på
// eller over SLA; rød, når den er over), og til højre den ansvarlige, Kundeside, Kundeflow,
// Flere handlinger og næste skridt. Uden levende data står kun navn, linjen og den ansvarlige (ikke
// ved en ukendt sag). Teksterne og knapperne regnes af wsHeaderModel (src/domain/workspace/header.js)
// i WorkspaceView.
//
// Props: caseData, hasData, name, facility ({ text, note } | null), cvr, phaseDays, phaseLate,
//        phaseWarn, moreItems (menuen Flere handlinger), nextStep ({ label, onClick } | null; knappen
//        har id 'ws-next-btn'), nextPrimary (næste skridt er sidens primære knap).
// Emits: open-preview(flow): Kundeside (flow false) eller Kundeflow (flow true).
import { ArrowRightOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { wsPlural } from '@/domain/workspace/format'
import CaseMoreActions from './CaseMoreActions.vue'
import CaseOwnerSelect from './CaseOwnerSelect.vue'

defineProps({
  caseData: { type: Object, required: true },
  hasData: { type: Boolean, default: false },
  name: { type: String, required: true },
  facility: { type: Object, default: null },
  cvr: { type: [String, Number], default: null },
  phaseDays: { type: Number, default: 0 },
  phaseLate: { type: Boolean, default: false },
  phaseWarn: { type: Boolean, default: false },
  moreItems: { type: Array, default: () => [] },
  nextStep: { type: Object, default: null },
  nextPrimary: { type: Boolean, default: true },
})
const emit = defineEmits(['open-preview'])
</script>

<template>
  <div class="ws-header">
    <a-row
      :gutter="[16, 12]"
      align="top"
      justify="space-between"
    >
      <a-col
        flex="1 1 320px"
        class="ws-header-name"
      >
        <a-typography-title
          :level="1"
          class="ws-title"
        >
          {{ name }}
        </a-typography-title>
        <!-- Rød tekst kun når noget er overskredet; tid i fasen kun tæt på eller over SLA -->
        <a-space
          wrap
          :size="[8, 2]"
        >
          <template #split>
            <a-typography-text
              type="secondary"
              aria-hidden="true"
            >
              ·
            </a-typography-text>
          </template>
          <a-tooltip
            v-if="facility"
            :title="facility.note || undefined"
          >
            <a-typography-text>{{ facility.text }}</a-typography-text>
          </a-tooltip>
          <a-typography-text type="secondary">
            {{ t('Sagsnr.') + ' ' + caseData.caseNr }}
          </a-typography-text>
          <a-typography-text
            v-if="cvr"
            type="secondary"
          >
            {{ 'CVR ' + cvr }}
          </a-typography-text>
          <a-tooltip
            v-if="hasData && (phaseLate || phaseWarn)"
            :title="t('Hverdage siden sagen kom i den nuværende fase')"
          >
            <a-typography-text :type="phaseLate ? 'danger' : 'secondary'">
              {{ wsPlural(phaseDays, t('1 hverdag i fasen'), t('{n} hverdage i fasen')) + ' · ' + (phaseLate ? t('over SLA') : t('tæt på SLA')) }}
            </a-typography-text>
          </a-tooltip>
        </a-space>
      </a-col>
      <a-col flex="none">
        <a-space wrap>
          <CaseOwnerSelect
            v-if="!caseData.unknown"
            :case-data="caseData"
          />
          <template v-if="hasData">
            <a-button
              :title="t('Se kundens side')"
              @click="emit('open-preview', false)"
            >
              <template #icon>
                <EyeOutlined aria-hidden="true" />
              </template>
              {{ t('Kundeside') }}
            </a-button>
            <!-- Demo: kundens vej gennem opstarten, fra landingssiden -->
            <a-button
              type="dashed"
              :title="t('Demo: de skærme, kunden kommer igennem, fra landingssiden')"
              @click="emit('open-preview', true)"
            >
              {{ t('Kundeflow') }}
            </a-button>
            <CaseMoreActions :items="moreItems" />
            <a-button
              v-if="nextStep"
              id="ws-next-btn"
              :type="nextPrimary ? 'primary' : 'default'"
              @click="nextStep.onClick()"
            >
              {{ nextStep.label }}
              <ArrowRightOutlined aria-hidden="true" />
            </a-button>
          </template>
        </a-space>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.ws-header {
  padding: 16px 24px 12px;
}

.ws-header-name {
  min-width: 0;
}

/* Overskriften får fokus ved sideskift (ingen ramme om en overskrift) */
.ws-title:focus {
  outline: none;
}
</style>
