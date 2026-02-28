import { createRouter, createWebHistory } from 'vue-router'

// 1. 定义路由表
const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/Login.vue'),
        meta: { title: '管理员登录', public: true }
    },
    {
        path: '/',
        redirect: '/dashboard',
        component: () => import('@/layout/MainLayout.vue'), // 稍后我们会写这个布局组件
        children: [
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('@/views/Dashboard.vue'),
                meta: { title: '工作台' }
            },
            {
                path: 'employees',
                name: 'EmployeeManage',
                component: () => import('@/views/EmployeeManage.vue'),
                meta: { title: '员工管理' }
            },
            {
                path: 'points',
                name: 'PointManage',
                component: () => import('@/views/PointManage.vue'),
                meta: { title: '打卡点管理' }
            },
            {
                path: 'records',
                name: 'RecordAudit',
                component: () => import('@/views/RecordAudit.vue'),
                meta: { title: '全量记录审计' }
            },
            {
                path: 'admin/manage',
                name: 'AdminManage',
                component: () => import('@/views/AdminManage.vue'),
                meta: { title: '管理员设置' }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 2. 路由守卫：核心安保逻辑
router.beforeEach((to, from, next) => {
    // 设置页面标题
    document.title = to.meta.title ? `${to.meta.title} - 外勤管理系统` : '外勤管理系统'

    // 从本地获取 token
    const token = localStorage.getItem('access_token')

    // 如果访问的不是公开页面（如登录页）且没有 token，则跳转到登录
    if (!to.meta.public && !token) {
        next({ name: 'Login' })
    } else if (to.name === 'Login' && token) {
        // 如果已经登录了还想去登录页，直接拉回首页
        next({ name: 'Dashboard' })
    } else {
        next()
    }
})

export default router
