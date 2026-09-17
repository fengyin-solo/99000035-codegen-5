<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>登录 Link Collector</h2>
          <p>管理你的书签收藏</p>
        </div>
      </template>

      <!-- 被退出登录的原因 -->
      <el-alert
        v-if="reasonAlert"
        :type="reasonAlert.type"
        :title="reasonAlert.title"
        :closable="false"
        show-icon
        class="reason-alert"
      >
        <div>{{ reasonAlert.message }}</div>
        <div v-if="redirectHint" class="redirect-hint">登录后将返回刚才的页面：{{ redirectHint }}</div>
      </el-alert>

      <!-- 切换账号提示 -->
      <el-alert
        v-else-if="isSwitching && authStore.user"
        type="info"
        title="切换账号"
        :closable="false"
        show-icon
        class="reason-alert"
      >
        <div>当前登录为「{{ authStore.user.username }}」，登录其他账号后将自动切换。</div>
      </el-alert>

      <!-- 已登录账号点选列表 -->
      <div v-if="view === 'picker'" class="account-picker">
        <p v-if="accounts.length" class="picker-title">选择一个账号登录</p>
        <el-empty v-else description="这台浏览器还没有保存过账号" :image-size="60" />

        <ul class="account-list">
          <li v-for="acc in accounts" :key="acc.id" class="account-item">
            <button type="button" class="account-btn" @click="pickAccount(acc)">
              <span class="account-avatar">{{ acc.username.charAt(0).toUpperCase() }}</span>
              <span class="account-meta">
                <span class="account-name">{{ acc.username }}</span>
                <span class="account-email">{{ acc.email }}</span>
              </span>
            </button>
            <el-popconfirm
              title="从本浏览器移除该账号？"
              width="200"
              confirm-button-text="移除"
              cancel-button-text="取消"
              @confirm="removeAccount(acc)"
            >
              <template #reference>
                <el-icon class="account-remove" title="移除账号"><CircleClose /></el-icon>
              </template>
            </el-popconfirm>
          </li>
        </ul>

        <el-divider v-if="accounts.length" />
        <el-button link type="primary" @click="useOtherAccount">
          <el-icon><Plus /></el-icon>
          使用其他账号
        </el-button>
      </div>

      <!-- 账号密码表单 -->
      <el-form v-else :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin" label-position="top">
        <!-- 已选中账号：只输密码 -->
        <div v-if="selectedAccount" class="selected-account">
          <span class="account-avatar">{{ selectedAccount.username.charAt(0).toUpperCase() }}</span>
          <div class="account-meta">
            <div class="account-name">{{ selectedAccount.username }}</div>
            <div class="account-email">{{ selectedAccount.email }}</div>
          </div>
          <el-button link type="primary" @click="backToPicker">更换</el-button>
        </div>

        <el-form-item v-else prop="username" :error="fieldErrors.username || undefined">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
            @input="fieldErrors.username = ''"
          />
        </el-form-item>

        <el-form-item prop="password" :error="fieldErrors.password || undefined">
          <el-input
            ref="passwordRef"
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @input="fieldErrors.password = ''"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item class="remember-item">
          <el-checkbox v-model="form.remember">记住登录状态（关闭页面后仍保持登录）</el-checkbox>
        </el-form-item>

        <el-alert
          v-if="topError"
          type="error"
          :title="topError"
          :closable="false"
          show-icon
          class="top-error"
        />

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleLogin" size="large" style="width: 100%">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>

      <div class="demo-hint">
        <el-divider>演示账号</el-divider>
        <p>用户名: <strong>demo</strong> / 密码: <strong>demo123</strong></p>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import * as authStorage from '../utils/auth-storage'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const formRef = ref(null)
const passwordRef = ref(null)
const loading = ref(false)

// 本机登录过的账号列表（不包含密码）
const accounts = ref(authStorage.getAccounts())
const view = ref(accounts.value.length ? 'picker' : 'form')
const selectedAccount = ref(null)

const form = reactive({
  username: '',
  password: '',
  remember: true,
})

// 服务端返回的字段级错误（区分用户名/密码）
const fieldErrors = reactive({ username: '', password: '' })
// 网络/服务器等非字段错误
const topError = ref('')

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const isSwitching = computed(() => route.query.switch !== undefined)

// 仅允许站内回跳地址，防止 open redirect
const redirectPath = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : ''
})

// 回跳提示对首页（/）无意义，只展示具体的内页地址
const redirectHint = computed(() => (redirectPath.value && redirectPath.value !== '/' ? redirectPath.value : ''))

// 被退出登录的原因说明
const reasonAlert = computed(() => {
  switch (route.query.reason) {
    case 'TOKEN_EXPIRED':
      return { type: 'warning', title: '登录状态已过期', message: '登录超时，为了账号安全请重新登录。' }
    case 'TOKEN_INVALID':
      return { type: 'warning', title: '登录状态已失效', message: '登录信息无效，请重新登录。' }
    case 'AUTH_REQUIRED':
      return { type: 'info', title: '请先登录', message: '该页面需要登录后访问。' }
    default:
      return null
  }
})

function pickAccount(acc) {
  selectedAccount.value = acc
  form.username = acc.username
  form.password = ''
  fieldErrors.username = ''
  fieldErrors.password = ''
  topError.value = ''
  view.value = 'form'
  nextTick(() => passwordRef.value?.focus())
}

function useOtherAccount() {
  selectedAccount.value = null
  form.username = ''
  form.password = ''
  fieldErrors.username = ''
  fieldErrors.password = ''
  topError.value = ''
  view.value = 'form'
}

function backToPicker() {
  view.value = 'picker'
  selectedAccount.value = null
  fieldErrors.username = ''
  fieldErrors.password = ''
  topError.value = ''
}

async function removeAccount(acc) {
  accounts.value = authStorage.removeAccount(acc.id)
  if (selectedAccount.value?.id === acc.id) {
    useOtherAccount()
  }
  ElMessage.success(`已移除账号 ${acc.username}`)
}

async function handleLogin() {
  // 选中账号时用户名是确定的，只校验密码；手动输入时两个字段都校验
  const propsToValidate = selectedAccount.value ? ['password'] : ['username', 'password']
  // validateField 不同版本返回值语义不一，统一用回调判断
  const valid = await new Promise((resolve) => {
    formRef.value.validateField(propsToValidate, (isValid) => resolve(!!isValid))
  })
  if (!valid) return

  loading.value = true
  fieldErrors.username = ''
  fieldErrors.password = ''
  topError.value = ''
  try {
    await authStore.login(form.username.trim(), form.password, form.remember)
    accounts.value = authStorage.getAccounts()
    ElMessage.success('登录成功')
    router.push(redirectPath.value || '/')
  } catch (err) {
    const code = err.response?.data?.code
    const message = err.response?.data?.error
    if (code === 'USERNAME_NOT_FOUND') {
      // 用户名不对：保留已填用户名并指出问题；选中的账号标记为手动输入状态
      fieldErrors.username = message || '用户名不存在'
      selectedAccount.value = null
    } else if (code === 'WRONG_PASSWORD') {
      // 密码不对：用户名保留，清空密码并聚焦
      fieldErrors.password = message || '密码不正确'
      form.password = ''
      nextTick(() => passwordRef.value?.focus())
    } else {
      topError.value = message || '登录失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 400px;
  max-width: 100%;
}

.card-header {
  text-align: center;
}

.card-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.card-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.reason-alert {
  margin-bottom: 16px;
}

.redirect-hint {
  margin-top: 4px;
  font-size: 12px;
  word-break: break-all;
}

.picker-title {
  text-align: center;
  color: #606266;
  font-size: 14px;
  margin-bottom: 12px;
}

.account-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 280px;
  overflow-y: auto;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid #f0f2f5;
}

.account-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-width: 0;
}

.account-btn:hover {
  background: #f5f7fa;
  border-radius: 6px;
}

.account-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
}

.account-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.account-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.account-email {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-remove {
  flex-shrink: 0;
  padding: 6px;
  font-size: 16px;
  color: #c0c4cc;
  cursor: pointer;
}

.account-remove:hover {
  color: #f56c6c;
}

.selected-account {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 18px;
  background: #f5f7fa;
  border-radius: 8px;
}

.selected-account .account-meta {
  flex: 1;
  min-width: 0;
}

.remember-item {
  margin-bottom: 8px;
}

.top-error {
  margin-bottom: 12px;
}

.login-footer {
  text-align: center;
  margin-top: 16px;
  color: #606266;
}

.login-footer a {
  color: #409eff;
  text-decoration: none;
}

.demo-hint {
  text-align: center;
  color: #909399;
  font-size: 13px;
}

.demo-hint p {
  margin: 8px 0 0 0;
}
</style>
