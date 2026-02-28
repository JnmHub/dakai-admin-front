import request from '@/utils/request'

export function getPoints(keyword) {
    return request({ url: '/admin/points/', method: 'get', params: { keyword } })
}

export function createPoint(data) {
    return request({ url: '/admin/points/', method: 'post', data })
}

export function deletePoint(id) {
    return request({ url: `/admin/points/${id}`, method: 'delete' })
}

export function updatePoint(id, data) {
    return request({
        url: `/admin/points/${id}`,
        method: 'put', // 或者 patch，根据你后端定义的路由来
        data
    })
}
