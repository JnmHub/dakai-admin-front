import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite' // 导入 UnoCSS 插件
import path from 'path'

export default defineConfig({
    plugins: [
        vue(),
        UnoCSS() // 在这里启用 UnoCSS
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    // 后端接口代理配置（顺便配好，方便对接你的 FastAPI）
    server: {
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true
            }
        }
    }
})
