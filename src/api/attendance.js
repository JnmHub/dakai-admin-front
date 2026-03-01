// src/api/attendance.js
import request from '@/utils/request'

// 获取规则列表
export function getRules() {
    return request({
        url: '/attendance/rules',
        method: 'get'
    })
}

// 创建规则
export function createRule(data) {
    return request({
        url: '/attendance/rules',
        method: 'post',
        data
    })
}

// 删除规则
export function deleteRule(id) {
    return request({
        url: `/attendance/rules/${id}`,
        method: 'delete'
    })
}

export function getCalendar(params) {
    return request({
        url: '/attendance/calendar',
        method: 'get',
        params // { year, month, employee_id, point_id }
    })
}

// 获取月度统计 (增加了 point_id)
export function getStats(params) {
    return request({
        url: '/attendance/stats',
        method: 'get',
        params // { year, month, employee_id, point_id }
    })
}

// 🔥 新增：每日团队报表
export function getDailyReport(params) {
    return request({
        url: '/attendance/daily_report',
        method: 'get',
        params // { date_str, point_id }
    })
}
