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

        <n-modal v-model:show="showTrajDateModal" preset="card" title="选择轨迹时间范围" class="w-96">
            <div class="flex flex-col gap-4">
                <n-alert type="info" :show-icon="false">
                    请选择要查看 <strong>{{ currentTrajEmp?.name }}</strong> 的轨迹日期范围。
                </n-alert>
                <n-date-picker v-model:value="trajDateRange" type="daterange" clearable class="w-full" />
            </div>
            <template #footer>
                <div class="flex justify-end gap-2">
                    <n-button @click="showTrajDateModal = false">取消</n-button>
                    <n-button type="primary" @click="confirmOpenDrawer">查看轨迹</n-button>
                </div>
            </template>
        </n-modal>

        <n-drawer v-model:show="showTrajDrawer" width="85%" placement="right">
            <n-drawer-content :title="`${currentTrajEmp?.name} 的行动轨迹`" closable>
                <div v-if="showTrajDrawer" class="h-full w-full">
                    <TrajectoryMap :employee-id="currentTrajEmp?.id" :date-range="trajDateRange" />
                </div>
            </n-drawer-content>
        </n-drawer>
    </div>
</template>

<script setup>
import { h, ref, reactive, onMounted } from 'vue'
import { useMessage, NButton, NSwitch, NSpace, NPopconfirm, NDrawer, NDrawerContent, NDatePicker, NAlert, NModal } from 'naive-ui'
import { getEmployees, createEmployee, updateEmployee, deleteEmployee, resetEmployeePassword, unbindWechat } from '@/api/employee'
import TrajectoryMap from '@/components/TrajectoryMap.vue' // 🔥 引入地图组件

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

const formRef = ref(null)
const message = useMessage()
const loading = ref(false)
const tableData = ref([])
const showAddModal = ref(false)
const editId = ref(null)

// --- 轨迹相关状态 ---
const showTrajDateModal = ref(false) // 控制时间选择弹窗
const showTrajDrawer = ref(false) // 控制地图抽屉
const currentTrajEmp = ref(null) // 当前查看的员工对象
const trajDateRange = ref(null) // 选中的时间范围

// 1. 搜索逻辑
const searchParams = reactive({
    name: '',
    account: '',
    page: 1,
    pageSize: 10
})

// 2. 表格列定义
const columns = [
    { title: 'ID', key: 'id', width: 60 },
    { title: '姓名', key: 'name', width: 100 },
    { title: '账号', key: 'account', width: 120 },
    {
        title: '状态',
        key: 'is_active',
        width: 100,
        render(row) {
            return h(NSwitch, {
                value: row.is_active,
                onUpdateValue: val => handleStatusChange(row, val)
            })
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row) {
            return h(NSpace, null, {
                default: () => [
                    // 🔥 新增：查看轨迹按钮
                    h(
                        NButton,
                        {
                            size: 'small',
                            secondary: true,
                            type: 'info',
                            onClick: () => handleOpenTrajModal(row)
                        },
                        { default: () => '轨迹' }
                    ),
                    row.wechat_openid
                        ? h(
                              NPopconfirm,
                              { onPositiveClick: () => handleUnbindWechat(row) },
                              {
                                  trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'warning' }, { default: () => '解绑微信' }),
                                  default: () => `确定要解绑 ${row.name} 的微信吗？`
                              }
                          )
                        : null,
                    h(NButton, { size: 'small', quaternary: true, onClick: () => handleEdit(row) }, { default: () => '编辑' }),
                    h(NButton, { size: 'small', quaternary: true, type: 'warning', onClick: () => handleResetPwd(row) }, { default: () => '重置密码' }),
                    h(
                        NPopconfirm,
                        { onPositiveClick: () => handleDelete(row) },
                        {
                            trigger: () => h(NButton, { size: 'small', quaternary: true, type: 'error' }, { default: () => '删除' }),
                            default: () => '确定要删除该员工吗？'
                        }
                    )
                ]
            })
        }
    }
]

// --- 轨迹交互逻辑 ---

// 点击列表中的“轨迹”按钮
const handleOpenTrajModal = row => {
    currentTrajEmp.value = row
    // 默认时间设为今天到今天
    const startOfToday = new Date().setHours(0, 0, 0, 0)
    const endOfToday = new Date().setHours(23, 59, 59, 999)
    trajDateRange.value = [startOfToday, endOfToday]

    showTrajDateModal.value = true
}

// 在模态框点“查看轨迹”确认
const confirmOpenDrawer = () => {
    if (!trajDateRange.value) {
        message.warning('请选择日期范围')
        return
    }
    showTrajDateModal.value = false // 关掉小窗
    showTrajDrawer.value = true // 打开大抽屉
}

// ... 以下保持您原有的业务逻辑不变 ...
const handleUnbindWechat = async row => {
    try {
        await unbindWechat(row.id)
        message.success('解绑成功')
        // 刷新列表，更新状态
        fetchList()
    } catch (e) {
        // 错误已由拦截器处理，或在此打印
        console.error(e)
    }
}
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
    pagination.page = 1
    fetchList()
}

const resetSearch = () => {
    searchParams.name = ''
    searchParams.account = ''
    pagination.page = 1
    fetchList()
}

const fetchList = async () => {
    loading.value = true
    try {
        const data = await getEmployees({
            skip: (pagination.page - 1) * pagination.pageSize,
            limit: pagination.pageSize,
            name: searchParams.name,
            account: searchParams.account
        })
        tableData.value = data.items || data || []
    } catch (err) {
        console.error('获取列表失败:', err)
    } finally {
        loading.value = false
    }
}

const handleStatusChange = async (row, val) => {
    await updateEmployee(row.id, { is_active: val })
    message.success(val ? '已启用账号' : '已禁用账号')
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

const formModel = reactive({ name: '', account: '', password: '' })
const handleSave = async () => {
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
            } finally {
                loading.value = false
            }
        }
    })
}

onMounted(fetchList)
</script>
