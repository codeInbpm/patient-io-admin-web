<template>
  <div class="container">
    <!-- 顶部复合筛选工具栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="所属病区：">
          <el-select v-model="selectedWardId" placeholder="全部病区" clearable @change="fetchPatients" style="width: 170px;">
            <el-option label="全部病区" :value="null" />
            <el-option v-for="w in wardList" :key="w.id" :label="w.wardName" :value="w.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="责任护士：">
          <el-select v-model="filterNurse" placeholder="全部护士" clearable style="width: 140px;">
            <el-option label="全部护士" value="" />
            <el-option label="未指定护士" value="UNASSIGNED" />
            <el-option v-for="n in nurseOptions" :key="n" :label="n" :value="n" />
          </el-select>
        </el-form-item>

        <el-form-item label="出入量监测：">
          <el-select v-model="filterNeedIo" placeholder="全部状态" clearable style="width: 130px;">
            <el-option label="全部状态" value="" />
            <el-option label="💧 监测中" :value="1" />
            <el-option label="不测" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item label="人群类别：">
          <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 120px;">
            <el-option label="全部类型" value="" />
            <el-option label="成人" value="ADULT" />
            <el-option label="👶 婴儿" value="INFANT" />
          </el-select>
        </el-form-item>

        <el-form-item label="护理级别：">
          <el-select v-model="filterNursingLevel" placeholder="全部级别" clearable style="width: 120px;">
            <el-option label="全部级别" value="" />
            <el-option label="特级护理" value="SPECIAL" />
            <el-option label="一级护理" value="LEVEL_1" />
            <el-option label="二级护理" value="LEVEL_2" />
            <el-option label="三级护理" value="LEVEL_3" />
          </el-select>
        </el-form-item>

        <el-form-item label="搜索病患：">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索姓名/住院号/床位号"
            clearable
            prefix-icon="Search"
            style="width: 220px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" icon="Plus" @click="handleCreate">录入住院病患</el-button>
          <el-button type="success" icon="Download" @click="handleExportExcel">导出出入量报表</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 患者档案数据表格 -->
    <el-card shadow="never" style="margin-top: 14px;">
      <template #header>
        <div class="table-header">
          <div class="header-left">
            <span>📋 在院病患档案列表</span>
            <el-tag type="info" style="margin-left: 10px;">共 {{ filteredPatientList.length }} 位病患</el-tag>
            <el-tag v-if="filterNursingLevel" type="danger" closable @close="filterNursingLevel=''" style="margin-left: 8px;">
              护理: {{ formatNursingLevel(filterNursingLevel) }}
            </el-tag>
            <el-tag v-if="filterAdmissionType" type="warning" closable @close="filterAdmissionType=''" style="margin-left: 8px;">
              类别: {{ filterAdmissionType === 'EMERGENCY' ? '急诊' : '平诊' }}
            </el-tag>
            <el-tag v-if="filterTube === 1" type="warning" closable @close="filterTube=''" style="margin-left: 8px;">
              留置管路患者
            </el-tag>
            <el-tag v-if="filterAbnormal === 1" type="danger" closable @close="filterAbnormal=''" style="margin-left: 8px;">
              出入量失衡告警
            </el-tag>
            <el-tag v-if="filterSevereCare === 1" type="danger" closable @close="filterSevereCare=''" style="margin-left: 8px;">
              重症护理(特级/一级)
            </el-tag>
            <!-- 临床智能监测预警图例 -->
            <span class="legend-badge red-badge">🔴 24h尿量&lt;400ml标红</span>
            <span class="legend-badge red-badge">🔴 出入差值&gt;1000ml标红</span>
            <span class="legend-badge yellow-badge">🟡 静脉输液&gt;3000ml标黄</span>
          </div>
        </div>
      </template>

      <el-table 
        :data="filteredPatientList" 
        :cell-class-name="getTableCellClass"
        border 
        stripe 
        class="table" 
        empty-text="当前暂无符合条件的病患档案数据"
      >
        <el-table-column prop="hospitalNo" label="住院号" width="130" />
        <el-table-column prop="patientName" label="病患姓名" width="120">
          <template #default="{ row }">
            <strong class="text-blue">👤 {{ row.patientName }}</strong>
          </template>
        </el-table-column>

        <el-table-column prop="wardName" label="所属病区" width="130" show-overflow-tooltip />

        <el-table-column prop="bedNo" label="床位" width="90" align="center">
          <template #default="{ row }">
            <el-tag type="danger" effect="plain">🛏️ {{ row.bedNo }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="genderAge" label="性别/年龄" width="95" align="center">
          <template #default="{ row }">
            <span>{{ row.gender === 1 ? '男' : '女' }} / {{ row.age }}岁</span>
          </template>
        </el-table-column>

        <el-table-column prop="patientType" label="群体类别" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.patientType === 'INFANT' ? 'warning' : 'primary'" size="small">
              {{ row.patientType === 'INFANT' ? '👶 婴儿' : '成人' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="admissionType" label="入院途径" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.admissionType === 'EMERGENCY' ? 'danger' : 'info'" size="small">
              {{ row.admissionType === 'EMERGENCY' ? '急诊' : '平诊' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="nursingLevel" label="护理级别" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="row.nursingLevel === 'SPECIAL' ? 'danger' : (row.nursingLevel === 'LEVEL_1' ? 'warning' : 'success')" size="small">
              {{ formatNursingLevel(row.nursingLevel) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="needIoRecord" label="测出入量" width="95" align="center">
          <template #default="{ row }">
            <el-tag :type="row.needIoRecord === 1 ? 'success' : 'info'" effect="dark" size="small">
              {{ row.needIoRecord === 1 ? '💧 监测中' : '不测' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="drainageTubes" label="留置管道" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.drainageTubes">{{ formatTubes(row.drainageTubes) }}</span>
            <span v-else style="color:#9ca3af;">无</span>
          </template>
        </el-table-column>

        <el-table-column prop="diagnosis" label="临床主要诊断" min-width="150" show-overflow-tooltip />

        <!-- 规则3: 静脉输液 > 3000ml 标黄 -->
        <el-table-column prop="todayIv" label="静脉输液(ml)" width="130" align="right">
          <template #default="{ row }">
            <div class="io-cell">
              <span :class="{ 'text-yellow': row.isIvAlert, 'font-bold': true }">
                {{ row.todayIv || 0 }}
              </span>
              <el-tag v-if="row.isIvAlert" type="warning" size="small" effect="dark" style="margin-left: 4px;">
                >3000
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 规则1: 24h尿量 < 400ml 标红 -->
        <el-table-column prop="todayUrine" label="24h尿量(ml)" width="130" align="right">
          <template #default="{ row }">
            <div class="io-cell">
              <span :class="{ 'text-red': row.isUrineAlert, 'font-bold': true }">
                {{ row.todayUrine || 0 }}
              </span>
              <el-tag v-if="row.isUrineAlert" type="danger" size="small" effect="dark" style="margin-left: 4px;">
                少尿
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 规则2: 入量-出量差值 > 1000ml 标红 -->
        <el-table-column prop="todayBalance" label="出入差值(ml)" width="140" align="right">
          <template #default="{ row }">
            <div class="io-cell">
              <span :class="{ 'text-red': row.isBalanceAlert, 'text-normal': !row.isBalanceAlert, 'font-bold': true }">
                {{ row.todayBalance > 0 ? '+' : '' }}{{ row.todayBalance }}
              </span>
              <el-tag v-if="row.isBalanceAlert" type="danger" size="small" effect="dark" style="margin-left: 4px;">
                差值>1000
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="assignedNurseName" label="责任护士" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.assignedNurseName" class="text-green font-bold">👩‍⚕️ {{ row.assignedNurseName }}</span>
            <span v-else style="color:#9ca3af;">未指定</span>
          </template>
        </el-table-column>

        <el-table-column label="管理操作" width="220" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleDischarge(row)">办理出院</el-button>
            <el-button link type="danger" v-if="row.isBound" @click="handleUnbind(row)">解绑微信</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 录入/编辑病患对话框 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑住院病患档案' : '录入住院病患档案'" width="580px">
      <el-form :model="form" label-width="100px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="住院号" required>
              <el-input v-model="form.hospitalNo" placeholder="如：ZY202611003" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="病患姓名" required>
              <el-input v-model="form.patientName" placeholder="如：张三" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="性别">
              <el-radio-group v-model="form.gender">
                <el-radio :label="1">男</el-radio>
                <el-radio :label="2">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年龄">
              <el-input-number v-model="form.age" :min="0" :max="120" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="群体类别">
              <el-select v-model="form.patientType" style="width:100%">
                <el-option label="成人" value="ADULT" />
                <el-option label="👶 婴儿" value="INFANT" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入院方式">
              <el-select v-model="form.admissionType" style="width:100%">
                <el-option label="平诊" value="ROUTINE" />
                <el-option label="急诊" value="EMERGENCY" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属病区" required>
              <el-select v-model="form.wardId" placeholder="选择病房" @change="onWardSelectChange" style="width:100%">
                <el-option v-for="w in wardList" :key="w.id" :label="w.wardName" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所在床位" required>
              <el-select v-model="form.bedId" placeholder="选择床位" style="width:100%">
                <el-option
                  v-for="b in emptyBeds"
                  :key="b.id"
                  :label="`${b.roomNo ? b.roomNo + ' - ' : ''}${b.bedNo}${b.id === form.bedId ? ' (当前床位)' : ''}`"
                  :value="b.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="护理级别">
              <el-select v-model="form.nursingLevel" style="width:100%">
                <el-option label="特级护理" value="SPECIAL" />
                <el-option label="一级护理" value="LEVEL_1" />
                <el-option label="二级护理" value="LEVEL_2" />
                <el-option label="三级护理" value="LEVEL_3" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="测出入量医嘱">
              <el-switch v-model="form.needIoRecordBool" active-text="开启监测" inactive-text="不测" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="留置管路">
          <el-checkbox-group v-model="selectedTubes">
            <el-checkbox label="CATHER">留置导尿管</el-checkbox>
            <el-checkbox label="GASTRIC">胃肠减压管</el-checkbox>
            <el-checkbox label="DRAINAGE">引流管(胸/腹腔)</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="入院日期" required>
          <el-date-picker v-model="form.admissionDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="临床诊断">
          <el-input v-model="form.diagnosis" type="textarea" placeholder="如：胃癌术后、胆囊结石伴急性胆囊炎" />
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
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../utils/request';

const route = useRoute();

const wardList = ref<any[]>([]);
const selectedWardId = ref<number | null>(null);
const patientList = ref<any[]>([]);
const emptyBeds = ref<any[]>([]);
const selectedTubes = ref<string[]>([]);

// 筛选状态
const filterType = ref('');
const filterNeedIo = ref<number | ''>('');
const filterNursingLevel = ref('');
const filterNurse = ref('');
const searchKeyword = ref('');
const filterAdmissionType = ref('');
const filterAbnormal = ref<number | ''>('');
const filterTube = ref<number | ''>('');
const filterSevereCare = ref<number | ''>('');

const resetFilters = () => {
  filterType.value = '';
  filterNeedIo.value = '';
  filterNursingLevel.value = '';
  filterNurse.value = '';
  searchKeyword.value = '';
  filterAdmissionType.value = '';
  filterAbnormal.value = '';
  filterTube.value = '';
  filterSevereCare.value = '';
  selectedWardId.value = null;
  fetchPatients();
};

// 提取当前所有已分配的护士姓名列表
const nurseOptions = computed(() => {
  const set = new Set<string>();
  patientList.value.forEach(p => {
    if (p.assignedNurseName) set.add(p.assignedNurseName);
  });
  return Array.from(set).sort();
});

// 多维度综合筛选结果
const filteredPatientList = computed(() => {
  return patientList.value.filter(p => {
    // 群体类别
    if (filterType.value && p.patientType !== filterType.value) return false;
    // 出入量监测状态
    if (filterNeedIo.value !== '' && p.needIoRecord !== filterNeedIo.value) return false;
    // 护理级别
    if (filterNursingLevel.value && p.nursingLevel !== filterNursingLevel.value) return false;
    // 特级/一级重症护理
    if (filterSevereCare.value === 1 && p.nursingLevel !== 'SPECIAL' && p.nursingLevel !== 'LEVEL_1') return false;
    // 平急诊类别
    if (filterAdmissionType.value && p.admissionType !== filterAdmissionType.value) return false;
    // 出入量异常告警
    if (filterAbnormal.value === 1 && !p.isAbnormal) return false;
    // 留置管路
    if (filterTube.value === 1 && (!p.drainageTubes || !p.drainageTubes.trim())) return false;
    // 责任护士
    if (filterNurse.value) {
      if (filterNurse.value === 'UNASSIGNED') {
        if (p.assignedNurseName) return false;
      } else {
        if (p.assignedNurseName !== filterNurse.value) return false;
      }
    }
    // 关键词搜索（姓名、住院号、床位号）
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      const matchName = (p.patientName || '').toLowerCase().includes(kw);
      const matchHosp = (p.hospitalNo || '').toLowerCase().includes(kw);
      const matchBed = (p.bedNo || '').toLowerCase().includes(kw);
      if (!matchName && !matchHosp && !matchBed) return false;
    }
    return true;
  });
});

const dialogVisible = ref(false);
const form = reactive({
  id: null as number | null,
  hospitalNo: '',
  patientName: '',
  gender: 1,
  age: 50,
  weight: 65.0,
  patientType: 'ADULT',
  admissionType: 'ROUTINE',
  nursingLevel: 'LEVEL_2',
  needIoRecordBool: true,
  wardId: null as any,
  bedId: null as any,
  admissionDate: new Date().toISOString().split('T')[0],
  diagnosis: ''
});

const formatNursingLevel = (lvl: string) => {
  const map: Record<string, string> = {
    SPECIAL: '特级护理',
    LEVEL_1: '一级护理',
    LEVEL_2: '二级护理',
    LEVEL_3: '三级护理'
  };
  return map[lvl] || '二级';
};

const formatTubes = (tubesStr: string) => {
  if (!tubesStr) return '无';
  const arr = tubesStr.split(',');
  const labelMap: Record<string, string> = {
    CATHER: '导尿管',
    GASTRIC: '胃管',
    DRAINAGE: '引流管'
  };
  return arr.map(t => labelMap[t] || t).join('、');
};

const applyQueryParams = () => {
  if (route.query.wardId) {
    selectedWardId.value = Number(route.query.wardId);
  } else {
    const nurseWardId = Number(localStorage.getItem('admin_ward_id'));
    if (nurseWardId && wardList.value.some((w: any) => w.id === nurseWardId)) {
      selectedWardId.value = nurseWardId;
    }
  }

  if (route.query.nursingLevel) {
    filterNursingLevel.value = String(route.query.nursingLevel);
  }
  if (route.query.needIo !== undefined && route.query.needIo !== '') {
    filterNeedIo.value = Number(route.query.needIo);
  }
  if (route.query.keyword) {
    searchKeyword.value = String(route.query.keyword);
  }
  if (route.query.admissionType) {
    filterAdmissionType.value = String(route.query.admissionType);
  }
  if (route.query.hasTube !== undefined && route.query.hasTube !== '') {
    filterTube.value = Number(route.query.hasTube);
  }
  if (route.query.isAbnormal !== undefined && route.query.isAbnormal !== '') {
    filterAbnormal.value = Number(route.query.isAbnormal);
  }
  if (route.query.isSevereCare !== undefined && route.query.isSevereCare !== '') {
    filterSevereCare.value = Number(route.query.isSevereCare);
  }
};

const fetchWards = async () => {
  const res = (await request.get('/wards/list')) as any;
  wardList.value = res;
  applyQueryParams();
};

watch(() => route.query, () => {
  applyQueryParams();
  fetchPatients();
}, { deep: true });

const fetchPatients = async () => {
  const params: any = {};
  if (selectedWardId.value) {
    params.wardId = selectedWardId.value;
  }
  const res = (await request.get('/patients/list', { params })) as any;
  patientList.value = res || [];
};

const onWardSelectChange = async (wardId: number, currentBedId?: number) => {
  if (!currentBedId) form.bedId = null;
  const beds = (await request.get(`/beds/by-ward/${wardId}`)) as any;
  // 空床，或者当前患者正在占用的床位
  emptyBeds.value = beds.filter((b: any) => b.status === 0 || (currentBedId && b.id === currentBedId));
};

const handleCreate = () => {
  selectedTubes.value = [];
  Object.assign(form, {
    id: null,
    hospitalNo: '',
    patientName: '',
    gender: 1,
    age: 50,
    weight: 65.0,
    patientType: 'ADULT',
    admissionType: 'ROUTINE',
    nursingLevel: 'LEVEL_2',
    needIoRecordBool: true,
    wardId: (Number(localStorage.getItem('admin_ward_id')) && wardList.value.some((w: any) => w.id === Number(localStorage.getItem('admin_ward_id')))) ? Number(localStorage.getItem('admin_ward_id')) : (wardList.value[0]?.id || null),
    bedId: null,
    admissionDate: new Date().toISOString().split('T')[0],
    diagnosis: ''
  });
  if (form.wardId) onWardSelectChange(form.wardId);
  dialogVisible.value = true;
};

// 编辑病患
const handleEdit = async (row: any) => {
  selectedTubes.value = row.drainageTubes ? row.drainageTubes.split(',').filter(Boolean) : [];
  Object.assign(form, {
    id: row.id,
    hospitalNo: row.hospitalNo || '',
    patientName: row.patientName || '',
    gender: row.gender !== undefined ? row.gender : 1,
    age: row.age || 50,
    weight: row.weight || 60.0,
    patientType: row.patientType || 'ADULT',
    admissionType: row.admissionType || 'ROUTINE',
    nursingLevel: row.nursingLevel || 'LEVEL_2',
    needIoRecordBool: row.needIoRecord === 1,
    wardId: row.wardId,
    bedId: row.bedId,
    admissionDate: row.admissionDate || new Date().toISOString().split('T')[0],
    diagnosis: row.diagnosis || ''
  });
  if (form.wardId) {
    await onWardSelectChange(form.wardId, form.bedId);
  }
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!form.hospitalNo || !form.patientName || !form.wardId || !form.bedId) {
    ElMessage.warning('请填写住院号、姓名、病房及床位');
    return;
  }
  const selectedBedObj = emptyBeds.value.find((b: any) => b.id === form.bedId);
  const payload = {
    ...form,
    bedNo: selectedBedObj?.bedNo || '',
    needIoRecord: form.needIoRecordBool ? 1 : 0,
    drainageTubes: selectedTubes.value.join(',')
  };

  if (form.id) {
    await request.put('/patients/update', payload);
    ElMessage.success('病患档案更新成功');
  } else {
    await request.post('/patients/create', payload);
    ElMessage.success('病患建档成功，床位已标记占用并开启出入量监测');
  }
  dialogVisible.value = false;
  fetchPatients();
};

const handleDischarge = (row: any) => {
  ElMessageBox.confirm(
    `确定为病患【${row.patientName}】办理出院手续吗？<br/><strong style="color:#ef4444">注意：出院后系统将直接物理删除该病患档案，并立即释放床位【${row.bedNo}】为可用空床。</strong>`,
    '办理出院提示',
    {
      type: 'warning',
      dangerouslyUseHTMLString: true,
      confirmButtonText: '确定办理出院',
      cancelButtonText: '取消'
    }
  ).then(async () => {
    await request.post(`/patients/${row.id}/discharge`);
    ElMessage.success(`已为【${row.patientName}】办理出院，病患数据已物理删除并释放床位`);
    fetchPatients();
  });
};

const handleUnbind = (row: any) => {
  ElMessageBox.confirm(`确定解绑病患【${row.patientName}】当前绑定的微信账号吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await request.post(`/patients/${row.id}/unbind-wechat`);
    ElMessage.success('解绑成功');
    fetchPatients();
  });
};

// 表格单元格根据临床预警规则着色背景 (红底 / 黄底)
const getTableCellClass = ({ row, column }: any) => {
  if (column.property === 'todayBalance' && row.isBalanceAlert) {
    return 'cell-alert-red';
  }
  if (column.property === 'todayUrine' && row.isUrineAlert) {
    return 'cell-alert-red';
  }
  if (column.property === 'todayIv' && row.isIvAlert) {
    return 'cell-alert-yellow';
  }
  return '';
};

// 导出出入量 Excel 报表
const handleExportExcel = async () => {
  try {
    ElMessage.info('正在生成报表，请稍候...');
    const params: Record<string, any> = {};
    if (selectedWardId.value) {
      params.wardId = selectedWardId.value;
    }
    const data: any = await request({
      url: '/fluid-records/export-excel',
      method: 'GET',
      params,
      responseType: 'blob'
    });

    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `出入量记录报表_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    ElMessage.success('报表导出成功');
  } catch (err: any) {
    ElMessage.error(err.message || '导出报表失败');
  }
};

onMounted(async () => {
  await fetchWards();
  await fetchPatients();
});
</script>

<style scoped>
.filter-card {
  margin-bottom: 14px;
  background-color: #fafbfc;
}
.filter-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.header-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
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
.text-green {
  color: #059669;
}
.text-red {
  color: #f56c6c;
}
.text-yellow {
  color: #e6a23c;
}
.text-normal {
  color: #10b981;
}

.legend-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.red-badge {
  background-color: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}
.yellow-badge {
  background-color: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #faecd8;
}

.io-cell {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

/* 单元格红底与黄底背景高亮 */
:deep(.cell-alert-red) {
  background-color: #fef0f0 !important;
}
:deep(.cell-alert-yellow) {
  background-color: #fdf6ec !important;
}
</style>
