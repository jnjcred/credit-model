<script setup>
// Filer, der allerede er sendt til punktet (new_case_portal.jsx: PortalSentFiles, L2036–2058): navn,
// størrelse og dato (det fulde tidspunkt i tooltip), "tilføjet af {rådgiver}" på rådgiverens filer,
// "Åbn" og, på kundens egne filer, "Fjern" (bekræftelse; csRemoveOwnFile). Intet, når listen er tom.
// Props: item (punktet), files (punktets filer).
// "Fjern" bærer data-cust-act="remove": forhåndsvisningens spærre stopper klikket.
import { computed } from 'vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { csOpenFile, csRemoveOwnFile, csShortDate } from '@/domain/customer'
import { PORTAL_CONTACT, ncFill } from '@/domain/new_case_portal'
import { useCaseVersion } from '@/composables/useCaseVersion'

const props = defineProps({
  item: { type: Object, required: true },
  files: { type: Array, required: true },
})

const adv = PORTAL_CONTACT.first
const version = useCaseVersion()
// Hvilke filer kunden selv kan fjerne, følger sagen
const rows = computed(() => {
  version.value
  return props.files.map(f => ({ f, mine: CW.canRemoveFile(props.item.id, f.id, 'kunde') }))
})
</script>

<template>
  <a-list
    v-if="files.length"
    class="portal-sent"
    size="small"
    bordered
    :data-source="rows"
  >
    <template #header>
      <a-typography-text type="secondary">
        {{ ncFill(t('Allerede sendt til {adv}'), { adv }) }}
      </a-typography-text>
    </template>
    <template #renderItem="{ item: r }">
      <a-list-item>
        <div class="portal-sent-file">
          <div class="portal-sent-name">
            {{ r.f.name }}
          </div>
          <a-typography-text type="secondary">
            {{ r.f.sizeLabel }} ·
            <a-tooltip :title="CW.fmtWhen(r.f.at)">
              <span>{{ csShortDate(r.f.at) }}</span>
            </a-tooltip>{{ !r.mine ? ' · ' + ncFill(t('tilføjet af {adv}'), { adv }) : '' }}
          </a-typography-text>
        </div>
        <template #actions>
          <a-button
            type="text"
            :aria-label="t('Åbn') + ' ' + r.f.name"
            @click="csOpenFile(r.f)"
          >
            {{ t('Åbn') }}
          </a-button>
          <a-button
            v-if="r.mine"
            type="text"
            data-cust-act="remove"
            :aria-label="ncFill(t('Fjern {file}'), { file: r.f.name })"
            @click="csRemoveOwnFile(item.id, r.f)"
          >
            {{ t('Fjern') }}
          </a-button>
        </template>
      </a-list-item>
    </template>
  </a-list>
</template>

<style scoped>
.portal-sent {
  margin-bottom: 16px;
}

.portal-sent-file {
  min-width: 0;
}

/* Lange filnavne brydes, så listen ikke bliver bredere end siden */
.portal-sent-name {
  word-break: break-all;
}
</style>
