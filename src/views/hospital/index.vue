<template>
  <div class="container">
    <div class="handle-box">
      <el-input v-model="query.keyword" placeholder="搜索医院名称/编码" class="handle-input" clearable />
      <el-button type="primary" icon="Search" @click="fetchData">查询</el-button>
      <el-button type="success" icon="Plus" @click="handleCreate">新增医院</el-button>
    </div>

    <el-table :data="tableData" border stripe class="table">
      <el-table-column prop="id" label="医院ID" width="90" align="center" />
      <el-table-column prop="hospitalName" label="医院名称" min-width="180" />
      <el-table-column prop="hospitalCode" label="唯一编码" width="140" />
      <el-table-column prop="contactPerson" label="联系人" width="110" />
      <el-table-column prop="contactPhone" label="联系电话" width="140" />
      <el-table-column prop="address" label="医院地址" min-width="180" show-overflow-tooltip />
      <el-table-column prop="status" label="运营状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '正常运营' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="管理操作" width="220" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑信息</el-button>
          <el-button link type="warning" @click="handleAssignAdmin(row)">开通管理员</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 医院新增/修改对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑医院信息' : '创建新医院租户'" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="医院全称" required>
          <el-input v-model="form.hospitalName" placeholder="如：北京协和医院" />
        </el-form-item>
        <el-form-item label="医院编码" required>
          <el-input v-model="form.hospitalCode" placeholder="如：BJ_XIEHE" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactPerson" placeholder="负责人姓名" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="手机或座机号码" />
        </el-form-item>
        <el-form-item label="医院地址">
          <el-input v-model="form.address" placeholder="详细地址" />
        </el-form-item>
        <el-form-item label="运营状态">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常运营</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 分配管理员账号对话框 -->
    <el-dialog v-model="adminDialogVisible" title="分配/重置医院管理员账号" width="480px">
      <el-alert
        title="医院管理员只能登录管理该医院本院的数据，无法跨医院访问。"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 16px;"
      />
      <el-form :model="adminForm" label-width="100px">
        <el-form-item label="管理员账号" required>
          <el-input v-model="adminForm.username" placeholder="如：xiehe_admin" />
        </el-form-item>
        <el-form-item label="管理员姓名" required>
          <el-input v-model="adminForm.realName" placeholder="如：张科长" />
        </el-form-item>
        <el-form-item label="登录密码">
          <el-input v-model="adminForm.password" placeholder="留空则保持原密码或默认123456" show-password />
        </el-form-item>
        <el-form-item label="联系手机">
          <el-input v-model="adminForm.phone" placeholder="手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adminDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAdminSubmit">确认开通</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../utils/request';

const tableData = ref([]);
const query = reactive({ keyword: '' });

const dialogVisible = ref(false);
const form = reactive({
  id: null,
  hospitalName: '',
  hospitalCode: '',
  contactPerson: '',
  contactPhone: '',
  address: '',
  status: 1
});

const adminDialogVisible = ref(false);
const selectedHospitalId = ref<number | null>(null);
const adminForm = reactive({ username: '', realName: '', password: '', phone: '' });

const fetchData = async () => {
  const res = (await request.get('/admin/hospitals', { params: query })) as any;
  tableData.value = res;
};

const handleCreate = () => {
  Object.assign(form, {
    id: null,
    hospitalName: '',
    hospitalCode: '',
    contactPerson: '',
    contactPhone: '',
    address: '',
    status: 1
  });
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  Object.assign(form, row);
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!form.hospitalName || !form.hospitalCode) {
    ElMessage.warning('请填写医院名称和唯一编码');
    return;
  }
  await request.post('/admin/hospitals', form);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
};

const handleAssignAdmin = (row: any) => {
  selectedHospitalId.value = row.id;
  Object.assign(adminForm, { username: '', realName: '', password: '', phone: '' });
  adminDialogVisible.value = true;
};

const handleAdminSubmit = async () => {
  if (!adminForm.username || !adminForm.realName) {
    ElMessage.warning('账号与姓名不能为空');
    return;
  }
  await request.post(`/admin/hospitals/${selectedHospitalId.value}/assign-admin`, adminForm);
  ElMessage.success('医院管理员账号设置成功');
  adminDialogVisible.value = false;
};

onMounted(fetchData);
</script>

<style scoped>
.handle-input {
  width: 260px;
}
</style>
