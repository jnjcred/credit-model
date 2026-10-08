<script setup>
// "Flere handlinger" i sagshovedet (WSMenu i workspace.jsx L395–452 med punkterne fra
// WorkspaceShell L689–693): Giv afslag, Træk indstilling tilbage eller Genoptag sag. Punkterne
// udelukker hinanden, så menuen har ét punkt ad gangen (wsHeaderModel(...).moreItems).
// Menuen kan betjenes med tastaturet som før (useMenuKeyboard): fokus på første punkt, pil op/ned,
// Enter, Esc tilbage til knappen, Tab videre. Et valg lukker menuen og giver knappen fokus, før
// punktets handling kører, så en dialog, der åbnes, giver fokus tilbage til knappen.
//
// Props: items ([{ key, label, sub, danger, icon: 'X' | 'Undo', onClick }]; false-punkter springes over).
// Emits: ingen. Knappen har id 'ws-more-btn' (Giv afslag giver fokus tilbage hertil).
import { computed, ref } from 'vue'
import { CloseOutlined, EllipsisOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { useMenuKeyboard } from '@/composables/useMenuKeyboard'

const props = defineProps({
  items: { type: Array, default: () => [] },
})

const ICONS = { X: CloseOutlined, Undo: UndoOutlined }
const list = computed(() => props.items.filter(Boolean))
const open = ref(false)
const trigger = () => document.getElementById('ws-more-btn')

const menuKeys = useMenuKeyboard()
function onVisible (v) {
  open.value = v
  if (v) menuKeys.attach({ menuId: 'ws-more-menu', trigger, close: () => { open.value = false } })
  else menuKeys.detach()
}
function pick ({ key }) {
  const it = list.value.find(x => x.key === key)
  open.value = false
  menuKeys.detach()
  const b = trigger()
  if (b) b.focus()
  if (it && it.onClick) it.onClick()
}
</script>

<template>
  <a-dropdown
    :trigger="['click']"
    :visible="open"
    placement="bottomRight"
    @visible-change="onVisible"
  >
    <a-button
      id="ws-more-btn"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="t('Flere handlinger')"
    >
      <template #icon>
        <EllipsisOutlined aria-hidden="true" />
      </template>
    </a-button>
    <template #overlay>
      <a-menu
        id="ws-more-menu"
        :aria-label="t('Flere handlinger')"
        @click="pick"
      >
        <a-menu-item
          v-for="it in list"
          :key="it.key"
          :danger="!!it.danger"
        >
          <template #icon>
            <component
              :is="ICONS[it.icon]"
              aria-hidden="true"
            />
          </template>
          {{ it.label }}<template v-if="it.sub">
            <br><a-typography-text type="secondary">
              {{ it.sub }}
            </a-typography-text>
          </template>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>
