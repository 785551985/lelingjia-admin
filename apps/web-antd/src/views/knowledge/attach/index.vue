<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { AttachForm } from '#/api/knowledge/attach/model';

import { ref, onActivated, onMounted } from 'vue';
import { Page, useVbenModal } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import { Modal, Popconfirm, Space, Tag, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import { attachExport, attachList, attachRemove } from '#/api/knowledge/attach';
import { commonDownloadExcel } from '#/utils/file/download';
import { getDeptTree } from '#/api/system/user';

import attachModal from './attach-modal.vue';
import { columns, querySchema } from './data';

import { infoList } from '#/api/knowledge/info';

const deptNameMap = ref<Record<string | number, string>>({});
const deptPathMap = ref<Record<string | number, string>>({});
const knowledgeMap = ref<Record<string | number, string>>({});

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

      <!-- 附件名称插槽 -->
      <template #name="{ row }">
        <span class="font-medium text-gray-800 dark:text-gray-200">{{ row.name }}</span>
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
        <!-- 个人私有级：表格精简，悬浮显示所属全路径 -->
        <template v-if="resolveScopeLevel(row) === 4">
          <Tooltip :title="'个人专属资产: ' + resolveCreatorName(row)">
            <Tag color="default">
              {{ resolveCreatorName(row) }}
            </Tag>
          </Tooltip>
        </template>

        <!-- 集团级 -->
        <template v-else-if="resolveScopeLevel(row) === 1">
          <Tooltip title="全集团各分公司及下属部门均可访问">
            <Tag color="cyan">全集团共享</Tag>
          </Tooltip>
        </template>

        <!-- 机构级：悬浮提示完整机构全称 -->
        <template v-else-if="resolveScopeLevel(row) === 2">
          <Tooltip :title="'全机构共享: ' + resolveCompanyName(row)">
            <Tag color="green">
              {{ resolveCompanyName(row) }}
            </Tag>
          </Tooltip>
        </template>

        <!-- 部门级：表格展露精简部门，悬浮完整展现层次全路径 -->
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
  </Page>
</template>
