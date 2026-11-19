<template>
  <div class="sidebar">
    <el-menu
      class="sidebar-el-menu"
      :default-active="activeRoute"
      background-color="#324157"
      text-color="#bfcbd9"
      active-text-color="#20a0ff"
      router
    >
      <el-menu-item index="/dashboard">
        <el-icon><DataAnalysis /></el-icon>
        <span>数据概览看板</span>
      </el-menu-item>

      <!-- 护士长每日夜查房登记表 -->
      <el-menu-item index="/rounds">
        <el-icon><Tickets /></el-icon>
        <span>夜查房登记 (交接班)</span>
      </el-menu-item>

      <!-- 仅平台超级管理员可见 -->
      <el-menu-item index="/hospital" v-if="userRole === 'SUPER_ADMIN'">
        <el-icon><OfficeBuilding /></el-icon>
        <span>医院管理 (租户)</span>
      </el-menu-item>

      <el-menu-item index="/department">
        <el-icon><Grid /></el-icon>
        <span>楼宇与病区管理</span>
      </el-menu-item>

      <el-menu-item index="/bed">
        <el-icon><Compass /></el-icon>
        <span>床位管理</span>
      </el-menu-item>

      <el-menu-item index="/nurse">
        <el-icon><User /></el-icon>
        <span>护士长/护士档案</span>
      </el-menu-item>

      <el-menu-item index="/patient">
        <el-icon><UserFilled /></el-icon>
        <span>病患档案管理</span>
      </el-menu-item>

      <el-menu-item index="/assignment">
        <el-icon><Connection /></el-icon>
        <span>责任护士-床位分配</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import {
  DataAnalysis,
  Tickets,
  OfficeBuilding,
  Grid,
  Compass,
  User,
  UserFilled,
  Connection
} from '@element-plus/icons-vue';

const route = useRoute();
const activeRoute = computed(() => route.path);
const userRole = ref(localStorage.getItem('admin_role') || '');
</script>

<style scoped>
.sidebar {
  display: block;
  position: absolute;
  left: 0;
  top: 60px;
  bottom: 0;
  overflow-y: scroll;
  width: 220px;
  background-color: #324157;
}
.sidebar::-webkit-scrollbar {
  width: 0;
}
.sidebar-el-menu {
  border-right: none;
}
</style>
