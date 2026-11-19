<template>
  <div class="header">
    <div class="logo-box">
      <el-icon class="logo-icon"><Platform /></el-icon>
      <span class="logo-text">夜婷护记后台管理系统</span>
    </div>

    <!-- 超级管理员：租户切换视窗 -->
    <div class="tenant-selector" v-if="userRole === 'SUPER_ADMIN'">
      <span class="label">🏢 当前医院视窗：</span>
      <el-select
        v-model="activeHospital"
        placeholder="全部医院总览"
        clearable
        @change="handleHospitalChange"
        style="width: 260px"
      >
        <el-option :value="0" label="全平台视图（聚合所有医院）" />
        <el-option
          v-for="item in tenantStore.hospitalList"
          :key="item.id"
          :label="item.hospitalName"
          :value="item.id"
        />
      </el-select>
    </div>

    <!-- 护士/护士长或医院管理员：展示当前所属医院及所在病区（图1） -->
    <div class="tenant-tag" v-else>
      <span class="label" style="color: #9ca3af; font-size: 14px; margin-right: 8px;">🏢 当前医院视窗：</span>
      <el-tag type="primary" size="large" effect="dark" style="font-size: 14px; font-weight: 600;">
        {{ currentHospitalName || '第一人民医院（示范本部）' }}
      </el-tag>
      <el-tag v-if="currentWardName" type="success" size="large" effect="plain" style="margin-left: 8px; font-weight: 500;">
        🛏️ {{ currentWardName }}
      </el-tag>
    </div>

    <div class="header-right">
      <el-tag :type="userRole === 'SUPER_ADMIN' ? 'danger' : 'info'" size="default">
        {{ userRoleText }}
      </el-tag>
      <span class="user-name">{{ realName }}</span>
      <el-button
        link
        type="primary"
        @click="handleOpenPwdDialog"
        v-if="userRole === 'SUPER_ADMIN' || userRole === 'HOSPITAL_ADMIN'"
      >
        <el-icon><Key /></el-icon> 修改密码
      </el-button>
      <el-button link type="danger" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon> 退出
      </el-button>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="pwdDialogVisible"
      title="修改个人登录密码"
      width="440px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="90px">
        <el-form-item label="登录账号">
          <el-input :value="username" disabled />
        </el-form-item>
        <el-form-item label="原密码" prop="oldPassword">
          <el-input
            v-model="pwdForm.oldPassword"
            type="password"
            placeholder="请输入当前原密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="pwdForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="pwdDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmitPwd">确认修改</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Platform, SwitchButton, Key } from '@element-plus/icons-vue';
import { ElMessageBox, FormInstance } from 'element-plus';
import request from '../utils/request';
import { useTenantStore } from '../store/tenant';

const router = useRouter();
const tenantStore = useTenantStore();

const userRole = ref(localStorage.getItem('admin_role') || '');
const realName = ref(localStorage.getItem('admin_real_name') || '管理员');
const username = ref(localStorage.getItem('admin_username') || '');
const currentHospitalName = ref(localStorage.getItem('admin_hospital_name') || '');
const currentWardName = ref(localStorage.getItem('admin_ward_name') || '');
const activeHospital = ref(tenantStore.currentHospitalId || 0);

const pwdDialogVisible = ref(false);
const submitLoading = ref(false);
const pwdFormRef = ref<FormInstance>();
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const validateConfirmPassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请再次输入新密码'));
  } else if (value !== pwdForm.newPassword) {
    callback(new Error('两次输入的新密码不一致'));
  } else {
    callback();
  }
};

const validateNewPassword = (_rule: any, value: string, callback: any) => {
  if (!value) {
    callback(new Error('请输入新密码'));
  } else if (value.length < 6) {
    callback(new Error('新密码长度不能少于6位'));
  } else if (value === pwdForm.oldPassword) {
    callback(new Error('新密码不能与原密码相同'));
  } else {
    if (pwdForm.confirmPassword) {
      pwdFormRef.value?.validateField('confirmPassword');
    }
    callback();
  }
};

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [{ required: true, validator: validateNewPassword, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validateConfirmPassword, trigger: 'blur' }]
};

const handleOpenPwdDialog = () => {
  pwdForm.oldPassword = '';
  pwdForm.newPassword = '';
  pwdForm.confirmPassword = '';
  pwdDialogVisible.value = true;
};

const handleSubmitPwd = () => {
  pwdFormRef.value?.validate(async (valid: boolean) => {
    if (!valid) return;
    submitLoading.value = true;
    try {
      await request.post('/admin/auth/update-password', {
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword
      });
      pwdDialogVisible.value = false;
      ElMessageBox.alert('密码修改成功，请使用新密码重新登录！', '提示', {
        confirmButtonText: '确定',
        type: 'success',
        callback: () => {
          handleLogout();
        }
      });
    } catch (e: any) {
      console.error(e);
    } finally {
      submitLoading.value = false;
    }
  });
};

const userRoleText = computed(() => {
  if (userRole.value === 'SUPER_ADMIN') return '平台超级管理员';
  if (userRole.value === 'HEAD_NURSE') return '护士长';
  if (userRole.value === 'NURSE') return '责任护士';
  return '医院管理员';
});

onMounted(() => {
  if (userRole.value === 'SUPER_ADMIN') {
    tenantStore.fetchHospitalList();
  }
});

const handleHospitalChange = (val: number) => {
  tenantStore.setHospitalId(val || 0);
};

const handleLogout = () => {
  localStorage.clear();
  router.push('/login');
};
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  background-color: #242f42;
  color: #fff;
  padding: 0 24px;
}
.logo-box {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-icon {
  font-size: 22px;
  color: #409eff;
}
.logo-text {
  font-size: 16px;
  font-weight: 600;
}
.tenant-selector .label {
  margin-right: 8px;
  font-size: 14px;
  color: #e4e7ed;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user-name {
  font-size: 14px;
  color: #fff;
}
</style>
