import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
    presets: [
        presetUno(), // 必须：提供 Tailwind/Windi CSS 兼容的工具类
        presetAttributify(), // 可选：支持属性化模式 (如 <div border="1">)
        presetIcons() // 可选：支持图标
    ],
    shortcuts: {
        // 你可以在这里定义一些快捷类，比如居中布局
        'flex-center': 'flex items-center justify-center'
    }
})
