<template>
  <div class="dashboard-page">
    <!-- 顶部状态导览横幅 -->
    <div class="dashboard-header-banner">
      <div class="header-left">
        <div class="header-badge">
          <span class="live-pulse"></span>
          <span class="badge-text">实时临床数据监控系统</span>
        </div>
        <h1 class="header-title">
          <span class="title-icon">🏥</span>
          <span>{{ hospitalTitle }} · 医疗运行与出入量监测总览</span>
        </h1>
        <p class="header-subtitle">
          <el-icon><InfoFilled /></el-icon>
          <span>{{ currentHospitalTip }}</span>
        </p>
      </div>

      <div class="header-right">
        <div class="shift-info-card">
          <div class="shift-row">
            <el-tag :type="currentShift.tagType" size="small" effect="dark">
              {{ currentShift.name }}
            </el-tag>
            <span class="shift-hours">{{ currentShift.timeRange }}</span>
          </div>
          <div class="clock-display">
            <el-icon><Timer /></el-icon>
            <span>{{ currentTimeStr }}</span>
          </div>
        </div>

        <div class="header-actions">
          <el-button
            type="primary"
            :loading="loading"
            icon="Refresh"
            @click="fetchOverview"
            class="refresh-btn"
          >
            刷新数据
          </el-button>
          <el-button
            type="success"
            plain
            icon="DocumentChecked"
            @click="goToRounds"
          >
            夜查房交班直通车
          </el-button>
        </div>
      </div>
    </div>

    <!-- 第一层：四大核心运营指标矩阵 -->
    <el-row :gutter="16" class="metric-row">
      <!-- 在院病患总数 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div class="kpi-card theme-blue">
          <div class="kpi-main">
            <div class="kpi-label">
              <span>在院患者总数</span>
              <el-tag size="small" type="primary" effect="plain">在床管理</el-tag>
            </div>
            <div class="kpi-value-box">
              <span class="kpi-number text-blue">{{ overview.inPatientCount || 0 }}</span>
              <span class="kpi-unit">人</span>
            </div>
          </div>
          <div class="kpi-footer">
            <div class="sub-metric">
              <span class="label">平诊</span>
              <span class="val">{{ overview.routineAdmissionCount || 0 }}</span>
            </div>
            <div class="divider"></div>
            <div class="sub-metric">
              <span class="label">急诊</span>
              <span class="val text-danger">{{ overview.emergencyAdmissionCount || 0 }}</span>
            </div>
            <div class="divider"></div>
            <div class="sub-metric">
              <span class="label">重点出入量</span>
              <span class="val text-primary">{{ overview.needIoPatientCount || 0 }}</span>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 床位占用情况 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div class="kpi-card theme-amber">
          <div class="kpi-main">
            <div class="kpi-label">
              <span>全院床位占用率</span>
              <el-tag
                size="small"
                :type="overview.bedUsageRate > 85 ? 'danger' : overview.bedUsageRate > 60 ? 'warning' : 'success'"
                effect="plain"
              >
                {{ overview.bedUsageRate > 85 ? '床位紧张' : overview.bedUsageRate > 60 ? '负荷良好' : '床位充裕' }}
              </el-tag>
            </div>
            <div class="kpi-value-box">
              <span class="kpi-number">{{ overview.occupiedBedCount || 0 }}</span>
              <span class="kpi-sub-total">/ {{ overview.bedCount || 0 }} 张</span>
            </div>
          </div>
          <div class="kpi-progress-bar">
            <el-progress
              :percentage="Math.min(overview.bedUsageRate || 0, 100)"
              :color="bedProgressColor"
              :stroke-width="8"
              :show-text="false"
            />
          </div>
          <div class="kpi-footer between">
            <span class="text-muted">占用率 {{ overview.bedUsageRate || 0 }}%</span>
            <span class="text-muted">空闲床位 {{ Math.max((overview.bedCount || 0) - (overview.occupiedBedCount || 0), 0) }} 张</span>
          </div>
        </div>
      </el-col>

      <!-- 今日出入量记录总数 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div class="kpi-card theme-teal">
          <div class="kpi-main">
            <div class="kpi-label">
              <span>今日出入量记录总数</span>
              <el-tag size="small" type="success" effect="plain">今日活跃</el-tag>
            </div>
            <div class="kpi-value-box">
              <span class="kpi-number text-teal">{{ overview.todayTotalRecordCount || (overview.todayIntakeRecordCount || 0) + (overview.todayOutputRecordCount || 0) }}</span>
              <span class="kpi-unit">条次</span>
            </div>
          </div>
          <div class="kpi-footer">
            <div class="sub-metric">
              <span class="label">💧 入量记录</span>
              <span class="val text-success">{{ overview.todayIntakeRecordCount || 0 }} 条</span>
            </div>
            <div class="divider"></div>
            <div class="sub-metric">
              <span class="label">🚽 出量记录</span>
              <span class="val text-warning">{{ overview.todayOutputRecordCount || 0 }} 条</span>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 医护资源与管道监控 -->
      <el-col :xs="24" :sm="12" :md="6">
        <div class="kpi-card theme-indigo">
          <div class="kpi-main">
            <div class="kpi-label">
              <span>医护在岗 & 管道监护</span>
              <el-tag size="small" type="info" effect="plain">{{ overview.wardCount || 0 }} 个启用病区</el-tag>
            </div>
            <div class="kpi-value-box">
              <span class="kpi-number">{{ overview.nurseCount || 0 }}</span>
              <span class="kpi-unit">位在职护士</span>
            </div>
          </div>
          <div class="kpi-footer">
            <div class="sub-metric">
              <span class="label">留置管路患者</span>
              <span class="val text-indigo font-bold">{{ overview.tubePatientCount || 0 }} 人</span>
            </div>
            <div class="divider"></div>
            <div class="sub-metric">
              <span class="label">出入量异常告警</span>
              <span class="val text-danger font-bold">{{ overview.todayAbnormalCount || 0 }} 人</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 第二层：今日出入液量天平平衡看板 & 近7日趋势可视化 -->
    <el-row :gutter="16" class="section-row">
      <!-- 今日出入液量收支平衡看板 (ml) -->
      <el-col :xs="24" :lg="13">
        <div class="glass-panel fluid-balance-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="title-dot bg-cyan"></span>
              <span>今日全院出入液量 · 收支平衡天平</span>
            </div>
            <div class="header-tags">
              <el-tag size="small" :type="balanceStatusTag.type" effect="dark">
                {{ balanceStatusTag.text }}
              </el-tag>
            </div>
          </div>

          <!-- 三大容量卡：入量、净差额、出量 -->
          <div class="balance-cards-grid">
            <!-- 今日总入量 -->
            <div class="balance-metric-box box-intake">
              <div class="box-icon">💧</div>
              <div class="box-content">
                <div class="box-label">今日总入量 (Intake)</div>
                <div class="box-val text-green">
                  {{ (overview.todayIntakeTotalAmount || 0).toLocaleString() }}
                  <span class="unit">ml</span>
                </div>
                <div class="box-sub">共 {{ overview.todayIntakeRecordCount || 0 }} 条录入记录</div>
              </div>
            </div>

            <!-- 净平衡 (Net Balance) -->
            <div class="balance-metric-box box-balance">
              <div class="box-icon">⚖️</div>
              <div class="box-content">
                <div class="box-label">今日出入差额 (净平衡)</div>
                <div class="box-val" :class="netBalanceClass">
                  {{ formatNetBalance(overview.todayNetBalance) }}
                  <span class="unit">ml</span>
                </div>
                <div class="box-sub">{{ netBalanceClinicalTip }}</div>
              </div>
            </div>

            <!-- 今日总出量 -->
            <div class="balance-metric-box box-output">
              <div class="box-icon">🚽</div>
              <div class="box-content">
                <div class="box-label">今日总出量 (Output)</div>
                <div class="box-val text-orange">
                  {{ (overview.todayOutputTotalAmount || 0).toLocaleString() }}
                  <span class="unit">ml</span>
                </div>
                <div class="box-sub">共 {{ overview.todayOutputRecordCount || 0 }} 条录入记录</div>
              </div>
            </div>
          </div>

          <!-- 液体分类构成条 -->
          <div class="category-breakdown">
            <div class="breakdown-col">
              <div class="breakdown-title">
                <span>💧 入量构成分布</span>
                <span class="total-tag">{{ (overview.todayIntakeTotalAmount || 0).toLocaleString() }} ml</span>
              </div>
              <div class="category-list">
                <div
                  v-for="item in (overview.intakeTypeStats || defaultIntakeStats)"
                  :key="item.type"
                  class="category-item"
                >
                  <div class="cat-info">
                    <span class="cat-name">{{ item.name }}</span>
                    <span class="cat-num">{{ item.amount }} ml <small>({{ item.count }}条)</small></span>
                  </div>
                  <el-progress
                    :percentage="calcPercent(item.amount, overview.todayIntakeTotalAmount)"
                    :color="'#10b981'"
                    :stroke-width="6"
                    :show-text="false"
                  />
                </div>
              </div>
            </div>

            <div class="breakdown-col">
              <div class="breakdown-title">
                <span>🚽 出量构成分布</span>
                <span class="total-tag">{{ (overview.todayOutputTotalAmount || 0).toLocaleString() }} ml</span>
              </div>
              <div class="category-list">
                <div
                  v-for="item in (overview.outputTypeStats || defaultOutputStats)"
                  :key="item.type"
                  class="category-item"
                >
                  <div class="cat-info">
                    <span class="cat-name">{{ item.name }}</span>
                    <span class="cat-num">{{ item.amount }} ml <small>({{ item.count }}条)</small></span>
                  </div>
                  <el-progress
                    :percentage="calcPercent(item.amount, overview.todayOutputTotalAmount)"
                    :color="'#f59e0b'"
                    :stroke-width="6"
                    :show-text="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-col>

      <!-- 近 7 日全院出入量记录动态趋势 -->
      <el-col :xs="24" :lg="11">
        <div class="glass-panel trend-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="title-dot bg-blue"></span>
              <span>近 7 日出入量记录趋势</span>
            </div>
            <div class="trend-legend">
              <span class="legend-item"><span class="dot bg-green"></span>入量记录</span>
              <span class="legend-item"><span class="dot bg-orange"></span>出量记录</span>
            </div>
          </div>

          <!-- 自定义 SVG 响应式图表 -->
          <div class="chart-container">
            <svg class="trend-svg" viewBox="0 0 500 240" preserveAspectRatio="none">
              <!-- 背景横向刻度线 -->
              <line x1="40" y1="40" x2="480" y2="40" stroke="#f1f5f9" stroke-dasharray="4,4" />
              <line x1="40" y1="90" x2="480" y2="90" stroke="#f1f5f9" stroke-dasharray="4,4" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#f1f5f9" stroke-dasharray="4,4" />
              <line x1="40" y1="190" x2="480" y2="190" stroke="#e2e8f0" stroke-width="1.5" />

              <!-- 柱状对比图与折线 -->
              <g v-for="(day, idx) in trendData" :key="idx">
                <!-- X 轴文字 -->
                <text
                  :x="calcBarX(idx) + 16"
                  y="215"
                  text-anchor="middle"
                  font-size="12"
                  fill="#64748b"
                >
                  {{ day.date }}
                </text>

                <!-- 入量柱条 -->
                <rect
                  :x="calcBarX(idx)"
                  :y="calcBarY(day.intakeCount)"
                  width="14"
                  :height="calcBarH(day.intakeCount)"
                  rx="3"
                  fill="#10b981"
                  opacity="0.85"
                >
                  <title>{{ day.date }} 入量记录: {{ day.intakeCount }} 条</title>
                </rect>

                <!-- 出量柱条 -->
                <rect
                  :x="calcBarX(idx) + 18"
                  :y="calcBarY(day.outputCount)"
                  width="14"
                  :height="calcBarH(day.outputCount)"
                  rx="3"
                  fill="#f59e0b"
                  opacity="0.85"
                >
                  <title>{{ day.date }} 出量记录: {{ day.outputCount }} 条</title>
                </rect>

                <!-- 数值气泡指示（最高显示） -->
                <text
                  v-if="day.intakeCount > 0"
                  :x="calcBarX(idx) + 7"
                  :y="calcBarY(day.intakeCount) - 4"
                  text-anchor="middle"
                  font-size="10"
                  fill="#10b981"
                  font-weight="bold"
                >
                  {{ day.intakeCount }}
                </text>
                <text
                  v-if="day.outputCount > 0"
                  :x="calcBarX(idx) + 25"
                  :y="calcBarY(day.outputCount) - 4"
                  text-anchor="middle"
                  font-size="10"
                  fill="#f59e0b"
                  font-weight="bold"
                >
                  {{ day.outputCount }}
                </text>
              </g>
            </svg>
          </div>

          <div class="trend-summary-foot">
            <div class="trend-stat">
              <span class="label">7日累计出入量总记录：</span>
              <span class="val font-bold">{{ sumTrendTotal }} 条</span>
            </div>
            <div class="trend-stat">
              <span class="label">日均录入频次：</span>
              <span class="val text-blue font-bold">{{ (sumTrendTotal / 7).toFixed(1) }} 条/天</span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 第三层：各病区实时负荷与监控矩阵 -->
    <div class="glass-panel section-panel">
      <div class="panel-header">
        <div class="panel-title">
          <span class="title-dot bg-purple"></span>
          <span>各病区实时负荷与出入量监测矩阵</span>
          <span class="title-badge">{{ (overview.wardStatsList || []).length }} 个启用病区</span>
        </div>
        <div class="panel-actions">
          <el-radio-group v-model="wardViewMode" size="small">
            <el-radio-button label="card">卡片视窗</el-radio-button>
            <el-radio-button label="table">明细列表</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div v-if="wardViewMode === 'card'" class="ward-cards-grid">
        <div
          v-for="ward in (overview.wardStatsList || [])"
          :key="ward.wardId"
          class="ward-card"
          @click="handleWardClick(ward)"
        >
          <div class="ward-card-header">
            <div class="ward-name-box">
              <span class="ward-name">{{ ward.wardName }}</span>
              <span class="ward-building">{{ ward.building }}</span>
            </div>
            <el-tag
              size="small"
              :type="ward.bedUsageRate > 85 ? 'danger' : ward.bedUsageRate > 50 ? 'warning' : 'success'"
            >
              床位使用 {{ ward.bedUsageRate }}%
            </el-tag>
          </div>

          <div class="ward-progress-bar">
            <el-progress
              :percentage="Math.min(ward.bedUsageRate || 0, 100)"
              :color="getWardRateColor(ward.bedUsageRate)"
              :stroke-width="6"
              :show-text="false"
            />
          </div>

          <div class="ward-stat-row">
            <div class="stat-pill">
              <span class="num">{{ ward.patientCount }}</span>
              <span class="txt">在床患者</span>
            </div>
            <div class="stat-pill">
              <span class="num text-primary">{{ ward.needIoCount }}</span>
              <span class="txt">重点监测</span>
            </div>
            <div class="stat-pill">
              <span class="num text-teal">{{ ward.todayTotalRecords }}</span>
              <span class="txt">今日出入条数</span>
            </div>
          </div>

          <div class="ward-card-footer">
            <span class="bed-detail">床位：{{ ward.occupiedBeds }}/{{ ward.totalBeds }}</span>
            <span class="action-link">查看查房 <el-icon><ArrowRight /></el-icon></span>
          </div>
        </div>

        <div v-if="!overview.wardStatsList || overview.wardStatsList.length === 0" class="empty-ward-box">
          <el-empty description="暂无病区监测数据" :image-size="60" />
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-else class="ward-table-box">
        <el-table :data="overview.wardStatsList || []" stripe style="width: 100%">
          <el-table-column prop="wardName" label="病区名称" min-width="160">
            <template #default="{ row }">
              <strong>{{ row.wardName }}</strong>
              <el-tag size="small" type="info" style="margin-left: 8px;">{{ row.building }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="床位情况" min-width="180">
            <template #default="{ row }">
              <span>{{ row.occupiedBeds }} / {{ row.totalBeds }} 张 ({{ row.bedUsageRate }}%)</span>
              <el-progress
                :percentage="Math.min(row.bedUsageRate || 0, 100)"
                :color="getWardRateColor(row.bedUsageRate)"
                :stroke-width="5"
                :show-text="false"
              />
            </template>
          </el-table-column>
          <el-table-column prop="patientCount" label="在院患者" width="100" align="center" />
          <el-table-column prop="needIoCount" label="重点监测人数" width="120" align="center">
            <template #default="{ row }">
              <el-tag size="small" type="primary">{{ row.needIoCount }} 人</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="今日出入量记录" min-width="180" align="center">
            <template #default="{ row }">
              <span class="text-success">入: {{ row.todayIntakeCount }}</span>
              <span style="margin: 0 8px;">|</span>
              <span class="text-warning">出: {{ row.todayOutputCount }}</span>
              <span style="margin: 0 8px;">|</span>
              <span class="font-bold">总: {{ row.todayTotalRecords }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="handleWardClick(row)">夜查房表</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 第四层：今日出入量异常预警患者 & 护士长夜查房速报直通车 -->
    <el-row :gutter="16" class="section-row">
      <!-- 异常失衡患者预警看板 -->
      <el-col :xs="24" :lg="13">
        <div class="glass-panel alert-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="title-dot bg-red"></span>
              <span>今日出入量失衡 & 异常告警监测</span>
            </div>
            <el-tag
              size="small"
              :type="(overview.todayAbnormalCount || 0) > 0 ? 'danger' : 'success'"
              effect="dark"
            >
              {{ (overview.todayAbnormalCount || 0) > 0 ? `${overview.todayAbnormalCount} 例预警` : '全部平稳' }}
            </el-tag>
          </div>

          <div v-if="overview.abnormalPatientList && overview.abnormalPatientList.length > 0" class="alert-list">
            <div
              v-for="item in overview.abnormalPatientList"
              :key="item.patientId"
              class="alert-item"
            >
              <div class="alert-left">
                <div class="alert-bed">{{ formatBedNo(item.bedNo) }}</div>
                <div class="alert-patient">
                  <span class="name">{{ item.patientName }}</span>
                  <span class="ward">{{ item.wardName }}</span>
                </div>
              </div>
              <div class="alert-mid">
                <span class="text-muted">总入:</span> {{ item.totalIntake }}ml
                <span class="divider">/</span>
                <span class="text-muted">总出:</span> {{ item.totalOutput }}ml
                <span class="divider">/</span>
                <span class="text-danger font-bold">差额: {{ item.netBalance }}ml</span>
              </div>
              <div class="alert-right">
                <el-button size="small" type="danger" plain @click="goToPatient(item.patientId)">
                  核查记录
                </el-button>
              </div>
            </div>
          </div>

          <div v-else class="alert-empty-state">
            <el-icon class="check-icon"><CircleCheck /></el-icon>
            <div class="empty-title">今日全院暂无出入量失衡异常</div>
            <div class="empty-desc">所有监测病患出入量均在安全参考生理区间，系统持续实时巡检中</div>
          </div>
        </div>
      </el-col>

      <!-- 护士长 19:00 夜查房交班直通速报 -->
      <el-col :xs="24" :lg="11">
        <div class="glass-panel quick-rounds-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="title-dot bg-amber"></span>
              <span>护士长 19:00 夜查房交班速报</span>
            </div>
            <el-button link type="primary" @click="goToRounds">进入交班表 →</el-button>
          </div>

          <div class="quick-rounds-body">
            <p class="rounds-tip">
              根据在床病患出入院与实时管道出入量，系统自动完成每日夜查房核算，告别繁重手工数人头：
            </p>

            <div class="rounds-kpi-grid">
              <div class="rounds-pill">
                <span class="val">{{ overview.inPatientCount || 0 }}</span>
                <span class="lbl">在院病患总数</span>
              </div>
              <div class="rounds-pill">
                <span class="val">{{ overview.routineAdmissionCount || 0 }}</span>
                <span class="lbl">今日平诊入院</span>
              </div>
              <div class="rounds-pill">
                <span class="val text-danger">{{ overview.emergencyAdmissionCount || 0 }}</span>
                <span class="lbl">今日急诊入院</span>
              </div>
              <div class="rounds-pill">
                <span class="val text-indigo">{{ overview.tubePatientCount || 0 }}</span>
                <span class="lbl">留置管路患者</span>
              </div>
            </div>

            <div class="rounds-action-bar">
              <el-button type="success" icon="DocumentCopy" @click="copyFastRoundsText">
                一键复制交班速报文本
              </el-button>
              <el-button type="primary" plain icon="FirstAidKit" @click="goToRounds">
                进入病区交班管理
              </el-button>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import {
  InfoFilled,
  Timer,
  Refresh,
  DocumentChecked,
  ArrowRight,
  CircleCheck,
  FirstAidKit,
  DocumentCopy
} from '@element-plus/icons-vue';
import request from '../../utils/request';

const router = useRouter();

const formatBedNo = (bedNo: any) => {
  if (!bedNo || bedNo === '-') return '-';
  const str = String(bedNo).trim();
  return str.endsWith('床') ? str : `${str}床`;
};

const loading = ref(false);
const overview = ref<any>({});
const userRole = ref(localStorage.getItem('admin_role') || '');
const hospitalName = ref(localStorage.getItem('admin_hospital_name') || '');
const activeHospitalId = ref(localStorage.getItem('active_hospital_id') || '0');
const wardViewMode = ref('card');

// 实时时间
const currentTimeStr = ref('');
const updateCurrentTime = () => {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? '0' + n : String(n));
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  currentTimeStr.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${weekDay}`;
};
setInterval(updateCurrentTime, 1000);
updateCurrentTime();

// 当前班次
const currentShift = computed(() => {
  const h = new Date().getHours();
  if (h >= 8 && h < 16) {
    return { name: '白班进行中', timeRange: '08:00 - 16:00', tagType: 'success' };
  } else if (h >= 16 && h < 23) {
    return { name: '小夜班', timeRange: '16:00 - 23:00 (19:00前交班)', tagType: 'warning' };
  } else {
    return { name: '大夜班', timeRange: '23:00 - 08:00', tagType: 'danger' };
  }
});

// 医院标题
const hospitalTitle = computed(() => {
  if (userRole.value === 'SUPER_ADMIN') {
    return activeHospitalId.value === '0' ? '全平台医院' : '指定医院';
  }
  return hospitalName.value || '本院工作台';
});

// 提示信息
const currentHospitalTip = computed(() => {
  if (userRole.value === 'SUPER_ADMIN') {
    return activeHospitalId.value === '0'
      ? '处于【超级管理员全平台全景视窗】，展示各租户医院聚合汇总数据'
      : `聚焦指定租户医院 (ID: ${activeHospitalId.value}) 运行视窗`;
  }
  return `严格限制在【${hospitalName.value}】独立租户，数据完全物理隔离与合规加密`;
});

// 床位进度条颜色
const bedProgressColor = (percent: number) => {
  if (percent > 85) return '#ef4444';
  if (percent > 65) return '#f59e0b';
  return '#3b82f6';
};

const getWardRateColor = (rate: number) => {
  if (rate > 85) return '#ef4444';
  if (rate > 60) return '#f59e0b';
  return '#10b981';
};

// 格式化净差额
const formatNetBalance = (val: number | undefined) => {
  if (val === undefined || val === null) return '0';
  if (val > 0) return `+${val.toLocaleString()}`;
  return val.toLocaleString();
};

const netBalanceClass = computed(() => {
  const b = overview.value.todayNetBalance || 0;
  if (b > 1000) return 'text-danger';
  if (b > 0) return 'text-green';
  if (b < -1000) return 'text-warning';
  return 'text-muted';
});

const netBalanceClinicalTip = computed(() => {
  const b = overview.value.todayNetBalance || 0;
  if (b > 1500) return '⚠️ 净入量过高，关注水肿与心肾负荷';
  if (b > 0) return '正平衡 (入量大于出量)';
  if (b < -1500) return '⚠️ 净出量过多，注意水电解质与脱水风险';
  if (b < 0) return '负平衡 (出量大于入量)';
  return '出入基本平衡';
});

const balanceStatusTag = computed(() => {
  const b = overview.value.todayNetBalance || 0;
  if (Math.abs(b) < 500) return { type: 'success', text: '出入平衡良好' };
  if (b > 0) return { type: 'primary', text: '呈正平衡态' };
  return { type: 'warning', text: '呈负平衡态' };
});

const defaultIntakeStats = [
  { type: 'IV', name: '静脉输液', count: 0, amount: 0 },
  { type: 'ORAL', name: '口服饮水/饮食', count: 0, amount: 0 },
  { type: 'NASOGASTRIC', name: '鼻饲/管饲', count: 0, amount: 0 },
  { type: 'OTHER', name: '其他入量', count: 0, amount: 0 }
];

const defaultOutputStats = [
  { type: 'URINE', name: '尿液', count: 0, amount: 0 },
  { type: 'GASTRO_DRAINAGE', name: '胃肠减压', count: 0, amount: 0 },
  { type: 'CHEST_DRAINAGE', name: '胸腹腔引流', count: 0, amount: 0 },
  { type: 'STOOL', name: '大便/排泄', count: 0, amount: 0 }
];

const calcPercent = (val: number, total: number) => {
  if (!total || total <= 0) return 0;
  return Math.min(Math.round((val / total) * 100), 100);
};

// 7 日趋势数据
const trendData = computed(() => {
  if (overview.value.trend7Days && overview.value.trend7Days.length > 0) {
    return overview.value.trend7Days;
  }
  // 缺省兜底
  return [
    { date: '11-12', intakeCount: 0, outputCount: 0 },
    { date: '11-13', intakeCount: 0, outputCount: 0 },
    { date: '11-14', intakeCount: 0, outputCount: 0 },
    { date: '11-15', intakeCount: 0, outputCount: 0 },
    { date: '11-16', intakeCount: 0, outputCount: 0 },
    { date: '11-17', intakeCount: 0, outputCount: 0 },
    { date: '11-18', intakeCount: overview.value.todayIntakeRecordCount || 0, outputCount: overview.value.todayOutputRecordCount || 0 }
  ];
});

// 计算柱状图坐标
const maxTrendCount = computed(() => {
  const counts = trendData.value.flatMap((d: any) => [d.intakeCount || 0, d.outputCount || 0]);
  const max = Math.max(...counts, 6);
  return max;
});

const calcBarX = (idx: number) => {
  return 55 + idx * 60;
};

const calcBarY = (count: number) => {
  const maxH = 140;
  const h = (count / maxTrendCount.value) * maxH;
  return 190 - h;
};

const calcBarH = (count: number) => {
  const maxH = 140;
  return Math.max((count / maxTrendCount.value) * maxH, 2);
};

const sumTrendTotal = computed(() => {
  return trendData.value.reduce((acc: number, cur: any) => acc + (cur.intakeCount || 0) + (cur.outputCount || 0), 0);
});

// 获取概览数据
const fetchOverview = async () => {
  loading.value = true;
  try {
    const res = await request.get('/admin/dashboard/overview');
    overview.value = res;
  } catch (error) {
    console.error('获取概览看板数据失败', error);
  } finally {
    loading.value = false;
  }
};

const goToRounds = () => {
  router.push('/rounds');
};

const goToPatient = (patientId?: number) => {
  if (patientId) {
    router.push({ path: '/patient', query: { id: patientId } });
  } else {
    router.push('/patient');
  }
};

const handleWardClick = (ward: any) => {
  router.push({ path: '/rounds', query: { wardId: ward.wardId } });
};

const copyFastRoundsText = () => {
  const o = overview.value;
  const text = `【夜查房交班速报 - ${hospitalTitle.value}】
日期：${currentTimeStr.value.slice(0, 10)}
在床患者总数：${o.inPatientCount || 0} 人（平诊 ${o.routineAdmissionCount || 0}，急诊 ${o.emergencyAdmissionCount || 0}）
床位占用情况：${o.occupiedBedCount || 0} / ${o.bedCount || 0} 张（使用率 ${o.bedUsageRate || 0}%）
重点出入量监控：${o.needIoPatientCount || 0} 人
今日出入量记录：入量 ${o.todayIntakeRecordCount || 0} 条 / 出量 ${o.todayOutputRecordCount || 0} 条
留置管路患者：${o.tubePatientCount || 0} 人
今日出入量异常告警：${o.todayAbnormalCount || 0} 例`;

  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制夜查房交班速报至剪贴板');
  }).catch(() => {
    ElMessage.info('复制失败，请手动选取复制');
  });
};

onMounted(fetchOverview);
</script>

<style scoped>
.dashboard-page {
  padding: 20px 24px;
  background-color: #f8fafc;
  min-height: calc(100vh - 80px);
}

/* 顶部导览 Banner */
.dashboard-header-banner {
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-subtitle {
  font-size: 13px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shift-info-card {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 10px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shift-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shift-hours {
  font-size: 12px;
  color: #cbd5e1;
}

.clock-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #38bdf8;
  font-family: monospace;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 第一层：KPI 卡片 */
.metric-row {
  margin-bottom: 20px;
}

.kpi-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 140px;
  transition: all 0.25s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.kpi-card.theme-blue {
  border-left: 4px solid #3b82f6;
  background: #ffffff;
}
.kpi-card.theme-amber {
  border-left: 4px solid #f59e0b;
  background: #ffffff;
}
.kpi-card.theme-teal {
  border-left: 4px solid #10b981;
  background: #ffffff;
}
.kpi-card.theme-indigo {
  border-left: 4px solid #6366f1;
  background: #ffffff;
}

.kpi-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.kpi-value-box {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 4px;
}

.kpi-number {
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1;
}

.kpi-unit {
  font-size: 13px;
  color: #64748b;
}

.kpi-sub-total {
  font-size: 16px;
  color: #64748b;
  font-weight: 600;
}

.kpi-progress-bar {
  margin: 6px 0;
}

.kpi-footer {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  border-top: 1px dashed #f1f5f9;
  padding-top: 8px;
  gap: 8px;
}

.kpi-footer.between {
  justify-content: space-between;
}

.sub-metric {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sub-metric .val {
  font-weight: 600;
  color: #334155;
}

.divider {
  width: 1px;
  height: 12px;
  background-color: #cbd5e1;
}

/* 玻璃质感面板基础 */
.glass-panel {
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
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.title-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.title-badge {
  font-size: 12px;
  font-weight: normal;
  background-color: #f1f5f9;
  color: #475569;
  padding: 2px 8px;
  border-radius: 12px;
}

.title-dot.bg-cyan { background-color: #06b6d4; }
.title-dot.bg-blue { background-color: #3b82f6; }
.title-dot.bg-green, .legend-item .dot.bg-green { background-color: #10b981; }
.title-dot.bg-orange, .legend-item .dot.bg-orange { background-color: #f59e0b; }
.title-dot.bg-purple { background-color: #8b5cf6; }
.title-dot.bg-red { background-color: #ef4444; }

/* 出入液量天平平衡卡 */
.balance-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.balance-metric-box {
  border-radius: 10px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s;
}

.balance-metric-box:hover {
  transform: translateY(-2px);
}

.box-intake {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.box-balance {
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
}

.box-output {
  background: #fffbeb;
  border: 1px solid #fde68a;
}

.box-icon {
  font-size: 28px;
}

.box-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 2px;
  font-weight: 500;
}

.box-val {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
}

.box-val .unit {
  font-size: 13px;
  font-weight: normal;
  color: #64748b;
  margin-left: 2px;
}

.box-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

/* 液体分类进度条 */
.category-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
}

.breakdown-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 12px;
}

.total-tag {
  font-size: 12px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cat-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.cat-name {
  color: #475569;
}

.cat-num {
  font-weight: 600;
  color: #1e293b;
}

.cat-num small {
  font-weight: normal;
  color: #94a3b8;
  margin-left: 2px;
}

/* 趋势图表区 */
.trend-legend {
  display: flex;
  gap: 14px;
  font-size: 12px;
  color: #64748b;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chart-container {
  width: 100%;
  height: 220px;
  position: relative;
}

.trend-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.trend-summary-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
  margin-top: 10px;
  font-size: 13px;
  color: #64748b;
}

/* 病区卡片网格 */
.ward-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.ward-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.ward-card:hover {
  background: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.ward-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.ward-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  display: block;
}

.ward-building {
  font-size: 12px;
  color: #94a3b8;
}

.ward-progress-bar {
  margin-bottom: 12px;
}

.ward-stat-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  background: #ffffff;
  padding: 10px 8px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
  text-align: center;
  margin-bottom: 10px;
}

.stat-pill .num {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  display: block;
}

.stat-pill .txt {
  font-size: 11px;
  color: #64748b;
}

.ward-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
}

.action-link {
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 500;
}

.empty-ward-box {
  grid-column: 1 / -1;
  padding: 30px;
}

/* 异常预警列表 */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  padding: 12px 16px;
  border-radius: 8px;
}

.alert-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-bed {
  background: #e53e3e;
  color: #fff;
  font-weight: bold;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.alert-patient .name {
  font-weight: 700;
  color: #2d3748;
  margin-right: 8px;
}

.alert-patient .ward {
  font-size: 12px;
  color: #718096;
}

.alert-mid {
  font-size: 13px;
  color: #4a5568;
}

.alert-empty-state {
  text-align: center;
  padding: 32px 20px;
  color: #64748b;
}

.check-icon {
  font-size: 40px;
  color: #10b981;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.empty-desc {
  font-size: 13px;
  color: #94a3b8;
}

/* 夜查房速报直通车 */
.quick-rounds-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rounds-tip {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
  margin: 0;
}

.rounds-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.rounds-pill {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 8px;
  text-align: center;
}

.rounds-pill .val {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  display: block;
}

.rounds-pill .lbl {
  font-size: 11px;
  color: #64748b;
}

.rounds-action-bar {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

/* 通用颜色文字与粗体 */
.text-green { color: #10b981; }
.text-orange { color: #f59e0b; }
.text-teal { color: #0d9488; }
.text-blue { color: #3b82f6; }
.text-indigo { color: #6366f1; }
.text-danger { color: #ef4444; }
.text-warning { color: #f59e0b; }
.text-primary { color: #3b82f6; }
.text-muted { color: #64748b; }
.font-bold { font-weight: 700; }
</style>
