<template>
  <div class="rounds-page">
    <!-- 顶部综合操作横幅 -->
    <div class="rounds-header-banner">
      <div class="header-left">
        <div class="header-badge">
          <span class="live-pulse"></span>
          <span>夜查房全自动汇总结算系统 · 19:00 前交班</span>
        </div>
        <h1 class="header-title">
          <span>📝 护士长夜查房登记 & 护理交接班志</span>
        </h1>
        <p class="header-subtitle">
          系统根据当前在床病患、今日出入院动态、护理等级、留置管道及实时出入量全自动结算，免去人工重复清点！
        </p>
      </div>

      <div class="header-right">
        <!-- 病区切换选择器（只查启用的病区） -->
        <div class="ward-selector-box">
          <span class="selector-label">当前核算病区：</span>
          <el-select
            v-model="selectedWardId"
            placeholder="切换病区"
            @change="fetchSummary"
            class="ward-select"
            filterable
          >
            <el-option
              v-for="w in activeWardList"
              :key="w.id"
              :label="`${w.wardName} (${w.building || '综合楼'})`"
              :value="w.id"
            />
          </el-select>
        </div>

        <div class="action-buttons">
          <el-button
            type="primary"
            icon="Refresh"
            :loading="loading"
            @click="fetchSummary"
          >
            实时重新核算
          </el-button>
          <el-button
            type="success"
            icon="DocumentCopy"
            @click="handleCopyText"
          >
            复制标准化交班志
          </el-button>
          <el-button
            type="info"
            plain
            icon="Printer"
            @click="handlePrint"
          >
            打印交班表
          </el-button>
        </div>
      </div>
    </div>

    <!-- 第一层：病区动态与五总数核算仪表盘（4大卡片均展示真实数据，并支持携带条件点击跳转详情） -->
    <el-row :gutter="16" class="metric-row">
      <!-- 卡片1：在院病患总数与出入院异动 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div
          class="rounds-kpi-card theme-blue clickable-card"
          @click="goToPatientList()"
          title="点击跳转至【病患档案管理】查看该病区患者全量详情"
        >
          <div class="kpi-head">
            <span class="title">在院患者总数</span>
            <div class="head-right-actions">
              <el-tag size="small" type="primary" effect="plain">{{ summaryData.wardName }}</el-tag>
              <el-button
                link
                type="primary"
                size="small"
                class="jump-btn"
                @click.stop="goToPatientList()"
              >
                查看详情 ↗
              </el-button>
            </div>
          </div>
          <div class="kpi-val-box">
            <span class="kpi-num text-blue">{{ summaryData.totalPatientCount || 0 }}</span>
            <span class="kpi-unit">人</span>
            <span class="kpi-detail">（成人 {{ summaryData.totalAdultCount || 0 }} / 婴儿 {{ summaryData.totalInfantCount || 0 }}）</span>
          </div>
          <div class="kpi-sub-grid">
            <div
              class="sub-item clickable-sub"
              @click.stop="goToPatientList({ admissionType: 'ROUTINE' })"
              title="点击跳转并筛选【平诊入院】患者详情"
            >
              <span class="sub-lbl">平诊入院 ↗</span>
              <span class="sub-val">{{ summaryData.routineAdmissionCount || 0 }} 人</span>
            </div>
            <div
              class="sub-item clickable-sub"
              @click.stop="goToPatientList({ admissionType: 'EMERGENCY' })"
              title="点击跳转并筛选【急诊入院】患者详情"
            >
              <span class="sub-lbl">急诊入院 ↗</span>
              <span class="sub-val text-danger">{{ summaryData.emergencyAdmissionCount || 0 }} 人</span>
            </div>
            <div
              class="sub-item clickable-sub"
              @click.stop="goToPatientList({ status: 2 })"
              title="点击跳转查看【今日出院】病患详情"
            >
              <span class="sub-lbl">今日出院 ↗</span>
              <span class="sub-val text-warning">{{ summaryData.dischargeCount || 0 }} 人</span>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 卡片2：床位使用与真实占用情况 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div
          class="rounds-kpi-card theme-amber clickable-card"
          @click="goToBedManagement()"
          title="点击跳转至【床位管理】查看该病区可视化床位看板与房间分布"
        >
          <div class="kpi-head">
            <span class="title">病区床位占用情况</span>
            <div class="head-right-actions">
              <el-tag
                size="small"
                :type="summaryData.bedUsageRate > 85 ? 'danger' : summaryData.bedUsageRate > 50 ? 'warning' : 'success'"
                effect="plain"
              >
                {{ summaryData.bedUsageRate > 85 ? '床位紧张' : '运转平稳' }}
              </el-tag>
              <el-button
                link
                type="warning"
                size="small"
                class="jump-btn"
                @click.stop="goToBedManagement()"
              >
                床位管理 ↗
              </el-button>
            </div>
          </div>
          <div class="kpi-val-box">
            <span class="kpi-num">{{ summaryData.occupiedBeds || 0 }}</span>
            <span class="kpi-sub-total">/ {{ summaryData.totalBeds || 0 }} 张</span>
            <span class="kpi-detail">占用率 {{ summaryData.bedUsageRate || 0 }}%</span>
          </div>
          <div class="kpi-progress">
            <el-progress
              :percentage="Math.min(summaryData.bedUsageRate || 0, 100)"
              :color="getBedRateColor(summaryData.bedUsageRate)"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
          <div class="kpi-foot-text">
            <span
              class="clickable-sub"
              @click.stop="goToBedManagement(1)"
              title="点击跳转查看【已占用床位】详情"
            >
              在床占用：{{ summaryData.occupiedBeds || 0 }} 张 ↗
            </span>
            <span
              class="text-primary font-bold clickable-sub"
              @click.stop="goToBedManagement(0)"
              title="点击跳转查看【空闲空床】并排床"
            >
              空床：{{ Math.max((summaryData.totalBeds || 0) - (summaryData.occupiedBeds || 0), 0) }} 张 ↗
            </span>
          </div>
        </div>
      </el-col>

      <!-- 卡片3：护理分级分布（真实统计） -->
      <el-col :xs="24" :sm="12" :md="6">
        <div class="rounds-kpi-card theme-teal">
          <div class="kpi-head">
            <span class="title">护理分级管理</span>
            <div class="head-right-actions">
              <el-tag size="small" type="success" effect="plain">真实分级</el-tag>
              <el-button
                link
                type="success"
                size="small"
                class="jump-btn"
                @click.stop="goToPatientList()"
              >
                分级档案 ↗
              </el-button>
            </div>
          </div>
          <div class="care-level-grid">
            <div
              class="care-pill pill-special clickable-pill"
              @click="goToPatientList({ nursingLevel: 'SPECIAL' })"
              title="点击跳转查看【特级护理】病患档案详情"
            >
              <span class="pill-title">特级 ↗</span>
              <span class="pill-num">{{ summaryData.specialCareCount || 0 }}</span>
            </div>
            <div
              class="care-pill pill-level1 clickable-pill"
              @click="goToPatientList({ nursingLevel: 'LEVEL_1' })"
              title="点击跳转查看【一级护理】病患档案详情"
            >
              <span class="pill-title">一级 ↗</span>
              <span class="pill-num">{{ summaryData.level1CareCount || 0 }}</span>
            </div>
            <div
              class="care-pill pill-level2 clickable-pill"
              @click="goToPatientList({ nursingLevel: 'LEVEL_2' })"
              title="点击跳转查看【二级护理】病患档案详情"
            >
              <span class="pill-title">二级 ↗</span>
              <span class="pill-num">{{ summaryData.level2CareCount || 0 }}</span>
            </div>
            <div
              class="care-pill pill-level3 clickable-pill"
              @click="goToPatientList({ nursingLevel: 'LEVEL_3' })"
              title="点击跳转查看【三级护理】病患档案详情"
            >
              <span class="pill-title">三级 ↗</span>
              <span class="pill-num">{{ summaryData.level3CareCount || 0 }}</span>
            </div>
          </div>
          <div class="kpi-foot-text">
            <span>重症合计：{{ (summaryData.specialCareCount || 0) + (summaryData.level1CareCount || 0) }} 人</span>
            <span
              class="link-span font-bold text-danger"
              @click="goToPatientList({ isSevereCare: 1 })"
              title="点击跳转筛选特级+一级重症病患详情"
            >
              查看重症病患 ↗
            </span>
          </div>
        </div>
      </el-col>

      <!-- 卡片4：留置管道与出入量告警 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div class="rounds-kpi-card theme-indigo">
          <div class="kpi-head">
            <span class="title">管道监护与出入量告警</span>
            <div class="head-right-actions">
              <el-tag
                size="small"
                :type="(summaryData.abnormalIoCount || 0) > 0 ? 'danger' : 'success'"
                effect="dark"
              >
                {{ (summaryData.abnormalIoCount || 0) > 0 ? `${summaryData.abnormalIoCount} 例失衡` : '出入量正常' }}
              </el-tag>
              <el-button
                link
                type="danger"
                size="small"
                class="jump-btn"
                @click.stop="goToPatientList({ needIo: 1 })"
              >
                出入量档案 ↗
              </el-button>
            </div>
          </div>
          <div class="tubes-stat-grid">
            <div
              class="tube-item clickable-pill"
              @click="goToPatientList({ hasTube: 1 })"
              title="点击跳转查看【留置导尿管】患者详情"
            >
              <span class="tube-icon">🧪</span>
              <span class="tube-lbl">导尿管 ↗</span>
              <span class="tube-num font-bold">{{ summaryData.tubeCatheterCount || 0 }} 人</span>
            </div>
            <div
              class="tube-item clickable-pill"
              @click="goToPatientList({ hasTube: 1 })"
              title="点击跳转查看【引流管/胃管】患者详情"
            >
              <span class="tube-icon">🩸</span>
              <span class="tube-lbl">引流/胃管 ↗</span>
              <span class="tube-num font-bold">{{ (summaryData.tubeGastricCount || 0) + (summaryData.tubeDrainageCount || 0) }} 人</span>
            </div>
          </div>
          <div class="kpi-foot-text">
            <span
              class="text-primary font-bold link-span"
              @click="goToPatientList({ needIo: 1 })"
              title="点击跳转筛选【需测出入量】患者详情"
            >
              需测出入量：{{ summaryData.needIoCount || 0 }} 人 ↗
            </span>
            <span
              v-if="(summaryData.abnormalIoCount || 0) > 0"
              class="text-danger font-bold link-span"
              @click="goToPatientList({ isAbnormal: 1 })"
              title="点击跳转筛选【出入量失衡告警】患者详情"
            >
              ⚠️ 查看 {{ summaryData.abnormalIoCount }} 例失衡 ↗
            </span>
            <span v-else class="text-success">生理平衡平稳</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 第二层：在床病患巡视核对清册（床位巡房大表格） -->
    <div class="panel-box patient-list-panel" id="patient-list-section">
      <div class="panel-header">
        <div class="panel-title">
          <span class="dot-indicator"></span>
          <span>在床病患巡查与实时出入量核对清册</span>
          <span class="count-tag">{{ filteredPatients.length }} / {{ (summaryData.patientList || []).length }} 人</span>

          <!-- 当前下钻过滤条件提示标签 -->
          <div v-if="activeFilterTag" class="active-filter-badge">
            <el-tag size="small" type="warning" closable @close="clearExtraFilters">
              {{ activeFilterTag }}
            </el-tag>
          </div>
        </div>

        <div class="panel-toolbar">
          <el-radio-group v-model="filterType" size="small" class="filter-radios">
            <el-radio-button label="all">全部在床</el-radio-button>
            <el-radio-button label="needIo">需测出入量 ({{ countNeedIo }})</el-radio-button>
            <el-radio-button label="tubes">留置管道 ({{ countTubes }})</el-radio-button>
            <el-radio-button label="abnormal">出入量告警 ({{ countAbnormal }})</el-radio-button>
          </el-radio-group>

          <el-input
            v-model="searchKey"
            placeholder="搜索床号 / 姓名 / 诊断"
            prefix-icon="Search"
            size="small"
            clearable
            style="width: 200px"
          />

          <el-button
            type="primary"
            plain
            size="small"
            icon="User"
            @click="goToPatientList()"
          >
            病患档案总表 ↗
          </el-button>
        </div>
      </div>

      <el-table
        :data="paginatedPatients"
        stripe
        class="rounds-table"
        v-loading="loading"
        empty-text="当前筛选条件下暂无在床患者"
      >
        <el-table-column label="床号" width="100" align="center">
          <template #default="{ row }">
            <div class="bed-badge-box">
              <span class="bed-badge">{{ formatBedNo(row.bedNo) }}</span>
              <el-tag
                v-if="row.admissionType === 'EMERGENCY'"
                type="danger"
                size="small"
                effect="dark"
                class="emergency-tag"
              >
                急
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="患者姓名" width="130">
          <template #default="{ row }">
            <div class="patient-name-box">
              <span class="p-name link-span" @click="goToPatient(row.id)">{{ row.patientName }}</span>
              <span class="p-info">{{ row.gender === 1 ? '男' : '女' }} · {{ row.age }}岁</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="diagnosis" label="临床诊断" min-width="160" show-overflow-tooltip />

        <el-table-column label="护理级别" width="110" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getNursingTagType(row.nursingLevel)"
              size="small"
              class="clickable-tag"
              @click="goToPatientList({ nursingLevel: row.nursingLevel })"
              :title="`点击跳转查看所有【${getNursingLevelText(row.nursingLevel)}】病患档案`"
            >
              {{ getNursingLevelText(row.nursingLevel) }} ↗
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="留置管道" min-width="160">
          <template #default="{ row }">
            <div v-if="row.drainageTubes && row.drainageTubes.trim()" class="tube-tags-box">
              <el-tag
                v-for="t in parseTubes(row.drainageTubes)"
                :key="t"
                size="small"
                type="warning"
                effect="plain"
                class="tube-tag"
              >
                {{ t }}
              </el-tag>
            </div>
            <span v-else class="text-muted text-xs">无管道</span>
          </template>
        </el-table-column>

        <el-table-column label="今日已录入入量" width="130" align="right">
          <template #default="{ row }">
            <span class="text-green font-bold">{{ row.todayIntakeMl }} ml</span>
          </template>
        </el-table-column>

        <el-table-column label="今日已录入出量" width="130" align="right">
          <template #default="{ row }">
            <span class="text-orange font-bold">{{ row.todayOutputMl }} ml</span>
          </template>
        </el-table-column>

        <el-table-column label="净平衡 (差额)" width="130" align="right">
          <template #default="{ row }">
            <span :class="row.todayNetBalanceMl > 0 ? 'text-primary font-bold' : row.todayNetBalanceMl < 0 ? 'text-warning font-bold' : 'text-muted'">
              {{ row.todayNetBalanceMl > 0 ? `+${row.todayNetBalanceMl}` : row.todayNetBalanceMl }} ml
            </span>
          </template>
        </el-table-column>

        <el-table-column label="监测状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="row.isAbnormal"
              type="danger"
              size="small"
              effect="dark"
            >
              ⚠️ 异常失衡
            </el-tag>
            <el-tag
              v-else-if="row.needIoRecord"
              type="success"
              size="small"
              effect="plain"
            >
              监测中·正常
            </el-tag>
            <span v-else class="text-muted text-xs">常规监护</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goToPatient(row.id)">
              出入量详情
            </el-button>
            <el-button link type="success" size="small" @click="goToPatientList({ keyword: row.patientName })">
              档案 ↗
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 表格分页工具栏 -->
      <div class="table-pagination-bar">
        <div class="pagination-info">
          <span>共 <strong>{{ filteredPatients.length }}</strong> 位在床患者<template v-if="filteredPatients.length > 0">，当前第 {{ (currentPage - 1) * pageSize + 1 }} ~ {{ Math.min(currentPage * pageSize, filteredPatients.length) }} 位</template></span>
        </div>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredPatients.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
          size="default"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 第三层：夜班交班重点备忘 & 医院标准化交班报告预览 -->
    <el-row :gutter="16" class="memo-row">
      <!-- 重点风险交接备忘 -->
      <el-col :xs="24" :lg="11">
        <div class="panel-box memo-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="dot-indicator bg-orange"></span>
              <span>夜班重点巡查与交班备忘（重点防范）</span>
            </div>
          </div>

          <div class="memo-body">
            <!-- 自动归纳的重点患者 -->
            <div class="risk-section">
              <div class="risk-section-title">
                <span>⚠️ 本病区夜班需重点巡视患者 ({{ (summaryData.riskPatients || []).length }} 人)</span>
              </div>
              <div v-if="summaryData.riskPatients && summaryData.riskPatients.length > 0" class="risk-list">
                <div
                  v-for="rp in summaryData.riskPatients"
                  :key="rp.id"
                  class="risk-item clickable-risk"
                  @click="goToPatient(rp.id)"
                  title="点击直接查看该患者出入量详情"
                >
                  <div class="risk-item-left">
                    <span class="bed-tag">{{ formatBedNo(rp.bedNo) }}</span>
                    <span class="name">{{ rp.patientName }}</span>
                    <span class="diag">({{ rp.diagnosis }})</span>
                  </div>
                  <div class="risk-item-tags">
                    <el-tag
                      v-for="tag in rp.riskTags"
                      :key="tag"
                      size="small"
                      :type="tag === '出入量失衡' ? 'danger' : tag === '重症护理' ? 'primary' : 'warning'"
                    >
                      {{ tag }}
                    </el-tag>
                    <span class="view-link">核查 ↗</span>
                  </div>
                </div>
              </div>
              <div v-else class="risk-empty">
                <el-icon class="check-icon"><CircleCheckFilled /></el-icon>
                <span>本病区暂无极高危及失衡患者，常规巡查即可</span>
              </div>
            </div>

            <!-- 护士长手写交班叮嘱 -->
            <div class="custom-memo-box">
              <div class="memo-label">
                <span>📝 护士长夜班交班特别叮嘱（可选填，一并导出）：</span>
              </div>
              <el-input
                v-model="customMemo"
                type="textarea"
                :rows="3"
                placeholder="例如：夜间密切监测3床引流液颜色；7床明日晨起需空腹采血；注意防跌倒防压疮巡视等..."
                maxlength="200"
                show-word-limit
              />
            </div>
          </div>
        </div>
      </el-col>

      <!-- 标准化交班报告预览卡 -->
      <el-col :xs="24" :lg="13">
        <div class="panel-box preview-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="dot-indicator bg-green"></span>
              <span>医院标准化交班报告预览（每日 19:00 前）</span>
            </div>
            <el-button type="success" size="small" icon="DocumentCopy" @click="handleCopyText">
              一键复制文本
            </el-button>
          </div>

          <div class="report-preview-box">
            <pre class="report-content">{{ generatedReportText }}</pre>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  Refresh,
  DocumentCopy,
  Printer,
  Search,
  User,
  CircleCheckFilled
} from '@element-plus/icons-vue';
import request from '../../utils/request';

const router = useRouter();

const loading = ref(false);
const wardList = ref<any[]>([]);
const selectedWardId = ref<number | null>(null);
const summaryData = ref<any>({});
const customMemo = ref('');
const searchKey = ref('');

// 筛选状态
const filterType = ref('all');
const selectedNursingFilter = ref('');
const selectedAdmissionFilter = ref('');

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

// 格式化床号，防止数据库已存“12床”时渲染为“12床床”
const formatBedNo = (bedNo: any) => {
  if (!bedNo || bedNo === '-') return '-';
  const str = String(bedNo).trim();
  return str.endsWith('床') ? str : `${str}床`;
};

const todayStr = new Date().toISOString().split('T')[0];

// 只获取启用的活跃病区
const activeWardList = computed(() => {
  return wardList.value.filter((w: any) => w.status === 1 || w.status === undefined);
});

// 获取病区列表
const fetchWards = async () => {
  try {
    const res = (await request.get('/wards/list')) as any;
    wardList.value = res || [];
    if (activeWardList.value.length > 0) {
      const nurseWardId = Number(localStorage.getItem('admin_ward_id'));
      const cachedWardId = Number(sessionStorage.getItem('admin_selected_ward_id'));
      let targetWard = null;
      if (nurseWardId) {
        targetWard = activeWardList.value.find((w: any) => w.id === nurseWardId);
      }
      if (!targetWard && cachedWardId) {
        targetWard = activeWardList.value.find((w: any) => w.id === cachedWardId);
      }
      selectedWardId.value = targetWard ? targetWard.id : activeWardList.value[0].id;
      await fetchSummary();
    }
  } catch (e) {
    console.error('获取病区列表失败', e);
  }
};

// 获取夜查房汇总（结合底层实时床位矩阵与病患档案，确保 100% 真实数据）
const fetchSummary = async () => {
  if (!selectedWardId.value) return;
  loading.value = true;
  try {
    const wardId = selectedWardId.value;

    // 1. 获取汇总概览
    const resPromise = request.get('/admin/dashboard/night-rounds-summary', {
      params: { wardId }
    });
    // 2. 获取该病区实时真实患者档案（含真实床位号、真实护理级别、出入量）
    const patientsPromise = request.get('/patients/list', {
      params: { wardId }
    });
    // 3. 获取该病区真实床位矩阵（真实总床位与占用情况）
    const bedsPromise = request.get(`/beds/visual-matrix/${wardId}`);

    const [summaryRes, rawPatients, beds]: any = await Promise.all([
      resPromise.catch(() => ({})),
      patientsPromise.catch(() => []),
      bedsPromise.catch(() => [])
    ]);

    const data: any = summaryRes || {};

    // 真实床位计算（直接来自真实床位表）
    const bedList = Array.isArray(beds) ? beds : [];
    const totalBeds = bedList.length;
    const occupiedBeds = bedList.filter((b: any) => b.status === 1).length;
    const bedUsageRate = totalBeds > 0 ? Number(((occupiedBeds * 100) / totalBeds).toFixed(1)) : 0;

    data.totalBeds = totalBeds;
    data.occupiedBeds = occupiedBeds;
    data.bedUsageRate = bedUsageRate;

    // 真实病患及护理级别计算（直接来自真实患者档案）
    const pList = Array.isArray(rawPatients) ? rawPatients : [];
    data.totalPatientCount = pList.length;
    data.totalAdultCount = pList.filter((p: any) => p.patientType !== 'INFANT').length;
    data.totalInfantCount = pList.filter((p: any) => p.patientType === 'INFANT').length;

    data.specialCareCount = pList.filter((p: any) => p.nursingLevel === 'SPECIAL').length;
    data.level1CareCount = pList.filter((p: any) => p.nursingLevel === 'LEVEL_1').length;
    data.level2CareCount = pList.filter((p: any) => p.nursingLevel === 'LEVEL_2').length;
    data.level3CareCount = pList.filter((p: any) => p.nursingLevel === 'LEVEL_3').length;

    // 平急诊动态
    data.routineAdmissionCount = pList.filter((p: any) => p.admissionType !== 'EMERGENCY').length;
    data.emergencyAdmissionCount = pList.filter((p: any) => p.admissionType === 'EMERGENCY').length;

    // 需测出入量人数
    data.needIoCount = pList.filter((p: any) => p.needIoRecord === 1 || p.needIoRecord === true || p.needIoRecord == null).length;

    // 管道
    data.tubeCatheterCount = pList.filter((p: any) => p.drainageTubes && p.drainageTubes.toUpperCase().includes('CATHER')).length;
    data.tubeGastricCount = pList.filter((p: any) => p.drainageTubes && p.drainageTubes.toUpperCase().includes('GASTRIC')).length;
    data.tubeDrainageCount = pList.filter((p: any) => p.drainageTubes && (p.drainageTubes.toUpperCase().includes('ABDOMINAL') || p.drainageTubes.toUpperCase().includes('DRAINAGE'))).length;

    // 异常失衡
    data.abnormalIoCount = pList.filter((p: any) => p.isAbnormal || p.isBalanceAlert || p.isUrineAlert).length;

    // 组装真实在床病患核对清册
    data.patientList = pList.map((p: any) => ({
      id: p.id,
      bedNo: p.bedNo || '-',
      patientName: p.patientName,
      gender: p.gender,
      age: p.age,
      patientType: p.patientType,
      admissionType: p.admissionType || 'ROUTINE',
      nursingLevel: p.nursingLevel || 'LEVEL_2',
      diagnosis: p.diagnosis || '在床监护',
      needIoRecord: p.needIoRecord === 1 || p.needIoRecord === true || p.needIoRecord == null,
      drainageTubes: p.drainageTubes || '',
      todayIntakeMl: p.todayIntake != null ? p.todayIntake : 0,
      todayOutputMl: p.todayOutput != null ? p.todayOutput : 0,
      todayNetBalanceMl: p.todayBalance != null ? p.todayBalance : ((p.todayIntake || 0) - (p.todayOutput || 0)),
      isAbnormal: Boolean(p.isAbnormal || p.isBalanceAlert || p.isUrineAlert)
    }));

    // 风险患者
    data.riskPatients = data.patientList.filter((p: any) =>
      p.isAbnormal || (p.drainageTubes && p.drainageTubes.trim()) || p.nursingLevel === 'SPECIAL' || p.nursingLevel === 'LEVEL_1' || p.admissionType === 'EMERGENCY'
    ).map((p: any) => {
      const tags: string[] = [];
      if (p.isAbnormal) tags.push('出入量失衡');
      if (p.drainageTubes && p.drainageTubes.trim()) tags.push('留置管道');
      if (p.nursingLevel === 'SPECIAL' || p.nursingLevel === 'LEVEL_1') tags.push('重症护理');
      if (p.admissionType === 'EMERGENCY') tags.push('急诊入院');
      return { ...p, riskTags: tags };
    });

    summaryData.value = data;
    sessionStorage.setItem('admin_selected_ward_id', String(selectedWardId.value));
  } catch (error) {
    console.error('获取夜查房汇总失败', error);
  } finally {
    loading.value = false;
  }
};

// 页面跳转方法（全面携带查询条件）
const goToPatientList = (extraParams?: Record<string, any>) => {
  const query: Record<string, any> = {};
  if (selectedWardId.value) {
    query.wardId = selectedWardId.value;
  }
  if (extraParams) {
    Object.assign(query, extraParams);
  }
  router.push({ path: '/patient', query });
};

const goToBedManagement = (status?: number) => {
  const query: Record<string, any> = {};
  if (selectedWardId.value) {
    query.wardId = selectedWardId.value;
  }
  if (status !== undefined) {
    query.status = status;
  }
  router.push({ path: '/bed', query });
};

// 本地联动下钻筛选
const filterAndScroll = (type: string, nursingLvl = '', admissionType = '') => {
  filterType.value = type;
  selectedNursingFilter.value = nursingLvl;
  selectedAdmissionFilter.value = admissionType;
  scrollToTable();
};

const toggleNursingFilter = (lvl: string) => {
  if (selectedNursingFilter.value === lvl) {
    selectedNursingFilter.value = '';
  } else {
    selectedNursingFilter.value = lvl;
    scrollToTable();
  }
};

const clearExtraFilters = () => {
  selectedNursingFilter.value = '';
  selectedAdmissionFilter.value = '';
};

const scrollToTable = () => {
  const el = document.getElementById('patient-list-section');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const activeFilterTag = computed(() => {
  const tags: string[] = [];
  if (selectedNursingFilter.value) {
    tags.push(getNursingLevelText(selectedNursingFilter.value));
  }
  if (selectedAdmissionFilter.value === 'ROUTINE') {
    tags.push('平诊入院');
  } else if (selectedAdmissionFilter.value === 'EMERGENCY') {
    tags.push('急诊入院');
  }
  return tags.join(' · ');
});

// 列表筛选
const filteredPatients = computed(() => {
  let list = summaryData.value.patientList || [];

  // 单选大类
  if (filterType.value === 'needIo') {
    list = list.filter((p: any) => p.needIoRecord);
  } else if (filterType.value === 'tubes') {
    list = list.filter((p: any) => p.drainageTubes && p.drainageTubes.trim());
  } else if (filterType.value === 'abnormal') {
    list = list.filter((p: any) => p.isAbnormal);
  }

  // 护理级别过滤
  if (selectedNursingFilter.value) {
    list = list.filter((p: any) => p.nursingLevel === selectedNursingFilter.value);
  }

  // 平急诊过滤
  if (selectedAdmissionFilter.value) {
    list = list.filter((p: any) => p.admissionType === selectedAdmissionFilter.value);
  }

  // 搜索关键字
  if (searchKey.value.trim()) {
    const k = searchKey.value.trim().toLowerCase();
    list = list.filter((p: any) =>
      String(p.bedNo).toLowerCase().includes(k) ||
      String(p.patientName).toLowerCase().includes(k) ||
      String(p.diagnosis).toLowerCase().includes(k)
    );
  }

  return list;
});

// 分页切片数据
const paginatedPatients = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredPatients.value.slice(start, start + pageSize.value);
});

// 筛选条件变动时重置页码为第1页
watch([filterType, selectedNursingFilter, selectedAdmissionFilter, searchKey, selectedWardId], () => {
  currentPage.value = 1;
});

const countNeedIo = computed(() => {
  return (summaryData.value.patientList || []).filter((p: any) => p.needIoRecord).length;
});

const countTubes = computed(() => {
  return (summaryData.value.patientList || []).filter((p: any) => p.drainageTubes && p.drainageTubes.trim()).length;
});

const countAbnormal = computed(() => {
  return (summaryData.value.patientList || []).filter((p: any) => p.isAbnormal).length;
});

// 管道解析
const parseTubes = (tubesStr: string) => {
  if (!tubesStr) return [];
  const map: Record<string, string> = {
    CATHER: '导尿管',
    GASTRIC: '胃管/胃肠减压',
    ABDOMINAL: '腹腔引流管',
    DRAINAGE: '引流管',
    CHEST: '胸腔引流管',
    PICC: 'PICC置管',
    CVC: 'CVC中心静脉'
  };
  return tubesStr.split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => map[t.toUpperCase()] || t);
};

// 护理等级映射
const getNursingLevelText = (lvl: string) => {
  const map: Record<string, string> = {
    SPECIAL: '特级护理',
    LEVEL_1: '一级护理',
    LEVEL_2: '二级护理',
    LEVEL_3: '三级护理'
  };
  return map[lvl] || '普通护理';
};

const getNursingTagType = (lvl: string) => {
  if (lvl === 'SPECIAL') return 'danger';
  if (lvl === 'LEVEL_1') return 'warning';
  if (lvl === 'LEVEL_2') return 'primary';
  return 'info';
};

const getBedRateColor = (rate: number) => {
  if (rate > 85) return '#ef4444';
  if (rate > 50) return '#f59e0b';
  return '#3b82f6';
};

// 生成标准交班报告文本
const generatedReportText = computed(() => {
  const d = summaryData.value;
  const patients = d.patientList || [];
  const abnormalList = patients.filter((p: any) => p.isAbnormal);

  let abnormalText = '无出入量失衡患者，各项监测均在正常生理区间';
  if (abnormalList.length > 0) {
    abnormalText = abnormalList.map((p: any) =>
      `• ${formatBedNo(p.bedNo)} ${p.patientName}：入量${p.todayIntakeMl}ml / 出量${p.todayOutputMl}ml，净差额${p.todayNetBalanceMl}ml`
    ).join('\n');
  }

  const memoPart = customMemo.value.trim() ? `\n【夜班重点嘱托】\n${customMemo.value.trim()}\n` : '';

  return `========================================
🏥 护士长夜查房 & 护理交接班志
========================================
【病区信息】：${d.building || ''} · ${d.wardName || '未指定'}
【核算日期】：${todayStr} (19:00 前交班)
【床位动态】：在床 ${d.occupiedBeds || 0} / 总床位 ${d.totalBeds || 0} 张 (使用率 ${d.bedUsageRate || 0}%)
----------------------------------------
一、病患动态五总数
• 在院患者总数：${d.totalPatientCount || 0} 人（成人 ${d.totalAdultCount || 0} / 婴儿 ${d.totalInfantCount || 0}）
• 今日平诊入院：${d.routineAdmissionCount || 0} 人
• 今日急诊入院：${d.emergencyAdmissionCount || 0} 人
• 今日出院人数：${d.dischargeCount || 0} 人

二、护理分级与监护等级
• 特级护理：${d.specialCareCount || 0} 人   • 一级护理：${d.level1CareCount || 0} 人
• 二级护理：${d.level2CareCount || 0} 人   • 三级护理：${d.level3CareCount || 0} 人

三、留置管道与出入量监测
• 重点监测出入量：${d.needIoCount || 0} 人
• 留置导尿管人数：${d.tubeCatheterCount || 0} 人
• 胃肠减压/引流管：${(d.tubeGastricCount || 0) + (d.tubeDrainageCount || 0)} 人
• 出入量失衡预警：${d.abnormalIoCount || 0} 例

四、出入量重点关注/预警患者明细
${abnormalText}
${memoPart}----------------------------------------
交班人（护士长/值班护士）：_____________
接班人：_____________   时间：19:00
========================================`;
});

// 一键复制
const handleCopyText = () => {
  navigator.clipboard.writeText(generatedReportText.value).then(() => {
    ElMessage.success('已复制标准化交班志文本到剪贴板，可直接粘贴提交或发送到工作群！');
  }).catch(() => {
    ElMessage.info('复制失败，请手动选取复制');
  });
};

const handlePrint = () => {
  window.print();
};

const goToPatient = (patientId: number) => {
  router.push({ path: '/patient', query: { id: patientId, wardId: selectedWardId.value } });
};

onMounted(fetchWards);
</script>

<style scoped>
.rounds-page {
  padding: 20px 24px;
  background-color: #f8fafc;
  min-height: calc(100vh - 80px);
}

/* 顶部导览横幅 */
.rounds-header-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #fff;
  padding: 20px 28px;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
  flex-wrap: wrap;
  gap: 16px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  color: #34d399;
  margin-bottom: 8px;
}

.live-pulse {
  width: 8px;
  height: 8px;
  background-color: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  animation: pulse-green 2s infinite;
}

@keyframes pulse-green {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.header-title {
  font-size: 22px;
  font-weight: 700;
  color: #f8fafc;
  margin: 0 0 6px 0;
}

.header-subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.ward-selector-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.selector-label {
  font-size: 13px;
  color: #cbd5e1;
  white-space: nowrap;
}

.ward-select {
  width: 220px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

/* 第一层：KPI 卡片 */
.metric-row {
  margin-bottom: 20px;
}

.rounds-kpi-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 16px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 155px;
  transition: all 0.25s ease;
  position: relative;
}

.clickable-card {
  cursor: pointer;
}

.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.rounds-kpi-card.theme-blue {
  border-left: 4px solid #3b82f6;
}
.rounds-kpi-card.theme-amber {
  border-left: 4px solid #f59e0b;
}
.rounds-kpi-card.theme-teal {
  border-left: 4px solid #10b981;
}
.rounds-kpi-card.theme-indigo {
  border-left: 4px solid #6366f1;
}

.kpi-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-head .title {
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.head-right-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.jump-btn {
  font-size: 12px;
  padding: 0 2px;
  font-weight: 600;
}

.jump-btn:hover {
  text-decoration: underline;
}

.kpi-val-box {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0;
}

.kpi-num {
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.kpi-unit {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.kpi-detail {
  font-size: 12px;
  color: #64748b;
}

.kpi-sub-total {
  font-size: 16px;
  color: #64748b;
  font-weight: 600;
}

.kpi-sub-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 8px;
  text-align: center;
}

.sub-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 4px;
  padding: 2px;
  transition: all 0.2s;
}

.clickable-sub {
  cursor: pointer;
}

.clickable-sub:hover {
  background-color: #f1f5f9;
  border-radius: 4px;
}

.sub-lbl {
  font-size: 11px;
  color: #64748b;
}

.sub-val {
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
}

.kpi-progress {
  margin: 8px 0;
}

.kpi-foot-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  border-top: 1px dashed #e2e8f0;
  padding-top: 6px;
}

.link-span {
  cursor: pointer;
  transition: color 0.2s;
}

.link-span:hover {
  text-decoration: underline;
  color: #2563eb;
}

/* 护理分级小胶囊 */
.care-level-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  margin: 8px 0;
}

.care-pill {
  padding: 6px 4px;
  border-radius: 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: all 0.2s;
}

.clickable-pill {
  cursor: pointer;
}

.clickable-pill:hover {
  transform: translateY(-1px);
  filter: brightness(0.96);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.care-pill .pill-title {
  font-size: 11px;
  color: #64748b;
}

.care-pill .pill-num {
  font-size: 16px;
  font-weight: 800;
}

.pill-special {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #ef4444;
}

.pill-level1 {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #f59e0b;
}

.pill-level2 {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #3b82f6;
}

.pill-level3 {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

/* 管道统计 */
.tubes-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 8px 0;
}

.tube-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.tube-icon {
  font-size: 14px;
}

.tube-lbl {
  color: #64748b;
  flex: 1;
}

.tube-num {
  color: #0f172a;
}

/* 通用面板容器 */
.panel-box {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  padding: 20px;
  margin-bottom: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.active-filter-badge {
  margin-left: 8px;
}

.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #3b82f6;
}

.dot-indicator.bg-orange { background-color: #f59e0b; }
.dot-indicator.bg-green { background-color: #10b981; }

.count-tag {
  font-size: 12px;
  background-color: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: normal;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 病患清册表格 */
.bed-badge-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.bed-badge {
  font-weight: 800;
  color: #0f172a;
  font-size: 14px;
}

.patient-name-box {
  display: flex;
  flex-direction: column;
}

.p-name {
  font-weight: 700;
  color: #1e293b;
  font-size: 14px;
}

.p-info {
  font-size: 11px;
  color: #94a3b8;
}

.clickable-tag {
  cursor: pointer;
}

.clickable-tag:hover {
  opacity: 0.85;
}

.tube-tags-box {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tube-tag {
  font-size: 11px;
}

.text-xs {
  font-size: 12px;
}

/* 分页工具栏 */
.table-pagination-bar {
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

/* 备忘录与交班报告 */
.memo-row {
  margin-bottom: 20px;
}

.memo-panel, .preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.memo-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}

.risk-section {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 8px;
  padding: 12px 14px;
}

.risk-section-title {
  font-size: 13px;
  font-weight: 700;
  color: #92400e;
  margin-bottom: 10px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  background: #ffffff;
  border: 1px solid #fde68a;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.clickable-risk {
  cursor: pointer;
}

.clickable-risk:hover {
  background-color: #fefce8;
  border-color: #f59e0b;
}

.view-link {
  font-size: 11px;
  color: #2563eb;
  margin-left: 4px;
}

.risk-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.risk-item-left .bed-tag {
  font-weight: 800;
  color: #b45309;
}

.risk-item-left .name {
  font-weight: 700;
  color: #1e293b;
}

.risk-item-left .diag {
  font-size: 12px;
  color: #64748b;
}

.risk-item-tags {
  display: flex;
  align-items: center;
  gap: 4px;
}

.risk-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #059669;
  font-size: 13px;
  padding: 8px 0;
}

.check-icon {
  font-size: 18px;
}

.custom-memo-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memo-label {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

/* 报告预览框 */
.report-preview-box {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  flex: 1;
  overflow: auto;
  max-height: 480px;
}

.report-content {
  font-family: 'Consolas', 'Menlo', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}

/* 颜色工具类 */
.text-green { color: #10b981; }
.text-orange { color: #f59e0b; }
.text-blue { color: #2563eb; }
.text-danger { color: #ef4444; }
.text-warning { color: #f59e0b; }
.text-primary { color: #3b82f6; }
.text-muted { color: #94a3b8; }
.font-bold { font-weight: 700; }
</style>
