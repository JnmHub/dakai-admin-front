import { createApp } from 'vue'
import naive from 'naive-ui' // 导入整个 naive-ui
import App from './App.vue'
import router from './router'
import 'virtual:uno.css'

const app = createApp(App)

app.use(naive) // 全局注册所有 Naive UI 组件
app.use(router)
app.mount('#app')
