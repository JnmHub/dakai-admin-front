<template>
    <div class="h-full flex flex-col relative bg-gray-100 rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <div id="trajectory-container" class="w-full h-full"></div>

        <div v-if="loading" class="absolute inset-0 bg-white/50 z-50 flex items-center justify-center">
            <n-spin size="large" description="正在加载轨迹..." />
        </div>

        <div class="absolute top-4 right-4 bg-white/90 p-3 rounded shadow text-xs z-10">
            <div class="font-bold mb-2">图例说明</div>
            <div class="flex items-center gap-2 mb-1"><span class="w-3 h-3 rounded-full bg-green-500 block"></span> 起点</div>
            <div class="flex items-center gap-2 mb-1"><span class="w-3 h-3 rounded-full bg-blue-500 block"></span> 途经点</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-red-500 block"></span> 终点</div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMessage, NSpin } from 'naive-ui'
import AMapLoader from '@amap/amap-jsapi-loader'
import { getTrajectory } from '@/api/checkin'
import { baseURL } from '@/utils/request'

// 接收父组件传入的参数
const props = defineProps({
    employeeId: { type: Number, required: true },
    dateRange: { type: Array, required: true } // [startTime, endTime]
})

// 高德 Key 配置
const AMAP_KEY = 'a7592aff08b9b33eea542cf176ae4133'
const AMAP_SECURITY_CODE = '1a167ea6fbd13fff6544a2b5d166da61'

const message = useMessage()
const loading = ref(false)

// 地图变量
let map = null
let AMapObj = null
let markers = []
let polyline = null
let infoWindow = null

// 初始化
onMounted(() => {
    initMap()
})

onUnmounted(() => {
    if (map) map.destroy()
})

// 监听参数变化，重新加载轨迹
watch(
    () => [props.employeeId, props.dateRange],
    () => {
        if (map && props.employeeId) {
            loadTrajectory()
        }
    },
    { deep: true }
)

const initMap = () => {
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE }

    AMapLoader.load({
        key: AMAP_KEY,
        version: '2.0',
        plugins: ['AMap.ToolBar', 'AMap.Scale']
    })
        .then(AMap => {
            AMapObj = AMap
            map = new AMap.Map('trajectory-container', {
                viewMode: '3D',
                zoom: 11,
                center: [116.397428, 39.90923]
            })
            map.addControl(new AMap.ToolBar())
            map.addControl(new AMap.Scale())

            infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) })

            // 地图加载完后，立即查询一次
            if (props.employeeId) {
                loadTrajectory()
            }
        })
        .catch(e => {
            console.error(e)
            message.error('地图加载失败')
        })
}

const loadTrajectory = async () => {
    if (!props.employeeId || !props.dateRange) return

    // 处理时间格式
    const d1 = new Date(props.dateRange[0]).toISOString().split('T')[0]
    const d2 = new Date(props.dateRange[1]).toISOString().split('T')[0]

    loading.value = true
    clearMap() // 清除旧轨迹

    try {
        const res = await getTrajectory({
            employee_id: props.employeeId,
            start_date: d1,
            end_date: d2
        })
        // 兼容数据结构
        const list = res.data?.items || res.items || res || []

        if (list.length === 0) {
            message.info('该时间段内无轨迹数据')
            return
        }

        drawMap(list)
        // message.success(`加载了 ${list.length} 个打卡点`)
    } catch (e) {
        console.error(e)
        message.error('轨迹获取失败')
    } finally {
        loading.value = false
    }
}

const clearMap = () => {
    if (!map) return
    map.remove(markers)
    if (polyline) map.remove(polyline)
    markers = []
    polyline = null
}

const drawMap = points => {
    if (!map || !AMapObj) return

    const path = []
    points.forEach((item, index) => {
        const position = [item.lon, item.lat]
        path.push(position)

        let iconContent = ''
        let bgColor = ''

        if (index === 0) {
            bgColor = '#52c41a'
            iconContent = '起'
        } else if (index === points.length - 1) {
            bgColor = '#f5222d'
            iconContent = '终'
        } else {
            bgColor = '#1890ff'
            iconContent = `${index + 1}`
        }

        const content = `
            <div style="background-color: ${bgColor}; width: 24px; height: 24px; border-radius: 50%; color: white; text-align: center; line-height: 24px; font-size: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
                ${iconContent}
            </div>
        `

        const marker = new AMapObj.Marker({
            position: position,
            content: content,
            offset: new AMapObj.Pixel(-12, -12),
            zIndex: 100 + index
        })

        const token = localStorage.getItem('access_token')
        marker.on('click', () => {
            const infoBody = `
                <div style="padding:4px; min-width: 200px;">
                    <div style="font-weight:bold; margin-bottom:4px;">${item.time}</div>
                    <div style="font-size:12px; color:#666; margin-bottom:8px;">${item.location}</div>
                    <div style="font-size:12px; color:#999; margin-bottom:4px;">点位：${item.point_name}</div>
                    ${item.photo ? `<img src="${baseURL}/checkin/view_photo?photo_path=${item.photo}&query_token=${token}" style="width:100%; height:120px; object-fit:cover; border-radius:4px;">` : ''}
                </div>
            `
            infoWindow.setContent(infoBody)
            infoWindow.open(map, position)
        })

        markers.push(marker)
    })

    map.add(markers)

    polyline = new AMapObj.Polyline({
        path: path,
        isOutline: true,
        outlineColor: '#ffeeff',
        borderWeight: 2,
        strokeColor: '#3366FF',
        strokeOpacity: 1,
        strokeWeight: 6,
        strokeStyle: 'solid',
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 50,
        showDir: true
    })
    map.add(polyline)
    map.setFitView()
}
</script>
