<template>
    <div class="p-6 flex flex-col gap-4">
        <n-card title="系统管理员管理" size="small">
            <div class="flex justify-between items-center">
                <n-input-group class="w-80">
                    <n-input v-model:value="searchParams.username" placeholder="搜索用户名" clearable @keyup.enter="fetchList" />
                    <n-button type="primary" @click="fetchList">搜索</n-button>
                </n-input-group>
                <n-button type="primary" @click="openModal('add')">
                    <template #icon
                        ><n-icon><AddOutline /></n-icon
                    ></template>
                    新增管理员
                </n-button>
            </div>
        </n-card>

        <n-data-table :columns="columns" :data="tableData" :loading="loading" />

        <n-modal v-model:show="showModal" preset="card" :title="modalType === 'add' ? '新增管理员' : '编辑信息'" class="w-100">
            <n-form ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="80">
                <n-form-item label="用户名" path="username">
                    <n-input v-model:value="formModel.username" placeholder="请输入登录账号" />
                </n-form-item>
                <n-form-item v-if="modalType === 'add'" label="初始密码" path="password">
                    <n-input v-model:value="formModel.password" type="password" placeholder="至少6位" />
                </n-form-item>
            </n-form>
            <template #footer>
                <n-space justify="end">
                    <n-button @click="showModal = false">取消</n-button>
                    <n-button type="primary" :loading="submitting" @click="handleSave">确认</n-button>
                </n-space>
            </template>
        </n-modal>

        <n-modal v-model:show="showPwdModal" preset="card" title="重置登录密码" class="w-100">
            <div class="mb-4 text-gray-400 text-xs">修改后该账号的所有设备将被强制下线。</div>
            <n-form label-placement="left" label-width="80">
                <n-form-item label="新密码">
                    <n-input v-model:value="newPassword" type="password" placeholder="请输入新密码" />
                </n-form-item>
            </n-form>
            <template #footer>
                <n-space justify="end">
                    <n-button @click="showPwdModal = false">取消</n-button>
                    <n-button type="primary" :loading="submitting" @click="handleUpdatePwd">提交修改</n-button>
                </n-space>
            </template>
        </n-modal>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useMessage, NButton, NSpace, NPopconfirm, NIcon, NTag } from 'naive-ui'
import { AddOutline, KeyOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import { getAdmins, createAdmin, updateAdmin, changeAdminPassword, deleteAdmin } from '@/api/admin'

const message = useMessage()
const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])

// 搜索与分页状态
const searchParams = reactive({
    username: '',
    skip: 0,
    limit: 20
})

// 弹窗状态
const showModal = ref(false)
const showPwdModal = ref(false)
const modalType = ref('add') // 'add' | 'edit'
const editId = ref(null)
const newPassword = ref('')
const formRef = ref(null)

const formModel = reactive({
    username: '',
    password: ''
})

const rules = {
    username: { required: true, message: '请输入用户名', trigger: 'blur' },
    password: { required: true, min: 6, message: '密码至少6位', trigger: 'blur' }
}

const columns = [
    { title: 'ID', key: 'id', width: 80 },
    { title: '用户名', key: 'username' },
    {
        title: '角色',
        key: 'role',
        render: () => h(NTag, { type: 'info', size: 'small' }, { default: () => '管理员' })
    },
    {
        title: '操作',
        key: 'actions',
        render(row) {
            return h(
                NSpace,
                {},
                {
                    default: () => [
                        h(
                            NButton,
                            { size: 'small', quaternary: true, onClick: () => openModal('edit', row) },
                            {
                                icon: () => h(NIcon, { component: CreateOutline }),
                                default: () => '改名'
                            }
                        ),
                        h(
                            NButton,
                            { size: 'small', quaternary: true, type: 'warning', onClick: () => openPwdModal(row) },
                            {
                                icon: () => h(NIcon, { component: KeyOutline }),
                                default: () => '重置密码'
                            }
                        ),
                        h(
                            NPopconfirm,
                            { onPositiveClick: () => handleDelete(row.id) },
                            {
                                trigger: () =>
                                    h(
                                        NButton,
                                        { size: 'small', quaternary: true, type: 'error' },
                                        {
                                            icon: () => h(NIcon, { component: TrashOutline }),
                                            default: () => '删除'
                                        }
                                    ),
                                default: () => '确定要删除此管理账号吗？'
                            }
                        )
                    ]
                }
            )
        }
    }
]

const fetchList = async () => {
    loading.value = true
    try {
        const res = await getAdmins(searchParams)
        tableData.value = res
    } finally {
        loading.value = false
    }
}

const openModal = (type, row = null) => {
    modalType.value = type
    if (type === 'edit') {
        editId.value = row.id
        formModel.username = row.username
    } else {
        formModel.username = ''
        formModel.password = ''
    }
    showModal.value = true
}

const openPwdModal = row => {
    editId.value = row.id
    newPassword.value = ''
    showPwdModal.value = true
}

const handleSave = () => {
    formRef.value?.validate(async errors => {
        if (errors) return
        submitting.value = true
        try {
            if (modalType.value === 'add') {
                await createAdmin(formModel)
                message.success('管理员创建成功')
            } else {
                await updateAdmin(editId.value, { username: formModel.username })
                message.success('用户名已更新')
            }
            showModal.value = false
            fetchList()
        } finally {
            submitting.value = false
        }
    })
}

const handleUpdatePwd = async () => {
    if (!newPassword.value || newPassword.value.length < 6) return message.error('密码至少6位')
    submitting.value = true
    try {
        await changeAdminPassword(editId.value, newPassword.value)
        message.success('密码重置成功，该账号已强制登出')
        showPwdModal.value = false
    } finally {
        submitting.value = false
    }
}

const handleDelete = async id => {
    await deleteAdmin(id)
    message.success('账号已移除')
    fetchList()
}

onMounted(fetchList)
</script>
