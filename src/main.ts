import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue/offline'
import icons from 'virtual:mirai-icons'
import App from './App.vue'
import './assets/styles/main.css'

addCollection(icons)
createApp(App).use(createPinia()).mount('#app')
