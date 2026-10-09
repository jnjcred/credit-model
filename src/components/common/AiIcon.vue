<script setup>
// AI-ikonet i hele appen: den typiske AI-stjerne (en stor og to små glimt) i AI-farverne, en overgang fra blå over
// lilla til rosa. Tegnet som en maske med en farveovergang bagved (ingen SVG-id'er, der kan gå i stykker, hvis ikonet
// står i noget skjult), 1em og på linje med teksten som et antdv-ikon (klassen anticon). Står, hvor RobotOutlined
// stod: i AiBadge, kilde-linjen, memoet og oplysningen om AI. Samme figur og farver ligger i
// src/styles/memo-document.less (@memo-ai-icon). Dekorativt: teksten ved siden af siger, hvad det er.
</script>

<template>
  <span
    class="anticon ai-icon"
    role="img"
    aria-hidden="true"
  />
</template>

<style scoped>
.ai-icon {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -0.125em;
  background: linear-gradient(135deg, #4285f4 0%, #9b72cb 55%, #d96570 100%);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 4C10.5 9.2 11.8 10.5 17 11C11.8 11.5 10.5 12.8 10 18C9.5 12.8 8.2 11.5 3 11C8.2 10.5 9.5 9.2 10 4Z'/%3E%3Cpath d='M18.5 1C18.7 3.3 19.4 4 21.5 4.2C19.4 4.4 18.7 5.1 18.5 7.4C18.3 5.1 17.6 4.4 15.5 4.2C17.6 4 18.3 3.3 18.5 1Z'/%3E%3Cpath d='M18.5 14C18.65 15.6 19.1 16.1 20.7 16.25C19.1 16.4 18.65 16.9 18.5 18.5C18.35 16.9 17.9 16.4 16.3 16.25C17.9 16.1 18.35 15.6 18.5 14Z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M10 4C10.5 9.2 11.8 10.5 17 11C11.8 11.5 10.5 12.8 10 18C9.5 12.8 8.2 11.5 3 11C8.2 10.5 9.5 9.2 10 4Z'/%3E%3Cpath d='M18.5 1C18.7 3.3 19.4 4 21.5 4.2C19.4 4.4 18.7 5.1 18.5 7.4C18.3 5.1 17.6 4.4 15.5 4.2C17.6 4 18.3 3.3 18.5 1Z'/%3E%3Cpath d='M18.5 14C18.65 15.6 19.1 16.1 20.7 16.25C19.1 16.4 18.65 16.9 18.5 18.5C18.35 16.9 17.9 16.4 16.3 16.25C17.9 16.1 18.35 15.6 18.5 14Z'/%3E%3C/svg%3E") center / contain no-repeat;
}
</style>
