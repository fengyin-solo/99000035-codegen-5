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

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 保留刚才正要访问的入口地址，登录成功后可跳回
    next({ name: 'Login', query: { reason: 'AUTH_REQUIRED', redirect: to.fullPath } })
  } else if (to.meta.guest && authStore.isLoggedIn && to.query.switch === undefined) {
    next({ name: 'Home' })
  } else {
    next()
  }
})

export default router
