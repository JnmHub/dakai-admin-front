<template>
    <div class="flex flex-col h-full">
        <div class="flex justify-between items-center mb-4">
            <div class="text-sm font-bold flex items-center gap-2">指派员工 <n-badge :value="modelValue.length" type="info" /></div>
            <n-checkbox :checked="isAllSelected" :indeterminate="isIndeterminate" @update:checked="toggleSelectAll"> 全选所有 </n-checkbox>
        </div>

        <n-input v-model:value="searchKeyword" placeholder="输入姓名或账号筛选..." class="mb-3" clearable />

        <n-scrollbar class="flex-1 pr-2">
            <div class="grid grid-cols-2 gap-2">
                <div
                    v-for="emp in filteredEmployees"
                    :key="emp.id"
                    @click="toggleEmployee(emp.id)"
                    :class="['group cursor-pointer p-3 rounded-lg border transition-all flex items-center gap-3', modelValue.includes(emp.id) ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 hover:border-blue-300 hover:bg-gray-50']"
                >
                    <n-avatar round size="small" :style="{ backgroundColor: getAvatarColor(emp.name) }">
                        {{ emp.name.substring(0, 1) }}
                    </n-avatar>
                    <div class="flex-1 overflow-hidden">
                        <div class="text-xs font-bold truncate">{{ emp.name }}</div>
                        <div class="text-[10px] text-gray-400 truncate">{{ emp.account }}</div>
                    </div>
                    <n-checkbox :checked="modelValue.includes(emp.id)" @click.stop />
                </div>
            </div>
            <n-empty v-if="filteredEmployees.length === 0" description="未找到匹配员工" class="mt-10" />
        </n-scrollbar>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
    modelValue: { type: Array, default: () => [] }, // 选中的 ID 列表
    employees: { type: Array, default: () => [] } // 全量员工数据
})

const emit = defineEmits(['update:modelValue'])

const searchKeyword = ref('')

// 1. 过滤逻辑
const filteredEmployees = computed(() => {
    if (!searchKeyword.value) return props.employees
    const kw = searchKeyword.value.toLowerCase()
    return props.employees.filter(e => e.name.toLowerCase().includes(kw) || e.account.toLowerCase().includes(kw))
})

// 2. 全选状态
const isAllSelected = computed(() => {
    return props.employees.length > 0 && props.modelValue.length === props.employees.length
})

const isIndeterminate = computed(() => {
    return props.modelValue.length > 0 && props.modelValue.length < props.employees.length
})

const toggleSelectAll = checked => {
    const newSelection = checked ? props.employees.map(e => e.id) : []
    emit('update:modelValue', newSelection)
}

// 3. 单选/反选
const toggleEmployee = id => {
    const newSelection = [...props.modelValue]
    const index = newSelection.indexOf(id)
    if (index > -1) {
        newSelection.splice(index, 1)
    } else {
        newSelection.push(id)
    }
    emit('update:modelValue', newSelection)
}

// 4. 头像颜色逻辑
const getAvatarColor = name => {
    const colors = ['#18a058', '#2080f0', '#f0a020', '#d03050', '#70c0e8']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
}
</script>
