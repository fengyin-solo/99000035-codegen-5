// 认证相关事件总线，解耦 axios 拦截器与 pinia/router
// session-expired: 令牌缺失/过期/无效，payload 为后端返回的 code（如 TOKEN_EXPIRED）
const listeners = new Map()

export const authEvents = {
  on(event, handler) {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event).add(handler)
    return () => authEvents.off(event, handler)
  },

  off(event, handler) {
    listeners.get(event)?.delete(handler)
  },

  emit(event, payload) {
    listeners.get(event)?.forEach((handler) => handler(payload))
  },
}
