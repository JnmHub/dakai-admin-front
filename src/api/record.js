import request from '@/utils/request'

/**
 * 获取全量打卡记录 (支持筛选)
 */
export function getAllRecords(params) {
    return request({
        url: '/api/v1/checkin/all_records', // 对应后端即将实现的管理员接口
        method: 'get',
        params
    })
}
