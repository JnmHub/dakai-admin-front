<template>
    <n-layout has-sider class="h-screen">
        <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed" show-trigger @collapse="collapsed = true" @expand="collapsed = false">
            <div class="h-16 flex items-center justify-center bg-gray-50 dark:bg-zinc-800 border-b border-gray-200">
                <h2 v-show="!collapsed" class="text-lg font-bold truncate px-4 text-blue-600">外勤签到管理</h2>
                <n-icon v-show="collapsed" size="24" color="#2563eb"><LocationOutline /></n-icon>
            </div>

            <n-menu :collapsed="collapsed" :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions" :value="activeKey" @update:value="handleMenuClick" />
        </n-layout-sider>

        <n-layout>
            <n-layout-header bordered class="h-16 flex items-center justify-between px-6 shadow-sm">
                <div class="text-gray-500 font-medium flex items-center gap-2">
                    <n-breadcrumb>
                        <n-breadcrumb-item>管理后台</n-breadcrumb-item>
                        <n-breadcrumb-item>{{ currentRouteTitle }}</n-breadcrumb-item>
                    </n-breadcrumb>
                </div>

                <div class="flex items-center gap-4">
                    <n-dropdown :options="userOptions" @select="handleUserAction">
                        <n-button quaternary class="px-2 group">
                            <div class="flex items-center gap-2">
                                <n-icon size="20" class="group-hover:text-blue-500 transition-colors">
                                    <PersonCircleOutline />
                                </n-icon>
                                <span class="font-medium">管理员</span>
                                <n-icon size="14"><ChevronDownOutline /></n-icon>
                            </div>
                        </n-button>
                    </n-dropdown>
                </div>
            </n-layout-header>

            <n-layout-content content-style="padding: 24px;" class="bg-gray-50 dark:bg-zinc-950">
                <router-view />
            </n-layout-content>
        </n-layout>

        <n-modal v-model:show="showPwdModal" preset="card" title="修改个人登录密码" class="w-100 shadow-xl">
            <n-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-placement="left" label-width="100">
                <n-form-item label="当前密码" path="oldPassword">
                    <n-input v-model:value="pwdForm.oldPassword" type="password" show-password-on="click" placeholder="请输入原密码" />
                </n-form-item>
                <n-form-item label="新密码" path="newPassword">
                    <n-input v-model:value="pwdForm.newPassword" type="password" show-password-on="click" placeholder="至少6位新密码" />
                </n-form-item>
                <n-form-item label="确认新密码" path="confirmPassword">
                    <n-input v-model:value="pwdForm.confirmPassword" type="password" show-password-on="click" placeholder="再次输入新密码" />
                </n-form-item>
            </n-form>
            <template #footer>
                <n-space justify="end">
                    <n-button @click="showPwdModal = false">取消</n-button>
                    <n-button type="primary" :loading="pwdLoading" @click="submitPwdChange">确认修改</n-button>
                </n-space>
            </template>
        </n-modal>
    </n-layout>
</template>

<script setup>
import { ref, computed, h, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, NIcon } from 'naive-ui'
import { HomeOutline, PeopleOutline, LocationOutline, SettingsOutline, LogOutOutline, KeyOutline, PersonCircleOutline, ChevronDownOutline, ClipboardOutline } from '@vicons/ionicons5'
import { changeAdminPasswordMyself } from '@/api/admin'
const router = useRouter()
const route = useRoute()
const message = useMessage()
const collapsed = ref(false)

// 渲染图标辅助函数
function renderIcon(icon) {
    return () => h(NIcon, null, { default: () => h(icon) })
}

// 路由逻辑
const activeKey = computed(() => route.path)
const currentRouteTitle = computed(() => route.meta.title || '工作台')

// 菜单配置
const menuOptions = [
    { label: '工作台', key: '/dashboard', icon: renderIcon(HomeOutline) },
    { label: '员工管理', key: '/employees', icon: renderIcon(PeopleOutline) },
    { label: '打卡点管理', key: '/points', icon: renderIcon(LocationOutline) },
    { label: '打卡记录', key: '/records', icon: renderIcon(ClipboardOutline) },
    { label: '考勤规则', key: '/rules', icon: renderIcon(ClipboardOutline) },
    { label: '考勤统计', key: '/attendance-stats', icon: renderIcon(ClipboardOutline) },
    { label: '管理员设置', key: '/admin/manage', icon: renderIcon(SettingsOutline) }
]

// 用户下拉菜单：增加“修改密码”
const userOptions = [
    { label: '修改密码', key: 'change_pwd', icon: renderIcon(KeyOutline) },
    { type: 'divider', key: 'd1' },
    { label: '退出登录', key: 'logout', icon: renderIcon(LogOutOutline) }
]

// --- 修改密码逻辑区 ---
const showPwdModal = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref(null)
const pwdForm = reactive({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
})

const pwdRules = {
    oldPassword: { required: true, message: '请验证当前密码', trigger: 'blur' },
    newPassword: { required: true, min: 6, message: '新密码不能少于6位', trigger: 'blur' },
    confirmPassword: [
        { required: true, message: '请再次输入新密码', trigger: 'blur' },
        {
            validator: (rule, value) => value === pwdForm.newPassword,
            message: '两次输入的密码不一致',
            trigger: 'blur'
        }
    ]
}

const handleMenuClick = key => router.push(key)

const handleUserAction = key => {
    if (key === 'logout') {
        localStorage.removeItem('access_token')
        message.success('已安全退出')
        router.push('/login')
    } else if (key === 'change_pwd') {
        showPwdModal.value = true
    }
}

const submitPwdChange = async () => {
    pwdFormRef.value?.validate(async errors => {
        if (errors) return
        pwdLoading.value = true
        try {
            await changeAdminPasswordMyself(pwdForm.oldPassword, pwdForm.newPassword)
            message.success('密码修改成功，请重新登录')
            showPwdModal.value = false
            handleUserAction('logout')
        } finally {
            pwdLoading.value = false
        }
    })
}
</script>

<style scoped>
.flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
}
:deep(.n-layout-scroll-container) {
    background-color: #f9fafb !important;
}
</style>
