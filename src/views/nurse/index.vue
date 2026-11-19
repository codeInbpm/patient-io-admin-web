<template>
  <div class="container">
    <div class="handle-box">
      <el-button type="primary" icon="Plus" @click="handleCreate">录入新医护</el-button>

      <div class="filter-group">
        <span class="filter-label">所在楼宇：</span>
        <el-select
          v-model="filterBuilding"
          placeholder="全部楼宇"
          clearable
          style="width: 150px;"
          @change="onFilterBuildingChange"
        >
          <el-option label="全部楼宇" value="" />
          <el-option
            v-for="b in buildingOptions"
            :key="b"
            :label="b"
            :value="b"
          />
        </el-select>

        <span class="filter-label">所属病区：</span>
        <el-select
          v-model="filterWardId"
          placeholder="全部病区"
          clearable
          filterable
          style="width: 210px;"
          @change="onFilterWardChange"
        >
          <el-option label="全部病区" :value="null" />
          <el-option
            v-for="w in filteredWardOptions"
            :key="w.id"
            :label="w.wardName"
            :value="w.id"
          />
        </el-select>

        <el-input
          v-model="searchKeyword"
          placeholder="搜索护士姓名 / 6位工号"
          clearable
          style="width: 220px;"
        />

        <el-button @click="resetFilters">重置</el-button>
      </div>

      <span class="tip-text">💡 点击行首箭头可展开查看该护士当前所负责的具体病患与床位明细</span>
    </div>

    <el-table :data="paginatedTableData" border stripe class="table">
      <!-- 展开行：展示当前护士所负责的具体病患与床位 -->
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="expand-detail">
            <div class="expand-title">
              <span>🩺 <strong>{{ row.realName }}</strong>（{{ row.role === 'HEAD_NURSE' ? '护士长' : '责任护士' }}）当前管辖的在床病患明细：</span>
            </div>
            <div v-if="row.assignedPatients && row.assignedPatients.length > 0">
              <el-table :data="row.assignedPatients" size="small" border style="width: 100%; margin-top: 8px;">
                <el-table-column prop="bedNo" label="负责床位" width="110" align="center">
                  <template #default="{ row: p }">
                    <el-tag type="danger" effect="plain">🛏️ {{ p.bedNo }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="patientName" label="病患姓名" width="120" />
                <el-table-column prop="hospitalNo" label="住院号" width="140" />
                <el-table-column prop="wardName" label="所在病区" width="150" />
                <el-table-column prop="diagnosis" label="临床主要诊断" min-width="200" show-overflow-tooltip />
              </el-table>
            </div>
            <div v-else class="empty-patient-tip">
              暂未分配具体床位病患（可在「责任护士-床位分配」功能中为其勾选负责床位）
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="jobNumber" label="工号" width="100" align="center" />
      <el-table-column prop="realName" label="姓名" width="110" />
      <el-table-column prop="role" label="岗位角色" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.role === 'HEAD_NURSE' ? 'danger' : 'primary'">
            {{ row.role === 'HEAD_NURSE' ? '护士长' : '责任护士' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="hospitalName" label="所属医院" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.hospitalName || currentHospitalName || '默认医院' }}
        </template>
      </el-table-column>
      <el-table-column prop="department" label="所在楼宇" width="110" align="center">
        <template #default="{ row }">
          <el-tag type="info" effect="plain">{{ row.building || row.department || '-' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="wardName" label="所属病区" min-width="190">
        <template #default="{ row }">
          <el-tag v-if="row.wardName" type="success" effect="light" style="font-weight: 600;">
            🛏️ {{ row.wardName }}
          </el-tag>
          <span v-else style="color: #9ca3af; font-size: 13px;">未指定病区</span>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机号码" width="130" />
      <el-table-column prop="assignedPatientCount" label="负责病患数" width="110" align="center">
        <template #default="{ row }">
          <el-badge :value="row.assignedPatientCount || 0" :type="row.assignedPatientCount > 0 ? 'success' : 'info'" />
        </template>
      </el-table-column>
      <el-table-column prop="isBound" label="微信绑定" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isBound ? 'success' : 'info'">
            {{ row.isBound ? '已绑定' : '未绑定' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="在职状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.status === 1 ? '在职' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="管理操作" width="220" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="handleToggleStatus(row)">
            {{ row.status === 1 ? '停用' : '启用' }}
          </el-button>
          <el-button link type="danger" v-if="row.isBound" @click="handleUnbind(row)">
            解绑微信
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页工具栏 -->
    <div class="pagination-box">
      <div class="pagination-info">
        <span>共 <strong>{{ filteredTableData.length }}</strong> 位医护人员<template v-if="filteredTableData.length > 0">，当前显示第 {{ (currentPage - 1) * pageSize + 1 }} ~ {{ Math.min(currentPage * pageSize, filteredTableData.length) }} 位</template></span>
      </div>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="filteredTableData.length"
        layout="total, sizes, prev, pager, next, jumper"
        background
        size="default"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 录入/编辑医护对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑医护档案' : '录入新医护人员'" width="560px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="所属医院" required>
          <el-select
            v-model="form.hospitalId"
            placeholder="请选择所属医院"
            style="width:100%"
            @change="onHospitalChange"
          >
            <el-option
              v-for="h in hospitalList"
              :key="h.id"
              :label="h.hospitalName"
              :value="h.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="所在楼宇" required>
          <el-select
            v-model="form.deptId"
            placeholder="请选择所在楼宇"
            style="width:100%"
            @change="onDeptChange"
          >
            <el-option
              v-for="d in availableDeptList"
              :key="d.id"
              :label="d.deptName"
              :value="d.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="所属病区" required>
          <el-select
            v-model="form.wardId"
            placeholder="请选择绑定的病区"
            style="width:100%"
            @change="onWardChange"
          >
            <el-option
              v-for="w in availableWardList"
              :key="w.id"
              :label="w.wardName"
              :value="w.id"
            />
          </el-select>
          <span style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            💡 护士和病区深度绑定，登录工作台后将默认进入该病区
          </span>
        </el-form-item>

        <el-form-item label="6位工号" required>
          <el-input v-model="form.jobNumber" placeholder="如：100001 (仅限6位纯数字)" :disabled="!!form.id" />
        </el-form-item>
        <el-form-item label="真实姓名" required>
          <el-input v-model="form.realName" placeholder="如：李丽" />
        </el-form-item>
        <el-form-item label="岗位角色" required>
          <el-radio-group v-model="form.role">
            <el-radio label="HEAD_NURSE">护士长</el-radio>
            <el-radio label="NURSE">责任护士</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="手机号码">
          <el-input v-model="form.phone" placeholder="联系手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../utils/request';

const tableData = ref<any[]>([]);
const searchKeyword = ref('');
const filterBuilding = ref('');
const filterWardId = ref<number | null>(null);
const hospitalList = ref<any[]>([]);
const departmentList = ref<any[]>([]);
const allWardList = ref<any[]>([]);
const currentHospitalName = ref(localStorage.getItem('admin_hospital_name') || '');

// 所有可用楼宇选项
const buildingOptions = computed(() => {
  const set = new Set<string>();
  departmentList.value.forEach(d => {
    if (d.deptName) set.add(d.deptName);
  });
  allWardList.value.forEach(w => {
    if (w.building) set.add(w.building);
    if (w.department) set.add(w.department);
  });
  tableData.value.forEach(t => {
    if (t.building) set.add(t.building);
    if (t.department) set.add(t.department);
  });
  return Array.from(set);
});

// 病区与楼宇强联动：选了楼宇后，病区下拉框仅展示归属该楼宇的病区
const filteredWardOptions = computed(() => {
  if (!filterBuilding.value) {
    return allWardList.value;
  }
  return allWardList.value.filter(w => {
    return w.building === filterBuilding.value ||
           w.department === filterBuilding.value ||
           (w.deptName && w.deptName === filterBuilding.value);
  });
});

// 切换楼宇时，如果先前选中的病区不属于新楼宇，清空已选病区
const onFilterBuildingChange = () => {
  if (filterWardId.value) {
    const isMatched = filteredWardOptions.value.some(w => w.id === filterWardId.value);
    if (!isMatched) {
      filterWardId.value = null;
    }
  }
};

// 切换病区时，若当前未指定楼宇，自动识别并锁定该病区所属楼宇
const onFilterWardChange = (wardId: number | null) => {
  if (!wardId) return;
  if (!filterBuilding.value) {
    const w = allWardList.value.find(item => item.id === wardId);
    const b = w?.building || w?.department;
    if (b && buildingOptions.value.includes(b)) {
      filterBuilding.value = b;
    }
  }
};

const resetFilters = () => {
  filterBuilding.value = '';
  filterWardId.value = null;
  searchKeyword.value = '';
  currentPage.value = 1;
};

const dialogVisible = ref(false);
const form = reactive({
  id: null as any,
  jobNumber: '',
  realName: '',
  role: 'NURSE',
  hospitalId: null as any,
  hospitalName: '',
  deptId: null as any,
  department: '',
  building: '',
  wardId: null as any,
  wardName: '',
  phone: ''
});

// 根据选中的医院过滤可用楼宇
const availableDeptList = computed(() => {
  if (!form.hospitalId) return departmentList.value;
  return departmentList.value.filter(d => !d.hospitalId || d.hospitalId === form.hospitalId);
});

// 根据选中的楼宇和医院过滤可用病区
const availableWardList = computed(() => {
  let list = allWardList.value;
  if (form.hospitalId) {
    list = list.filter(w => !w.hospitalId || w.hospitalId === form.hospitalId);
  }
  if (form.deptId) {
    list = list.filter(w => w.deptId === form.deptId || (form.building && w.building === form.building) || (form.department && w.department === form.department));
  }
  return list;
});

const filteredTableData = computed(() => {
  return tableData.value.filter((item: any) => {
    // 楼宇筛选
    if (filterBuilding.value) {
      const itemB = item.building || item.department;
      if (itemB !== filterBuilding.value) {
        return false;
      }
    }
    // 病区筛选
    if (filterWardId.value !== null && filterWardId.value !== undefined) {
      if (item.wardId !== filterWardId.value) {
        return false;
      }
    }
    // 关键字搜索（姓名、工号、手机号、病区名、楼宇名）
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      const matchName = item.realName && item.realName.toLowerCase().includes(kw);
      const matchJob = item.jobNumber && String(item.jobNumber).includes(kw);
      const matchPhone = item.phone && String(item.phone).includes(kw);
      const matchWard = item.wardName && item.wardName.toLowerCase().includes(kw);
      const matchDept = (item.department && item.department.toLowerCase().includes(kw)) ||
                        (item.building && item.building.toLowerCase().includes(kw));
      if (!matchName && !matchJob && !matchPhone && !matchWard && !matchDept) {
        return false;
      }
    }
    return true;
  });
});

// 分页状态
const currentPage = ref(1);
const pageSize = ref(10);

const handleSizeChange = (val: number) => {
  pageSize.value = val;
  currentPage.value = 1;
};

const handleCurrentChange = (val: number) => {
  currentPage.value = val;
};

// 分页切片数据
const paginatedTableData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTableData.value.slice(start, start + pageSize.value);
});

// 筛选条件变动时重置页码为第1页
watch([filterBuilding, filterWardId, searchKeyword], () => {
  currentPage.value = 1;
});

const fetchData = async () => {
  try {
    const [nurses, depts, wards, hospitals] = await Promise.all([
      request.get('/nurses/manage-list') as Promise<any>,
      request.get('/admin/departments') as Promise<any>,
      request.get('/wards/list', { params: { all: true } }) as Promise<any>,
      request.get('/admin/hospitals').catch(() => []) as Promise<any>
    ]);
    tableData.value = nurses || [];
    departmentList.value = depts || [];
    allWardList.value = wards || [];
    hospitalList.value = (hospitals && hospitals.length > 0) ? hospitals : [
      { id: 1, hospitalName: '第一人民医院（示范本部）' },
      { id: 2, hospitalName: '第二人民医院' }
    ];
  } catch (e) {
    console.error('拉取数据失败', e);
  }
};

const onHospitalChange = (hospId: number) => {
  const h = hospitalList.value.find(item => item.id === hospId);
  if (h) form.hospitalName = h.hospitalName;
  // 重置楼宇和病区
  form.deptId = null;
  form.department = '';
  form.building = '';
  form.wardId = null;
  form.wardName = '';
  if (availableDeptList.value.length > 0) {
    onDeptChange(availableDeptList.value[0].id);
  }
};

const onDeptChange = (deptId: number) => {
  const dept = departmentList.value.find(d => d.id === deptId);
  if (dept) {
    form.deptId = dept.id;
    form.department = dept.deptName;
    form.building = dept.deptName;
  }
  // 联动重新挑选第一个符合条件的病区
  form.wardId = null;
  form.wardName = '';
  const matchedWards = availableWardList.value;
  if (matchedWards.length > 0) {
    onWardChange(matchedWards[0].id);
  }
};

const onWardChange = (wardId: number) => {
  const w = allWardList.value.find(item => item.id === wardId);
  if (w) {
    form.wardId = w.id;
    form.wardName = w.wardName;
    if (!form.deptId && w.deptId) {
      form.deptId = w.deptId;
      form.department = w.department || w.building;
      form.building = w.building || w.department;
    }
    if (!form.hospitalId && w.hospitalId) {
      form.hospitalId = w.hospitalId;
      form.hospitalName = w.hospitalName;
    }
  }
};

const handleCreate = () => {
  const defaultHosp = hospitalList.value[0] || { id: 1, hospitalName: '第一人民医院（示范本部）' };
  const defaultDept = departmentList.value[0] || null;
  const defaultWard = allWardList.value[0] || null;

  Object.assign(form, {
    id: null,
    jobNumber: '',
    realName: '',
    role: 'NURSE',
    hospitalId: defaultHosp.id,
    hospitalName: defaultHosp.hospitalName,
    deptId: defaultDept?.id || null,
    department: defaultDept?.deptName || '',
    building: defaultDept?.deptName || '',
    wardId: defaultWard?.id || null,
    wardName: defaultWard?.wardName || '',
    phone: ''
  });
  dialogVisible.value = true;
};

const handleEdit = (row: any) => {
  Object.assign(form, {
    id: row.id,
    jobNumber: row.jobNumber,
    realName: row.realName,
    role: row.role,
    hospitalId: row.hospitalId || (hospitalList.value[0]?.id || 1),
    hospitalName: row.hospitalName || (hospitalList.value[0]?.hospitalName || '第一人民医院（示范本部）'),
    deptId: row.deptId,
    department: row.department,
    building: row.building || row.department,
    wardId: row.wardId,
    wardName: row.wardName,
    phone: row.phone
  });
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!form.jobNumber || !form.realName) {
    ElMessage.warning('工号、姓名为必填项');
    return;
  }
  if (!form.hospitalId) {
    ElMessage.warning('请选择所属医院');
    return;
  }
  if (!form.deptId) {
    ElMessage.warning('请选择所在楼宇');
    return;
  }
  if (!form.wardId) {
    ElMessage.warning('请选择绑定的病区');
    return;
  }

  await request.post('/nurses', form);
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  fetchData();
};

const handleToggleStatus = async (row: any) => {
  await request.post(`/nurses/${row.id}/toggle-status`);
  ElMessage.success('状态更新成功');
  fetchData();
};

const handleUnbind = (row: any) => {
  ElMessageBox.confirm(
    `确定解绑 ${row.realName}（工号：${row.jobNumber}）绑定的微信吗？解绑后其小程序端将恢复未绑定状态。`,
    '提示',
    { type: 'warning' }
  ).then(async () => {
    await request.post(`/nurses/${row.id}/unbind-wechat`);
    ElMessage.success('解绑成功');
    fetchData();
  });
};

onMounted(fetchData);
</script>

<style scoped>
.handle-box {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.filter-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.filter-label {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  margin-right: -4px;
}
.tip-text {
  font-size: 13px;
  color: #6b7280;
}
.expand-detail {
  padding: 12px 24px;
  background-color: #f9fafb;
}
.expand-title {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 6px;
}
.empty-patient-tip {
  font-size: 13px;
  color: #9ca3af;
  padding: 8px 0;
}
.pagination-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  flex-wrap: wrap;
  gap: 12px;
}
.pagination-info {
  font-size: 13px;
  color: #64748b;
}
.pagination-info strong {
  color: #0f172a;
}
</style>
