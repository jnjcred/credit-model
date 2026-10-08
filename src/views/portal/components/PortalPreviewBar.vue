<script setup>
// Bjælken øverst i rådgiverens forhåndsvisning af kundens portal (new_case_portal.jsx: CustomerPortal
// L1214–1243): Kundeside eller Kundeflow, hvem der bruger siden ("Se som": Rådgiver eller Kunde), en
// forklaring og "Luk". I Kundeflow står rækken med kundens skærme under (aria-current på den viste).
//
// Props: flow (Kundeflow), flowRole ('rådgiver' | 'kunde'), hasRequest (anmodningen er sendt),
//        jump (vis rækken med kundens skærme), current (den viste skærm i rækken).
// Emits: role(r), close, jump(k).
// Bjælken er rådgiverens værktøj (role="note"), ikke en del af kundens side. Valget af rolle er ikke en
// kundehandling: listen lægges uden for portalen (antdv's standard), så forhåndsvisningens spærre ikke
// ser den.
import { computed } from 'vue'
import { CloseOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { PV_SCREENS, pvScreenLabel } from '@/domain/onboarding'

const props = defineProps({
  flow: { type: Boolean, default: false },
  flowRole: { type: String, required: true },
  hasRequest: { type: Boolean, default: false },
  jump: { type: Boolean, default: false },
  current: { type: String, default: null },
})
const emit = defineEmits(['role', 'close', 'jump'])
const ROLES = [{ value: 'rådgiver', label: t('Rådgiver') }, { value: 'kunde', label: t('Kunde') }]
const explain = computed(() => (props.flowRole === 'kunde' ? t('Du bruger siden som kunden. Svar, filer og beskeder gemmes, som om kunden havde sendt dem.')
  : props.flow ? t('De skærme, kunden kommer igennem. Du kan klikke rundt, men intet gemmes.')
  : props.hasRequest ? t('Du kan se og klikke rundt. Filer, du uploader i punkterne, sendes på kundens vegne. Alt andet gemmes ikke.') : t('Anmodningen er ikke sendt endnu. Sådan ser siden ud, når den er sendt.')))
</script>

<template>
  <a-alert
    class="portal-pv-bar"
    type="info"
    banner
    show-icon
    role="note"
  >
    <template #icon>
      <EyeOutlined aria-hidden="true" />
    </template>
    <template #message>
      <div class="portal-pv-row">
        <a-typography-text strong>
          {{ flow ? t('Kundeflow (demo)') : t('Forhåndsvisning af kundens side') }}
        </a-typography-text>
        <span class="cwp-pv-role">
          <label for="cwp-pv-role">{{ t('Se som') }}</label>
          <a-select
            id="cwp-pv-role"
            class="portal-pv-select"
            :value="flowRole"
            :options="ROLES"
            :dropdown-match-select-width="false"
            @change="(r) => emit('role', r)"
          />
        </span>
        <a-typography-text type="secondary">
          {{ explain }}
        </a-typography-text>
        <a-button
          class="portal-pv-close"
          @click="emit('close')"
        >
          <template #icon>
            <CloseOutlined aria-hidden="true" />
          </template>
          {{ t('Luk') }}
        </a-button>
      </div>
    </template>
    <template
      v-if="jump"
      #description
    >
      <div
        class="cwp-pv-jump"
        role="group"
        :aria-label="t('Kundens skærme')"
      >
        <span>{{ t('Kundens skærme:') }}</span>
        <a-space
          wrap
          :size="4"
        >
          <a-button
            v-for="k in PV_SCREENS"
            :key="k"
            :type="current === k ? 'primary' : 'default'"
            :aria-current="current === k ? 'true' : undefined"
            @click="emit('jump', k)"
          >
            {{ pvScreenLabel(k) }}
          </a-button>
        </a-space>
      </div>
    </template>
  </a-alert>
</template>

<style scoped>
.portal-pv-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
}

.cwp-pv-role {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.portal-pv-select {
  min-width: 110px;
}

/* "Luk" står yderst til højre */
.portal-pv-close {
  margin-left: auto;
}

.cwp-pv-jump {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
  margin-top: 8px;
}
</style>
