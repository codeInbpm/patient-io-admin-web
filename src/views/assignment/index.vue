<template>
  <div class="container">
    <div class="handle-box">
      <span class="label">当前病区视窗：</span>
      <el-select v-model="selectedWardId" placeholder="请选择病房" @change="fetchWardAllData" style="width: 240px;">
        <el-option v-for="w in wardList" :key="w.id" :label="w.wardName" :value="w.id" />
      </el-select>
      <el-button type="primary" icon="Refresh" @click="fetchWardAllData">刷新床位与分配</el-button>
      <span class="tip-text">💡 护士长全景管理：直观查看全病区床位病患由谁负责，可直接在表格下拉中指派与调换责任护士</span>
    </div>

    <!-- 1. 顶部：在岗护士工作量负荷看板卡片 -->
    <div class="nurse-stat-row" v-if="activeNurseList.length > 0">
      <div class="stat-badge-title">👩‍⚕️ 在岗责任护士管床负荷统计：</div>
      <div class="nurse-cards">
        <el-card
          v-for="nurse in activeNurseList"
          :key="nurse.id"
          shadow="hover"
          class="nurse-card"
          :class="{ 'card-highlight': getNursePatientCount(nurse.id) > 0 }"
        >
          <div class="n-name">{{ nurse.realName }} <span class="n-job">({{ nurse.jobNumber }})</span></div>
          <div class="n-count">
            负责病患：<strong>{{ getNursePatientCount(nurse.id) }}</strong> 人
            <span class="n-bed">（{{ getNurseBedCount(nurse.id) }} 张床）</span>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 2. 筛选过滤工具栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="责任护士：">
          <el-select v-model="filterNurseId" placeholder="全部护士" clearable style="width: 170px;">
            <el-option label="全部护士" value="" />
            <el-option label="⚠️ 未指派护士" :value="-1" />
            <el-option
              v-for="n in activeNurseList"
              :key="n.id"
              :label="`${n.realName} (${n.jobNumber})`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="分配状态：">
          <el-select v-model="filterAssignStatus" placeholder="全部状态" clearable style="width: 150px;">
            <el-option label="全部状态" value="" />
            <el-option label="已责任包干" value="ASSIGNED" />
            <el-option label="⚠️ 尚未指派" value="UNASSIGNED" />
            <el-option label="空床待收治" value="EMPTY" />
          </el-select>
        </el-form-item>

        <el-form-item label="床位状态：">
          <el-select v-model="filterOccupiedStatus" placeholder="全部床位" clearable style="width: 130px;">
            <el-option label="全部床位" value="" />
            <el-option label="🔴 已占用" value="OCCUPIED" />
            <el-option label="🟢 空床" value="EMPTY" />
          </el-select>
        </el-form-item>

        <el-form-item label="快捷搜索：">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索床位号/病患姓名/住院号"
            clearable
            prefix-icon="Search"
            style="width: 250px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="resetFilters">重置</el-button>
          <span class="filter-result-tip">
            筛选结果：共 <strong>{{ filteredBedRows.length }}</strong> 张床位
          </span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 3. 主体：全病区【床位 - 住院病患 - 责任护士】全景对照与指派表 -->
    <el-card shadow="never" style="margin-top: 16px;">
      <template #header>
        <div class="table-header">
          <span>📋 病区床位病患与责任护士分配对照表</span>
          <el-tag type="info">全病区共 {{ bedTableList.length }} 张床位，当前已收治 {{ inPatientCount }} 位病患</el-tag>
        </div>
      </template>

      <el-table :data="filteredBedRows" border stripe class="table" empty-text="没有符合筛选条件的床位分配数据">
        <el-table-column prop="roomNo" label="所属房间" width="120" align="center">
          <template #default="{ row }">
            <el-tag effect="plain" type="info">🚪 {{ row.roomNo || '-' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="bedNo" label="床位编号" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isOccupied ? 'danger' : 'info'" size="large" effect="dark">
              🛏️ {{ row.bedNo }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="patientName" label="在床病患姓名" width="150">
          <template #default="{ row }">
            <span v-if="row.isOccupied && row.patientName" class="font-bold text-blue">
              👤 {{ row.patientName }}
            </span>
            <span v-else-if="row.isOccupied" class="text-orange font-bold">
              👤 (在床收治患者)
            </span>
            <span v-else class="text-gray">（空床待收治）</span>
          </template>
        </el-table-column>

        <el-table-column prop="hospitalNo" label="住院号" width="140">
          <template #default="{ row }">
            {{ row.hospitalNo || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="genderAge" label="性别/年龄" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.isOccupied && row.gender">
              {{ row.gender === 1 ? '男' : '女' }} / {{ row.age }}岁
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="diagnosis" label="主要临床诊断" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.diagnosis || '-' }}
          </template>
        </el-table-column>

        <!-- 关键核心列：直接下拉指派责任护士 -->
        <el-table-column label="当前负责护士（可直接在线调换）" width="260">
          <template #default="{ row }">
            <el-select
              v-model="row.assignedNurseId"
              placeholder="指派责任护士"
              :disabled="!row.isOccupied"
              @change="(val: number) => handleAssignChange(row, val)"
              style="width: 100%;"
            >
              <el-option
                v-for="nurse in activeNurseList"
                :key="nurse.id"
                :label="`${nurse.realName} (${nurse.jobNumber})`"
                :value="nurse.id"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="分配状态" width="120" align="center">
          <template #default="{ row }">
            <template v-if="!row.isOccupied">
              <el-tag type="info">空床</el-tag>
            </template>
            <template v-else-if="row.assignedNurseId">
              <el-tag type="success">已责任包干</el-tag>
            </template>
            <template v-else>
              <el-tag type="danger">⚠️ 尚未指派</el-tag>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../../utils/request';

const wardList = ref<any[]>([]);
const selectedWardId = ref<number | null>(null);

const activeNurseList = ref<any[]>([]);
const bedTableList = ref<any[]>([]);

// 筛选条件
const filterNurseId = ref<number | string>('');
const filterAssignStatus = ref('');
const filterOccupiedStatus = ref('');
const searchKeyword = ref('');

const resetFilters = () => {
  filterNurseId.value = '';
  filterAssignStatus.value = '';
  filterOccupiedStatus.value = '';
  searchKeyword.value = '';
};

const inPatientCount = computed(() => {
  return bedTableList.value.filter(b => b.isOccupied).length;
});

// 计算某个护士负责的病患数量和床位数
const getNursePatientCount = (nurseId: number) => {
  return bedTableList.value.filter(b => b.isOccupied && b.assignedNurseId === nurseId).length;
};
const getNurseBedCount = (nurseId: number) => {
  return bedTableList.value.filter(b => b.assignedNurseId === nurseId).length;
};

// 筛选后的列表
const filteredBedRows = computed(() => {
  return bedTableList.value.filter(row => {
    // 责任护士筛选
    if (filterNurseId.value !== '') {
      if (filterNurseId.value === -1) {
        // 未指派护士且已占用
        if (!row.isOccupied || row.assignedNurseId) return false;
      } else {
        if (row.assignedNurseId !== filterNurseId.value) return false;
      }
    }

    // 分配状态筛选
    if (filterAssignStatus.value) {
      if (filterAssignStatus.value === 'ASSIGNED' && (!row.isOccupied || !row.assignedNurseId)) return false;
      if (filterAssignStatus.value === 'UNASSIGNED' && (!row.isOccupied || row.assignedNurseId)) return false;
      if (filterAssignStatus.value === 'EMPTY' && row.isOccupied) return false;
    }

    // 床位占用状态
    if (filterOccupiedStatus.value) {
      if (filterOccupiedStatus.value === 'OCCUPIED' && !row.isOccupied) return false;
      if (filterOccupiedStatus.value === 'EMPTY' && row.isOccupied) return false;
    }

    // 模糊搜索
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      const matchBed = (row.bedNo || '').toLowerCase().includes(kw);
      const matchPatient = (row.patientName || '').toLowerCase().includes(kw);
      const matchHosp = (row.hospitalNo || '').toLowerCase().includes(kw);
      if (!matchBed && !matchPatient && !matchHosp) return false;
    }

    return true;
  });
});

const fetchWards = async () => {
  const res = (await request.get('/wards/list')) as any;
  wardList.value = res;
  if (res && res.length > 0) {
    const nurseWardId = Number(localStorage.getItem('admin_ward_id'));
    const cachedWardId = Number(sessionStorage.getItem('admin_selected_ward_id'));
    let targetWard = null;
    if (nurseWardId) {
      targetWard = res.find((w: any) => w.id === nurseWardId);
    }
    if (!targetWard && cachedWardId) {
      targetWard = res.find((w: any) => w.id === cachedWardId);
    }
    selectedWardId.value = targetWard ? targetWard.id : res[0].id;
    await fetchWardAllData();
  }
};

const fetchNurses = async () => {
  const res = (await request.get('/nurses/manage-list')) as any;
  activeNurseList.value = res.filter((n: any) => n.status === 1);
};

// 获取床位病患分配全量数据（使用 visual-matrix 保证床位+病患+护士一体化返回）
const fetchWardAllData = async () => {
  if (!selectedWardId.value) return;

  const [visualBeds] = await Promise.all([
    request.get(`/beds/visual-matrix/${selectedWardId.value}`) as Promise<any>,
    fetchNurses()
  ]);

  bedTableList.value = visualBeds.map((b: any) => {
    // 优先使用后端返回的 assignedNurseId，或者根据 assignedNurseName 查找
    let nurseId = b.assignedNurseId;
    if (!nurseId && b.assignedNurseName) {
      const found = activeNurseList.value.find(n => n.realName === b.assignedNurseName);
      if (found) nurseId = found.id;
    }

    return {
      bedId: b.bedId,
      roomNo: b.roomNo,
      bedNo: b.bedNo,
      isOccupied: b.status === 1,
      patientId: b.patientId,
      patientName: b.patientName || '',
      hospitalNo: b.hospitalNo || '',
      gender: b.gender,
      age: b.age,
      diagnosis: b.diagnosis || '',
      assignedNurseId: nurseId,
      assignedNurseName: b.assignedNurseName || ''
    };
  });
};

// 护士长直接在表格中调整护士指派
const handleAssignChange = async (row: any, nurseId: number) => {
  if (!row.patientId) {
    ElMessage.warning('当前床位尚未绑定在院病患，无需分配责任护士');
    return;
  }
  try {
    await request.post('/patients/assign-nurse', {
      patientId: row.patientId,
      nurseId: nurseId
    });
    ElMessage.success(`已成功将【${row.bedNo}】${row.patientName} 的责任护士指派完成`);
    fetchWardAllData();
  } catch (e: any) {
    console.error(e);
  }
};

onMounted(() => {
  fetchWards();
});
</script>

<style scoped>
.handle-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.label {
  font-size: 14px;
  color: #374151;
}
.tip-text {
  font-size: 13px;
  color: #6b7280;
}

.nurse-stat-row {
  margin-bottom: 16px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 16px;
}
.stat-badge-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 10px;
}
.nurse-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.nurse-card {
  width: 190px;
  background: #ffffff;
  border-radius: 6px;
  transition: all 0.2s;
}
.card-highlight {
  border-left: 4px solid #3b82f6;
}
.n-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}
.n-job {
  font-size: 12px;
  color: #64748b;
  font-weight: normal;
}
.n-count {
  margin-top: 6px;
  font-size: 13px;
  color: #475569;
}
.n-bed {
  font-size: 12px;
  color: #94a3b8;
}

.filter-card {
  margin-bottom: 16px;
  background-color: #fafbfc;
}
.filter-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.filter-result-tip {
  margin-left: 14px;
  font-size: 13px;
  color: #6b7280;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.table {
  width: 100%;
}
.font-bold {
  font-weight: bold;
}
.text-blue {
  color: #2563eb;
}
.text-orange {
  color: #f59e0b;
}
.text-gray {
  color: #9ca3af;
}
</style>
