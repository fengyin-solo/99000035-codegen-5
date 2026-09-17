import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'
import {
  clearSession,
  loadSession,
  rememberAccount,
  saveSession,
} from '../utils/session'
import { useLinksStore } from './links'
import { useReadLaterStore } from './readLater'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(null)
  const rememberMe = ref(true)

  const isLoggedIn = computed(() => !!token.value)

  // 切换账号前必须先把上一个账号残留在本地的信息清干净：
  // 会话存储 + 其他 store 中缓存的业务数据
  function resetLocalState() {
    user.value = null
    token.value = null
    clearSession()
    useLinksStore().reset()
    useReadLaterStore().reset()
  }

  // 应用启动时恢复登录状态（localStorage 持久化 / sessionStorage 当次会话）
  function init() {
    const session = loadSession()
    if (session) {
      token.value = session.token
      user.value = session.user
      rememberMe.value = session.remember
    }
  }

  async function login(username, password, remember = true) {
    const response = await authApi.login(username, password)
    const { token: newToken, user: newUser } = response.data

    // 先清掉上一个账号的本地信息，再写入新账号
    resetLocalState()
    saveSession({ token: newToken, user: newUser, remember })
    rememberAccount(newUser)

    token.value = newToken
    user.value = newUser
    rememberMe.value = remember
    return response.data
  }

  async function register(username, email, password) {
    const response = await authApi.register(username, email, password)
    const { token: newToken, user: newUser } = response.data

    resetLocalState()
    // 注册后默认记住登录状态
    saveSession({ token: newToken, user: newUser, remember: true })
    rememberAccount(newUser)

    token.value = newToken
    user.value = newUser
    rememberMe.value = true
    return response.data
  }

  // 主动注销：保留 rememberedAccounts，方便在登录页快速选回
  function logout() {
    resetLocalState()
  }

  // 令牌失效被服务端踢出：同样清空本地会话，但不动账号列表
  function handleSessionExpired() {
    resetLocalState()
  }

  return {
    user,
    token,
    rememberMe,
    isLoggedIn,
    init,
    login,
    register,
    logout,
    handleSessionExpired,
  }
})
