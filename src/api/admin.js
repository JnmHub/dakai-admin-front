import request from '@/utils/request'

// 获取列表 (支持搜索和分页)
export function getAdmins(params) {
    return request({ url: '/admin/manage/', method: 'get', params })
}

// 创建管理员
export function createAdmin(data) {
    return request({ url: '/admin/manage/', method: 'post', data })
}

// 更新信息 (修改用户名等)
export function updateAdmin(id, data) {
    return request({ url: `/admin/manage/${id}`, method: 'put', data })
}

// 修改密码 (后端要求 embed=True，所以传对象)
export function changeAdminPassword(id, password) {
    return request({
        url: `/admin/manage/${id}/password`,
        method: 'post',
        data: { new_password: password }
    })
}

// 删除管理员
export function deleteAdmin(id) {
    return request({ url: `/admin/manage/${id}`, method: 'delete' })
}

export function changeAdminPasswordMyself(oldPassword, newPassword) {
    return request({
        url: `/admin/manage/password_myself`,
        method: 'post',
        data: {
            old_password: oldPassword,
            new_password: newPassword
        }
    })
}
