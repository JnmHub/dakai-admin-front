import axios from 'axios'
import { createDiscreteApi } from 'naive-ui'

// 使用 Naive UI 的脱离上下文 API 来显示通知
const { message } = createDiscreteApi(['message'])
export const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'
// 1. 创建实例
const service = axios.create({
    // 根据你的后端配置
    baseURL,
    timeout: 10000
})

// 2. 请求拦截器：把 Token 塞进 Header
service.interceptors.request.use(
    config => {
        // 从 localStorage 获取 token
        const token = localStorage.getItem('access_token')
        if (token) {
            // 必须与后端 deps.py 里的 Header 定义一致
            config.headers['token'] = token
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 3. 响应拦截器：统一解析 Result 格式
service.interceptors.response.use(
    response => {
        const res = response.data

        // 如果 code 不是 200，说明是业务逻辑错误
        if (res.code !== 200) {
            message.error(res.msg || 'Error')

            // 处理 401：凭证失效或被禁用，强制跳回登录页
            if (res.code === 401 || res.code === 403) {
                localStorage.removeItem('access_token')
                // 如果当前不是登录页，则跳转
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login'
                }
            }
            return Promise.reject(new Error(res.msg || 'Error'))
        }

        // 业务成功，直接返回 data 部分，页面调用时就不需要 res.data.data 了
        return res.data
    },
    error => {
        // 处理 HTTP 状态码错误（如 500 崩溃）
        const msg = error.response?.data?.msg || '服务器连接失败'
        message.error(msg)
        return Promise.reject(error)
    }
)

export default service
