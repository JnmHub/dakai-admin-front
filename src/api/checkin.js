import request from '@/utils/request'

// ... 其他接口 ...

// 获取轨迹数据
export function getTrajectory(params) {
    return request({
        url: '/checkin/trajectory',
        method: 'get',
        params // { employee_id, start_date, end_date }
    })
}
