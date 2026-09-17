import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Import from '../views/Import.vue'
import DeadLinks from '../views/DeadLinks.vue'
import ReadLater from '../views/ReadLater.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guest: true },
  },
  {
    path: '/import',
    name: 'Import',
    component: Import,
    meta: { requiresAuth: true },
  },
  {
    path: '/dead-links',
    name: 'DeadLinks',
    component: DeadLinks,
    meta: { requiresAuth: true },
  },
  {
    path: '/read-later',
    name: 'ReadLater',
    component: ReadLater,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  // main.js 在挂载前已执行 init()，这里兜底保证刷新直达受保护页面时也能恢复会话
  authStore.init()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({
      name: 'Login',
      query: {
        reason: 'auth-required',
        redirect: to.fullPath,
      },
    })
  } else if (to.meta.guest && authStore.isLoggedIn) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
