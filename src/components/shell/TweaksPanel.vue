<script setup>
// Tweaks: demoens værktøjspanel. Det vises kun, når værten (Claude Design) slår
// redigering til. Værtsprotokollen er den samme som før migrationen:
//   modtager __activate_edit_mode / __deactivate_edit_mode (postMessage)
//   sender __edit_mode_available ved start og __edit_mode_dismissed, når panelet lukkes.
// Afsnittet "Accentfarve" er fjernet: farverne strider mod designsystemets tema (se MIGRATION.md).
// Accentfarven var den eneste indstilling, panelet gemte hos værten (__edit_mode_set_keys), så den
// besked sendes ikke længere. Ordbogens nøgler til afsnittet står uændret i src/i18n/dict/tweaks.js.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { memoMode } from '@/domain/case_facts'
import { go } from '@/composables/useNavigation'
import { openNewCase } from '@/composables/useAppShell'
import { confirmResetDemo } from '@/services/demo'

const open = ref(false)

function onMessage (e) {
  const type = e && e.data && e.data.type
  if (type === '__activate_edit_mode') open.value = true
  else if (type === '__deactivate_edit_mode') open.value = false
}
onMounted(() => {
  window.addEventListener('message', onMessage)
  window.parent.postMessage({ type: '__edit_mode_available' }, '*')
})
onBeforeUnmount(() => window.removeEventListener('message', onMessage))

function dismiss () {
  open.value = false
  window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*')
}

// Piloten skriver memoet i Word med Copilot; det indbyggede memo er gemt bag dette flag (case_facts.js)
function setBuiltinMemo (on) {
  try { localStorage.setItem('cw_memo_mode', on ? 'builtin' : 'copilot') } catch (e) {}
  location.reload()
}

const jumps = [
  { label: 'Mine opgaver', route: 'cases' },
  { label: 'Dataanmodninger', route: 'requests' },
  { label: 'Porteføljeanalyse', route: 'analyse' },
  { label: 'Ny sag', action: openNewCase },
  { label: 'Sagens overblik', route: 'workspace:1' },
  { label: 'Finans', route: 'workspace:1:financials' },
  { label: 'Dokumenter', route: 'workspace:1:documents' },
  { label: 'Credit memo', route: 'workspace:1:memo' },
  { label: 'Kundens portal', route: 'portal' },
]
function jump (j) { if (j.action) j.action(); else go(j.route) }
</script>

<template>
  <a-drawer
    :visible="open"
    :title="t('Tweaks')"
    placement="right"
    :width="280"
    :mask="false"
    @close="dismiss"
  >
    <a-divider
      orientation="left"
      plain
    >
      {{ t('Demo') }}
    </a-divider>
    <a-space
      direction="vertical"
      class="tweaks-block"
    >
      <a-button
        block
        :title="t('Rydder alt demoen har gemt (sagens fase, uploads, memo) og genindlæser')"
        @click="confirmResetDemo"
      >
        <template #icon>
          <ReloadOutlined aria-hidden="true" />
        </template>
        {{ t('Nulstil demo') }}
      </a-button>
      <a-space>
        <a-switch
          :checked="memoMode() === 'builtin'"
          :aria-label="t('Indbygget memo og indstilling')"
          @change="setBuiltinMemo"
        />
        <span>{{ t('Indbygget memo og indstilling') }}</span>
      </a-space>
    </a-space>

    <a-divider
      orientation="left"
      plain
    >
      {{ t('Hop til skærm') }}
    </a-divider>
    <a-row :gutter="[8, 8]">
      <a-col
        v-for="j in jumps"
        :key="j.label"
        :span="12"
      >
        <a-button
          size="small"
          block
          @click="jump(j)"
        >
          {{ t(j.label) }}
        </a-button>
      </a-col>
    </a-row>
  </a-drawer>
</template>

<style scoped>
.tweaks-block {
  width: 100%;
}
</style>
