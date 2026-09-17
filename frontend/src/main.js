import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { setUnauthorizedHandler } from './api'

const app = createApp(App)

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 在首次路由守卫执行前恢复登录态（记住登录的会话保存在 localStorage）
const authStore = useAuthStore(pinia)
authStore.loadFromStorage()

// 令牌失效/缺失：清空本地登录态，带着退出原因和当前入口地址回到登录页。
// 多个请求同时 401 时只处理一次。
let isRedirecting = false
setUnauthorizedHandler((reason) => {
  if (isRedirecting) return
  const current = router.currentRoute.value
  if (current.name === 'Login') return
  isRedirecting = true
  authStore.sessionExpired()
  const query = { reason }
  if (current.fullPath && current.fullPath !== '/') {
    query.redirect = current.fullPath
  }
  router.push({ name: 'Login', query }).finally(() => {
    isRedirecting = false
  })
})

app.mount('#app')
