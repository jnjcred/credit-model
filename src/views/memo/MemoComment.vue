<script setup>
// Ét kort i kommentarsporet (memo.jsx: MemoComment L2949-3049). En kommentar slettes aldrig: den løses
// (hvem, hvornår, hvorfor) eller trækkes tilbage af den, der skrev den.
// - Åben: forfatter · afdeling, tidspunkt, teksten og evt. rådgiverens svar ("Svar fra …"). En blokerende
//   kommentar har "Blokerer indstilling" (rød tekst; prototypens røde kant i venstre side er udeladt, fordi
//   den kræver egen CSS på kortet) og, når rådgiveren har bedt om frigivelse, "Afventer {afdeling}".
//   Handlinger:
//     "Løs" (alt andet end en kontrolfunktions blokering), "Bed om frigivelse" (kontrolfunktionens blokering
//     uden svar), "Simulér svar fra …" (demo; mens svaret "skrives": "X skriver et svar…") og
//     "Træk tilbage" (egne kommentarer).
//   Er sporet låst (sagen er indstillet), står lockNote i stedet for handlingerne.
// - Løst eller trukket tilbage: foldet sammen til én linje ("Løst af …", "Frigivet af … (afdeling)" eller
//   "Trukket tilbage af …" og tidspunktet) med forfatter og afdeling under. Folden (a-collapse) viser
//   teksten, svaret og begrundelsen. Mellemrum folder også (useCollapseKeyboard; antdv 3.2.13 reagerer kun
//   på Enter). Foldens overskrift har klassen memo-cmt-sum: sporet giver den fokus efter løs og træk tilbage.
// data-cmt="cmt-<afsnit>-<id>" står på kortet (dybdelink, fokus og tests). Kortene har ingen avatar (som før).
// Reglerne for hvem der må hvad, og selve handlingerne, står i src/domain/memo/memoCommentWorkflow.js;
// kortet melder kun, hvad der blev klikket på.
//
// Props: c (kommentaren), section (afsnittet: { k, num, label }), lockNote (teksten, når sporet er låst;
//        ellers null).
// Emits: resolve(c), withdraw(c), request(c), simulate(c).
import { computed, ref } from 'vue'
import { CheckOutlined, RollbackOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { MEMO_DEPT_MAP, MEMO_DEPTS, MEMO_ME, commentState, commentWhen, isBlockingComment } from '@/domain/memo/memoComments'
import { _memoReleasePending } from '@/domain/memo/memoCommentWorkflow'
import { _memoFill } from '@/domain/memo/memoFormat'
import { collapseExpandIcon, useCollapseKeyboard } from '@/composables/useCollapseKeyboard'

const props = defineProps({
  c: { type: Object, required: true },
  section: { type: Object, required: true },
  lockNote: { type: String, default: null },
})
const emit = defineEmits(['resolve', 'withdraw', 'request', 'simulate'])

const onCollapseKeydown = useCollapseKeyboard()
// Foldens overskrift får klassen memo-cmt-sum (prop headerClass). a-collapse 3.2.13 læser panelets props
// direkte fra vnoden med camelCase-navnet og overskriver dem: skrevet som attributten header-class i
// skabelonen forsvinder klassen. Derfor gives den som et objekt med camelCase-nøglen.
const SUM_HEADER = { headerClass: 'memo-cmt-sum' }

const d = computed(() => MEMO_DEPT_MAP[props.c.dept] || MEMO_DEPTS[0])
const state = computed(() => commentState(props.c))
const blocking = computed(() => isBlockingComment(props.c))
const domId = computed(() => 'cmt-' + props.section.k + '-' + props.c.id)
const fmt = (iso) => (window.CW ? CW.fmtWhen(iso) : iso)

// Løst eller trukket tilbage: er folden åben?
const openKeys = ref([])
const open = computed(() => openKeys.value.length > 0)
// Frigivet: kontrolfunktionen har selv løst sin blokerende kommentar
const released = computed(() => state.value === 'resolved' && !!props.c.resolved.dept)
const summary = computed(() => {
  const c = props.c
  const who = state.value === 'resolved' ? c.resolved.by : c.withdrawn.by
  const when = state.value === 'resolved' ? c.resolved.at : c.withdrawn.at
  return (state.value === 'resolved' ? (released.value ? t('Frigivet af') + ' ' + who + ' (' + t((MEMO_DEPT_MAP[c.resolved.dept] || {}).label || c.resolved.dept) + ')' : t('Løst af') + ' ' + who) : t('Trukket tilbage af') + ' ' + who) + ', ' + fmt(when)
})

const mine = computed(() => props.c.author === MEMO_ME.author)
// En blokerende kommentar fra en kontrolfunktion kan kun frigives af den selv. Rådgiveren svarer og beder om
// frigivelse.
const control = computed(() => blocking.value && !mine.value)
// Mens det simulerede svar "skrives". Et almindeligt objekt i domænet: læses ved hver gengivelse (sporet
// tegnes om, når det ændrer sig, fordi ændringen sender 'memo-changed').
const isPending = () => !!_memoReleasePending[props.section.k + ':' + props.c.id]
const deptLbl = computed(() => t(d.value.label))
</script>

<template>
  <div
    v-if="state !== 'open'"
    :class="['memo-cmt', state]"
    :data-cmt="domId"
    @keydown="onCollapseKeydown"
  >
    <a-collapse
      v-model:active-key="openKeys"
      ghost
      expand-icon-position="right"
      :expand-icon="collapseExpandIcon"
    >
      <a-collapse-panel
        key="c"
        v-bind="SUM_HEADER"
      >
        <template #header>
          <span class="memo-cmt-sum-row">
            <CheckOutlined
              v-if="state === 'resolved'"
              aria-hidden="true"
            />
            <RollbackOutlined
              v-else
              aria-hidden="true"
            />
            <span class="memo-cmt-sum-t">{{ summary }}</span>
          </span>
        </template>
        <a-comment>
          <template #author>
            <a-typography-text strong>
              {{ c.author }}
            </a-typography-text>{{ ' ' }}<a-typography-text
              type="secondary"
              class="memo-cmt-dept"
            >
              {{ '- ' + t(d.label) }}
            </a-typography-text>
          </template>
          <template #datetime>
            <a-typography-text
              type="secondary"
              class="memo-cmt-time"
            >
              {{ commentWhen(c) }}
            </a-typography-text>
          </template>
          <template #content>
            <p class="memo-cmt-text">
              <a-typography-text
                v-if="state === 'withdrawn'"
                type="secondary"
              >
                {{ t(c.text) }}
              </a-typography-text>
              <template v-else>
                {{ t(c.text) }}
              </template>
            </p>
            <div
              v-if="c.release"
              class="memo-cmt-reason"
            >
              <a-typography-text strong>
                {{ t('Svar fra') + ' ' + c.release.by + ':' }}
              </a-typography-text>{{ ' ' + t(c.release.text) }}
              <div>
                <a-typography-text
                  type="secondary"
                  class="memo-cmt-time"
                >
                  {{ t('Bad om frigivelse') + ' ' + fmt(c.release.at) }}
                </a-typography-text>
              </div>
            </div>
            <div
              v-if="state === 'resolved' && c.resolved.reason"
              class="memo-cmt-reason"
            >
              <a-typography-text strong>
                {{ t('Begrundelse') + (released ? ' (' + c.resolved.by + ')' : '') + ':' }}
              </a-typography-text>{{ ' ' + t(c.resolved.reason) }}
            </div>
          </template>
        </a-comment>
      </a-collapse-panel>
    </a-collapse>
    <a-typography-text
      v-if="!open"
      type="secondary"
      class="memo-cmt-time"
    >
      {{ c.author + ' - ' + t(d.label) + (blocking ? ' - ' + t('var blokerende') : '') }}
    </a-typography-text>
  </div>

  <div
    v-else
    :class="['memo-cmt', { blocking }]"
    :data-cmt="domId"
  >
    <a-comment>
      <template #author>
        <a-typography-text strong>
          {{ c.author }}
        </a-typography-text>{{ ' ' }}<a-typography-text
          type="secondary"
          class="memo-cmt-dept"
        >
          {{ '- ' + t(d.label) }}
        </a-typography-text>
      </template>
      <template #datetime>
        <a-typography-text
          type="secondary"
          class="memo-cmt-time"
        >
          {{ commentWhen(c) }}
        </a-typography-text>
      </template>
      <template #content>
        <div
          v-if="blocking"
          class="memo-cmt-flag"
        >
          <a-typography-text type="danger">
            {{ t('Blokerer indstilling') }}
          </a-typography-text>
        </div>
        <div
          v-if="blocking && c.release && c.author !== MEMO_ME.author"
          class="memo-cmt-wait"
        >
          <a-typography-text type="secondary">
            {{ _memoFill(t('Afventer {dept}'), { dept: t(d.label) }) }}
          </a-typography-text>
        </div>
        <p class="memo-cmt-text">
          {{ t(c.text) }}
        </p>
        <div
          v-if="c.release"
          class="memo-cmt-reason"
        >
          <a-typography-text strong>
            {{ t('Svar fra') + ' ' + c.release.by + ':' }}
          </a-typography-text>{{ ' ' + t(c.release.text) }}
          <div>
            <a-typography-text
              type="secondary"
              class="memo-cmt-time"
            >
              {{ t('Bad om frigivelse') + ' ' + fmt(c.release.at) }}
            </a-typography-text>
          </div>
        </div>
      </template>
      <template #actions>
        <div
          v-if="lockNote"
          class="memo-cmt-actions"
        >
          <a-typography-text
            type="secondary"
            class="memo-cmt-time"
          >
            {{ lockNote }}
          </a-typography-text>
        </div>
        <div
          v-else
          class="memo-cmt-actions"
          :role="control && c.release ? 'status' : undefined"
        >
          <a-button
            v-if="!control"
            type="link"
            size="small"
            class="memo-cmt-act primary cw-link"
            :aria-label="t('Løs kommentar fra') + ' ' + c.author"
            @click="emit('resolve', c)"
          >
            {{ t('Løs') }}
          </a-button>
          <a-button
            v-if="control && !c.release"
            type="link"
            size="small"
            class="memo-cmt-act primary cw-link"
            :aria-label="t('Svar og bed om frigivelse fra') + ' ' + c.author"
            @click="emit('request', c)"
          >
            {{ t('Bed om frigivelse') }}
          </a-button>
          <template v-if="control && c.release">
            <a-typography-text
              v-if="isPending()"
              type="secondary"
              class="memo-cmt-time"
            >
              {{ c.author + ' ' + t('skriver et svar') + '…' }}
            </a-typography-text>
            <a-button
              v-else
              type="link"
              size="small"
              class="memo-cmt-act primary memo-cmt-wrap cw-link"
              @click="emit('simulate', c)"
            >
              {{ t('Simulér svar fra') + ' ' + c.author + ' (' + deptLbl + ')' }}
            </a-button>
          </template>
          <a-button
            v-if="mine"
            type="text"
            size="small"
            class="memo-cmt-act"
            :aria-label="t('Træk din kommentar tilbage')"
            @click="emit('withdraw', c)"
          >
            {{ t('Træk tilbage') }}
          </a-button>
        </div>
      </template>
    </a-comment>
  </div>
</template>

<style scoped lang="less">
@import (reference) 'ant-design-vue/lib/style/themes/default.less';

/* Ikonet og "Løst af …" på én linje i foldens overskrift */
.memo-cmt-sum-row {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
}

/* Handlingerne står på én linje og brydes, hvis der ikke er plads */
.memo-cmt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
}

/* "Simulér svar fra Jonas Holm (Compliance)" er bredere end sporet: knapteksten brydes */
.memo-cmt-wrap {
  height: auto;
  white-space: normal;
  text-align: left;
}

/* Teksten beholder sine linjeskift */
.memo-cmt-text {
  margin-bottom: 0;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

/* Svaret og begrundelsen står under teksten, skilt fra den med en stiplet linje */
.memo-cmt-reason {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed @border-color-base;
}
</style>
