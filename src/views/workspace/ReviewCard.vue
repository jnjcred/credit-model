<script setup>
// "Til din gennemgang" på Overblik (designet "Anmodet materiale v5"): det, kunden har sendt, og som
// venter på, at du godkender det eller stiller et spørgsmål. Et godkendt punkt flytter til Materiale
// på sagen (beskeden har Fortryd). Står kun, når kunden er bedt om materiale (wsOutstanding).
// Element-id'er, andre steder ruller og fokuserer til: ws-outstanding (afsnittet; sagshovedets
// "Gennemgå materiale", klokken og Dataanmodninger) og ws-outstanding-title (overskriften).
//
// Props: locked (sagen er indstillet eller afslået). Emits: ingen.
import { computed, ref } from 'vue'
import { t } from '@/i18n'
import { wsOutstanding } from '@/domain/workspace/items'
import { useCaseVersion } from '@/composables/useCaseVersion'
import MaterialTable from './MaterialTable.vue'
import RemindCustomerModal from './RemindCustomerModal.vue'

const props = defineProps({
  locked: { type: Boolean, default: false },
})

const caseVersion = useCaseVersion()
const o = computed(() => {
  caseVersion.value
  return wsOutstanding(props.locked)
})
// Påmind fra en række (sker kun, hvis et punkt i gennemgangen også mangler noget)
const remindIds = ref(null)
</script>

<template>
  <section
    v-if="o"
    id="ws-outstanding"
    class="ws-anchor"
    aria-labelledby="ws-outstanding-title"
  >
    <a-card :bordered="false">
      <template #title>
        <span
          id="ws-outstanding-title"
          role="heading"
          aria-level="2"
          tabindex="-1"
        >{{ t('Til din gennemgang') + ' ' }}<a-typography-text type="secondary">({{ o.review.length }})</a-typography-text></span>
      </template>
      <a-typography-paragraph
        v-if="!o.review.length"
        type="secondary"
        class="ws-empty"
      >
        {{ t('Der er intet materiale til gennemgang. Nyt materiale fra kunden lander her.') }}
      </a-typography-paragraph>
      <MaterialTable
        v-else
        :entries="o.review"
        kind="review"
        :locked="locked"
        labelled-by="ws-outstanding-title"
        @remind="(ids) => { remindIds = ids }"
      />
    </a-card>
    <RemindCustomerModal
      v-if="remindIds"
      :ids="remindIds"
      @close="remindIds = null"
    />
  </section>
</template>

<style scoped>
/* Afsnittet rulles til (sagshovedet, klokken, Dataanmodninger): lidt luft over kortet */
.ws-anchor {
  scroll-margin-top: 16px;
}

.ws-empty {
  margin-bottom: 0;
}
</style>
