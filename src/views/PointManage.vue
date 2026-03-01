<template>
    <div class="relative w-full border border-gray-200 shadow-sm rounded-xl overflow-hidden" style="height: calc(100vh - 120px)">
        <div class="absolute left-4 top-4 z-10 flex flex-col gap-2 w-85 transition-all duration-300">
            <n-card size="small" class="shadow-md opacity-95">
                <n-input-group>
                    <n-input v-model:value="locationSearchQuery" placeholder="定位地址、大厦..." clearable id="tipinput" @keyup.enter="handlePlaceSearch" />
                    <n-button type="primary" @click="handlePlaceSearch">搜索</n-button>
                </n-input-group>
            </n-card>

            <n-card size="small" class="shadow-md opacity-95 overflow-hidden flex flex-col" :segmented="{ content: true }">
                <template #header>
                    <div class="flex justify-between items-center w-full cursor-pointer" @click="showPointList = !showPointList">
                        <span class="text-xs font-bold flex items-center gap-2">
                            <n-icon><LocationOutline /></n-icon>
                            打卡点列表 ({{ allPoints.length }})
                        </span>
                        <n-button quaternary circle size="tiny">
                            <template #icon>
                                <n-icon :class="{ 'rotate-180': !showPointList }" class="transition-transform">
                                    <ChevronUpOutline />
                                </n-icon>
                            </template>
                        </n-button>
                    </div>
                </template>

                <div v-show="showPointList" class="flex flex-col gap-2 pt-2">
                    <n-input v-model:value="pointSearchQuery" placeholder="搜索已存点位名称..." size="small" clearable>
                        <template #prefix>
                            <n-icon><SearchOutline /></n-icon>
                        </template>
                    </n-input>

                    <n-scrollbar style="max-height: 350px">
                        <n-list hoverable clickable size="small">
                            <n-list-item v-for="point in filteredPoints" :key="point.id" @click="jumpToPoint(point)">
                                <div class="flex flex-col gap-1">
                                    <div class="text-xs font-bold text-gray-700 truncate">{{ point.title }}</div>
                                    <div class="text-[10px] text-gray-400 truncate">{{ point.address }}</div>
                                    <div v-if="point.rule_name" class="flex">
                                        <n-tag type="success" size="tiny" :bordered="false" round>
                                            {{ point.rule_name }}
                                        </n-tag>
                                    </div>
                                </div>
                                <template #suffix>
                                    <n-tag :bordered="false" type="info" size="tiny" round> {{ point.employee_ids?.length || 0 }}人 </n-tag>
                                </template>
                            </n-list-item>
                            <n-empty v-if="filteredPoints.length === 0" size="small" description="无匹配点位" class="py-4" />
                        </n-list>
                    </n-scrollbar>
                </div>
            </n-card>

            <div class="text-[10px] text-gray-400 px-2 flex items-center gap-1"><span class="text-blue-500 font-bold">提示:</span> 右键地图位置新增，左键图标编辑</div>
        </div>

        <div id="point-map-container" class="w-full h-full bg-gray-100"></div>

        <n-modal v-model:show="showModal" preset="card" :title="isEdit ? '编辑打卡点' : '新增打卡点'" class="w-240">
            <div class="flex gap-8 h-120">
                <div class="w-1/3 border-r pr-8 flex flex-col justify-between">
                    <n-form :model="formModel" label-placement="top">
                        <n-form-item label="点位名称">
                            <n-input v-model:value="formModel.title" placeholder="如：研发中心正门" />
                        </n-form-item>
                        <n-form-item label="详细地址">
                            <n-input v-model:value="formModel.address" readonly />
                        </n-form-item>
                        <n-form-item label="允许打卡半径 (米)">
                            <n-input-number v-model:value="formModel.radius" :step="50" :min="100" :max="2000" class="w-full" />
                        </n-form-item>

                        <n-form-item label="关联考勤规则">
                            <n-select v-model:value="formModel.rule_id" :options="ruleOptions" placeholder="选择考勤班次（可不选）" clearable />
                        </n-form-item>
                    </n-form>

                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div class="text-[11px] text-gray-400 flex justify-between">
                            <span>经度: {{ Number(formModel.longitude || 0).toFixed(6) }}</span>
                            <span>纬度: {{ Number(formModel.latitude || 0).toFixed(6) }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex-1">
                    <EmployeePicker v-model:modelValue="formModel.employee_ids" :employees="allEmployees" />
                </div>
            </div>

            <template #footer>
                <div class="flex justify-between w-full">
                    <n-button v-if="isEdit" type="error" ghost @click="handleDelete">删除此点</n-button>
                    <div v-else></div>
                    <n-space>
                        <n-button @click="showModal = false">取消</n-button>
                        <n-button type="primary" :loading="loading" @click="handleSave">确认保存配置</n-button>
                    </n-space>
                </div>
            </template>
        </n-modal>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted, shallowRef, computed } from 'vue'
import { useMessage, NIcon } from 'naive-ui'
import { LocationOutline, ChevronUpOutline, SearchOutline } from '@vicons/ionicons5'
import AMapLoader from '@amap/amap-jsapi-loader'
import EmployeePicker from '@/components/EmployeePicker.vue'
import { getPoints, createPoint, deletePoint, updatePoint } from '@/api/point'
import { getEmployees } from '@/api/employee'
import { getRules } from '@/api/attendance' // ✅ 1. 引入规则接口

const message = useMessage()
const showModal = ref(false)
const isEdit = ref(false)
const loading = ref(false)
const showPointList = ref(true)
const locationSearchQuery = ref('')
const pointSearchQuery = ref('')

const mapInstance = shallowRef(null)
const allEmployees = ref([])
const allPoints = ref([])
const ruleOptions = ref([]) // ✅ 2. 存储规则下拉选项

let geocoder = null
let contextMenu = null
let placeSearch = null
let markers = []

const formModel = reactive({
    id: null,
    title: '',
    address: '',
    latitude: 0,
    longitude: 0,
    radius: 500,
    employee_ids: [],
    rule_id: null // ✅ 3. 新增 rule_id 字段
})

// 计算属性：过滤点位
const filteredPoints = computed(() => {
    if (!pointSearchQuery.value) return allPoints.value
    const kw = pointSearchQuery.value.toLowerCase()
    return allPoints.value.filter(p => p.title.toLowerCase().includes(kw) || p.address.toLowerCase().includes(kw))
})

// ✅ 4. 加载规则列表
const loadRules = async () => {
    try {
        const res = await getRules()
        // 转换成 Naive UI Select 格式
        ruleOptions.value = res.map(item => ({
            label: item.name,
            value: item.id
        }))
    } catch (e) {
        console.error('加载规则失败', e)
    }
}

const jumpToPoint = point => {
    if (mapInstance.value) {
        mapInstance.value.setZoomAndCenter(17, [point.longitude, point.latitude])
        openEditMode(point)
    }
}

const initMap = async () => {
    window._AMapSecurityConfig = { securityJsCode: '1a167ea6fbd13fff6544a2b5d166da61' }

    try {
        const AMap = await AMapLoader.load({
            key: 'a7592aff08b9b33eea542cf176ae4133',
            version: '2.0',
            plugins: ['AMap.Geocoder', 'AMap.ContextMenu', 'AMap.AutoComplete', 'AMap.PlaceSearch']
        })

        mapInstance.value = new AMap.Map('point-map-container', {
            zoom: 5,
            center: [104.19, 35.86],
            viewMode: '3D'
        })

        geocoder = new AMap.Geocoder()

        const autoComplete = new AMap.AutoComplete({ input: 'tipinput' })
        placeSearch = new AMap.PlaceSearch({ city: '全国' })
        autoComplete.on('select', e => {
            if (e.poi?.location) {
                mapInstance.value.setZoomAndCenter(16, e.poi.location)
                locationSearchQuery.value = e.poi.name
            }
        })

        contextMenu = new AMap.ContextMenu()
        let tempLngLat = null
        mapInstance.value.on('rightclick', e => {
            tempLngLat = e.lnglat
            // @ts-ignore
            contextMenu.open(mapInstance.value, e.lnglat)
        })
        contextMenu.addItem('📍 在此新增打卡点', () => openAddMode(tempLngLat.getLng(), tempLngLat.getLat()), 0)

        await fetchAndMarkPoints()
        await fetchAllEmployees()
    } catch (e) {
        console.error('地图加载失败:', e)
    }
}

const fetchAndMarkPoints = async () => {
    const res = await getPoints()
    allPoints.value = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []

    // 清除旧标记
    markers.forEach(m => m.setMap(null))
    markers = []

    allPoints.value.forEach(point => {
        const lng = parseFloat(point.longitude)
        const lat = parseFloat(point.latitude)
        if (isNaN(lng) || isNaN(lat)) return

        // 绘制标记
        const marker = new window.AMap.Marker({
            position: [lng, lat],
            map: mapInstance.value,
            label: {
                content: `<div class="bg-blue-600 text-white px-2 py-0.5 rounded shadow text-[10px]">${point.title}</div>`,
                direction: 'top'
            }
        })
        marker.on('click', () => openEditMode(point))
        markers.push(marker)
    })
}

const fetchAllEmployees = async () => {
    // 获取所有员工用于选择
    const res = await getEmployees({ skip: 0, limit: 1000 })
    allEmployees.value = res.data?.items || res.items || []
}

const handlePlaceSearch = () => {
    if (!locationSearchQuery.value || !placeSearch) return
    placeSearch.search(locationSearchQuery.value, (status, result) => {
        if (status === 'complete' && result?.poiList?.pois?.length > 0) {
            const poi = result.poiList.pois[0]
            mapInstance.value.setZoomAndCenter(16, [poi.location.lng, poi.location.lat])
        }
    })
}

const openAddMode = (lng, lat) => {
    isEdit.value = false
    // 重置表单
    Object.assign(formModel, {
        id: null,
        title: '',
        address: '解析中...',
        latitude: lat,
        longitude: lng,
        radius: 500,
        employee_ids: [],
        rule_id: null // ✅ 重置
    })
    showModal.value = true

    // 逆地理编码
    geocoder.getAddress([lng, lat], (status, result) => {
        if (status === 'complete' && result.regeocode) {
            formModel.address = result.regeocode.formattedAddress
            formModel.title = result.regeocode.addressComponent.district + '打卡点'
        }
    })
}

const openEditMode = point => {
    isEdit.value = true
    Object.assign(formModel, {
        ...point,
        longitude: Number(point.longitude),
        latitude: Number(point.latitude),
        employee_ids: point.employee_ids ? point.employee_ids : point.employees ? point.employees.map(e => e.id) : [],
        rule_id: point.rule_id || null // ✅ 回显规则ID
    })
    showModal.value = true
}

const handleSave = async () => {
    if (!formModel.title) return message.error('请输入点位标题')
    loading.value = true
    try {
        // 构造提交数据
        const payload = { ...formModel }

        if (formModel.id) {
            await updatePoint(formModel.id, payload)
            message.success('更新成功')
        } else {
            await createPoint(payload)
            message.success('创建成功')
        }
        showModal.value = false
        await fetchAndMarkPoints()
    } catch (err) {
        console.error('保存失败:', err)
        // message.error 由 request.js 统一处理，这里可以不写
    } finally {
        loading.value = false
    }
}

const handleDelete = async () => {
    try {
        await deletePoint(formModel.id)
        message.success('已删除')
        showModal.value = false
        await fetchAndMarkPoints()
    } catch (e) {
        console.error(e)
    }
}

onMounted(() => {
    initMap()
    loadRules() // ✅ 同时加载规则
})
</script>

<style scoped>
.amap-logo,
.amap-copyright {
    display: none !important;
}
:deep(.amap-sug-result) {
    z-index: 9999 !important;
}
:deep(.amap-menu) {
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    border: none;
}
:deep(.amap-menu-item) {
    padding: 12px 24px;
}
.rotate-180 {
    transform: rotate(180deg);
}
</style>
