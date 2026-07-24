<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { InfoForm } from '#/api/knowledge/info/model';

import { ref, onActivated, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import { Modal, Popconfirm, Space, Tag, Badge, Tooltip } from 'ant-design-vue';

import { useVbenModal } from '@vben/common-ui';
import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import { infoExport, infoList, infoRemove } from '#/api/knowledge/info';
import { commonDownloadExcel } from '#/utils/file/download';
import { getDeptTree } from '#/api/system/user';

import KnowledgeAddModal from './components/KnowledgeAddModal.vue';
import { columns, querySchema } from './data';
import { useRouter } from 'vue-router';

const deptNameMap = ref<Record<string | number, string>>({});
const deptPathMap = ref<Record<string | number, string>>({});

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

async function fetchDeptMapData() {
  try {
    const res = await getDeptTree();
    deptNameMap.value = {};
    deptPathMap.value = {};
    buildDeptPathMap(res || []);
  } catch (error) {
    console.error('Failed to fetch dept tree:', error);
  }
}

function getDeptShortNames(deptScope?: string) {
  if (!deptScope) return '';
  const ids = String(deptScope).split(',').filter(Boolean);
  return ids.map(id => deptNameMap.value[id] || `部门${id}`).join(', ');
}

function getDeptFullPaths(deptScope?: string) {
  if (!deptScope) return '';
  const ids = String(deptScope).split(',').filter(Boolean);
  return ids.map(id => deptPathMap.value[id] || `部门${id}`).join(' | ');
}

onMounted(() => {
  fetchDeptMapData();
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
      query: async ({ page }, formValues = {}) => {
        return await infoList({
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
  id: 'system-info-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

onActivated(() => {
  tableApi.query();
});

const router = useRouter();

const [AddModal, modalApi] = useVbenModal({
  connectedComponent: KnowledgeAddModal,
});

function handleAdd() {
  modalApi.open();
}

function handleDetail(row: Required<InfoForm>) {
  router.push(`/knowledge/info/detail/${row.id}`);
}

async function handleDelete(row: Required<InfoForm>) {
  await infoRemove(row.id);
  await tableApi.query();
}

function handleMultiDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: Required<InfoForm>) => row.id);
  Modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的${ids.length}条记录吗？`,
    onOk: async () => {
      await infoRemove(ids);
      await tableApi.query();
    },
  });
}

function handleDownloadExcel() {
  commonDownloadExcel(infoExport, '知识库数据', tableApi.formApi.form.values, {
    fieldMappingTime: formOptions.fieldMappingTime,
  });
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="知识库列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            v-access:code="['system:info:export']"
            @click="handleDownloadExcel"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['system:info:remove']"
            @click="handleMultiDelete"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            type="primary"
            v-access:code="['system:info:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>

      <!-- 公开范围列插槽 -->
      <template #share="{ row }">
        <Tag v-if="Number(row.share) === 1" color="blue">对内公开</Tag>
        <Tag v-else-if="Number(row.share) === 2" color="purple">对外公开</Tag>
        <Tag v-else color="default">仅自己可见</Tag>
      </template>

      <!-- 作用域级别列插槽 -->
      <template #scopeLevel="{ row }">
        <Tag v-if="Number(row.scopeLevel) === 4 || row.share === 0 || row.share === '0'" color="default">个人级</Tag>
        <Tag v-else-if="Number(row.scopeLevel) === 1" color="cyan">集团级</Tag>
        <Tag v-else-if="Number(row.scopeLevel) === 2" color="green">机构级</Tag>
        <Tag v-else-if="Number(row.scopeLevel) === 3" color="orange">部门级</Tag>
        <Tag v-else color="blue">对内级</Tag>
      </template>

      <!-- 归属主体列插槽 -->
      <template #deptScope="{ row }">
        <!-- 个人私有级：清晰展示个人私有标签，悬浮气泡展示创建者姓名 -->
        <template v-if="Number(row.scopeLevel) === 4 || row.share === 0 || row.share === '0'">
          <Tooltip :title="'个人专属私有资产，仅创建者本人可见: ' + (row.createByName || '当前用户')">
            <Tag color="purple">
              个人私有 {{ row.createByName ? `(${row.createByName})` : '' }}
            </Tag>
          </Tooltip>
        </template>

        <!-- 集团级 -->
        <template v-else-if="Number(row.scopeLevel) === 1">
          <Tooltip title="全集团共享，所有分公司及下属部门均可访问">
            <Tag color="cyan">全集团共享</Tag>
          </Tooltip>
        </template>

        <!-- 机构级：气泡提示机构全称 -->
        <template v-else-if="Number(row.scopeLevel) === 2">
          <Tooltip :title="'全机构共享: ' + (getDeptFullPaths(row.deptScope) || row.deptName || '分支机构')">
            <Tag color="green">
              {{ getDeptShortNames(row.deptScope) || row.deptName || '分支机构' }}
            </Tag>
          </Tooltip>
        </template>

        <!-- 部门级：表格展示精简名称，悬浮弹窗展现完整层级路径 -->
        <template v-else-if="Number(row.scopeLevel) === 3 || row.deptScope">
          <Tooltip :title="'完整组织层级路径: ' + (getDeptFullPaths(row.deptScope) || '未指定部门')">
            <Tag color="orange">
              {{ getDeptShortNames(row.deptScope) || '特定部门' }}
            </Tag>
          </Tooltip>
        </template>
        <Tag v-else color="blue">对内公开</Tag>
      </template>

      <!-- 创建人列插槽 -->
      <template #createByName="{ row }">
        <Tag color="blue">{{ row.createByName || row.createBy || '管理员' }}</Tag>
      </template>

      <!-- 创建时间列插槽 -->
      <template #createTime="{ row }">
        <span>{{ row.createTime || row.create_time || '-' }}</span>
      </template>

      <!-- 文档数量列插槽 -->
      <template #docCount="{ row }">
        <Tag color="blue">{{ row.docCount ?? row.documentCount ?? 0 }} 篇</Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button
            @click.stop="handleDetail(row)"
          >
            详情
          </ghost-button>
          <Popconfirm
            :get-popup-container="getVxePopupContainer"
            placement="left"
            title="确认删除？"
            @confirm="handleDelete(row)"
          >
            <ghost-button
              danger
              v-access:code="['system:info:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <AddModal @reload="tableApi.query()" />
  </Page>
</template>
