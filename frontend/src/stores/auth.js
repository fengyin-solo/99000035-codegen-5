import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'
import * as authStorage from '../utils/auth-storage'
import { useLinksStore } from './links'
import { useReadLaterStore } from './readLater'

// 清理“上一个账号”在本地的全部信息：
// 会话 token/user + 各业务 store 的内存缓存（下一个账号数据加载前保持干净）
function clearLocalAccountData() {
  authStorage.clearSession()
  useLinksStore().reset()
  useReadLaterStore().reset()
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  // 在路由初始化前同步恢复登录态（勾选“记住登录”时 localStorage 中仍有会话）
  function loadFromStorage() {
    const session = authStorage.readSession()
    if (session) {
      token.value = session.token
      user.value = session.user
      // 兼容旧版本：已登录但还不在账号列表中的用户补录进去
      authStorage.upsertAccount(session.user)
    }
  }

  async function login(username, password, remember = true) {
    const response = await authApi.login(username, password)

    // 加载新账号前，先把上一个账号的本地信息清干净
    clearLocalAccountData()

    token.value = response.data.token
    user.value = response.data.user
    authStorage.saveSession(token.value, user.value, remember)
    authStorage.upsertAccount(user.value)
    return response.data
  }

  async function register(username, email, password, remember = true) {
    const response = await authApi.register(username, email, password)
    clearLocalAccountData()

    token.value = response.data.token
    user.value = response.data.user
    authStorage.saveSession(token.value, user.value, remember)
    authStorage.upsertAccount(user.value)
    return response.data
  }

  // 主动注销：清掉会话与业务缓存，保留账号列表以便下次点选
  function logout() {
    clearLocalAccountData()
    user.value = null
    token.value = null
  }

  // 令牌失效/被服务端拒绝：与注销一样清空本地登录态
  function sessionExpired() {
    logout()
  }

  return {
    user,
    token,
    isLoggedIn,
    loadFromStorage,
    login,
    register,
    logout,
    sessionExpired,
  }
})
