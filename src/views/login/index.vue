<template>
  <div class="login-wrap">
    <div class="ms-login">
      <div class="ms-title">病患出入量记录多租户管理后台</div>
      <el-form :model="param" :rules="rules" ref="loginForm" label-width="0px" class="ms-content">
        <el-form-item prop="username">
          <el-input v-model="param.username" placeholder="请输入管理员账号" size="large">
            <template #prepend>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            type="password"
            placeholder="请输入密码"
            v-model="param.password"
            size="large"
            @keyup.enter="submitForm"
            show-password
          >
            <template #prepend>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="preset-box">
          <span class="preset-tip">快捷测试账号：</span>
          <el-button link type="primary" size="small" @click="fill('admin')">超级管理员</el-button>
          <el-button link type="success" size="small" @click="fill('hosp1')">一院管理员</el-button>
          <el-button link type="danger" size="small" @click="fill('nurse_head')">张洁护士长</el-button>
          <el-button link type="primary" size="small" @click="fill('nurse_duty')">李丽护士</el-button>
        </div>

        <div class="login-btn">
          <el-button type="primary" size="large" :loading="loading" @click="submitForm" style="width:100%">
            安全登录
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import request from '../../utils/request';

const router = useRouter();
const loginForm = ref();
const loading = ref(false);

const param = reactive({
  username: 'admin',
  password: ''
});

const rules = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const fill = (type: string) => {
  if (type === 'admin') {
    param.username = 'admin';
    param.password = '123456';
  } else if (type === 'hosp1') {
    param.username = 'hosp1_admin';
    param.password = '123456';
  } else if (type === 'nurse_head') {
    param.username = '100001';
    param.password = '123456';
  } else if (type === 'nurse_duty') {
    param.username = '100002';
    param.password = '123456';
  } else {
    param.username = 'hosp2_admin';
    param.password = '123456';
  }
};

const submitForm = () => {
  loginForm.value.validate(async (valid: boolean) => {
    if (!valid) return;
    loading.value = true;
    try {
      const res = (await request.post('/admin/auth/login', param)) as any;
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_role', res.role);
      localStorage.setItem('admin_real_name', res.realName);
      localStorage.setItem('admin_username', res.username);
      localStorage.setItem('admin_hospital_id', res.hospitalId || '0');
      localStorage.setItem('admin_hospital_name', res.hospitalName || '');
      localStorage.setItem('admin_ward_id', res.wardId ? String(res.wardId) : '');
      localStorage.setItem('admin_ward_name', res.wardName || '');
      localStorage.setItem('admin_building', res.building || res.department || '');

      // 护士或医院管理员登录：默认选中其所属医院（满足图1需求）
      if (res.hospitalId) {
        localStorage.setItem('active_hospital_id', String(res.hospitalId));
      } else if (res.role === 'SUPER_ADMIN') {
        localStorage.setItem('active_hospital_id', '0');
      }

      ElMessage.success(`欢迎您，${res.realName}`);
      router.push('/dashboard');
    } catch (e: any) {
      console.error(e);
    } finally {
      loading.value = false;
    }
  });
};
</script>

<style scoped>
.login-wrap {
  position: relative;
  width: 100%;
  height: 100vh;
  background-image: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  display: flex;
  justify-content: center;
  align-items: center;
}
.ms-title {
  width: 100%;
  line-height: 50px;
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  border-bottom: 1px solid #e5e7eb;
}
.ms-login {
  width: 400px;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
.ms-content {
  padding: 30px 30px;
}
.preset-box {
  margin-bottom: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.preset-tip {
  color: #6b7280;
}
.login-btn {
  margin-top: 10px;
}
</style>
