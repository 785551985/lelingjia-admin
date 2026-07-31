<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { VbenFormProps } from '@vben/common-ui';

import type { VxeGridProps } from '#/adapter/vxe-table';
import type { FragmentForm } from '#/api/knowledge/fragment/model';

import { Page, useVbenModal } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import { Modal, Popconfirm, Space, Tag, Tooltip } from 'ant-design-vue';
import { infoList } from '#/api/knowledge/info';

const knowledgeMap = ref<Record<string | number, string>>({});

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
    console.error('Failed to fetch knowledge map in fragment page:', error);
  }
}

function resolveKnowledgeName(row: any): string {
  if (row.knowledgeName) return row.knowledgeName;
  if (row.knowledgeTitle) return row.knowledgeTitle;
  if (row.knowledgeId) {
    const name = knowledgeMap.value[row.knowledgeId];
    if (name) return name;
  }
  return '乐龄家全集团通用制度库';
}

onMounted(() => {
  fetchKnowledgeMapData();
});

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import {
  fragmentExport,
  fragmentList,
  fragmentRemove,
} from '#/api/knowledge/fragment';
import { commonDownloadExcel } from '#/utils/file/download';

import { columns, querySchema } from './data';
import fragmentModal from './fragment-modal.vue';

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  // 处理区间选择器 RangePicker 时间格式映射
  // 将一个时间区间字段映射为两个独立的开始/结束时间字段，用于搜索和导出
  // 示例: 将 createTime 字段映射为 params[beginTime] 和 params[endTime]
  // fieldMappingTime: [
  //   [
  //     'createTime', // 表单中的字段名
  //     ['params[beginTime]', 'params[endTime]'], // 映射后的字段名
  //     ['YYYY-MM-DD 00:00:00', 'YYYY-MM-DD 23:59:59'], // 时间格式
  //   ],
  // ],
};

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    // 高亮
    highlight: true,
    // 翻页时保留选中状态
    reserve: true,
    // 点击行选中
    // trigger: 'row',
  },
  // 需要使用i18n注意这里要改成getter形式 否则切换语言不会刷新
  // columns: columns(),
  columns,
  height: 'auto',
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues = {}) => {
        return await fragmentList({
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
  // 表格全局唯一标识，用于保存列配置
  id: 'system-fragment-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [FragmentModal, modalApi] = useVbenModal({
  connectedComponent: fragmentModal,
});

function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

async function handleEdit(row: Required<FragmentForm>) {
  modalApi.setData({ id: row.id });
  modalApi.open();
}

async function handleDelete(row: Required<FragmentForm>) {
  await fragmentRemove(row.id);
  await tableApi.query();
}

function handleMultiDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: Required<FragmentForm>) => row.id);
  Modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的${ids.length}条记录吗？`,
    onOk: async () => {
      await fragmentRemove(ids);
      await tableApi.query();
    },
  });
}

const previewModalVisible = ref(false);
const previewRecord = ref<any>({});

function handlePreview(row: any) {
  previewRecord.value = row;
  previewModalVisible.value = true;
}

function handleDownloadExcel() {
  commonDownloadExcel(
    fragmentExport,
    '知识片段数据',
    tableApi.formApi.form.values,
    {
      fieldMappingTime: formOptions.fieldMappingTime,
    },
  );
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="知识片段列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            v-access:code="['system:fragment:export']"
            @click="handleDownloadExcel"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['system:fragment:remove']"
            @click="handleMultiDelete"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            type="primary"
            v-access:code="['system:fragment:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <!-- 所属知识库 -->
      <template #knowledgeName="{ row }">
        <Tag color="cyan">{{ resolveKnowledgeName(row) }}</Tag>
      </template>

      <!-- 片段序号 / 向量 ID -->
      <template #idx="{ row }">
        <Tooltip :title="'向量 FID: ' + (row.fid || 'FID-8f2a01a1')">
          <Tag color="purple">Chunk #{{ row.idx ?? 0 }}</Tag>
        </Tooltip>
      </template>

      <!-- 文本切片内容（点击可直接打开完整查看预览） -->
      <template #content="{ row }">
        <Tooltip title="点击查看完整文本切片预览" placement="topLeft">
          <div
            class="truncate w-full text-blue-700 hover:text-blue-900 cursor-pointer font-mono text-xs hover:underline transition-all"
            @click="handlePreview(row)"
          >
            {{ row.content }}
          </div>
        </Tooltip>
      </template>

      <!-- 切片标记/章节 -->
      <template #remark="{ row }">
        <Tag color="blue">{{ row.remark || '标准切片' }}</Tag>
      </template>

      <template #action="{ row }">
        <Space>
          <ghost-button @click.stop="handlePreview(row)">
            查看
          </ghost-button>
          <ghost-button
            v-access:code="['system:fragment:edit', 'system:info:edit']"
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
              v-access:code="['system:fragment:remove', 'system:info:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <FragmentModal @reload="tableApi.query()" />

    <!-- 文本切片全量富文本查看预览弹窗 -->
    <Modal
      v-model:open="previewModalVisible"
      title="文本切片全量内容查看与预览"
      width="720px"
      :footer="null"
      destroy-on-close
    >
      <div class="py-2">
        <div class="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded border border-gray-100">
          <Tag color="cyan">{{ resolveKnowledgeName(previewRecord) }}</Tag>
          <Tag color="purple">Chunk #{{ previewRecord.idx ?? 0 }}</Tag>
          <Tag color="blue">{{ previewRecord.remark || '标准切片' }}</Tag>
          <span class="text-xs text-gray-400 ml-auto">FID: {{ previewRecord.fid || '内置ID' }}</span>
        </div>
        <div class="p-4 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto shadow-inner border border-slate-800">
          {{ previewRecord.content }}
        </div>
      </div>
    </Modal>
  </Page>
</template>
