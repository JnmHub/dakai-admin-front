<template>
    <div class="flex flex-col gap-4">
        <n-card size="small">
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex gap-4">
                    <n-input v-model:value="searchParams.name" placeholder="搜索姓名" clearable class="w-48" />
                    <n-input v-model:value="searchParams.account" placeholder="搜索账号" clearable class="w-48" />
                    <n-button type="primary" @click="handleSearch">查询</n-button>
                    <n-button @click="resetSearch">重置</n-button>
                </div>
                <n-button type="primary" @click="showAddModal = true">新增员工</n-button>
            </div>
        </n-card>

        <n-card size="small">
            <n-data-table :columns="columns" :data="tableData" :loading="loading" :pagination="pagination" remote />
        </n-card>

        <n-modal v-model:show="showAddModal" preset="card" :title="editId ? '编辑员工' : '新增员工'" class="w-120">
            <n-form ref="formRef" :model="formModel" :rules="formRules">
                <n-form-item label="姓名" path="name">
                    <n-input v-model:value="formModel.name" placeholder="请输入姓名" />
                </n-form-item>
                <n-form-item label="账号" path="account">
                    <n-input v-model:value="formModel.account" :disabled="!!editId" placeholder="登录账号" />
                </n-form-item>
                <n-form-item v-if="!editId" label="初始密码" path="password">
                    <n-input v-model:value="formModel.password" type="password" placeholder="设置初始密码" />
                </n-form-item>
            </n-form>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <n-button @click="showAddModal = false">取消</n-button>
                    <n-button type="primary" @click="handleSave">提交</n-button>
                </div>
            </template>
        </n-modal>
    </div>
</template>

<script setup>
import { h, ref, reactive, onMounted } from 'vue'
import { useMessage, NButton, NSwitch, NSpace, NPopconfirm } from 'naive-ui'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, resetEmployeePassword } from '@/api/employee'
const formRules = {
    name: [
        { required: true, message: '请输入员工姓名', trigger: 'blur' },
        { min: 2, max: 10, message: '姓名长度在 2 到 10 个字符', trigger: 'blur' }
    ],
    account: [
        { required: true, message: '请输入登录账号', trigger: 'blur' },
        { pattern: /^[a-zA-Z0-9_]+$/, message: '账号只能包含字母、数字和下划线', trigger: 'blur' }
    ],
    password: [
        {
            // 只有在新增模式下（editId 为空）才强制要求密码
            required: true,
            validator: (rule, value) => {
                if (!editId.value && !value) {
                    return new Error('请输入初始密码')
                }
                return true
            },
            trigger: 'blur'
        }
    ]
}

// 2. 别忘了在模板中引用的 formRef 也需要定义
const formRef = ref(null)
const message = useMessage()
const loading = ref(false)
const tableData = ref([])
const showAddModal = ref(false)
const editId = ref(null)

// 1. 搜索逻辑
const searchParams = reactive({
    name: '',
    account: '',
    page: 1,
    pageSize: 10
})

// 2. 表格列定义
const columns = [
    { title: 'ID', key: 'id', width: 80 },
    { title: '姓名', key: 'name' },
    { title: '账号', key: 'account' },
    {
        title: '状态',
        key: 'is_active',
        render(row) {
            return h(NSwitch, {
                value: row.is_active,
                onUpdateValue: val => handleStatusChange(row, val)
            })
        }
    },
    {
        title: '微信绑定',
        key: 'wechat_openid',
        render(row) {
            return row.wechat_openid ? '已绑定' : '未绑定'
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row) {
            return h(NSpace, null, {
                default: () => [
                    h(NButton, { size: 'small', quaternary: true, onClick: () => handleEdit(row) }, { default: () => '编辑' }),
                    h(NButton, { size: 'small', quaternary: true, type: 'warning', onClick: () => handleResetPwd(row) }, { default: () => '重置密码' }),
                    h(
                        NPopconfirm,
                        { onPositiveClick: () => handleDelete(row) },
                        {
                            trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, { default: () => '删除' }),
                            default: () => '确定要删除该员工及其所有记录吗？'
                        }
                    )
                ]
            })
        }
    }
]

// 3. 数据加载与分页
const pagination = reactive({
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    pageSizes: [10, 20, 50],
    onChange: page => {
        pagination.page = page
        fetchList()
    },
    onUpdatePageSize: pageSize => {
        pagination.pageSize = pageSize
        fetchList()
    }
})

const handleSearch = () => {
    pagination.page = 1 // 搜索时重置到第一页
    fetchList()
}

// 3. 补充重置函数
const resetSearch = () => {
    searchParams.name = ''
    searchParams.account = ''
    pagination.page = 1
    fetchList()
}

// 4. 修正 fetchList 中的数据赋值 Bug
const fetchList = async () => {
    loading.value = true
    try {
        const data = await getEmployees({
            skip: (pagination.page - 1) * pagination.pageSize,
            limit: pagination.pageSize,
            name: searchParams.name,
            account: searchParams.account
        })

        // 注意：这里必须用 .value 赋值，而不是 .ref
        tableData.value = data.items
    } catch (err) {
        console.error('获取列表失败:', err)
    } finally {
        loading.value = false
    }
}

// 4. 业务操作逻辑
const handleStatusChange = async (row, val) => {
    await updateEmployee(row.id, { is_active: val })
    message.success(val ? '已启用账号' : '已禁用账号并强制下线')
    row.is_active = val
}

const handleEdit = row => {
    editId.value = row.id
    formModel.name = row.name
    formModel.account = row.account
    showAddModal.value = true
}

const handleDelete = async row => {
    await deleteEmployee(row.id)
    message.success('删除成功')
    fetchList()
}

const handleResetPwd = row => {
    const newPwd = window.prompt(`正在为员工 ${row.name} 重置密码，请输入新密码：`)
    if (newPwd) {
        resetEmployeePassword(row.id, newPwd).then(() => {
            message.success('密码已重置')
        })
    }
}

// 5. 表单提交
const formModel = reactive({ name: '', account: '', password: '' })
const handleSave = async () => {
    // 执行表单验证
    formRef.value?.validate(async errors => {
        if (!errors) {
            loading.value = true
            try {
                if (editId.value) {
                    await updateEmployee(editId.value, { name: formModel.name })
                    message.success('信息已更新')
                } else {
                    await createEmployee(formModel)
                    message.success('员工创建成功')
                }
                showAddModal.value = false
                fetchList()
            } catch (err) {
                // 错误已被 axios 拦截器处理
            } finally {
                loading.value = false
            }
        } else {
            message.error('请填写完整信息')
        }
    })
}

onMounted(fetchList)
</script>
