<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { AttachForm } from '#/api/knowledge/attach/model';

import { onActivated, onMounted, ref } from 'vue';
import { Page, useVbenModal } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import {
  Button,
  Descriptions,
  DescriptionsItem,
  Image,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  TabPane,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
} from '@ant-design/icons-vue';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import { attachExport, attachList, attachRemove } from '#/api/knowledge/attach';
import { fragmentList } from '#/api/knowledge/fragment';
import { infoList } from '#/api/knowledge/info';
import { ossDownload, ossInfo } from '#/api/system/oss';
import { getDeptTree } from '#/api/system/user';
import { commonDownloadExcel, downloadByData, downloadByUrl } from '#/utils/file/download';

import attachModal from './attach-modal.vue';
import { columns, querySchema } from './data';

const deptNameMap = ref<Record<string | number, string>>({});
const deptPathMap = ref<Record<string | number, string>>({});
const knowledgeMap = ref<Record<string | number, string>>({});

// 文件预览状态
const fileDetailVisible = ref(false);
const fileDetailLoading = ref(false);
const fileDetailData = ref<any>(null);
const previewTextContent = ref('');
const activePreviewTab = ref('native');
const docxContainerRef = ref<HTMLElement | null>(null);
const excelHtmlContent = ref('');
const sheetNames = ref<string[]>([]);
const currentSheet = ref<string>('');
const excelWorkbook = ref<any>(null);
const isRenderingDocx = ref(false);
const isRenderingExcel = ref(false);
const isFullscreen = ref(false);
const showMeta = ref(false);

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

function selectSheet(name: string) {
  currentSheet.value = name;
  if (excelWorkbook.value && excelWorkbook.value.Sheets[name]) {
    const sheet = excelWorkbook.value.Sheets[name];
    if (sheet) {
      excelHtmlContent.value = XLSX.utils.sheet_to_html(sheet);
    }
  }
}

async function getFileBlob(ossId: any, fileUrl: string): Promise<Blob> {
  if (ossId) {
    try {
      const res: any = await ossDownload(ossId);
      if (res instanceof Blob) {
        return res;
      }
      if (res && res.data instanceof Blob) {
        return res.data;
      }
    } catch (e) {
      console.warn('ossDownload 方式获取文件失败，退回到 fetch fileUrl:', e);
    }
  }
  if (fileUrl) {
    const resp = await fetch(fileUrl);
    if (!resp.ok) {
      throw new Error(`HTTP 请求失败: ${resp.status}`);
    }
    return await resp.blob();
  }
  throw new Error('未提供有效的文件 ID 或 URL');
}

function getCleanFileName(name?: string): string {
  if (!name) return '';
  return name.replace(/\.(xlsx|xls|docx|doc|pdf|txt|md|csv|log|xml|json|png|jpg|jpeg|gif|webp|ppt|pptx)$/i, '');
}

function isImageFile(fileSuffix: string) {
  if (!fileSuffix) return false;
  const suffix = fileSuffix.toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'].some(t => suffix.includes(t));
}

function isPdfFile(fileSuffix: string) {
  return fileSuffix ? fileSuffix.toLowerCase().includes('pdf') : false;
}

function isTextFile(fileSuffix: string) {
  if (!fileSuffix) return false;
  const suffix = fileSuffix.toLowerCase();
  return ['.txt', '.md', '.json', '.csv', '.log', '.xml', '.yaml', '.yml', '.js', '.ts', '.py', '.java', '.sql', '.html', '.css'].some(t => suffix.includes(t));
}

function isOfficeFile(fileSuffix: string) {
  if (!fileSuffix) return false;
  const suffix = fileSuffix.toLowerCase();
  return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].some(t => suffix.includes(t));
}

async function handleViewFile(record: any) {
  fileDetailLoading.value = true;
  fileDetailVisible.value = true;
  previewTextContent.value = '';
  excelHtmlContent.value = '';
  sheetNames.value = [];
  currentSheet.value = '';
  excelWorkbook.value = null;
  activePreviewTab.value = 'native';

  try {
    let firstItem: any = null;
    if (record.ossId) {
      try {
        const res = await ossInfo(record.ossId);
        if (res && res.length > 0 && res[0]) {
          firstItem = res[0];
        }
      } catch (e) {
        console.warn('拉取 OSS 详情失败:', e);
      }
    }

    if (!firstItem) {
      firstItem = {
        ossId: record.ossId,
        originalName: record.name,
        fileSuffix: String(record.type || '').toLowerCase(),
        url: record.url || record.fileUrl || '',
        createTime: record.createTime,
        createByName: resolveCreatorName(record),
      };
    }

    fileDetailData.value = firstItem;
    const suffix = (firstItem.fileSuffix || record.type || '').toLowerCase();
    const fileUrl = firstItem.url || '';

    // 优先拉取 RAG 提取的切片文本 (必须 await)
    if (record.docId) {
      try {
        const frags: any = await fragmentList({ docId: record.docId, pageSize: 200 });
        const rows = frags?.rows || (Array.isArray(frags) ? frags : []);
        if (rows.length > 0) {
          previewTextContent.value = rows.map((r: any) => `【切片 #${Number(r.idx) + 1}】\n${r.content}`).join('\n\n' + '='.repeat(40) + '\n\n');
        }
      } catch (e) {
        console.warn('拉取切片文本失败', e);
      }
    }

    // 若无 ossId（内置预设范本等内嵌文档），直接依靠切片文本显示预览
    if (!record.ossId) {
      fileDetailLoading.value = false;
      return;
    }

    // 1. 纯文本 / 代码文件
    if (isTextFile(suffix)) {
      try {
        const blob = await getFileBlob(record.ossId, fileUrl);
        const txt = await blob.text();
        if (txt) {
          previewTextContent.value = txt;
        }
      } catch (e) {
        console.warn('拉取纯文本内容失败:', e);
      }
    }
    // 2. Word 文档 (.docx)
    else if (suffix.endsWith('.docx')) {
      isRenderingDocx.value = true;
      try {
        const blob = await getFileBlob(record.ossId, fileUrl);
        setTimeout(async () => {
          const container = docxContainerRef.value;
          if (container) {
            container.innerHTML = '';
            await renderAsync(blob, container, undefined, {
              className: 'docx-view-wrap',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
            });
          }
          isRenderingDocx.value = false;
        }, 150);
      } catch (e) {
        console.warn('docx-preview 渲染失败', e);
        isRenderingDocx.value = false;
      }
    }
    // 3. Excel 电子表格 (.xlsx / .xls)
    else if (suffix.includes('xls')) {
      isRenderingExcel.value = true;
      try {
        const blob = await getFileBlob(record.ossId, fileUrl);
        const buffer = await blob.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        excelWorkbook.value = workbook;
        sheetNames.value = workbook.SheetNames || [];
        if (sheetNames.value.length > 0) {
          currentSheet.value = sheetNames.value[0] || '';
          const firstSheet = workbook.Sheets[currentSheet.value];
          if (firstSheet) {
            excelHtmlContent.value = XLSX.utils.sheet_to_html(firstSheet);
          }
        }
        isRenderingExcel.value = false;
      } catch (e) {
        console.warn('XLSX 渲染失败', e);
        isRenderingExcel.value = false;
      }
    }
  } catch (err: any) {
    message.error(err.message || '获取文件详情失败');
  } finally {
    fileDetailLoading.value = false;
  }
}

function closeFileDetail() {
  fileDetailVisible.value = false;
  fileDetailData.value = null;
  previewTextContent.value = '';
  excelHtmlContent.value = '';
  sheetNames.value = [];
  currentSheet.value = '';
  excelWorkbook.value = null;
  isFullscreen.value = false;
}

async function handleDownloadFile(ossId: any, filename: string) {
  try {
    message.loading({ content: '正在准备下载文件...', key: 'downloading' });

    if (ossId) {
      try {
        const res: any = await ossDownload(ossId);
        let blob: Blob | null = null;
        if (res instanceof Blob) {
          blob = res;
        } else if (res && res.data instanceof Blob) {
          blob = res.data;
        }
        if (blob) {
          downloadByData(blob, filename || '下载文件');
          message.success({ content: '文件下载成功', key: 'downloading' });
          return;
        }
      } catch (e) {
        console.warn('ossDownload 失败，尝试 URL 直接下载', e);
      }
    }

    const fileUrl = fileDetailData.value?.url || '';
    if (fileUrl) {
      downloadByUrl({
        url: fileUrl,
        fileName: filename || fileDetailData.value?.originalName || '下载文件',
        target: '_blank',
      });
      message.success({ content: '文件下载已触发', key: 'downloading' });
      return;
    }

    message.error({ content: '未找到有效的文件下载地址', key: 'downloading' });
  } catch (err: any) {
    message.error({ content: err?.message || '文件下载失败', key: 'downloading' });
  }
}

function buildDeptPathMap(nodes: any[], parentPath = '') {
  if (!nodes || !Array.isArray(nodes)) return;
  for (const node of nodes) {
    const currentName = node.label || node.deptName || `部门${node.id}`;
    const currentPath = parentPath ? `${parentPath} ➔ ${currentName}` : currentName;
    if (node.id) {
      deptNameMap.value[node.id] = currentName;
      deptPathMap.value[node.id] = currentPath;
    }
    if (node.children && Array.isArray(node.children)) {
      buildDeptPathMap(node.children, currentPath);
    }
  }
}

async function fetchKnowledgeMapData() {
  try {
    const res = await infoList({ pageSize: 200 });
    const list = Array.isArray(res) ? res : ((res as any).rows || (res as any).records || []);
    knowledgeMap.value = {};
    for (const item of list) {
      if (item.id && item.name) {
        knowledgeMap.value[item.id] = item.name;
      }
    }
  } catch (error) {
    console.error('Failed to fetch knowledge map:', error);
  }
}

async function fetchDeptMapData() {
  try {
    const res = await getDeptTree();
    deptNameMap.value = {};
    deptPathMap.value = {};
    buildDeptPathMap(res || []);
  } catch (error) {
    console.error('Failed to fetch dept map in attach page:', error);
  }
}

function getDeptShortNames(deptScope?: string) {
  if (!deptScope) return '';
  const ids = String(deptScope).split(',').filter(Boolean);
  return ids.map(id => {
    if (deptNameMap.value[id]) return deptNameMap.value[id];
    if (isNaN(Number(id))) return id;
    return `部门${id}`;
  }).join(', ');
}

function getDeptFullPaths(deptScope?: string) {
  if (!deptScope) return '';
  const ids = String(deptScope).split(',').filter(Boolean);
  return ids.map(id => {
    if (deptPathMap.value[id]) return deptPathMap.value[id];
    if (isNaN(Number(id))) return id;
    return `部门${id}`;
  }).join(' | ');
}

function resolveScopeLevel(row: any): number {
  const level = row.scopeLevel ?? row.scope_level;
  if (level !== undefined && level !== null && !isNaN(Number(level)) && Number(level) > 0) {
    return Number(level);
  }
  const deptScopeStr = String(row.deptScope || row.dept_scope || '').trim();
  const nameStr = String(row.name || '');
  if ((deptScopeStr && deptScopeStr !== 'null' && deptScopeStr !== 'undefined') || 
      nameStr.includes('财务') || nameStr.includes('护理') || nameStr.includes('采购') || nameStr.includes('自购') || nameStr.includes('日志')) {
    return 3;
  }
  if (row.share === 0 || row.share === '0' || nameStr.includes('绝密') || nameStr.includes('笔记')) {
    return 4;
  }
  if (row.share === 2 || row.share === '2' || nameStr.includes('分公司')) {
    return 2;
  }
  return 1;
}

function resolveDeptScope(row: any): string {
  return row.deptScope || row.dept_scope || '';
}

function resolveCreatorName(row: any): string {
  return row.createByName || row.createBy || row.create_by || '管理员';
}

function resolveKnowledgeName(row: any): string {
  if (row.knowledgeName) return row.knowledgeName;
  if (row.knowledgeTitle) return row.knowledgeTitle;
  if (row.knowledge_name) return row.knowledge_name;
  if (row.knowledgeId) {
    const name = knowledgeMap.value[row.knowledgeId];
    if (name) return name;
  }
  return '通用制度知识库';
}

function resolveCompanyName(row: any): string {
  if (row.companyName || row.deptName) return row.companyName || row.deptName;
  const nameStr = String(row.name || '');
  if (nameStr.includes('绍兴')) return '绍兴分公司';
  if (nameStr.includes('杭州')) return '杭州分公司';
  return '机构公开';
}

onMounted(() => {
  fetchDeptMapData();
  fetchKnowledgeMapData();
});

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 90,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
  },
  columns,
  height: 'auto',
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }: { page: { currentPage: number; pageSize: number } }, formValues = {}) => {
        return await attachList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  id: 'system-attach-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

onActivated(() => {
  tableApi.query();
});

const [AttachModal, modalApi] = useVbenModal({
  connectedComponent: attachModal,
});

function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

async function handleEdit(row: Required<AttachForm>) {
  modalApi.setData({ id: row.id });
  modalApi.open();
}

async function handleDelete(row: Required<AttachForm>) {
  await attachRemove(row.id);
  await tableApi.query();
}

function handleMultiDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: Required<AttachForm>) => row.id);
  Modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的${ids.length}条记录吗？`,
    onOk: async () => {
      await attachRemove(ids);
      await tableApi.query();
    },
  });
}

function handleDownloadExcel() {
  commonDownloadExcel(
    attachExport,
    '知识库附件数据',
    tableApi.formApi.form.values,
    {
      fieldMappingTime: formOptions.fieldMappingTime,
    },
  );
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="全局综合文档列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            v-access:code="['system:attach:export']"
            @click="handleDownloadExcel"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['system:attach:remove']"
            @click="handleMultiDelete"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            type="primary"
            v-access:code="['system:attach:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>

      <!-- 附件名称插槽：支持点击弹窗预览完整文件 -->
      <template #name="{ row }">
        <button
          type="button"
          class="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer text-left border-0 bg-transparent p-0 transition-colors"
          @click.stop="handleViewFile(row)"
        >
          <span>{{ getCleanFileName(row.name) }}</span>
        </button>
      </template>

      <!-- 所属知识库插槽 -->
      <template #knowledgeName="{ row }">
        <Tag color="cyan">{{ resolveKnowledgeName(row) }}</Tag>
      </template>

      <!-- 作用域级别列插槽（纯粹级别） -->
      <template #scopeLevel="{ row }">
        <Tag v-if="resolveScopeLevel(row) === 4" color="default">个人级</Tag>
        <Tag v-else-if="resolveScopeLevel(row) === 1" color="cyan">集团级</Tag>
        <Tag v-else-if="resolveScopeLevel(row) === 2" color="green">机构级</Tag>
        <Tag v-else-if="resolveScopeLevel(row) === 3" color="orange">部门级</Tag>
        <Tag v-else color="cyan">集团级</Tag>
      </template>

      <!-- 归属主体列插槽（具体归属对象） -->
      <template #deptScope="{ row }">
        <template v-if="resolveScopeLevel(row) === 4">
          <Tooltip :title="'个人专属资产: ' + resolveCreatorName(row)">
            <Tag color="default">
              {{ resolveCreatorName(row) }}
            </Tag>
          </Tooltip>
        </template>

        <template v-else-if="resolveScopeLevel(row) === 1">
          <Tooltip title="全集团各分公司及下属部门均可访问">
            <Tag color="cyan">全集团共享</Tag>
          </Tooltip>
        </template>

        <template v-else-if="resolveScopeLevel(row) === 2">
          <Tooltip :title="'全机构共享: ' + resolveCompanyName(row)">
            <Tag color="green">
              {{ resolveCompanyName(row) }}
            </Tag>
          </Tooltip>
        </template>

        <template v-else-if="resolveScopeLevel(row) === 3 || resolveDeptScope(row)">
          <Tooltip :title="'完整组织层级路径: ' + (getDeptFullPaths(resolveDeptScope(row)) || '未指定部门')">
            <Tag color="orange">
              {{ getDeptShortNames(resolveDeptScope(row)) ? getDeptShortNames(resolveDeptScope(row)) : '特定部门' }}
            </Tag>
          </Tooltip>
        </template>

        <Tag v-else color="cyan">全集团共享</Tag>
      </template>

      <!-- 文件格式插槽 -->
      <template #type="{ row }">
        <Tag v-if="String(row.type).toLowerCase().includes('pdf')" color="red">PDF</Tag>
        <Tag v-else-if="String(row.type).toLowerCase().includes('doc')" color="blue">Word</Tag>
        <Tag v-else-if="String(row.type).toLowerCase().includes('xls')" color="green">Excel</Tag>
        <Tag v-else-if="String(row.type).toLowerCase().includes('txt')" color="default">TXT</Tag>
        <Tag v-else color="purple">{{ String(row.type || '文档').toUpperCase() }}</Tag>
      </template>

      <!-- 解析状态插槽 -->
      <template #status="{ row }">
        <Tag v-if="String(row.status) === '2'" color="success">解析成功</Tag>
        <Tag v-else-if="String(row.status) === '1'" color="processing">解析中</Tag>
        <Tag v-else-if="String(row.status) === '3'" color="error">解析失败</Tag>
        <Tag v-else color="default">未解析</Tag>
      </template>

      <!-- 审批状态插槽 -->
      <template #approveStatus="{ row }">
        <Tag v-if="String(row.approveStatus) === '2'" color="blue">已发布</Tag>
        <Tag v-else-if="String(row.approveStatus) === '1'" color="warning">待审核</Tag>
        <Tag v-else-if="String(row.approveStatus) === '3'" color="error">已驳回</Tag>
        <Tag v-else color="green">已通过</Tag>
      </template>

      <!-- 上传人列插槽 -->
      <template #createByName="{ row }">
        <Tag color="geekblue">{{ resolveCreatorName(row) }}</Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button
            type="primary"
            @click.stop="handleViewFile(row)"
          >
            预览
          </ghost-button>
          <ghost-button
            v-access:code="['system:attach:edit']"
            @click.stop="handleEdit(row)"
          >
            {{ $t('pages.common.edit') }}
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            title="确认删除？"
            @confirm="handleDelete(row)"
          >
            <ghost-button
              danger
              v-access:code="['system:attach:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>

    <AttachModal @reload="tableApi.query()" />

    <!-- 综合文档全能预览模态框 -->
    <Modal
      v-model:open="fileDetailVisible"
      :width="isFullscreen ? '98vw' : '1250px'"
      :style="isFullscreen ? { top: '8px' } : { top: '24px' }"
      :footer="null"
      destroy-on-close
      @cancel="closeFileDetail"
    >
      <div class="flex items-center justify-between pb-3 border-b mb-3">
        <div class="flex items-center gap-2 overflow-hidden">
          <span class="text-base font-bold text-gray-900 dark:text-gray-100 truncate flex items-center">
            <FileTextOutlined class="text-blue-500 mr-1.5" />
            <span>{{ fileDetailData ? fileDetailData.originalName : '文档在线预览' }}</span>
          </span>
          <Tag v-if="fileDetailData?.fileSuffix" color="blue" class="uppercase">
            {{ fileDetailData.fileSuffix.replace('.', '') }}
          </Tag>
        </div>
        
        <div class="flex items-center gap-2 shrink-0">
          <Button
            size="small"
            @click="showMeta = !showMeta"
          >
            {{ showMeta ? '隐藏概览信息' : '显示概览信息' }}
          </Button>

          <Button
            type="primary"
            ghost
            size="small"
            @click="toggleFullscreen"
            class="flex items-center gap-1 font-medium"
          >
            <template #icon>
              <FullscreenExitOutlined v-if="isFullscreen" />
              <FullscreenOutlined v-else />
            </template>
            {{ isFullscreen ? '退出全屏' : '全屏放大预览' }}
          </Button>

          <Button
            v-if="fileDetailData?.ossId"
            type="primary"
            size="small"
            @click="handleDownloadFile(fileDetailData.ossId, fileDetailData.originalName)"
          >
            <template #icon><DownloadOutlined /></template>
            下载
          </Button>
        </div>
      </div>

      <div v-if="fileDetailLoading" class="flex justify-center p-12"><Spin size="large" tip="加载原文档与预览数据..." /></div>
      <div v-else-if="fileDetailData" class="space-y-3">
        <Descriptions v-if="showMeta" :column="2" bordered size="small">
          <DescriptionsItem label="原始文件名">{{ fileDetailData.originalName }}</DescriptionsItem>
          <DescriptionsItem label="扩展名">{{ fileDetailData.fileSuffix }}</DescriptionsItem>
          <DescriptionsItem label="上传时间">{{ fileDetailData.createTime || '-' }}</DescriptionsItem>
          <DescriptionsItem label="上传人">{{ fileDetailData.createByName || '管理员' }}</DescriptionsItem>
        </Descriptions>
        
        <!-- 1. 图片预览 -->
        <div v-if="isImageFile(fileDetailData.fileSuffix)" class="text-center p-4 bg-gray-50 rounded border">
          <Image :src="fileDetailData.url" :preview="true" :style="{ maxHeight: isFullscreen ? 'calc(100vh - 140px)' : 'calc(80vh - 140px)' }" />
        </div>

        <!-- 2. PDF 文件内嵌原生预览 -->
        <div v-else-if="isPdfFile(fileDetailData.fileSuffix)" class="border rounded-lg overflow-hidden">
          <iframe :src="fileDetailData.url" class="w-full border-0" :style="{ height: isFullscreen ? 'calc(100vh - 130px)' : (showMeta ? 'calc(80vh - 200px)' : 'calc(80vh - 130px)') }" />
        </div>

        <!-- 3. Office 文档 (Word .docx / Excel .xlsx) / 文本高级双模式预览 -->
        <div v-else-if="isOfficeFile(fileDetailData.fileSuffix) || isTextFile(fileDetailData.fileSuffix) || previewTextContent" class="border rounded-lg p-3 bg-gray-50">
          <Tabs v-model:activeKey="activePreviewTab" type="card" size="small">
            
            <!-- Tab A: 原文档排版视图 -->
            <TabPane key="native" tab="原文档排版视图">
              
              <!-- Word .docx 渲染容器 -->
              <div v-if="(fileDetailData.fileSuffix || '').toLowerCase().endsWith('.docx')">
                <div v-if="isRenderingDocx" class="p-8 text-center"><Spin tip="正在解析并渲染 Word 排版..." /></div>
                <div 
                  ref="docxContainerRef" 
                  class="overflow-auto border rounded bg-slate-100 p-4 transition-all"
                  :style="{ height: isFullscreen ? 'calc(100vh - 170px)' : (showMeta ? 'calc(80vh - 220px)' : 'calc(80vh - 150px)') }"
                ></div>
              </div>

              <!-- Excel .xlsx 渲染容器 -->
              <div v-else-if="(fileDetailData.fileSuffix || '').toLowerCase().includes('xls')">
                <div v-if="isRenderingExcel" class="p-8 text-center"><Spin tip="正在渲染 Excel 电子表格..." /></div>
                <template v-else-if="excelHtmlContent">
                  <div v-if="sheetNames.length > 1" class="mb-2 flex items-center gap-2 flex-wrap border-b pb-2">
                    <span class="text-xs text-gray-500 font-medium">工作表（Sheet）：</span>
                    <Button
                      v-for="sName in sheetNames"
                      :key="sName"
                      size="small"
                      :type="currentSheet === sName ? 'primary' : 'default'"
                      @click="selectSheet(sName)"
                    >
                      {{ sName }}
                    </Button>
                  </div>
                  <div 
                    class="excel-table-container overflow-auto border rounded bg-white p-2 transition-all"
                    :style="{ height: isFullscreen ? 'calc(100vh - 180px)' : (showMeta ? 'calc(80vh - 230px)' : 'calc(80vh - 160px)') }"
                    v-html="excelHtmlContent"
                  ></div>
                </template>
                <div v-else class="p-4 text-gray-500 text-center">无法加载 Excel 表格内容</div>
              </div>

              <!-- 纯文本 / 代码预览 -->
              <div v-else class="overflow-auto" :style="{ height: isFullscreen ? 'calc(100vh - 170px)' : (showMeta ? 'calc(80vh - 220px)' : 'calc(80vh - 150px)') }">
                <pre class="h-full text-sm text-gray-800 font-mono whitespace-pre-wrap leading-relaxed bg-white p-4 rounded border overflow-auto">{{ previewTextContent }}</pre>
              </div>

            </TabPane>

            <!-- Tab B: AI 提取切片 (RAG Chunks Preview) -->
            <TabPane key="rag" tab="AI 知识切片视图">
              <div class="overflow-auto" :style="{ height: isFullscreen ? 'calc(100vh - 170px)' : (showMeta ? 'calc(80vh - 220px)' : 'calc(80vh - 150px)') }">
                <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center justify-between">
                  <span>系统底层向量库切片文本：</span>
                  <span>共 {{ previewTextContent.length }} 字符</span>
                </div>
                <pre class="h-full text-sm text-gray-800 font-mono whitespace-pre-wrap leading-relaxed bg-white p-4 rounded border overflow-auto">{{ previewTextContent || '暂无切片数据' }}</pre>
              </div>
            </TabPane>

          </Tabs>
        </div>

        <!-- 4. 通用下载访问链接 -->
        <div v-else class="mt-4 p-4 text-center bg-gray-50 rounded border text-gray-500">
          <p class="mb-2">源文件已在存储桶中</p>
          <a :href="fileDetailData.url" target="_blank" class="text-blue-600 underline text-sm break-all">{{ fileDetailData.url }}</a>
        </div>
      </div>
    </Modal>
  </Page>
</template>

<style scoped>
:deep(.excel-table-container table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  background-color: #fff;
}
:deep(.excel-table-container th) {
  position: sticky;
  top: 0;
  background-color: #f1f5f9;
  z-index: 5;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  text-align: left;
  white-space: nowrap;
}
:deep(.excel-table-container td) {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  white-space: nowrap;
}
:deep(.excel-table-container tr:nth-child(even)) {
  background-color: #f8fafc;
}
:deep(.excel-table-container tr:hover) {
  background-color: #e2e8f0;
}
:deep(.docx-view-wrap) {
  background: #f1f5f9;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 6px;
}
:deep(.docx-view-wrap > section.docx) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px !important;
  background: #ffffff !important;
  max-width: 100% !important;
  border-radius: 4px;
}
</style>
