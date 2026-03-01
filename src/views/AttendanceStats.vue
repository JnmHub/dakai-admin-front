<template>
    <div class="p-4 h-full flex flex-col gap-4">
        <n-card content-style="padding: 0;">
            <n-tabs type="line" size="large" :tabs-padding="20" pane-style="padding: 20px;">
                <n-tab-pane name="personal" tab="个人考勤日历">
                    <div class="flex flex-col gap-4">
                        <div class="flex justify-between items-center">
                            <div class="flex gap-4 items-center">
                                <h2 class="font-bold text-lg">考勤统计看板</h2>

                                <n-select v-model:value="selectedPointId" :options="pointOptions" placeholder="请选择打卡点" style="width: 200px" @update:value="handlePointChange" />

                                <n-select v-model:value="selectedEmpId" :options="employeeOptions" filterable placeholder="请选择员工" style="width: 200px" @update:value="fetchData" />
                            </div>

                            <n-button @click="fetchData" type="primary" secondary>
                                <template #icon
                                    ><n-icon><Refresh /></n-icon
                                ></template>
                                刷新数据
                            </n-button>
                        </div>

                        <n-grid :cols="5" x-gap="12" class="bg-gray-50 p-4 rounded-lg">
                            <n-gi>
                                <n-statistic label="应出勤天数" :value="stats.total_work_days">
                                    <template #suffix>天</template>
                                </n-statistic>
                            </n-gi>
                            <n-gi>
                                <n-statistic label="实际出勤" :value="stats.actual_work_days">
                                    <template #suffix>天</template>
                                </n-statistic>
                            </n-gi>
                            <n-gi>
                                <n-statistic label="迟到次数" :value="stats.late_times">
                                    <template #prefix
                                        ><n-icon color="#f5222d"><AlertCircle /></n-icon
                                    ></template>
                                    <template #suffix>次</template>
                                </n-statistic>
                            </n-gi>
                            <n-gi>
                                <n-statistic label="早退次数" :value="stats.early_times">
                                    <template #prefix
                                        ><n-icon color="#faad14"><Time /></n-icon
                                    ></template>
                                    <template #suffix>次</template>
                                </n-statistic>
                            </n-gi>
                            <n-gi>
                                <n-statistic label="缺卡/旷工" :value="stats.absent_days">
                                    <template #prefix
                                        ><n-icon color="#8c8c8c"><CloseCircle /></n-icon
                                    ></template>
                                    <template #suffix>次</template>
                                </n-statistic>
                            </n-gi>
                        </n-grid>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <n-calendar :value="calendarTs" #default="{ year, month, date }" :on-panel-change="handleCalendarClick">
                                <div class="h-full w-full flex flex-col gap-1 text-xs cursor-pointer hover:bg-gray-50 transition-colors p-1 rounded" @click.stop="handleDayClick(year, month, date)">
                                    <div v-if="getDayData(year, month, date)" class="mt-1">
                                        <div class="mb-1 flex justify-center">
                                            <n-tag :type="getStatusType(getDayData(year, month, date).status)" size="tiny" :bordered="false" round>
                                                {{ getDayData(year, month, date).status }}
                                            </n-tag>
                                        </div>

                                        <div class="flex flex-col gap-0.5 px-1">
                                            <div v-for="(seg, idx) in getDayData(year, month, date).segments" :key="idx" class="flex justify-between text-[10px] text-gray-500 bg-gray-50 rounded px-1 py-0.5">
                                                <span>{{ seg.plan_start.slice(0, 5) }}</span>

                                                <span :class="{ 'text-red-500': seg.status !== '正常' }">
                                                    {{ seg.status === '正常' ? (seg.actual_time ? seg.actual_time.slice(0, 5) : '已打卡') : seg.status }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </n-calendar>
                        </div>
                    </div>
                </n-tab-pane>

                <n-tab-pane name="team" tab="每日团队报表">
                    <div class="flex flex-col gap-4">
                        <div class="flex gap-4 items-center">
                            <n-select v-model:value="selectedPointId" :options="pointOptions" placeholder="选择打卡点" style="width: 250px" @update:value="fetchTeamData" />

                            <n-date-picker v-model:value="reportDateTs" type="date" placeholder="选择日期" @update:value="fetchTeamData" />

                            <n-radio-group v-model:value="statusFilter" size="medium">
                                <n-radio-button value="all">全部</n-radio-button>
                                <n-radio-button value="abnormal">只看异常</n-radio-button>
                                <n-radio-button value="missing">只看缺卡</n-radio-button>
                            </n-radio-group>

                            <n-button @click="fetchTeamData" type="primary" ghost>查询</n-button>
                        </div>

                        <n-data-table :columns="teamColumns" :data="filteredTeamList" :loading="teamLoading" :pagination="{ pageSize: 20 }" />
                    </div>
                </n-tab-pane>
            </n-tabs>
        </n-card>

        <n-modal v-model:show="showDetailModal" preset="card" title="打卡流水详情" style="width: 800px">
            <n-data-table :columns="detailColumns" :data="detailList" :loading="detailLoading" :pagination="false" max-height="400" size="small" />
            <div v-if="detailList.length === 0 && !detailLoading" class="text-center text-gray-400 py-8">当日无打卡记录</div>
        </n-modal>
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, h } from 'vue'
import { useMessage, NIcon, NImage, NTag } from 'naive-ui'
import { Refresh, AlertCircle, Time, CloseCircle } from '@vicons/ionicons5'
import { getCalendar, getStats, getDailyReport } from '@/api/attendance'
import { getEmployees } from '@/api/employee'
import { getPoints } from '@/api/point'
import { getAllRecords } from '@/api/record'
import { baseURL } from '@/utils/request'

const message = useMessage()
const token = localStorage.getItem('access_token')

// --- 通用状态 ---
const pointOptions = ref([])
const selectedPointId = ref(null)
const employeeOptions = ref([])

// --- Tab 1: 个人日历状态 ---
const currentMonthTs = ref(Date.now())
const calendarTs = ref(Date.now())
const selectedEmpId = ref(null)
const calendarMap = ref({})
const stats = ref({
    total_work_days: 0,
    actual_work_days: 0,
    late_times: 0,
    early_times: 0,
    absent_days: 0
})

// --- Tab 2: 团队报表状态 ---
const reportDateTs = ref(Date.now())
const teamLoading = ref(false)
const teamList = ref([])
const statusFilter = ref('all')

// --- 详情弹窗状态 ---
const showDetailModal = ref(false)
const detailLoading = ref(false)
const detailList = ref([])

// --- 详情弹窗表格列 ---
const detailColumns = [
    { title: '打卡时间', key: 'create_time', width: 160 },
    { title: '打卡地点', key: 'location_name', ellipsis: { tooltip: true } },
    { title: '打卡点名称', key: 'point_title', width: 120 },
    {
        title: '现场照片',
        key: 'photo_url',
        width: 100,
        render(row) {
            if (!row.photo_url) return '-'
            return h(NImage, {
                width: 40,
                src: `${baseURL}/checkin/view_photo?photo_path=${row.photo_url}&query_token=${token}`,
                objectFit: 'cover'
            })
        }
    }
]

// --- 🔥 修改点 2：团队报表表格列 (适配新结构) ---
const teamColumns = [
    { title: '姓名', key: 'employee_name', width: 120 },
    {
        title: '状态',
        key: 'status',
        width: 100,
        render(row) {
            return h(
                NTag,
                {
                    type: getStatusType(row.status),
                    bordered: false,
                    size: 'small'
                },
                { default: () => row.status }
            )
        }
    },
    {
        title: '班次详情',
        key: 'segments',
        render(row) {
            if (!row.segments || row.segments.length === 0) return '-'
            return row.segments.map((seg, i) => {
                // seg 结构: { plan_start, plan_end, actual_time, status }
                const timeText = seg.status === '正常' ? (seg.actual_time ? seg.actual_time.slice(0, 5) : '正常') : seg.status
                const colorClass = seg.status !== '正常' ? 'text-red-500' : 'text-gray-500'

                return h('div', { class: `text-xs ${colorClass}` }, `班次${i + 1} (${seg.plan_start.slice(0, 5)}): ${timeText}`)
            })
        }
    }
]

// ---------------- 初始化 ----------------
const initData = async () => {
    try {
        const pRes = await getPoints()
        const points = pRes.items || pRes || []
        pointOptions.value = points.map(p => ({ label: p.title, value: p.id }))
        if (points.length > 0) {
            selectedPointId.value = points[0].id
        }

        const res = await getEmployees({ page: 1, pageSize: 100 })
        const list = res.items || res || []
        employeeOptions.value = list.map(e => ({ label: e.name, value: e.id }))

        if (list.length > 0) {
            selectedEmpId.value = list[0].id
            fetchData()
        }
    } catch (e) {
        console.error(e)
        message.error('加载基础数据失败')
    }
}

// ---------------- Tab 1 逻辑 ----------------

const calendarKey = computed(() => {
    const d = new Date(calendarTs.value)
    return `${d.getFullYear()}-${d.getMonth()}`
})

const fetchData = async () => {
    if (!selectedEmpId.value) return

    const dateObj = new Date(calendarTs.value)
    const year = dateObj.getFullYear()
    const month = dateObj.getMonth() + 1

    if (currentMonthTs.value !== calendarTs.value) {
        currentMonthTs.value = calendarTs.value
    }

    console.log(`正在请求数据: ${year}年${month}月, 员工: ${selectedEmpId.value}, 打卡点: ${selectedPointId.value}`)

    try {
        const [calRes, statRes] = await Promise.all([getCalendar({ year, month, employee_id: selectedEmpId.value, point_id: selectedPointId.value }), getStats({ year, month, employee_id: selectedEmpId.value, point_id: selectedPointId.value })])

        const rawList = Array.isArray(calRes) ? calRes : calRes.items || calRes || []
        const map = {}
        if (rawList && rawList.length > 0) {
            rawList.forEach(item => {
                const d = item.day_str || item.date
                if (d) map[d] = item
            })
        }
        calendarMap.value = map

        const rawStats = statRes.items || statRes || {}
        if (rawStats) {
            stats.value = rawStats
        }
    } catch (e) {
        console.error('API 错误:', e)
        message.error('获取考勤数据失败')
    }
}

const getDayData = (year, month, date) => {
    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(date)
    const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return calendarMap.value[key]
}

const getStatusType = status => {
    if (status === '正常') return 'success'
    if (status === '休息' || status === '未开始') return 'default'
    if (status === '未排班') return 'default'
    if (status === '未加入') return 'warning'
    return 'error'
}

const handleCalendarClick = ts => {
    const date = new Date(ts)
    if (typeof ts === 'object') {
        const year = ts.year
        const month = ts.month
        date.setFullYear(year)
        date.setMonth(month - 1)
        date.setDate(1)
    }
    calendarTs.value = date.getTime()
    fetchData()
}

const handleDatePickerChange = ts => {
    if (ts) {
        const targetDate = new Date(ts)
        targetDate.setDate(1)
        calendarTs.value = targetDate.getTime()
        fetchData()
    }
}

const handleDayClick = async (year, month, date) => {
    if (!selectedEmpId.value) return

    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(date)
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const startTime = `${dateStr} 00:00:00`
    const endTime = `${dateStr} 23:59:59`

    showDetailModal.value = true
    detailLoading.value = true
    detailList.value = []

    try {
        const res = await getAllRecords({
            employee_id: selectedEmpId.value,
            point_id: selectedPointId.value,
            start_date: startTime,
            end_date: endTime,
            skip: 0,
            limit: 100
        })

        const list = res.items || res || []
        detailList.value = list
    } catch (e) {
        console.error(e)
        message.error('加载当日详情失败')
    } finally {
        detailLoading.value = false
    }
}

// ---------------- Tab 2 逻辑 ----------------

const fetchTeamData = async () => {
    if (!selectedPointId.value || !reportDateTs.value) return

    const dateStr = new Date(reportDateTs.value).toISOString().split('T')[0]
    teamLoading.value = true
    try {
        const res = await getDailyReport({
            date_str: dateStr,
            point_id: selectedPointId.value
        })
        teamList.value = res.items || res || []
    } catch (e) {
        console.error(e)
        message.error('加载团队报表失败')
    } finally {
        teamLoading.value = false
    }
}

const filteredTeamList = computed(() => {
    if (statusFilter.value === 'all') return teamList.value
    return teamList.value.filter(item => {
        if (statusFilter.value === 'missing') return item.status === '缺卡'
        if (statusFilter.value === 'abnormal') return item.status !== '正常' && item.status !== '休息' && item.status !== '未开始' && item.status !== '未加入'
        return true
    })
})

const handlePointChange = () => {
    fetchData()
    fetchTeamData()
}

onMounted(() => {
    initData()
})
</script>

<style scoped>
:deep(.n-calendar .n-calendar-cell) {
    padding: 10px;
    height: 110px;
}
</style>
