<template>
  <div class="container">
    <!-- 顶部选项卡：所在楼宇 / 病区 / 楼宇与病区层级树 -->
    <el-tabs v-model="activeTab" type="border-card" class="dept-tabs" @tab-change="handleTabChange">
      <!-- 1. 所在楼宇字典管理 -->
      <el-tab-pane label="🏢 所在楼宇" name="dept">
        <div class="handle-box">
          <el-button type="primary" icon="Plus" @click="handleCreateDept">新增所在楼宇</el-button>
          <el-button type="success" icon="Refresh" @click="fetchDeptList">刷新楼宇列表</el-button>
          <el-input
            v-model="deptSearchKeyword"
            placeholder="搜索楼宇名称或楼宇代码"
            clearable
            prefix-icon="Search"
            style="width: 260px; margin-left: 12px;"
          />
          <span class="tip-text">💡 医院所在楼宇字典：当前重点保障 2号楼、7号楼、12号楼、急诊楼 等核心住院查房楼宇</span>
        </div>

        <el-table :data="filteredDeptList" border stripe class="table" empty-text="暂无楼宇字典数据">
          <el-table-column prop="id" label="楼宇ID" width="90" align="center" />
          <el-table-column prop="deptName" label="楼宇名称" min-width="160">
            <template #default="{ row }">
              <span class="font-bold text-blue">🏢 {{ row.deptName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="deptCode" label="楼宇编码 (代码)" width="160" align="center">
            <template #default="{ row }">
              <el-tag effect="plain" type="info">{{ row.deptCode || '-' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序权重" width="100" align="center" />
          <el-table-column prop="status" label="运营状态" width="110" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                {{ row.status === 1 ? '正常启用' : '已停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
          <el-table-column label="管理操作" width="200" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleEditDept(row)">编辑楼宇</el-button>
              <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="handleToggleDeptStatus(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDeleteDept(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 2. 病区 -->
      <el-tab-pane label="🛏️ 病区" name="ward">
        <div class="handle-box">
          <el-button type="primary" icon="Plus" @click="handleCreateWard">新增病区</el-button>
          <el-button type="success" icon="Refresh" @click="fetchWardList">刷新病区列表</el-button>
          <el-select v-model="wardDeptFilter" placeholder="按所在楼宇筛选" clearable style="width: 170px; margin-left: 12px;">
            <el-option label="全部楼宇" value="" />
            <el-option v-for="d in deptList" :key="d.id" :label="d.deptName" :value="d.deptName" />
          </el-select>
          <el-select v-model="wardStatusFilter" placeholder="病区状态筛选" clearable style="width: 150px; margin-left: 10px;">
            <el-option label="全部状态" value="" />
            <el-option label="仅正常启用" :value="1" />
            <el-option label="仅已停用" :value="0" />
          </el-select>
          <el-input
            v-model="wardSearchKeyword"
            placeholder="搜索病区名称/所在楼宇"
            clearable
            prefix-icon="Search"
            style="width: 220px; margin-left: 10px;"
          />
          <span class="tip-text">当前已启用7号楼全部病区，其他楼宇病区处于禁用状态</span>
        </div>

        <el-table :data="filteredWardList" border stripe class="table" empty-text="暂无病区数据">
          <el-table-column prop="id" label="病区ID" width="90" align="center" />
          <el-table-column prop="wardName" label="病区名称" min-width="220">
            <template #default="{ row }">
              <span class="font-bold text-green">🛏️ {{ row.wardName }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="building" label="所在楼宇" width="150" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.building" type="warning" effect="plain">🏢 {{ row.building }}</el-tag>
              <span v-else style="color:#9ca3af;">未指定</span>
            </template>
          </el-table-column>
          <el-table-column prop="roomNo" label="代表房间号" width="120" align="center">
            <template #default="{ row }">
              <span>{{ row.roomNo ? `${row.roomNo}室` : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="sortOrder" label="排序权重" width="90" align="center" />
          <el-table-column prop="status" label="运营状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 1 ? 'success' : 'danger'" effect="light">
                {{ row.status === 1 ? '正常启用' : '已停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="管理操作" width="220" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleEditWard(row)">编辑</el-button>
              <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="handleToggleWardStatus(row)">
                {{ row.status === 1 ? '停用' : '启用' }}
              </el-button>
              <el-button link type="danger" @click="handleDeleteWard(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 3. 楼宇与病区层级树 -->
      <el-tab-pane label="🌲 楼宇与病区层级树" name="tree">
        <div class="handle-box">
          <el-button type="success" icon="Refresh" @click="fetchTreeData">刷新层级树</el-button>
          <el-select v-model="treeStatusFilter" placeholder="按病区状态筛选" style="width: 160px; margin-left: 12px;">
            <el-option label="全部病区状态" value="" />
            <el-option label="仅正常启用" :value="1" />
            <el-option label="仅已停用" :value="0" />
          </el-select>
          <el-checkbox v-model="treeHideEmptyDept" style="margin-left: 14px;">
            隐藏无匹配病区的楼宇
          </el-checkbox>
          <span class="tree-tip">💡 树状层级展示：支持按启用/停用过滤病区节点，点击楼宇展开下属病区</span>
        </div>

        <el-table
          :data="filteredTreeData"
          row-key="rowKey"
          border
          default-expand-all
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          class="table"
        >
          <el-table-column prop="name" label="楼宇 / 病区结构" min-width="280">
            <template #default="{ row }">
              <span v-if="row.nodeType === 'DEPT'" class="node-dept">
                🏢 <strong>{{ row.name }}</strong>
                <el-tag size="small" type="primary" style="margin-left: 8px;">所在楼宇</el-tag>
                <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" style="margin-left: 6px;">
                  {{ row.status === 1 ? '楼宇启用' : '楼宇停用' }}
                </el-tag>
              </span>
              <span v-else class="node-ward">
                🛏️ {{ row.name }}
                <el-tag size="small" type="success" style="margin-left: 8px;">病区</el-tag>
                <el-tag size="small" :type="row.status === 1 ? 'success' : 'danger'" style="margin-left: 6px;">
                  {{ row.status === 1 ? '正常启用' : '已停用' }}
                </el-tag>
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="building" label="所在楼宇" width="160" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.nodeType === 'WARD' && row.building" type="warning" effect="plain">
                🏢 {{ row.building }}
              </el-tag>
              <span v-else-if="row.nodeType === 'WARD'" style="color:#9ca3af;">未指定</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="codeOrRoom" label="代码 / 房间号" width="140" align="center">
            <template #default="{ row }">
              <span v-if="row.nodeType === 'DEPT'">{{ row.deptCode || '-' }}</span>
              <span v-else>{{ row.roomNo ? `${row.roomNo}室` : '-' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="subCount" label="下属病区数" width="110" align="center">
            <template #default="{ row }">
              <el-badge v-if="row.nodeType === 'DEPT'" :value="row.children ? row.children.length : 0" type="primary" />
              <span v-else style="color: #9ca3af;">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="sortOrder" label="排序权重" width="90" align="center" />

          <el-table-column label="管理操作" width="240" align="center">
            <template #default="{ row }">
              <template v-if="row.nodeType === 'DEPT'">
                <el-button link type="success" @click="handleCreateWardUnderDept(row)">+ 新增病区</el-button>
                <el-button link type="primary" @click="handleEditDept(row)">编辑楼宇</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" @click="handleEditWard(row)">编辑</el-button>
                <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="handleToggleWardStatus(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </el-button>
                <el-button link type="danger" @click="handleDeleteWard(row)">删除</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 所在楼宇编辑对话框 -->
    <el-dialog v-model="deptDialogVisible" :title="deptForm.id ? '编辑所在楼宇' : '新增所在楼宇'" width="450px">
      <el-form :model="deptForm" label-width="95px">
        <el-form-item label="楼宇名称" required>
          <el-input v-model="deptForm.deptName" placeholder="如：2号楼、7号楼、12号楼、急诊楼" />
        </el-form-item>
        <el-form-item label="楼宇编码">
          <el-input v-model="deptForm.deptCode" placeholder="如：BUILDING_2、BUILDING_7" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="deptForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="deptForm.status" :active-value="1" :inactive-value="0" active-text="正常启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deptDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDeptSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 病区编辑对话框 -->
    <el-dialog v-model="wardDialogVisible" :title="wardForm.id ? '编辑病区' : '新增病区'" width="480px">
      <el-form :model="wardForm" label-width="100px">
        <el-form-item label="所在楼宇" required>
          <el-select v-model="wardForm.deptId" placeholder="选择所在楼宇" style="width:100%" @change="onDeptSelectChange">
            <el-option
              v-for="d in deptList"
              :key="d.id"
              :label="d.deptName"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="病区名称" required>
          <el-input v-model="wardForm.wardName" placeholder="如：7#7A眼科病房、2#18F干细胞移植病房" />
        </el-form-item>
        <el-form-item label="代表房间号">
          <el-input v-model="wardForm.roomNo" placeholder="如：301室" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="wardForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="wardForm.status" :active-value="1" :inactive-value="0" active-text="正常启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="wardDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleWardSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../../utils/request';

const activeTab = ref('dept');

// 1. 所在楼宇字典相关数据与方法
const deptList = ref<any[]>([]);
const deptSearchKeyword = ref('');
const deptDialogVisible = ref(false);
const deptForm = reactive({ id: null, deptName: '', deptCode: '', sortOrder: 0, status: 1 });

const filteredDeptList = computed(() => {
  if (!deptSearchKeyword.value.trim()) return deptList.value;
  const kw = deptSearchKeyword.value.trim().toLowerCase();
  return deptList.value.filter(
    (d: any) =>
      (d.deptName && d.deptName.toLowerCase().includes(kw)) ||
      (d.deptCode && d.deptCode.toLowerCase().includes(kw))
  );
});

const fetchDeptList = async () => {
  const depts = (await request.get('/admin/departments')) as any;
  const map = new Map<string, any>();
  (depts || []).forEach((d: any) => {
    if (!map.has(d.deptName)) {
      map.set(d.deptName, d);
    }
  });
  deptList.value = Array.from(map.values());
};

const handleCreateDept = () => {
  Object.assign(deptForm, { id: null, deptName: '', deptCode: '', sortOrder: deptList.value.length + 1, status: 1 });
  deptDialogVisible.value = true;
};

const handleEditDept = (row: any) => {
  Object.assign(deptForm, {
    id: row.id,
    deptName: row.deptName,
    deptCode: row.deptCode,
    sortOrder: row.sortOrder,
    status: row.status !== undefined ? row.status : 1
  });
  deptDialogVisible.value = true;
};

const handleToggleDeptStatus = async (row: any) => {
  const targetStatus = row.status === 1 ? 0 : 1;
  const actionText = targetStatus === 1 ? '启用' : '停用';
  await request.post('/admin/departments', {
    ...row,
    status: targetStatus
  });
  ElMessage.success(`已${actionText}楼宇【${row.deptName}】`);
  fetchDeptList();
};

const handleDeptSubmit = async () => {
  if (!deptForm.deptName.trim()) {
    ElMessage.warning('请输入楼宇名称');
    return;
  }
  await request.post('/admin/departments', deptForm);
  ElMessage.success('所在楼宇保存成功');
  deptDialogVisible.value = false;
  fetchDeptList();
};

const handleDeleteDept = (row: any) => {
  ElMessageBox.confirm(`确定删除楼宇【${row.deptName}】吗？删除后属于该楼宇的病区请重新设置归属。`, '警告', {
    type: 'warning'
  }).then(async () => {
    await request.delete(`/admin/departments/${row.id}`);
    ElMessage.success('删除成功');
    fetchDeptList();
  });
};

// 2. 病区相关数据与方法
const wardList = ref<any[]>([]);
const wardDeptFilter = ref('');
const wardStatusFilter = ref<number | string>('');
const wardSearchKeyword = ref('');
const wardDialogVisible = ref(false);
const wardForm = reactive({
  id: null,
  wardName: '',
  building: '7号楼',
  deptId: null as any,
  department: '7号楼',
  roomNo: '',
  sortOrder: 0,
  status: 1
});

const filteredWardList = computed(() => {
  return wardList.value.filter((w: any) => {
    // 楼宇筛选
    if (wardDeptFilter.value && (w.department !== wardDeptFilter.value && w.building !== wardDeptFilter.value)) {
      return false;
    }
    // 状态筛选
    if (wardStatusFilter.value !== '' && wardStatusFilter.value !== null && wardStatusFilter.value !== undefined) {
      if (Number(w.status) !== Number(wardStatusFilter.value)) {
        return false;
      }
    }
    // 关键词筛选
    if (wardSearchKeyword.value.trim()) {
      const kw = wardSearchKeyword.value.trim().toLowerCase();
      const matchName = (w.wardName || '').toLowerCase().includes(kw);
      const matchBuilding = (w.building || '').toLowerCase().includes(kw);
      if (!matchName && !matchBuilding) return false;
    }
    return true;
  });
});

const fetchWardList = async () => {
  // 传 all=true 获取包括停用在内的全量病区（用于楼宇与病区字典维护）
  const wards = (await request.get('/wards/list', { params: { all: true } })) as any;
  wardList.value = wards || [];
};

const onDeptSelectChange = (deptId: number) => {
  const target = deptList.value.find(d => d.id === deptId);
  if (target) {
    wardForm.building = target.deptName;
    wardForm.department = target.deptName;
  }
};

const handleCreateWard = () => {
  const defaultDept = deptList.value.find(d => d.deptName === '7号楼') || deptList.value[0];
  Object.assign(wardForm, {
    id: null,
    wardName: '',
    building: defaultDept ? defaultDept.deptName : '7号楼',
    deptId: defaultDept ? defaultDept.id : null,
    department: defaultDept ? defaultDept.deptName : '7号楼',
    roomNo: '',
    sortOrder: wardList.value.length + 1,
    status: 1
  });
  wardDialogVisible.value = true;
};

const handleCreateWardUnderDept = (deptRow: any) => {
  Object.assign(wardForm, {
    id: null,
    wardName: '',
    building: deptRow.deptName,
    deptId: deptRow.id,
    department: deptRow.deptName,
    roomNo: '',
    sortOrder: 1,
    status: 1
  });
  wardDialogVisible.value = true;
};

const handleEditWard = (row: any) => {
  let dId = row.deptId;
  const bName = row.building || row.department || '7号楼';
  if (!dId) {
    const match = deptList.value.find(d => d.deptName === bName);
    if (match) dId = match.id;
  }
  Object.assign(wardForm, {
    id: row.id,
    wardName: row.wardName || row.name,
    building: bName,
    deptId: dId,
    department: bName,
    roomNo: row.roomNo || '',
    sortOrder: row.sortOrder || 0,
    status: row.status !== undefined ? Number(row.status) : 1
  });
  wardDialogVisible.value = true;
};

const handleToggleWardStatus = async (row: any) => {
  const targetStatus = row.status === 1 ? 0 : 1;
  const actionText = targetStatus === 1 ? '启用' : '停用';
  await request.put(`/wards/${row.id}/status?status=${targetStatus}`);
  ElMessage.success(`已${actionText}病区【${row.wardName || row.name}】`);
  await fetchWardList();
  if (activeTab.value === 'tree') await fetchTreeData();
};

const handleWardSubmit = async () => {
  if (!wardForm.wardName.trim()) {
    ElMessage.warning('请输入病区名称');
    return;
  }
  if (!wardForm.deptId && !wardForm.building) {
    ElMessage.warning('请选择所在楼宇');
    return;
  }
  if (wardForm.deptId && !wardForm.building) {
    const target = deptList.value.find(d => d.id === wardForm.deptId);
    if (target) {
      wardForm.building = target.deptName;
      wardForm.department = target.deptName;
    }
  }
  await request.post('/wards/save', wardForm);
  ElMessage.success('病区保存成功');
  wardDialogVisible.value = false;
  await fetchWardList();
  if (activeTab.value === 'tree') await fetchTreeData();
};

const handleDeleteWard = (row: any) => {
  ElMessageBox.confirm(`确定删除病区【${row.wardName || row.name}】吗？删除后该病区下的床位将无法访问。`, '警告', {
    type: 'warning'
  }).then(async () => {
    await request.delete(`/wards/${row.id}`);
    ElMessage.success('删除成功');
    await fetchWardList();
    if (activeTab.value === 'tree') await fetchTreeData();
  });
};

// 3. 楼宇与病区层级树数据及筛选
const rawTreeData = ref<any[]>([]);
const treeStatusFilter = ref<number | string>('');
const treeHideEmptyDept = ref(false);

const filteredTreeData = computed(() => {
  if (treeStatusFilter.value === '' && !treeHideEmptyDept.value) {
    return rawTreeData.value;
  }

  const result: any[] = [];
  rawTreeData.value.forEach(deptNode => {
    const originalChildren = deptNode.children || [];
    let matchedChildren = originalChildren;
    if (treeStatusFilter.value !== '' && treeStatusFilter.value !== null && treeStatusFilter.value !== undefined) {
      matchedChildren = originalChildren.filter((w: any) => Number(w.status) === Number(treeStatusFilter.value));
    }

    if (treeHideEmptyDept.value && matchedChildren.length === 0) {
      return; // 过滤掉没有符合条件病区的楼宇节点
    }

    result.push({
      ...deptNode,
      children: matchedChildren
    });
  });

  return result;
});

const fetchTreeData = async () => {
  await Promise.all([fetchDeptList(), fetchWardList()]);

  const wardGroupMap = new Map<string, any[]>();
  wardList.value.forEach((w: any) => {
    const key = w.deptId ? `id_${w.deptId}` : `name_${w.department || w.building}`;
    if (!wardGroupMap.has(key)) {
      wardGroupMap.set(key, []);
    }
    wardGroupMap.get(key)!.push({
      ...w,
      rowKey: `ward_${w.id}`,
      name: w.wardName,
      nodeType: 'WARD',
      building: w.building || w.department,
      codeOrRoom: w.roomNo,
      status: w.status !== undefined ? Number(w.status) : 1
    });
  });

  // 按楼宇名称去重，确保全平台/多医院聚合视图下层级树中每栋楼宇只展示唯一父节点
  const uniqueDeptMap = new Map<string, any>();
  deptList.value.forEach((d: any) => {
    if (!uniqueDeptMap.has(d.deptName)) {
      uniqueDeptMap.set(d.deptName, d);
    }
  });

  const nodes: any[] = [];
  uniqueDeptMap.forEach((d: any) => {
    const matchedWards = [
      ...(wardGroupMap.get(`id_${d.id}`) || []),
      ...(wardGroupMap.get(`name_${d.deptName}`) || [])
    ];
    const uniqueWards = Array.from(new Map(matchedWards.map(m => [m.id, m])).values());

    nodes.push({
      ...d,
      rowKey: `dept_${d.id}`,
      name: d.deptName,
      nodeType: 'DEPT',
      codeOrRoom: d.deptCode,
      status: d.status !== undefined ? Number(d.status) : 1,
      children: uniqueWards
    });
  });

  rawTreeData.value = nodes;
};

const handleTabChange = (tabName: any) => {
  if (tabName === 'dept') {
    fetchDeptList();
  } else if (tabName === 'ward') {
    fetchWardList();
  } else if (tabName === 'tree') {
    fetchTreeData();
  }
};

onMounted(() => {
  fetchDeptList();
  fetchWardList();
});
</script>

<style scoped>
.dept-tabs {
  background: #ffffff;
}
.handle-box {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.tip-text, .tree-tip {
  font-size: 13px;
  color: #6b7280;
  margin-left: 10px;
}
.table {
  width: 100%;
}
.node-dept {
  font-size: 15px;
  color: #1e293b;
}
.node-ward {
  font-size: 14px;
  color: #475569;
  padding-left: 8px;
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
</style>
