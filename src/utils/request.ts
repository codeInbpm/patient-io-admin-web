import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';

const service = axios.create({
  baseURL: '/api/v1',
  timeout: 10000
});

// 请求拦截器：注入 Token 和 当前选中的租户医院ID
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // 超级管理员当前选择的医院 ID（0 代表查看全网，非0代表切换为该医院上下文）
    const activeHospitalId = localStorage.getItem('active_hospital_id');
    if (activeHospitalId && activeHospitalId !== '0') {
      config.headers['X-Hospital-Id'] = activeHospitalId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 如果是文件流响应，直接返回
    if (response.config.responseType === 'blob' || response.data instanceof Blob) {
      return response.data;
    }
    const res = response.data;
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求处理异常');
      return Promise.reject(new Error(res.message || 'Error'));
    }
    return res.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      ElMessage.error('登录凭证已失效，请重新登录');
      localStorage.clear();
      router.push('/login');
    } else {
      ElMessage.error(error.response?.data?.message || error.message || '网络连接超时');
    }
    return Promise.reject(error);
  }
);

export default service;
