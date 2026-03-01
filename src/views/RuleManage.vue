<template>
    <div class="p-4">
        <n-card title="考勤规则设置">
            <template #header-extra>
                <n-button type="primary" @click="handleCreate"> 新建规则 </n-button>
            </template>

            <n-data-table :columns="columns" :data="tableData" :loading="loading" :bordered="false" :single-line="false" />
        </n-card>

        <n-modal v-model:show="showModal">
            <n-card style="width: 600px" title="新建考勤规则" :bordered="false" size="huge" role="dialog" aria-modal="true">
                <n-form ref="formRef" :model="formModel" :rules="rules" label-placement="left" label-width="100" require-mark-placement="right-hanging">
                    <n-form-item label="规则名称" path="name">
                        <n-input v-model:value="formModel.name" placeholder="例如：总部早班" />
                    </n-form-item>

                    <n-form-item label="工作日" path="work_days">
                        <n-checkbox-group v-model:value="formModel.work_days">
                            <n-space item-style="display: flex;">
                                <n-checkbox value="1" label="周一" />
                                <n-checkbox value="2" label="周二" />
                                <n-checkbox value="3" label="周三" />
                                <n-checkbox value="4" label="周四" />
                                <n-checkbox value="5" label="周五" />
                                <n-checkbox value="6" label="周六" />
                                <n-checkbox value="7" label="周日" />
                            </n-space>
                        </n-checkbox-group>
                    </n-form-item>

                    <n-form-item label="弹性打卡范围">
                        <n-input-number v-model:value="formModel.flex_minutes" :min="0" :max="240">
                            <template #suffix>分钟</template>
                        </n-input-number>
                        <div class="ml-2 text-gray-400 text-xs">打卡时间前后 N 分钟有效</div>
                    </n-form-item>

                    <n-divider title-placement="left">考勤时间段设置</n-divider>

                    <n-dynamic-input v-model:value="formModel.time_segments" item-style="margin-bottom: 0;" :on-create="onCreateSegment">
                        <template #default="{ value }">
                            <div class="flex items-center gap-2 w-full">
                                <n-time-picker v-model:formatted-value="value.start_time" value-format="HH:mm:ss" placeholder="上班时间" style="flex: 1" />
                                <span class="text-gray-400">-</span>
                                <n-time-picker v-model:formatted-value="value.end_time" value-format="HH:mm:ss" placeholder="下班时间" style="flex: 1" />
                            </div>
                        </template>
                    </n-dynamic-input>

                    <div class="mt-2 text-xs text-gray-400" v-if="formModel.time_segments.length === 0">请至少添加一个考勤时间段</div>
                </n-form>

                <template #footer>
                    <div class="flex justify-end gap-2">
                        <n-button @click="showModal = false">取消</n-button>
                        <n-button type="primary" @click="submitForm" :loading="submitting"> 确定 </n-button>
                    </div>
                </template>
            </n-card>
        </n-modal>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { NButton, NTag, NSpace, useMessage, NPopconfirm } from 'naive-ui'
import { getRules, createRule, deleteRule } from '@/api/attendance'

const message = useMessage()
const loading = ref(false)
const tableData = ref([])
const showModal = ref(false)
const submitting = ref(false)
const formRef = ref(null)

// 星期映射
const weekMap = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日'
}

// 表单模型
const formModel = reactive({
    name: '',
    work_days: ['1', '2', '3', '4', '5'],
    flex_minutes: 60,
    time_segments: []
})

// 表单校验规则
const rules = {
    name: { required: true, message: '请输入规则名称', trigger: 'blur' },
    work_days: { type: 'array', required: true, message: '请至少选择一个工作日', trigger: 'change' }
}

// 定义表格列
const columns = [
    { title: 'ID', key: 'id', width: 60 },
    { title: '规则名称', key: 'name', width: 150 },
    {
        title: '工作日',
        key: 'work_days',
        width: 250,
        render(row) {
            const days = row.work_days.split(',')
            return h(
                NSpace,
                { size: 4 },
                {
                    default: () => days.map(d => h(NTag, { size: 'small', type: 'info', bordered: false }, { default: () => weekMap[d] }))
                }
            )
        }
    },
    {
        title: '考勤时段',
        key: 'time_segments',
        render(row) {
            return h(
                NSpace,
                { vertical: true, size: 2 },
                {
                    default: () => row.time_segments.map((seg, index) => h('div', { class: 'text-xs text-gray-500' }, `时段${index + 1}: ${seg.start_time} - ${seg.end_time}`))
                }
            )
        }
    },
    {
        title: '弹性范围',
        key: 'flex_minutes',
        width: 120,
        render(row) {
            return `± ${row.flex_minutes} 分钟`
        }
    },
    {
        title: '操作',
        key: 'actions',
        width: 100,
        render(row) {
            return h(
                NPopconfirm,
                {
                    onPositiveClick: () => handleDelete(row)
                },
                {
                    trigger: () => h(NButton, { size: 'small', type: 'error', quaternary: true }, { default: () => '删除' }),
                    default: () => '确定删除该规则吗？'
                }
            )
        }
    }
]

// 动态输入框创建默认值
const onCreateSegment = () => {
    return {
        start_time: '09:00:00',
        end_time: '18:00:00'
    }
}

const loadData = async () => {
    loading.value = true
    try {
        const res = await getRules()
        tableData.value = res
    } finally {
        loading.value = false
    }
}

const handleCreate = () => {
    // 重置表单
    formModel.name = ''
    formModel.work_days = ['1', '2', '3', '4', '5']
    formModel.flex_minutes = 60
    formModel.time_segments = [onCreateSegment()]
    showModal.value = true
}

const submitForm = e => {
    e.preventDefault()
    formRef.value?.validate(async errors => {
        if (!errors) {
            // 手动校验时间段
            if (formModel.time_segments.length === 0) {
                message.warning('请至少添加一个时间段')
                return
            }
            for (const seg of formModel.time_segments) {
                if (!seg.start_time || !seg.end_time) {
                    message.warning('请完整填写所有时间段')
                    return
                }
            }

            submitting.value = true
            try {
                const payload = {
                    ...formModel,
                    work_days: formModel.work_days.join(',')
                }
                await createRule(payload)
                message.success('创建成功')
                showModal.value = false
                loadData()
            } catch (err) {
                // request.js 会处理错误提示，或者在这里 message.error
            } finally {
                submitting.value = false
            }
        }
    })
}

const handleDelete = async row => {
    try {
        await deleteRule(row.id)
        message.success('删除成功')
        loadData()
    } catch (err) {
        // error handled
    }
}

onMounted(loadData)
</script>
