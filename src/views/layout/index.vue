<template>
  <div class="layout-wrapper">
    <Header />
    <Sidebar />
    <div class="content-box">
      <div class="content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '../../components/Header.vue';
import Sidebar from '../../components/Sidebar.vue';
</script>

<style scoped>
.layout-wrapper {
  position: relative;
  height: 100%;
  overflow: hidden;
}
.content-box {
  position: absolute;
  left: 220px;
  right: 0;
  top: 60px;
  bottom: 0;
  padding: 16px;
  overflow-y: auto;
  background-color: #f0f2f5;
}
.content {
  width: 100%;
  height: 100%;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
