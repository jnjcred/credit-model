<script setup>
/* "Bogført til og med" i overskriften over periodetallene (Regnskab v5, kun ERP): måneden, som
   perioden går til. Listen står pr. regnskabsår (de ældste først) med en måned pr. punkt; den
   måned, Crediwire vurderer (eller kunden har angivet), at regnskabet er bogført til, har et mærke.
   Standard er vurderingen; rådgiverens valg gemmes og logges af sektionen (emit select).
   a-dropdown med a-menu (useMenuKeyboard: fokus på den valgte måned, piletaster, Enter, Esc).
   Props: period (finRegnskabColumns().period), disabled (sagen er indstillet: kun teksten)
   Emits: select(t) */
import { computed, ref } from 'vue'
import { CheckOutlined, DownOutlined, UserOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { finFill } from '@/domain/financials/finFormat'
import { useMenuKeyboard } from '@/composables/useMenuKeyboard'

const props = defineProps({
  period: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const open = ref(false)
const kb = useMenuKeyboard()
const btnId = 'fin-period-btn'
const menuId = 'fin-period-menu'

const byCust = computed(() => props.period.estBy === 'cust')
const estText = computed(() => (byCust.value ? t('Angivet bogført hertil') : t('Vurderet bogført hertil')))
const estTip = computed(() => (byCust.value
  ? t('Kunden har selv angivet, at bogføringen er ajour til og med denne måned')
  : t('Crediwire vurderer ud fra bogføringen, at regnskabet er bogført til og med denne måned')))
const selectedKeys = computed(() => (props.period.selected != null ? [String(props.period.selected)] : []))
const btnLabel = computed(() => finFill(t('Bogført til og med: {periode}'), { periode: props.period.label }))
const itemLabel = (it) => it.label + (it.est ? ', ' + estText.value.toLowerCase() + (byCust.value ? ' ' + t('af kunden') : ' ' + t('af Crediwire')) : '')

function onVisible (v) {
  open.value = v
  if (v) {
    // Knappen står i tabellens vandrette rulning: den rulles ind, så listen åbner ved den
    const btn = document.getElementById(btnId)
    if (btn && btn.scrollIntoView) btn.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    // Fokus på den valgte måned (listen kan være lang; den valgte står ofte nederst)
    kb.attach({ menuId, trigger: () => document.getElementById(btnId), close: () => { open.value = false },
      initial: () => document.querySelector('#' + menuId + ' [aria-checked="true"]') })
  } else kb.detach()
}
function onPick ({ key }) {
  open.value = false
  kb.detach()
  const m = Number(key)
  if (m !== props.period.selected) emit('select', m)
  const btn = document.getElementById(btnId)
  if (btn) btn.focus()
}
</script>

<template>
  <span
    v-if="disabled"
    class="fin-period-months"
  >{{ period.months }}</span>
  <a-dropdown
    v-else
    :trigger="['click']"
    :visible="open"
    placement="bottomRight"
    @visible-change="onVisible"
  >
    <a-button
      :id="btnId"
      type="text"
      size="small"
      class="fin-period-btn"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="btnLabel"
      :title="t('Vælg, hvilken måned regnskabet er bogført til og med')"
    >
      <span class="fin-period-months">{{ period.months }}</span>
      <DownOutlined aria-hidden="true" />
    </a-button>
    <template #overlay>
      <a-menu
        :id="menuId"
        :aria-label="t('Bogført til og med')"
        :selected-keys="selectedKeys"
        :style="{ minWidth: '360px', maxHeight: '360px', overflowY: 'auto' }"
        @click="onPick"
      >
        <a-menu-item-group key="head">
          <template #title>
            <span class="fin-period-over">{{ t('Bogført til og med') }}</span>
          </template>
        </a-menu-item-group>
        <a-menu-item-group
          v-for="g in period.groups"
          :key="'fy' + g.s"
        >
          <template #title>
            <span class="fin-period-fy">{{ g.label }}</span>
          </template>
          <a-menu-item
            v-for="it in g.items"
            :key="String(it.t)"
            role="menuitemradio"
            :aria-checked="it.sel ? 'true' : 'false'"
            :aria-label="itemLabel(it)"
          >
            <span class="fin-period-item">
              <span :class="['fin-period-label', { sel: it.sel }]">{{ it.label }}</span>
              <a-tooltip
                v-if="it.est"
                :title="estTip"
              >
                <a-tag class="fin-period-est">
                  {{ estText }}
                  <a-divider type="vertical" />
                  <template v-if="byCust">
                    <UserOutlined aria-hidden="true" />
                    {{ t('Kunden') }}
                  </template>
                  <span
                    v-else
                    class="fin-period-cw"
                  >Crediwire</span>
                </a-tag>
              </a-tooltip>
              <CheckOutlined
                v-if="it.sel"
                class="fin-period-check"
                aria-hidden="true"
              />
            </span>
          </a-menu-item>
        </a-menu-item-group>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Måneden i overskriften: grå og halvfed som i designet; året står ved siden af (sektionen) */
.fin-period-months {
  font-weight: 600;
  color: @text-color-secondary;
}

.fin-period-over {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: @text-color-secondary;
}

.fin-period-fy {
  font-weight: 700;
  color: @heading-color;
}

.fin-period-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fin-period-label { flex: 1; }
.fin-period-label.sel { font-weight: 600; }

.fin-period-est {
  margin: 0;
  border-radius: 999px;
}

/* Crediwire som ord (appen har ikke logoet som fil, og repoet er offentligt) */
.fin-period-cw {
  font-weight: 700;
  color: @orange-8;
}

.fin-period-check { color: @primary-color; }
</style>
