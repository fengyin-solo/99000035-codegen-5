// 会话存储工具：
// - 勾选"记住登录状态"时，会话存 localStorage，关闭浏览器后仍保持登录
// - 未勾选时，会话存 sessionStorage，关闭标签页即失效
// - rememberedAccounts 始终存 localStorage，用于登录页多账号点选

const REMEMBERED_ACCOUNTS_KEY = 'rememberedAccounts'
const MAX_REMEMBERED_ACCOUNTS = 10

const SESSION_KEYS = ['token', 'user']

// 旧版本（或被 401 拦截器）写在 localStorage 里的会话，清理时两处都要删
function getStorageList() {
  return [localStorage, sessionStorage]
}

export function getToken() {
  return sessionStorage.getItem('token') || localStorage.getItem('token')
}

// 保存当前登录会话
export function saveSession({ token, user, remember }) {
  clearSession()

  const storage = remember ? localStorage : sessionStorage
  storage.setItem('token', token)
  storage.setItem('user', JSON.stringify(user))
}

// 读取已保存的会话，返回 { token, user, remember }；remember 表示是否来自持久化存储
export function loadSession() {
  let token = localStorage.getItem('token')
  let userRaw = localStorage.getItem('user')
  let remember = true

  if (!token) {
    token = sessionStorage.getItem('token')
    userRaw = sessionStorage.getItem('user')
    remember = false
  }

  if (!token || !userRaw) return null

  try {
    return { token, user: JSON.parse(userRaw), remember }
  } catch {
    clearSession()
    return null
  }
}

// 清除当前账号的全部本地会话信息（不动 rememberedAccounts）
export function clearSession() {
  for (const storage of getStorageList()) {
    for (const key of SESSION_KEYS) {
      storage.removeItem(key)
    }
  }
}

// 登录成功后记住账号（不含任何敏感信息），最近登录的排在最前
export function rememberAccount(user) {
  const accounts = getRememberedAccounts().filter((a) => a.username !== user.username)
  accounts.unshift({
    username: user.username,
    email: user.email || '',
    lastLoginAt: Date.now(),
  })
  localStorage.setItem(
    REMEMBERED_ACCOUNTS_KEY,
    JSON.stringify(accounts.slice(0, MAX_REMEMBERED_ACCOUNTS))
  )
}

export function getRememberedAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem(REMEMBERED_ACCOUNTS_KEY) || '[]')
    return Array.isArray(accounts) ? accounts : []
  } catch {
    return []
  }
}

export function forgetAccount(username) {
  const accounts = getRememberedAccounts().filter((a) => a.username !== username)
  localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(accounts))
}
