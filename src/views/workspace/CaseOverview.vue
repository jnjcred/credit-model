<script setup>
// Fanen Overblik i sagen (workspace.jsx: WSOverview, L987–1080), i denne rækkefølge:
// - fasekortet (hvor sagen står, næste skridt og sagens trin) og afslagsnoten, når sagen er afslået;
// - materialevalget "Anmod om materiale" / "Ret i anmodningen" som modal (MaterialRequestModal).
//   En opdatering af en sendt anmodning er en kladde, mens sagen bliver i sin fase. Lukkes modalen
//   uden at sende, huskes kladden: en anmodning, der ikke er sendt, går tilbage til vurderingen,
//   en opdatering lukkes, og ellers skjules modalen, til "Åbn anmodningen" ('cw-open-material');
// - dialogen med kunden: venter kunden på et svar fra rådgiveren, står den før materialet og
//   bliver stående, når rådgiveren har svaret (så feltet ikke hopper væk midt i skrivningen);
// - Anmodet materiale, Materiale på sagen og Seneste aktivitet.
// Kommer man fra sagshovedet, Dataanmodninger ('kabul:focus-material') eller tilbage fra en kilde
// under Dokumenter ('kabul:ws-focus'), rulles der til afsnittet (useFocusTarget).
// Reglerne står i wsOverviewModel i src/domain/workspace/header.js.
//
// Props: caseId. (React-propperne go, caseData og stage regnes her: useNavigation, wsCaseData og
// wsStage.) Emits: ingen.
import { computed, ref, watch } from 'vue'
import { wsCaseData } from '@/domain/workspace/caseData'
import { wsStage } from '@/domain/workspace/stage'
import { wsOverviewModel } from '@/domain/workspace/header'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import { useFocusTarget } from './composables/useFocusTarget'
import StageHeroCard from './StageHeroCard.vue'
import DeclineNoteCard from './DeclineNoteCard.vue'
import MaterialRequestModal from './MaterialRequestModal.vue'
import CustomerDialogPanel from './CustomerDialogPanel.vue'
import OutstandingCard from './OutstandingCard.vue'
import MaterialOnCaseCard from './MaterialOnCaseCard.vue'
import ActivityCard from './ActivityCard.vue'

const props = defineProps({
  caseId: { type: Number, required: true },
})

const caseVersion = useCaseVersion()
const matClosed = ref(false)
// Kvitteringen i modalen efter afsendelsen: { name, count, deadline, update, noMail }
const sentInfo = ref(null)

const caseData = computed(() => {
  caseVersion.value
  return wsCaseData(props.caseId)
})
const stage = computed(() => {
  caseVersion.value
  return wsStage()
})
const ov = computed(() => {
  caseVersion.value
  return wsOverviewModel(stage.value, { setMatClosed: (v) => { matClosed.value = v } })
})
// Indstillet eller afslået: kundens punkter kan ikke ændres
const locked = computed(() => ov.value.submitted || stage.value === 'declined')

// Dialogen med kunden står først, når kunden venter på rådgiveren, og bliver der
const dialogPinned = ref(ov.value.waitsOnAdvisor)
watch(() => ov.value.waitsOnAdvisor, (v) => { if (v) dialogPinned.value = true })
const dialogFirst = computed(() => ov.value.showDialog && (ov.value.waitsOnAdvisor || dialogPinned.value))

// Rul til det afsnit, sagshovedet eller en anden skærm bad om
useFocusTarget()

// Materialevalget: vises igen, når det bliver aktuelt, eller når "Åbn anmodningen" trykkes
watch([() => ov.value.matShown, () => ov.value.editing], () => {
  if (ov.value.matShown) matClosed.value = false
})
useWindowEvent('cw-open-material', () => { matClosed.value = false })
// Fortrydes afsendelsen, mens kvitteringen står i modalen, er den ikke sand længere
watch(() => !!ov.value.request, () => {
  if (!ov.value.request && sentInfo.value) sentInfo.value = null
})
const showMaterial = computed(() => (ov.value.matShown && !matClosed.value) || !!sentInfo.value)
function onSent (info) {
  sentInfo.value = info
}
function onMaterialClose () {
  if (sentInfo.value) {
    sentInfo.value = null
    matClosed.value = false
  } else ov.value.closeMaterial()
}
</script>

<template>
  <div class="ws-overview">
    <!-- Fasekortet: hvor sagen står, og næste skridt (én primær knap) -->
    <StageHeroCard
      :stage="stage"
      :case-id="caseId"
    />

    <DeclineNoteCard v-if="stage === 'declined'" />

    <MaterialRequestModal
      v-if="showMaterial"
      :key="sentInfo ? 'sent' : 'edit'"
      :case-data="caseData"
      :request="ov.request"
      :sent="sentInfo"
      @sent="onSent"
      @close="onMaterialClose"
    />

    <CustomerDialogPanel v-if="dialogFirst" />

    <!-- Det, der kræver handling: til gennemgang og det, kunden mangler -->
    <OutstandingCard :locked="locked" />

    <!-- Det, sagen har: offentlige data og det godkendte fra kunden -->
    <MaterialOnCaseCard :locked="locked" />

    <CustomerDialogPanel v-if="ov.showDialog && !dialogFirst" />

    <!-- Hvad er der sket -->
    <ActivityCard />
  </div>
</template>

<style scoped>
.ws-overview {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 32px 80px;
}
</style>
