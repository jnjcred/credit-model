<script setup>
// Stamdata (financials.jsx: CompanySection): felterne fra CVR-integrationen. Rådgiveren kan rette
// et felt (blyant), gendanne CVR-værdien (fortryd-pil) og hente stamdata igen fra CVR (pil i ring
// i afsnittets hoved; en demo, der venter 0,9 s). Rettelser bevares ved hentning. CVR-nummeret er
// nøglen til registret og kan ikke rettes. Felterne og tilstanden står i
// src/domain/financials/finCvr.js (localStorage 'kabul:fin-cvr:nordhavn'); cvrSave sender 'fin-cvr'.
// Kopiér, gem, gendan og hent igen er flyttet ordret fra financials.jsx.
//
// Props: ingen. Emits: ingen.
import { computed, ref } from 'vue'
import { CheckOutlined, CopyOutlined, EditOutlined, LinkOutlined, SyncOutlined, UndoOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'
import { CW } from '@/domain/case_state'
import { DATA } from '@/domain/data'
import { CVR_FIELDS, cvrEdit, cvrLoad, cvrOrig, cvrSave, cvrUpdated, cvrVal } from '@/domain/financials/finCvr'
import { finFill } from '@/domain/financials/finFormat'
import { useCaseVersion } from '@/composables/useCaseVersion'
import { useWindowEvent } from '@/composables/useWindowEvent'
import FinSection from './FinSection.vue'
import FinIconBtn from './FinIconBtn.vue'

const co = DATA.COMPANY
// Rettelserne ligger i localStorage: tegn igen, når de ændres ('fin-cvr')
const ver = ref(0)
useWindowEvent('fin-cvr', () => { ver.value++ })
const caseVersion = useCaseVersion()

const copied = ref(null)
const editKey = ref(null)
const draft = ref('')
const fetching = ref(false)

// Ordret fra financials.jsx (kun React-tilstanden er skiftet til refs)
const present = (v) => v != null && v !== '' && v !== '-';
const copy = (key, text) => {
  try { navigator.clipboard && navigator.clipboard.writeText(String(text)).catch(() => {}); } catch (e) {}
  copied.value = key;
  setTimeout(() => { if (copied.value === key) copied.value = null; }, 1400);
};
const startEdit = (key) => { draft.value = cvrVal(key); editKey.value = key; CW.focusSoon('#fin-cvr-' + key); };
const save = (key) => {
  const v = draft.value.trim();
  const st = cvrLoad(); st.fields = st.fields || {};
  if (!v || v === cvrOrig(key)) delete st.fields[key];
  else st.fields[key] = { value: v, at: new Date().toISOString(), by: (DATA.ADVISOR && DATA.ADVISOR.name) || 'Mette Larsen' };
  cvrSave(st); editKey.value = null;
};
const restore = (key, label) => {
  const st = cvrLoad(); if (st.fields) delete st.fields[key]; cvrSave(st);
  CW.toast(finFill(t('{navn} er gendannet fra CVR'), { navn: label }));
};
// Demo: integrationen til CVR kaldes igen (ingen rigtig forbindelse i prototypen)
const refetch = () => {
  fetching.value = true;
  setTimeout(() => {
    const st = cvrLoad(); st.fetchedAt = new Date().toISOString(); cvrSave(st);
    fetching.value = false;
    const kept = Object.keys(st.fields || {}).length;
    CW.toast(kept ? t('Stamdata er hentet igen fra CVR. Dine rettelser er bevaret.') : t('Stamdata er hentet igen fra CVR'));
  }, 900);
};
const cvrNo = String(co.cvr || '');

// Enter gemmer, Esc fortryder (uden at lukke noget udenom)
function onEditKey (key, ev) {
  if (ev.key === 'Enter') { ev.preventDefault(); save(key) }
  if (ev.key === 'Escape') { ev.stopPropagation(); editKey.value = null }
}

const sub = computed(() => {
  ver.value + caseVersion.value
  return fetching.value ? t('Henter fra CVR …') : finFill(t('Fra CVR-registret, opdateret {date}.'), { date: cvrUpdated() })
})
// Felterne med rådgiverens rettelse (e) og den viste værdi (v)
const fields = computed(() => {
  ver.value
  return CVR_FIELDS.map(f => ({ key: f.key, copy: f.copy, label: t(f.label), e: cvrEdit(f.key), v: cvrVal(f.key) }))
})
</script>

<template>
  <FinSection
    :title="t('Stamdata')"
    :sub="sub"
  >
    <template #badge>
      <a-space :size="4">
        <FinIconBtn
          :label="t('Hent stamdata igen fra CVR')"
          :disabled="fetching"
          :busy="fetching"
          @click="refetch"
        >
          <template #icon>
            <SyncOutlined aria-hidden="true" />
          </template>
        </FinIconBtn>
        <a-button
          v-if="co.cvrUrl"
          type="link"
          size="small"
          :href="co.cvrUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('Åbn i CVR') }} <LinkOutlined aria-hidden="true" />
        </a-button>
      </a-space>
    </template>

    <a-spin :spinning="fetching">
      <a-card :bordered="false">
        <a-descriptions
          bordered
          size="small"
          :column="1"
        >
          <a-descriptions-item :label="t('CVR-nr.')">
            <template v-if="present(cvrNo)">
              {{ cvrNo }}
              <a-tooltip :title="copied === 'cvr' ? t('Kopieret') : t('Kopiér CVR-nummer')">
                <a-button
                  type="text"
                  size="small"
                  :aria-label="t('Kopiér CVR-nummer')"
                  @click="copy('cvr', cvrNo.replace(/\s+/g, ''))"
                >
                  <template #icon>
                    <CheckOutlined
                      v-if="copied === 'cvr'"
                      aria-hidden="true"
                    />
                    <CopyOutlined
                      v-else
                      aria-hidden="true"
                    />
                  </template>
                </a-button>
              </a-tooltip>
            </template>
            <a-typography-text
              v-else
              type="secondary"
            >
              {{ t('Ikke oplyst') }}
            </a-typography-text>
          </a-descriptions-item>

          <a-descriptions-item
            v-for="f in fields"
            :key="f.key"
            :label="f.label"
          >
            <!-- Ret feltet: Enter gemmer, Esc fortryder. Tomt felt eller CVR's egen værdi fjerner rettelsen -->
            <a-space
              v-if="editKey === f.key"
              :size="8"
              wrap
            >
              <a-input
                :id="'fin-cvr-' + f.key"
                v-model:value="draft"
                class="fin-cvr-input"
                :aria-label="finFill(t('Ret {navn}'), { navn: f.label })"
                @keydown="onEditKey(f.key, $event)"
              />
              <a-button
                type="primary"
                @click="save(f.key)"
              >
                {{ t('Gem') }}
              </a-button>
              <a-button @click="editKey = null">
                {{ t('Annullér') }}
              </a-button>
            </a-space>
            <div
              v-else
              class="fin-cvr-field"
            >
              <div>
                <a-typography-text :type="present(f.v) ? undefined : 'secondary'">
                  {{ present(f.v) ? f.v : t('Ikke oplyst') }}
                </a-typography-text>
                <a-tooltip
                  v-if="f.copy && present(f.v)"
                  :title="copied === f.key ? t('Kopieret') : t('Kopiér adresse')"
                >
                  <a-button
                    type="text"
                    size="small"
                    :aria-label="t('Kopiér adresse')"
                    @click="copy(f.key, [f.v, co.country].filter(present).join(', '))"
                  >
                    <template #icon>
                      <CheckOutlined
                        v-if="copied === f.key"
                        aria-hidden="true"
                      />
                      <CopyOutlined
                        v-else
                        aria-hidden="true"
                      />
                    </template>
                  </a-button>
                </a-tooltip>
                <div v-if="f.e">
                  <a-typography-text type="secondary">
                    {{ finFill(t('Rettet af {who} · {date}'), { who: f.e.by || '', date: CW.fmtDate(f.e.at) }) + ' · CVR: ' + (cvrOrig(f.key) || t('Ikke oplyst')) }}
                  </a-typography-text>
                </div>
              </div>
              <a-space :size="4">
                <FinIconBtn
                  :label="finFill(t('Ret {navn}'), { navn: f.label })"
                  @click="startEdit(f.key)"
                >
                  <template #icon>
                    <EditOutlined aria-hidden="true" />
                  </template>
                </FinIconBtn>
                <FinIconBtn
                  v-if="f.e"
                  :label="finFill(t('Gendan {navn} fra CVR'), { navn: f.label })"
                  @click="restore(f.key, f.label)"
                >
                  <template #icon>
                    <UndoOutlined aria-hidden="true" />
                  </template>
                </FinIconBtn>
              </a-space>
            </div>
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
    </a-spin>
  </FinSection>
</template>

<style scoped>
.fin-cvr-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fin-cvr-input {
  width: 260px;
  max-width: 100%;
}
</style>
