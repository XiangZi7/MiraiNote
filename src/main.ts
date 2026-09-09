import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue/offline'
import icons from 'virtual:mirai-icons'
import App from './App.vue'
import { router } from './router'
import { bindWorkspaceRouter } from './router/workspace'
import './assets/styles/main.css'

addCollection(icons)
const pinia = createPinia()
const app = createApp(App).use(pinia)
const stopRouting = bindWorkspaceRouter(router, pinia)
app.use(router)
app.onUnmount(stopRouting)
void router.isReady().then(() => app.mount('#app'))
