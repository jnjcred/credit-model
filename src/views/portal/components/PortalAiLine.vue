<script setup>
// "Sådan bruger vi AI": hele oplysningen om AI (src/domain/aiNotice.js) som en fold, uden en kort linje ovenover.
// Står nederst i kortet med det anmodede materiale (PortalHub), ét sted og ikke under hvert punkt
// (AI-forordningen art. 50, stk. 5).
// Props: ingen.
import { ref } from 'vue'
import { t } from '@/i18n'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import { AI_NOTICE_TEXT } from '@/domain/aiNotice'
import { collapseExpandIcon } from '@/composables/useCollapseKeyboard'

const open = ref([])
const adv = PORTAL_CONTACT.first
</script>

<template>
  <div class="cwp-ai-line">
    <a-collapse
      v-model:active-key="open"
      ghost
      :expand-icon="collapseExpandIcon"
    >
      <a-collapse-panel
        key="ai"
        :header="t('Sådan bruger vi AI')"
      >
        <a-typography-paragraph
          v-for="(p, i) in AI_NOTICE_TEXT"
          :key="i"
          type="secondary"
        >
          {{ ncFill(t(p), { adv }) }}
        </a-typography-paragraph>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<style scoped>
.cwp-ai-line {
  margin-top: 4px;
}
</style>
