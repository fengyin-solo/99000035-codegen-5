// 登录态与“已登录账号列表”的本地存储封装。
//
// - auth_accounts (localStorage): 本浏览器登录过的账号，仅保存展示信息，不保存密码/token
// - 当前会话 token/user:
//     勾选“记住登录状态” -> localStorage（关闭页面后仍保持登录）
//     未勾选             -> sessionStorage（关闭标签页后清除）

const ACCOUNTS_KEY = 'auth_accounts'
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function safeParse(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

// ---------- 已登录账号列表 ----------

export function getAccounts() {
  const accounts = safeParse(localStorage.getItem(ACCOUNTS_KEY), [])
  return Array.isArray(accounts) ? accounts : []
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

// 登录成功后记录/更新一个账号，按最近登录时间倒序
export function upsertAccount(user) {
  if (!user?.id) return getAccounts()
  const accounts = getAccounts().filter((acc) => acc.id !== user.id)
  accounts.unshift({
    id: user.id,
    username: user.username,
    email: user.email,
    lastLoginAt: Date.now(),
  })
  saveAccounts(accounts)
  return accounts
}

export function removeAccount(userId) {
  const accounts = getAccounts().filter((acc) => acc.id !== userId)
  saveAccounts(accounts)
  return accounts
}

// ---------- 当前会话 ----------

function readFrom(storage) {
  const token = storage.getItem(TOKEN_KEY)
  const userRaw = storage.getItem(USER_KEY)
  if (!token || !userRaw) return null
  const user = safeParse(userRaw, null)
  if (!user) return null
  return { token, user }
}

// 读取当前会话；localStorage（记住登录）优先，其次 sessionStorage
export function readSession() {
  return readFrom(localStorage) || readFrom(sessionStorage)
}

// 保存会话，并清除另一处可能残留的旧会话，避免两份并存
export function saveSession(token, user, remember) {
  clearSession()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
  storage.setItem(USER_KEY, JSON.stringify(user))
}

// 清除当前会话（两处都清）。账号列表不在此清除。
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function getToken() {
  return readSession()?.token || null
}
