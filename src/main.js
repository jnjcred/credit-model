// Domænelogikken først, i samme rækkefølge som før migrationen (se bootstrap.js)
import './bootstrap'
import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.less'
import './styles/global.css'
// Synligt tastaturfokus på faner, folde, knapper og links (antdv 3.2.13 viser intet eller næsten intet)
import './styles/focus.less'
// Memoets dokumentindhold (gemt HTML: overskrifter, tabeller, kildehenvisninger), også i AI-forhåndsvisninger
import './styles/memo-document.less'
import App from './App.vue'

// Hele biblioteket registreres globalt (a-* i skabelonerne), som i Crediwires frontend-app
createApp(App).use(Antd).mount('#app')
