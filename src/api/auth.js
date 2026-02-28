import request from '@/utils/request'

/**
 * 管理员登录
 */
export function loginAdmin(username, password) {
    return request({
        url: '/auth/admin_login',
        method: 'post',
        data: { username, password }
    })
}

/**
 * 修改当前管理员密码
 */
export function changePassword(old_password, new_password) {
    return request({
        url: '/auth/change_password',
        method: 'post',
        data: { old_password, new_password }
    })
}

/**
 * 退出登录（可选：调用后端删除缓存接口）
 */
export function logout() {
    // 通常前端直接清空本地 token 即可
    localStorage.removeItem('access_token')
}
