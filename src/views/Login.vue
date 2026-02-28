<template>
    <div class="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-900">
        <n-card class="w-100 shadow-lg rounded-2xl" title="外勤打卡管理后台" size="huge">
            <template #header-extra>
                <div class="text-xs text-gray-400">Admin Login</div>
            </template>

            <n-form ref="formRef" :model="loginForm" :rules="rules">
                <n-form-item label="管理员账号" path="username">
                    <n-input v-model:value="loginForm.username" placeholder="请输入账号" @keyup.enter="handleLogin" />
                </n-form-item>

                <n-form-item label="登录密码" path="password">
                    <n-input v-model:value="loginForm.password" type="password" show-password-on="mousedown" placeholder="请输入密码" @keyup.enter="handleLogin" />
                </n-form-item>

                <div class="mt-4">
                    <n-button type="primary" block round size="large" :loading="loading" @click="handleLogin"> 立即登录 </n-button>
                </div>
            </n-form>

            <template #footer>
                <div class="text-center text-gray-400 text-xs">© 2026 Jnm外勤签到系统 · v1.0.0</div>
            </template>
        </n-card>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { loginAdmin } from '@/api/auth' // 导入我们封装的 API

const router = useRouter()
const message = useMessage()
const formRef = ref(null)
const loading = ref(false)

// 表单数据
const loginForm = reactive({
    username: '',
    password: ''
})

// 简单的表单校验规则
const rules = {
    username: { required: true, message: '请输入管理员账号', trigger: 'blur' },
    password: { required: true, message: '请输入密码', trigger: 'blur' }
}

/**
 * 执行登录逻辑
 */
const handleLogin = async () => {
    formRef.value?.validate(async errors => {
        if (!errors) {
            loading.value = true
            try {
                // 调用后端 admin_login 接口
                const data = await loginAdmin(loginForm.username, loginForm.password)

                // 1. 存储 Token (拦截器会自动带上这个 token)
                localStorage.setItem('access_token', data.access_token)

                message.success('登录成功，欢迎回来')

                // 2. 跳转到首页/工作台
                router.push('/dashboard')
            } catch (err) {
                // 错误已被 axios 拦截器处理并提示，这里只需重置加载状态
                console.error('登录失败:', err)
            } finally {
                loading.value = false
            }
        }
    })
}
</script>

<style scoped>
/* 可以在这里写特殊的微调，大部分样式已由 UnoCSS 完成 */
</style>
