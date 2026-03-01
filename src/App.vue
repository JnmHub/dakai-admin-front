<template>
    <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
        <n-message-provider>
            <n-dialog-provider>
                <n-notification-provider>
                    <router-view />
                </n-notification-provider>
            </n-dialog-provider>
        </n-message-provider>
    </n-config-provider>
</template>

<script setup>
import { zhCN, dateZhCN } from 'naive-ui'
// 这里不需要写逻辑
</script>

<style>
/* 全局样式可以写在这里 */
body {
    margin: 0;
    background-color: #f9fafb !important;
}
</style>
