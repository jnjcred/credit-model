// Lyt på et window-event, så længe komponenten er monteret.
// Appens skærme taler sammen med CustomEvents på window (fx 'cw-new-case',
// 'cw-open-doc', 'memo-changed'); navnene og indholdet er de samme som før migrationen.
import { onBeforeUnmount, onMounted } from 'vue'

export function useWindowEvent (name, handler, options) {
  onMounted(() => window.addEventListener(name, handler, options))
  onBeforeUnmount(() => window.removeEventListener(name, handler, options))
}
