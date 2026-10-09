<script setup>
// Ejerne som en stille, venstrestillet liste (financials.jsx: OwnerList): fed ejernavn, én grå
// linje og ejerandelen til højre; nederst noten om medarbejderwarrants. Selskabet selv står i
// sagshovedet. Ejerne er DATA.OWNERS (efter Ejerbog_2026.pdf, som også står i Det Offentlige
// Ejerregister).
//
// Props: ingen. Emits: ingen.
import { t } from '@/i18n'
import { DATA } from '@/domain/data'
import { OWNER_KIND } from '@/domain/financials/finData'

// Ordret fra financials.jsx
const pctFmt = (v) => v.toLocaleString(window.CW_LANG === 'en' ? 'en-GB' : 'da-DK', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (window.CW_LANG === 'en' ? '%' : ' %');
const line = (o) => o.type === 'holding' ? t('Reel ejer') + ': ' + DATA.COMPANY.realOwner
  : o.type === 'person' && o.role ? t(OWNER_KIND.person) + ', ' + t(o.role)
  : t(OWNER_KIND[o.type] || 'Selskab');
</script>

<template>
  <a-list
    :data-source="DATA.OWNERS"
    row-key="name"
  >
    <template #renderItem="{ item }">
      <a-list-item>
        <div class="fin-owner">
          <a-typography-text strong>
            {{ item.name }}
          </a-typography-text>
          <a-typography-text type="secondary">
            {{ line(item) }}
          </a-typography-text>
        </div>
        <span class="fin-owner-share">{{ pctFmt(item.share) }}</span>
      </a-list-item>
    </template>
  </a-list>
</template>

<style scoped>
.fin-owner {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.fin-owner-share {
  font-variant-numeric: tabular-nums;
}
</style>
