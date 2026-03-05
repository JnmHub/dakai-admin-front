<template>
    <div class="p-6 flex flex-col gap-4">
        <n-card title="全量打卡记录审计" :segmented="{ content: true }" class="shadow-sm rounded-xl">
            <n-space class="mb-4">
                <n-input v-model:value="queryParams.employee_name" placeholder="打卡人姓名" clearable @keyup.enter="handleSearch" />
                <n-input v-model:value="queryParams.point_title" placeholder="打卡地点名称" clearable @keyup.enter="handleSearch" />
                <n-date-picker v-model:value="dateRange" type="daterange" clearable />
                <n-button type="primary" @click="handleSearch">
                    <template #icon
                        ><n-icon><SearchOutline /></n-icon
                    ></template>
                    查询
                </n-button>
                <n-button @click="resetQuery">重置</n-button>
            </n-space>

            <n-data-table remote ref="tableRef" :columns="columns" :data="data" :loading="loading" :pagination="pagination" :bordered="false" @update:page="handlePageChange" @update:sorter="handleSorterChange" />
        </n-card>

        <n-modal v-model:show="showPhoto" preset="card" title="查看打卡凭证" class="w-120">
            <div class="flex gap-4">
                <n-image :src="currentPhotoUrl" class="rounded-lg shadow-lg" width="100%" />
                <n-descriptions bordered label-placement="center" :column="1" size="small" class="w-full">
                    <n-descriptions-item label="详细地址">{{ currentRecord?.location_name }}</n-descriptions-item>
                </n-descriptions>
            </div>
        </n-modal>
    </div>
</template>

<script setup>
import { h, ref, reactive, onMounted } from 'vue'
import { NButton, NImage, NTag, NIcon } from 'naive-ui'
import { SearchOutline, ImageOutline } from '@vicons/ionicons5'
import request from '@/utils/request'
import { baseURL } from '@/utils/request'
import dayjs from 'dayjs'

const loading = ref(false)
const data = ref([])
const showPhoto = ref(false)
const currentPhotoUrl = ref('')
const currentRecord = ref(null)
const dateRange = ref(null)

const queryParams = reactive({
    employee_name: '',
    point_title: '',
    skip: 0,
    limit: 10
})

const pagination = reactive({
    page: 1,
    pageSize: 10,
    itemCount: 0,
    showSizePicker: true,
    pageSizes: [10, 20, 50]
})

// 表格列定义
const columns = [
    {
        title: '打卡人',
        key: 'employee_name',
        sorter: true // 开启排序
    },
    {
        title: '目标点位',
        key: 'point_title',
        sorter: true
    },
    {
        title: '打卡时间',
        key: 'create_time',
        sorter: 'default',
        render(row) {
            return dayjs(row.create_time).format('YYYY-MM-DD HH:mm:ss')
        }
    },
    {
        title: '现场地址',
        key: 'location_name',
        ellipsis: { tooltip: true }
    },
    {
        title: '现场照片',
        key: 'actions',
        render(row) {
            return h(
                NButton,
                {
                    size: 'small',
                    type: 'info',
                    secondary: true,
                    onClick: () => previewPhoto(row)
                },
                { default: () => '查看照片', icon: () => h(NIcon, null, { default: () => h(ImageOutline) }) }
            )
        }
    }
]

const fetchData = async () => {
    loading.value = true
    try {
        const params = { ...queryParams }
        if (dateRange.value) {
            params.start_date = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
            params.end_date = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
        }
        const res = await request.get('/checkin/all_records', { params })

        data.value = res.items
        // 假设后端返回了总数，这里可以设置 pagination.itemCount
    } finally {
        loading.value = false
    }
}

const previewPhoto = row => {
    currentRecord.value = row
    const token = localStorage.getItem('access_token')
    currentPhotoUrl.value = `${baseURL}/checkin/view_photo?photo_path=${row.photo_url}&query_token=${token}`
    showPhoto.value = true
}

const handleSearch = () => {
    pagination.page = 1
    queryParams.skip = 0
    fetchData()
}

const resetQuery = () => {
    queryParams.employee_name = ''
    queryParams.point_title = ''
    dateRange.value = null
    handleSearch()
}

const handlePageChange = page => {
    pagination.page = page
    queryParams.skip = (page - 1) * pagination.pageSize
    fetchData()
}

// 排序回调
const handleSorterChange = sorter => {
    // 后端排序逻辑：这里可以根据 sorter.columnKey 和 sorter.order 向后端发请求
    console.log('排序改变:', sorter)
}

onMounted(fetchData)
</script>
<style scoped>
img {
    width: 100% !important;
}
</style>
