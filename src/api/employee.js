import request from '@/utils/request'

/**
 * 获取员工列表（支持搜索和分页）
 */
export function getEmployees(params) {
    return request({
        url: '/admin/employees/',
        method: 'get',
        params // 包含 name, account, skip, limit
    })
}

/**
 * 创建员工
 */
export function createEmployee(data) {
    return request({
        url: '/admin/employees/',
        method: 'post',
        data // 包含 name, account, password
    })
}

/**
 * 更新员工信息或状态
 */
export function updateEmployee(id, data) {
    return request({
        url: `/admin/employees/${id}`,
        method: 'put',
        data // 包含 name, is_active
    })
}

/**
 * 重置员工密码
 */
export function resetEmployeePassword(id, newPassword) {
    return request({
        url: `/admin/employees/${id}/reset_password`,
        method: 'post',
        data: { new_password: newPassword }
    })
}

/**
 * 删除员工
 */
export function deleteEmployee(id) {
    return request({
        url: `/admin/employees/${id}`,
        method: 'delete'
    })
}

export function unbindWechat(id) {
    return request({
        url: `/admin/employees/${id}/unbind_wechat`, // 注意：请根据您实际的路由前缀调整，这里假设是 /admin/employees
        method: 'patch'
    })
}
