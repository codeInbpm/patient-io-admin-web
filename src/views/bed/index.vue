<template>
  <div class="container">
    <!-- 顶部病区选择、统计胶囊与视图切换 -->
    <div class="bed-top-bar">
      <div class="left-controls">
        <span class="label">当前科室病区：</span>
        <el-select v-model="selectedWardId" placeholder="请选择病房" @change="onWardChange" style="width: 240px;">
          <el-option v-for="w in wardList" :key="w.id" :label="w.wardName" :value="w.id" />
        </el-select>

        <!-- 床位使用率统计胶囊 -->
        <div class="stat-capsule" v-if="visualBedList.length > 0">
          <el-tag type="info" size="large">总床位: {{ visualBedList.length }} 张</el-tag>
          <el-tag type="danger" size="large">已占用: {{ occupiedCount }} 张</el-tag>
          <el-tag type="success" size="large">空床: {{ emptyCount }} 张</el-tag>
          <el-tag :type="occupancyRate > 85 ? 'warning' : 'primary'" size="large">
            使用率: {{ occupancyRate }}%
          </el-tag>
        </div>
      </div>

      <div class="right-actions">
        <el-radio-group v-model="viewMode" size="default">
          <el-radio-button label="visual">🖥️ 可视化病房床位图</el-radio-button>
          <el-radio-button label="table">📋 传统列表模式</el-radio-button>
        </el-radio-group>

        <el-button type="warning" icon="Lightning" @click="batchDialogVisible = true">
          ⚡ 批量铺设房间床位
        </el-button>
        <el-button type="primary" icon="Plus" :disabled="!selectedWardId" @click="handleCreateSingleBed">
          单个加床
        </el-button>
      </div>
    </div>

    <!-- 顶部综合筛选栏 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" class="filter-form">
        <el-form-item label="所属房间：">
          <el-select v-model="filterRoom" placeholder="全部房间" clearable style="width: 150px;">
            <el-option label="全部房间" value="" />
            <el-option v-for="r in availableRooms" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>

        <el-form-item label="床位状态：">
          <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 130px;">
            <el-option label="全部状态" value="" />
            <el-option label="🔴 已占用" :value="1" />
            <el-option label="🟢 空闲空床" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item label="快捷搜索：">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索床位号/占用病患姓名/住院号"
            clearable
            prefix-icon="Search"
            style="width: 260px;"
          />
        </el-form-item>

        <el-form-item>
          <el-button @click="resetFilters">重置</el-button>
          <span class="filter-result-tip">
            筛选结果：共 <strong>{{ filteredBedList.length }}</strong> 张床位
          </span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 1. 核心视图：可视化房间-床位物理格局大屏 (Visual Board) -->
    <div v-if="viewMode === 'visual'" class="visual-board-wrapper">
      <div v-if="groupedRooms.length > 0" class="room-grid">
        <!-- 房间区块容器 (Room Block) -->
        <div v-for="room in groupedRooms" :key="room.roomNo" class="room-box">
          <div class="room-header">
            <div class="room-title-wrap">
              <span class="room-title">🚪 {{ room.roomNo }}</span>
              <el-tag size="small" type="info" style="margin-left: 8px;">{{ room.beds.length }} 张床</el-tag>
            </div>
            <div class="room-right-info">
              <span class="room-badge">
                {{ room.beds.filter((b: any) => b.status === 1).length }} / {{ room.beds.length }} 床占用
              </span>
            </div>
          </div>

          <!-- 房间内床位卡片列表 (Bed Cards in Room) -->
          <div class="beds-in-room">
            <div
              v-for="bed in room.beds"
              :key="bed.bedId"
              class="bed-card"
              :class="{
                'bed-occupied': bed.status === 1,
                'bed-empty': bed.status === 0,
                'bed-alert': bed.status === 1 && bed.isAbnormal
              }"
              @click="handleBedCardClick(bed)"
            >
              <!-- 床位卡片顶部条（含直接修改/删除床位操作） -->
              <div class="bed-card-top">
                <span class="bed-no-tag">🛏️ {{ bed.bedNo }}</span>
                <div class="top-right-group">
                  <el-tag v-if="bed.status === 1" :type="bed.isAbnormal ? 'danger' : 'primary'" size="small">
                    {{ bed.isAbnormal ? '⚠️ 异常' : (bed.nursingLevel ? formatNursingLevel(bed.nursingLevel) : '在院') }}
                  </el-tag>
                  <el-tag v-else type="success" size="small" effect="plain">空床</el-tag>

                  <!-- 🌟 可视化卡片上的快捷编辑与删除入口 -->
                  <el-button
                    link
                    type="primary"
                    icon="Edit"
                    title="编辑此床位/所属房间"
                    class="card-act-btn"
                    @click.stop="handleEditBed(bed)"
                  />
                  <el-button
                    v-if="bed.status === 0"
                    link
                    type="danger"
                    icon="Delete"
                    title="删除该空床"
                    class="card-act-btn"
                    @click.stop="handleDeleteBed(bed)"
                  />
                </div>
              </div>

              <!-- 已占用：病患姓名、住院号、临床诊断及出入量 -->
              <div v-if="bed.status === 1" class="bed-patient-body">
                <div class="p-main-info">
                  <span class="p-name">{{ bed.patientName }}</span>
                  <span class="p-sub" v-if="bed.gender">({{ bed.gender === 1 ? '男' : '女' }} {{ bed.age }}岁)</span>
                </div>
                <div class="p-hosp-no">住院号: {{ bed.hospitalNo || '-' }}</div>
                <div class="p-diag" :title="bed.diagnosis">诊断: {{ bed.diagnosis || '未填诊断' }}</div>

                <div class="nurse-assigned-tag">
                  👩‍⚕️ 责任: {{ bed.assignedNurseName || '未指定' }}
                </div>

                <!-- 出入量监控小胶囊 -->
                <div class="io-pill" :class="bed.isAbnormal ? 'io-pill-alert' : ''">
                  <span>入: {{ bed.todayIntake || 0 }}</span>
                  <span>出: {{ bed.todayOutput || 0 }}</span>
                  <strong :style="{ color: bed.isAbnormal ? '#ef4444' : '#10b981' }">
                    净: {{ bed.todayBalance > 0 ? '+' : '' }}{{ bed.todayBalance || 0 }}
                  </strong>
                </div>
              </div>

              <!-- 空床：收治提示 -->
              <div v-else class="bed-empty-body">
                <el-icon class="empty-icon"><Plus /></el-icon>
                <span class="empty-text">点击快捷录入病患收治</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-empty v-else description="没有符合筛选条件的房间与床位" />
    </div>

    <!-- 2. 传统数据表格视图 (Table View) -->
    <div v-else class="table-view-wrapper">
      <el-table :data="filteredBedList" border stripe class="table">
        <el-table-column prop="bedId" label="床位ID" width="80" align="center" />
        <el-table-column prop="roomNo" label="所属房间" width="130" align="center">
          <template #default="{ row }">
            <el-tag effect="plain" type="info">🚪 {{ row.roomNo || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bedNo" label="床位编号" width="110" align="center">
          <template #default="{ row }">
            <strong>{{ row.bedNo }}</strong>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="使用状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'danger' : 'success'">
              {{ row.status === 1 ? '已占用' : '空闲空床' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="patientName" label="占用人(病患姓名)" width="130">
          <template #default="{ row }">
            <span v-if="row.status === 1" class="font-bold text-blue">{{ row.patientName }}</span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="hospitalNo" label="住院号" width="130">
          <template #default="{ row }">
            {{ row.hospitalNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="assignedNurseName" label="责任护士" width="110" align="center">
          <template #default="{ row }">
            <span v-if="row.assignedNurseName">{{ row.assignedNurseName }}</span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column label="今日出入量平衡" width="130" align="right">
          <template #default="{ row }">
            <span v-if="row.status === 1" :style="{ color: row.isAbnormal ? '#ef4444' : '#10b981', fontWeight: 'bold' }">
              {{ row.todayBalance > 0 ? '+' : '' }}{{ row.todayBalance }} ml
            </span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column label="管理操作" width="140" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEditBed(row)">编辑</el-button>
            <el-button link type="danger" v-if="row.status === 0" @click="handleDeleteBed(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 批量铺设房间床位对话框 -->
    <el-dialog v-model="batchDialogVisible" title="⚡ 批量生成病房-床位布局（如上海市一院胃肠科）" width="560px">
      <el-alert
        title="规则举例：1-12号房间每间3张床（编号1~36）；13号房间2张床（编号37~38）"
        type="info"
        show-icon
        :closable="false"
        style="margin-bottom: 16px;"
      />
      <el-form :model="batchForm" label-width="170px">
        <el-form-item label="标准房间总间数">
          <el-input-number v-model="batchForm.standardRooms" :min="1" :max="50" />
          <span class="unit-text">间（如12间）</span>
        </el-form-item>
        <el-form-item label="每间标准房床位数">
          <el-input-number v-model="batchForm.bedsPerStandardRoom" :min="1" :max="10" />
          <span class="unit-text">张床（如3张）</span>
        </el-form-item>
        <el-form-item label="末尾房间特殊床位数">
          <el-input-number v-model="batchForm.lastRoomBeds" :min="0" :max="10" />
          <span class="unit-text">张床（如2张，0表示无特殊）</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchSubmit">立即智能生成全部床位</el-button>
      </template>
    </el-dialog>

    <!-- 单个添加/编辑床位对话框（支持编辑所属房间） -->
    <el-dialog v-model="singleDialogVisible" :title="singleForm.id ? '编辑床位与所属房间' : '单个新增床位'" width="480px">
      <el-form :model="singleForm" label-width="95px">
        <el-form-item label="所属房间" required>
          <el-select
            v-model="singleForm.roomNo"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入房间名(如01号房间)"
            style="width: 100%;"
          >
            <el-option v-for="r in availableRooms" :key="r" :label="r" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="床位编号" required>
          <el-input v-model="singleForm.bedNo" placeholder="如：01床、3床、加1床" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="singleForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="singleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSingleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../utils/request';

const router = useRouter();
const route = useRoute();

const wardList = ref<any[]>([]);
const selectedWardId = ref<number | null>(null);
const visualBedList = ref<any[]>([]);
const viewMode = ref<'visual' | 'table'>('visual');

// 筛选状态
const filterRoom = ref('');
const filterStatus = ref<number | ''>('');
const searchKeyword = ref('');

// 提取当前病区所有可用房间列表
const availableRooms = computed(() => {
  const set = new Set<string>();
  visualBedList.value.forEach(b => {
    if (b.roomNo) set.add(b.roomNo);
  });
  return Array.from(set).sort();
});

// 根据筛选条件过滤床位
const filteredBedList = computed(() => {
  return visualBedList.value.filter(bed => {
    // 房间筛选
    if (filterRoom.value && bed.roomNo !== filterRoom.value) {
      return false;
    }
    // 状态筛选
    if (filterStatus.value !== '' && bed.status !== filterStatus.value) {
      return false;
    }
    // 关键词搜索（床位号/患者姓名/住院号）
    if (searchKeyword.value.trim()) {
      const kw = searchKeyword.value.trim().toLowerCase();
      const matchBedNo = (bed.bedNo || '').toLowerCase().includes(kw);
      const matchPatient = (bed.patientName || '').toLowerCase().includes(kw);
      const matchHospNo = (bed.hospitalNo || '').toLowerCase().includes(kw);
      if (!matchBedNo && !matchPatient && !matchHospNo) {
        return false;
      }
    }
    return true;
  });
});

const resetFilters = () => {
  filterRoom.value = '';
  filterStatus.value = '';
  searchKeyword.value = '';
};

const batchDialogVisible = ref(false);
const batchForm = reactive({
  standardRooms: 12,
  bedsPerStandardRoom: 3,
  lastRoomBeds: 2
});

const singleDialogVisible = ref(false);
const singleForm = reactive({ id: null, wardId: null as any, roomNo: '', bedNo: '', sortOrder: 0 });

const occupiedCount = computed(() => visualBedList.value.filter(b => b.status === 1).length);
const emptyCount = computed(() => visualBedList.value.filter(b => b.status === 0).length);
const occupancyRate = computed(() => {
  if (visualBedList.value.length === 0) return 0;
  return Math.round((occupiedCount.value / visualBedList.value.length) * 100);
});

// 按房间归组（使用 filteredBedList 联动筛选）
const groupedRooms = computed(() => {
  const map = new Map<string, any[]>();
  filteredBedList.value.forEach(bed => {
    const room = bed.roomNo || '未分组房间';
    if (!map.has(room)) {
      map.set(room, []);
    }
    map.get(room)!.push(bed);
  });

  return Array.from(map.entries()).map(([roomNo, beds]) => ({
    roomNo,
    beds
  }));
});

const formatNursingLevel = (lvl: string) => {
  const map: Record<string, string> = {
    SPECIAL: '特级护理',
    LEVEL_1: '一级护理',
    LEVEL_2: '二级护理',
    LEVEL_3: '三级护理'
  };
  return map[lvl] || '在院';
};

const fetchWards = async () => {
  const res = (await request.get('/wards/list')) as any;
  wardList.value = res;
  if (route.query.status !== undefined && route.query.status !== '') {
    filterStatus.value = Number(route.query.status);
  }
  if (res && res.length > 0) {
    if (route.query.wardId) {
      const qWard = res.find((w: any) => w.id === Number(route.query.wardId));
      if (qWard) {
        selectedWardId.value = qWard.id;
        fetchVisualBeds();
        return;
      }
    }
    // 优先默认展示护士所在的病区（满足图3需求）
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
    fetchVisualBeds();
  }
};

watch(() => route.query, () => {
  if (route.query.status !== undefined && route.query.status !== '') {
    filterStatus.value = Number(route.query.status);
  }
  if (route.query.wardId) {
    selectedWardId.value = Number(route.query.wardId);
    fetchVisualBeds();
  }
}, { deep: true });

const onWardChange = (val: number) => {
  sessionStorage.setItem('admin_selected_ward_id', String(val));
  fetchVisualBeds();
};

const fetchVisualBeds = async () => {
  if (!selectedWardId.value) return;
  const res = (await request.get(`/beds/visual-matrix/${selectedWardId.value}`)) as any;
  visualBedList.value = res;
};

// 点击床位卡片
const handleBedCardClick = (bed: any) => {
  if (bed.status === 0) {
    ElMessageBox.confirm(`【${bed.bedNo}】当前为空床，是否前往病患建档页面收治新患者入住该床位？`, '收治入住', {
      type: 'info',
      confirmButtonText: '去建档收治'
    }).then(() => {
      router.push('/patient');
    });
  } else {
    ElMessageBox.alert(
      `<div style="line-height:1.8">
        <div><strong>所属房间：</strong>${bed.roomNo || '未分组'}</div>
        <div><strong>患者姓名：</strong>${bed.patientName} (${bed.gender === 1 ? '男' : '女'} ${bed.age}岁)</div>
        <div><strong>住院号：</strong>${bed.hospitalNo || '-'}</div>
        <div><strong>临床诊断：</strong>${bed.diagnosis || '暂无'}</div>
        <div><strong>责任护士：</strong>${bed.assignedNurseName || '未指定'}</div>
        <hr style="margin:8px 0; border:none; border-top:1px dashed #e2e8f0;"/>
        <div><strong>今日入量：</strong><span style="color:#10b981">${bed.todayIntake} ml</span></div>
        <div><strong>今日出量：</strong><span style="color:#f59e0b">${bed.todayOutput} ml</span></div>
        <div><strong>净平衡：</strong><span style="color:${bed.isAbnormal ? '#ef4444' : '#2563eb'}; font-weight:bold">${bed.todayBalance} ml</span> ${bed.isAbnormal ? ' (⚠️ 异常预警)' : ''}</div>
      </div>`,
      `床位病患详情 - ${bed.bedNo}`,
      { dangerouslyUseHTMLString: true }
    );
  }
};

// 批量铺设
const handleBatchSubmit = async () => {
  await request.post('/beds/batch-generate', {
    wardId: selectedWardId.value,
    ...batchForm
  });
  ElMessage.success('批量房间与床位生成成功！');
  batchDialogVisible.value = false;
  fetchVisualBeds();
};

const handleCreateSingleBed = () => {
  // 默认取当前最后一个房间或01号房间
  const defaultRoom = availableRooms.value.length > 0 ? availableRooms.value[availableRooms.value.length - 1] : '01号房间';
  Object.assign(singleForm, {
    id: null,
    wardId: selectedWardId.value,
    roomNo: defaultRoom,
    bedNo: '',
    sortOrder: visualBedList.value.length + 1
  });
  singleDialogVisible.value = true;
};

// 无论是列表模式还是可视化卡片，均可点击编辑
const handleEditBed = (rowOrBed: any) => {
  const bId = rowOrBed.bedId || rowOrBed.id;
  Object.assign(singleForm, {
    id: bId,
    wardId: rowOrBed.wardId || selectedWardId.value,
    roomNo: rowOrBed.roomNo || '',
    bedNo: rowOrBed.bedNo,
    sortOrder: rowOrBed.sortOrder || 0
  });
  singleDialogVisible.value = true;
};

const handleSingleSubmit = async () => {
  if (!singleForm.bedNo.trim()) {
    ElMessage.warning('请输入床位编号');
    return;
  }
  try {
    if (singleForm.id) {
      await request.put('/beds/update', singleForm);
    } else {
      await request.post('/beds/create', singleForm);
    }
    ElMessage.success('床位及房间信息保存成功');
    singleDialogVisible.value = false;
    fetchVisualBeds();
  } catch (e: any) {
    console.error(e);
  }
};

const handleDeleteBed = (rowOrBed: any) => {
  const bId = rowOrBed.bedId || rowOrBed.id;
  ElMessageBox.confirm(`确定删除床位【${rowOrBed.bedNo}】吗？`, '警告', { type: 'warning' }).then(async () => {
    await request.delete(`/beds/${bId}`);
    ElMessage.success('删除成功');
    fetchVisualBeds();
  });
};

onMounted(fetchWards);
</script>

<style scoped>
.bed-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 16px;
}
.left-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.label {
  font-size: 14px;
  color: #374151;
}
.stat-capsule {
  display: flex;
  gap: 8px;
}
.right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* 可视化房间-床位布局 */
.visual-board-wrapper {
  margin-top: 10px;
}
.room-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.room-box {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 18px;
}
.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #cbd5e1;
}
.room-title-wrap {
  display: flex;
  align-items: center;
}
.room-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}
.room-badge {
  font-size: 13px;
  color: #64748b;
}

.beds-in-room {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.bed-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 140px;
}
.bed-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.bed-occupied {
  border-left: 4px solid #ef4444;
  background-color: #fffafa;
}
.bed-empty {
  border-left: 4px solid #10b981;
  background-color: #f0fdf4;
}
.bed-alert {
  border-left: 5px solid #dc2626 !important;
  background-color: #fef2f2 !important;
  animation: pulse-border 2s infinite;
}

@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
  100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}

.bed-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.bed-no-tag {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}
.top-right-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.card-act-btn {
  padding: 2px 4px !important;
  font-size: 14px;
}

.bed-patient-body {
  font-size: 13px;
  color: #334155;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.p-main-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.p-name {
  font-size: 15px;
  font-weight: 700;
  color: #1d4ed8;
}
.p-sub {
  font-size: 12px;
  color: #64748b;
}
.p-hosp-no {
  font-size: 12px;
  color: #475569;
}
.p-diag {
  font-size: 12px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nurse-assigned-tag {
  font-size: 12px;
  color: #059669;
  font-weight: 600;
  margin-top: 2px;
}

.io-pill {
  margin-top: 6px;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
  display: flex;
  justify-content: space-between;
  color: #475569;
}
.io-pill-alert {
  background: #fee2e2;
  border: 1px solid #fca5a5;
}

.bed-empty-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #059669;
  height: 80px;
  gap: 6px;
}
.empty-icon {
  font-size: 24px;
}
.empty-text {
  font-size: 13px;
  font-weight: 500;
}

.unit-text {
  margin-left: 8px;
  color: #6b7280;
  font-size: 13px;
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
.text-gray {
  color: #9ca3af;
}
</style>
