<script setup>
// Mailen, kunden får, når rådgiveren sender anmodningen fra sagen (new_case_portal.jsx L493-517):
// en forhåndsvisning af CW.requestMail(...) i Ny sag-guidens trin 3. Den kan ikke rettes her, og
// knappen i mailen er kun en efterligning (skjult for skærmlæsere og tastatur, som før).
//
// Props: mail (CW.requestMail-resultatet), to ({ name, email }: modtageren som skrevet),
//        companyName, caseNr (sagsnummeret, den nye sag får), link (kundens personlige link).
import { ArrowRightOutlined } from '@ant-design/icons-vue'
import { t } from '@/i18n'

defineProps({
  mail: { type: Object, required: true },
  to: { type: Object, required: true },
  companyName: { type: String, default: '' },
  caseNr: { type: String, default: '' },
  link: { type: String, default: '' },
})
</script>

<template>
  <a-typography-paragraph type="secondary">
    {{ t('Den sendes først, når du sender anmodningen fra sagen.') }}
  </a-typography-paragraph>
  <a-card size="small">
    <a-descriptions
      :column="1"
      size="small"
      :colon="false"
    >
      <a-descriptions-item :label="t('Til')">
        <template v-if="to.name || to.email">
          {{ to.name ? to.name + (to.email ? ' <' + to.email + '>' : '') : to.email }}
        </template>
        <a-typography-text
          v-else
          type="secondary"
        >
          {{ t('Kontaktperson ikke angivet endnu') }}
        </a-typography-text>
      </a-descriptions-item>
      <a-descriptions-item :label="t('Emne')">
        <a-typography-text strong>
          {{ t('Materiale til kreditvurdering af') + ' ' + companyName }}
        </a-typography-text>
      </a-descriptions-item>
    </a-descriptions>
    <a-divider />
    <a-typography-paragraph>{{ mail.greeting }}</a-typography-paragraph>
    <a-typography-paragraph>{{ mail.intro }}</a-typography-paragraph>
    <ul>
      <li
        v-for="x in mail.items"
        :key="x.id"
      >
        <a-typography-text strong>
          {{ x.label }}
        </a-typography-text>{{ x.optional ? ' (' + t('valgfri') + ')' : '' }}
        <a-typography-text type="secondary">
          · {{ x.why }}
        </a-typography-text>
      </li>
    </ul>
    <a-typography-paragraph v-if="mail.deadlineLine">
      {{ mail.deadlineLine }}
    </a-typography-paragraph>
    <a-button
      type="primary"
      tabindex="-1"
      aria-hidden="true"
      class="nc-mail-mock"
    >
      {{ mail.buttonLabel }}
      <ArrowRightOutlined aria-hidden="true" />
    </a-button>
    <div>
      <a-typography-text type="secondary">
        {{ link }}
      </a-typography-text>
    </div>
    <a-typography-paragraph type="secondary">
      {{ mail.trustLine }}
    </a-typography-paragraph>
    <div
      v-for="(l, i) in mail.signature"
      :key="i"
    >
      <a-typography-text
        :strong="i === 0"
        :type="i ? 'secondary' : undefined"
      >
        {{ l }}
      </a-typography-text>
    </div>
    <a-typography-text type="secondary">
      {{ t('Sagsnr.') }} {{ caseNr }}
    </a-typography-text>
  </a-card>
</template>

<style scoped>
/* Knappen i mailen er en efterligning: den reagerer ikke på klik (som før) */
.nc-mail-mock {
  pointer-events: none;
}
</style>
