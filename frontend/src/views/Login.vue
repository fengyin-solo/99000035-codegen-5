<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2>登录 Link Collector</h2>
          <p>管理你的书签收藏</p>
        </div>
      </template>

      <!-- 被退出登录的原因说明 -->
      <el-alert
        v-if="logoutNotice"
        :title="logoutNotice.title"
        :type="logoutNotice.type"
        :description="logoutNotice.description"
        show-icon
        :closable="true"
        class="logout-alert"
        @close="dismissNotice"
      />

      <!-- 本浏览器登录过的账号，点选后只需输入密码 -->
      <div v-if="rememberedAccounts.length" class="saved-accounts">
        <div class="saved-title">选择已登录过的账号</div>
        <div class="account-list">
          <div
            v-for="account in rememberedAccounts"
            :key="account.username"
            class="account-chip"
            :class="{ active: form.username === account.username }"
            @click="selectAccount(account)"
          >
            <el-avatar :size="26" class="account-avatar">
              {{ account.username.charAt(0).toUpperCase() }}
            </el-avatar>
            <span class="account-name">{{ account.username }}</span>
            <el-icon class="account-remove" title="移除该账号" @click.stop="removeAccount(account)">
              <Close />
            </el-icon>
          </div>
        </div>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            ref="passwordInputRef"
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="remember">记住登录状态（关闭页面后仍保持登录）</el-checkbox>
        </el-form-item>

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
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { getRememberedAccounts, forgetAccount } from '../utils/session'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const passwordInputRef = ref(null)
const loading = ref(false)
const remember = ref(true)
const rememberedAccounts = ref([])
// 横幅被手动关闭后记住，本次停留不再弹出
const noticeDismissed = ref(false)

const form = reactive({
  username: '',
  password: '',
})

// 服务端返回的字段级错误，通过自定义校验规则显示在对应表单项下
const backendError = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    {
      trigger: 'manual',
      validator: (_rule, _value, callback) => {
        backendError.username ? callback(new Error(backendError.username)) : callback()
      },
    },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    {
      trigger: 'manual',
      validator: (_rule, _value, callback) => {
        backendError.password ? callback(new Error(backendError.password)) : callback()
      },
    },
  ],
}

const REASON_META = {
  TOKEN_EXPIRED: { type: 'warning', title: '登录状态已过期', desc: '令牌已失效，请重新登录' },
  TOKEN_INVALID: { type: 'error', title: '登录状态已失效', desc: '登录凭证无效，请重新登录' },
  NO_TOKEN: { type: 'warning', title: '请先登录', desc: '当前未登录，请先登录后再操作' },
  'auth-required': { type: 'info', title: '请先登录', desc: '该页面需要登录后才能访问' },
  switch: { type: 'info', title: '请登录新账号', desc: '上一个账号的本地信息已清除，请选择账号并输入密码' },
}

// 只有站内路径才允许作为登录后的回跳地址，防止开放重定向
function resolveRedirect() {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/'
}

const logoutNotice = computed(() => {
  if (noticeDismissed.value) return null
  const meta = REASON_META[route.query.reason]
  if (!meta) return null

  const redirect = resolveRedirect()
  return {
    type: meta.type,
    title: meta.title,
    description: redirect === '/' ? meta.desc : `${meta.desc}，登录后将返回：${redirect}`,
  }
})

function dismissNotice() {
  noticeDismissed.value = true
}

function refreshAccounts() {
  rememberedAccounts.value = getRememberedAccounts()
}

// 点选已记住的账号：自动填好用户名，只需输入密码
function selectAccount(account) {
  form.username = account.username
  form.password = ''
  backendError.username = ''
  backendError.password = ''
  formRef.value?.clearValidate(['username', 'password'])
  nextTick(() => passwordInputRef.value?.focus())
}

async function removeAccount(account) {
  try {
    await ElMessageBox.confirm(
      `确定从本浏览器移除账号 “${account.username}” 吗？下次需要手动输入用户名登录。`,
      '移除记住的账号',
      { confirmButtonText: '移除', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  forgetAccount(account.username)
  refreshAccounts()
  if (form.username === account.username) {
    form.username = ''
  }
  ElMessage.success('已移除该账号')
}

// 用户重新输入时清掉服务端返回的字段错误
watch(
  () => form.username,
  () => {
    if (backendError.username) {
      backendError.username = ''
      formRef.value?.validateField('username').catch(() => {})
    }
  }
)

watch(
  () => form.password,
  () => {
    if (backendError.password) {
      backendError.password = ''
      formRef.value?.validateField('password').catch(() => {})
    }
  }
)

async function handleLogin() {
  backendError.username = ''
  backendError.password = ''

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    // 登录过程会先清掉上一个账号的本地信息，再加载新账号
    await authStore.login(form.username.trim(), form.password, remember.value)
    ElMessage.success('登录成功')
    router.push(resolveRedirect())
  } catch (err) {
    const data = err.response?.data
    // 登录失败保留已填好的用户名，并明确指出是用户名还是密码不对
    if (data?.code === 'USER_NOT_FOUND') {
      backendError.username = data.error || '用户名不存在'
      formRef.value?.validateField('username').catch(() => {})
    } else if (data?.code === 'WRONG_PASSWORD') {
      backendError.password = data.error || '密码不正确'
      formRef.value?.validateField('password').catch(() => {})
      nextTick(() => passwordInputRef.value?.focus())
    } else {
      ElMessage.error(data?.error || '登录失败，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshAccounts()
  // 从导航栏"切换账号"过来时预填用户名，直接聚焦密码框
  if (typeof route.query.username === 'string' && route.query.username) {
    form.username = route.query.username
    nextTick(() => passwordInputRef.value?.focus())
  }
})
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

.logout-alert {
  margin-bottom: 16px;
}

.saved-accounts {
  margin-bottom: 18px;
}

.saved-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.account-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.account-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 6px;
  border: 1px solid #dcdfe6;
  border-radius: 20px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
  user-select: none;
}

.account-chip:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.account-chip.active {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 0 0 1px #409eff inset;
}

.account-avatar {
  background: #667eea;
  color: #fff;
  font-size: 13px;
  flex-shrink: 0;
}

.account-name {
  font-size: 14px;
  color: #303133;
}

.account-remove {
  color: #c0c4cc;
  font-size: 14px;
  border-radius: 50%;
}

.account-remove:hover {
  color: #f56c6c;
  background: #fef0f0;
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
