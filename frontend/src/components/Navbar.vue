<template>
  <el-menu mode="horizontal" :ellipsis="false" class="navbar">
    <el-menu-item index="home" @click="$router.push('/')">
      <el-icon><Link /></el-icon>
      <span class="logo-text">Link Collector</span>
    </el-menu-item>

    <div class="flex-grow"></div>

    <el-menu-item index="import" @click="$router.push('/import')">
      <el-icon><Upload /></el-icon>
      导入书签
    </el-menu-item>

    <el-menu-item index="dead-links" @click="$router.push('/dead-links')">
      <el-icon><Warning /></el-icon>
      死链检测
    </el-menu-item>

    <el-menu-item index="read-later" @click="$router.push('/read-later')">
      <el-icon><Clock /></el-icon>
      稍后阅读
    </el-menu-item>

    <el-sub-menu index="user">
      <template #title>
        <el-icon><User /></el-icon>
        {{ authStore.user?.username }}
      </template>
      <el-menu-item index="switch" @click="handleSwitchAccount">
        <el-icon><Switch /></el-icon>
        切换账号
      </el-menu-item>
      <el-menu-item index="logout" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        退出登录
      </el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import { Clock } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

// 切换账号：先清掉当前账号的本地信息，再去登录页（预填用户名、聚焦密码框）
function handleSwitchAccount() {
  const username = authStore.user?.username
  authStore.logout()
  router.push({
    name: 'Login',
    query: { reason: 'switch', username: username || '' },
  })
}
</script>

<style scoped>
.navbar {
  margin-bottom: 0;
  border-bottom: 1px solid #e4e7ed;
}

.logo-text {
  font-weight: 600;
  font-size: 16px;
  margin-left: 6px;
}

.flex-grow {
  flex: 1;
}
</style>
