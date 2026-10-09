<script setup>
// Sagshovedet (WorkspaceShell i workspace.jsx L697–740): sagens navn (sidens h1) og en grå linje med
// facilitet (andelen af bankens facilitet som tooltip), sagsnummer, CVR og dage i fasen (kun tæt på
// eller over SLA; rød, når den er over). Næste skridt står til højre i fanelinjen (WorkspaceView), og
// Kundeside og Kundeflow står i sidemenuen (AppSidebar). Giv afslag og de øvrige handlinger står ikke
// i sagshovedet. Teksterne regnes af wsHeaderModel (src/domain/workspace/header.js) i WorkspaceView.
//
// Props: caseData, hasData, name, facility ({ text, note } | null), cvr, phaseDays, phaseLate,
//        phaseWarn.
import { t } from '@/i18n'
import { wsPlural } from '@/domain/workspace/format'

defineProps({
  caseData: { type: Object, required: true },
  hasData: { type: Boolean, default: false },
  name: { type: String, required: true },
  facility: { type: Object, default: null },
  cvr: { type: [String, Number], default: null },
  phaseDays: { type: Number, default: 0 },
  phaseLate: { type: Boolean, default: false },
  phaseWarn: { type: Boolean, default: false },
})
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
              -
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
              {{ wsPlural(phaseDays, t('1 hverdag i fasen'), t('{n} hverdage i fasen')) + ' - ' + (phaseLate ? t('over SLA') : t('tæt på SLA')) }}
            </a-typography-text>
          </a-tooltip>
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
