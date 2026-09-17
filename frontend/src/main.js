import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { authEvents } from './utils/authEvents'

const app = createApp(App)

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)

// 在路由守卫运行前恢复登录状态（持久化的或当次会话的）
useAuthStore(pinia).init()

// 令牌失效：清掉本地会话，回到登录页并说明原因、保留原入口地址
authEvents.on('session-expired', ({ code, redirect }) => {
  const authStore = useAuthStore(pinia)
  if (!authStore.isLoggedIn) return

  authStore.handleSessionExpired()

  if (router.currentRoute.value.name !== 'Login') {
    router.push({
      name: 'Login',
      query: {
        reason: code || 'TOKEN_INVALID',
        redirect: redirect || router.currentRoute.value.fullPath,
      },
    })
  }
})

app.use(router)
app.use(ElementPlus)

app.mount('#app')
