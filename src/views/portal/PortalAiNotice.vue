<script setup>
// Oplysningen om AI (src/domain/aiNotice.js): et skærmbillede for sig lige efter trinnet Bruger, før kunden
// sender materiale. Eksisterende kunder, der ikke har kvitteret for den gældende version, får det ved næste
// login ("Nyt: sådan bruger vi AI"). Kunden sætter et flueben og trykker Fortsæt; kvitteringen gemmes med
// version og tidspunkt og står i sagens historik. Adskilt fra brugsvilkårene, så den er klar og letgenkendelig
// (AI-forordningen art. 50, stk. 5).
// Props: updated (kunden har kvitteret for en ældre version eller har allerede sendt materiale)
// Emits: done
import { ref } from 'vue'
import AiIcon from '@/components/common/AiIcon.vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import { AI_NOTICE_TEXT, aiNoticeAccept } from '@/domain/aiNotice'
import PortalContactLine from './components/PortalContactLine.vue'

defineProps({
  updated: { type: Boolean, default: false },
})
const emit = defineEmits(['done'])

const read = ref(false)
const tried = ref(false)
const adv = PORTAL_CONTACT.first

function next () {
  tried.value = true
  if (!read.value) { CW.focusSoon('#cwp-ai-read'); return }
  const acc = (CW.onboarding() || {}).account || {}
  if (aiNoticeAccept(acc.name || acc.email || '') === false) return
  emit('done')
}
</script>

<template>
  <div class="portal-calm">
    <a-typography-title>
      <AiIcon aria-hidden="true" />
      {{ updated ? t('Nyt: sådan bruger vi AI') : t('Sådan bruger vi AI') }}
    </a-typography-title>
    <a-typography-paragraph type="secondary">
      {{ updated ? t('Vi har tilføjet en oplysning om, hvordan jeres materiale læses af AI. Læs den, før I fortsætter.') : t('Læs det her, før I sender materiale.') }}
    </a-typography-paragraph>
    <a-card size="small">
      <a-typography>
        <a-typography-paragraph
          v-for="(p, i) in AI_NOTICE_TEXT"
          :key="i"
        >
          {{ ncFill(t(p), { adv }) }}
        </a-typography-paragraph>
      </a-typography>
    </a-card>
    <a-form-item
      class="portal-ai-check"
      :validate-status="tried && !read ? 'error' : undefined"
    >
      <a-checkbox
        id="cwp-ai-read"
        v-model:checked="read"
        aria-required="true"
        :aria-invalid="tried && !read ? 'true' : undefined"
        :aria-describedby="tried && !read ? 'cwp-ai-read-err' : undefined"
      >
        {{ t('Jeg har læst, hvordan EIFO og Crediwire bruger AI til at læse vores materiale.') }}
      </a-checkbox>
      <template
        v-if="tried && !read"
        #help
      >
        <span
          id="cwp-ai-read-err"
          role="alert"
        >{{ t('Sæt flueben for at fortsætte.') }}</span>
      </template>
    </a-form-item>
    <a-button
      type="primary"
      data-cust-act="terms"
      @click="next"
    >
      {{ t('Fortsæt') }}
    </a-button>
    <PortalContactLine class="portal-ai-contact" />
  </div>
</template>

<style scoped>
.portal-calm {
  max-width: 560px;
  margin: 0 auto;
}

.portal-ai-check {
  margin: 16px 0 12px;
}

.portal-ai-contact {
  margin-top: 24px;
}
</style>
