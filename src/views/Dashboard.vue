<template>
    <div class="p-6 bg-gray-50 min-h-screen flex flex-col gap-6">
        <n-grid cols="1 s:2 m:4" x-gap="16" y-gap="16" responsive="screen">
            <n-grid-item v-for="item in statCards" :key="item.key">
                <n-card class="shadow-sm border-none rounded-2xl hover:shadow-md transition-all duration-300">
                    <n-statistic :label="item.label" :value="item.value">
                        <template #prefix>
                            <div class="p-2 rounded-lg mr-2" :style="{ backgroundColor: item.bgColor }">
                                <n-icon :color="item.color" size="24">
                                    <component :is="item.icon" />
                                </n-icon>
                            </div>
                        </template>
                        <template #suffix>
                            <span class="text-xs text-gray-400 ml-1">{{ item.unit }}</span>
                        </template>
                    </n-statistic>
                </n-card>
            </n-grid-item>
        </n-grid>

        <n-grid cols="1 m:3" x-gap="16" y-gap="16" responsive="screen">
            <n-grid-item span="2">
                <n-card title="近七日外勤打卡趋势" :segmented="{ content: true }" class="shadow-sm border-none rounded-2xl h-full">
                    <div ref="trendChartRef" style="height: 380px"></div>
                </n-card>
            </n-grid-item>

            <n-grid-item>
                <div class="flex flex-col gap-4 h-full">
                    <n-card title="快捷通道" class="shadow-sm border-none rounded-2xl">
                        <n-grid cols="2" x-gap="12" y-gap="12">
                            <n-grid-item>
                                <n-button block secondary type="primary" class="h-16 flex-col gap-1" @click="$router.push('/points')">
                                    <n-icon size="20"><LocationOutline /></n-icon>
                                    <span class="text-[12px]">新增点位</span>
                                </n-button>
                            </n-grid-item>
                            <n-grid-item>
                                <n-button block secondary type="info" class="h-16 flex-col gap-1" @click="$router.push('/employees')">
                                    <n-icon size="20"><PeopleOutline /></n-icon>
                                    <span class="text-[12px]">员工入职</span>
                                </n-button>
                            </n-grid-item>
                            <n-grid-item>
                                <n-button block secondary type="warning" class="h-16 flex-col gap-1" @click="$router.push('/records')">
                                    <n-icon size="20"><ListOutline /></n-icon>
                                    <span class="text-[12px]">审计记录</span>
                                </n-button>
                            </n-grid-item>
                            <n-grid-item>
                                <n-button block secondary type="error" class="h-16 flex-col gap-1">
                                    <n-icon size="20"><AlertCircleOutline /></n-icon>
                                    <span class="text-[12px]">考勤报表</span>
                                </n-button>
                            </n-grid-item>
                        </n-grid>
                    </n-card>

                    <n-card title="系统说明" class="shadow-sm border-none rounded-2xl flex-1">
                        <n-alert title="运行状态" type="success" :bordered="false"> Jnm 外勤打卡系统后端 API 与 MinIO 存储服务连接正常。目前支持高精度经纬度校验与水印照片中转预览。 </n-alert>
                    </n-card>
                </div>
            </n-grid-item>
        </n-grid>

        <n-card title="最新打卡实况" :segmented="{ content: true }" class="shadow-sm border-none rounded-2xl">
            <template #header-extra>
                <n-button quaternary size="small" type="primary" @click="$router.push('/records')">查看全部记录</n-button>
            </template>
            <n-scrollbar style="max-height: 260px">
                <n-timeline horizontal class="mt-4">
                    <n-timeline-item v-for="log in recentActivities" :key="log.id" type="success" :title="log.employee_name" :content="`于 ${log.point_title} 完成了打卡`" :time="formatTime(log.create_time)" />
                    <n-empty v-if="recentActivities.length === 0" description="暂无今日打卡实况" />
                </n-timeline>
            </n-scrollbar>
        </n-card>
    </div>
</template>

<script setup>
import { ref, onMounted, shallowRef, markRaw } from 'vue'
import { PeopleOutline, LocationOutline, CameraOutline, PulseOutline, ListOutline, AlertCircleOutline } from '@vicons/ionicons5'
import * as echarts from 'echarts'
import request from '@/utils/request'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 💡 配置 dayjs 插件
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const trendChartRef = ref(null)
const chartInstance = shallowRef(null)
const recentActivities = ref([])

// 💡 统计卡片配置（对应后端 /dashboard/stats 接口返回的 key）
const statCards = ref([
    { key: 'total_employees', label: '在职总人数', value: 0, unit: '人', icon: markRaw(PeopleOutline), color: '#2979ff', bgColor: '#eef4ff' },
    { key: 'total_points', label: '管理点位', value: 0, unit: '个', icon: markRaw(LocationOutline), color: '#19be6b', bgColor: '#eafff3' },
    { key: 'today_checkin_count', label: '今日打卡人数', value: 0, unit: '人', icon: markRaw(CameraOutline), color: '#ff9900', bgColor: '#fff7e6' },
    { key: 'online_employee_count', label: '当前在线', value: 0, unit: '人', icon: markRaw(PulseOutline), color: '#ed4014', bgColor: '#fff1f0' }
])

// 初始化图表
const initChart = data => {
    if (!trendChartRef.value) return
    chartInstance.value = echarts.init(trendChartRef.value)
    const option = {
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 8 },
        grid: { left: '2%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(i => i.date),
            axisLine: { lineStyle: { color: '#e0e0e0' } }
        },
        yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } } },
        series: [
            {
                name: '打卡次数',
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 8,
                data: data.map(i => i.count),
                itemStyle: { color: '#2979ff' },
                lineStyle: { width: 4 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(41, 121, 255, 0.4)' },
                        { offset: 1, color: 'rgba(41, 121, 255, 0)' }
                    ])
                }
            }
        ]
    }
    chartInstance.value.setOption(option)
}

const fetchData = async () => {
    try {
        // 1. 获取核心统计数据 (路径不包含 /api/v1，已在 request.js 封装)
        const stats = await request.get('/dashboard/stats')
        statCards.value.forEach(card => {
            if (stats[card.key] !== undefined) {
                card.value = stats[card.key]
            }
        })

        // 2. 获取趋势数据
        const trends = await request.get('/dashboard/trends')
        initChart(trends)

        // 3. 获取最近 8 条动态 (复用 checkin 审计接口)
        const recordsRes = await request.get('/checkin/all_records', { params: { limit: 8, skip: 0 } })
        recentActivities.value = recordsRes.items || []
    } catch (err) {
        console.error('看板数据加载失败', err)
    }
}

const formatTime = t => dayjs(t).fromNow()

onMounted(() => {
    fetchData()
    window.addEventListener('resize', () => chartInstance.value?.resize())
})
</script>

<style scoped>
.n-card {
    animation: slideUp 0.6s ease-out forwards;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(24px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
