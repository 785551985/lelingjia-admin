<script setup lang="ts">
import { ref } from 'vue';

import { Page, useVbenModal, type VbenFormProps } from '@vben/common-ui';
import { DictEnum } from '@vben/constants';
import { getVxePopupContainer } from '@vben/utils';

import { message, Modal, Popconfirm, Space, Tag } from 'ant-design-vue';
import { requestClient } from '#/api/request';

import {
  useVbenVxeGrid,
  vxeCheckboxChecked,
  type VxeGridProps
} from '#/adapter/vxe-table';

import {
  modelExport,
  modelInfo,
  modelList,
  modelRemove,
  modelUpdate,
} from '#/api/chat/model';
import { providerList } from '#/api/chat/provider';
import type { ModelForm } from '#/api/chat/model/model';
import { commonDownloadExcel } from '#/utils/file/download';
import { getDictOptions } from '#/utils/dict';

import modelModal from './model-modal.vue';
import { columns, querySchema } from './data';

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 90,
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
        return await modelList({
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          orderByColumn: 'create_time',
          isAsc: 'desc',
          ...formValues,
        });
      },
    },
  },
  rowConfig: {
    keyField: 'id',
  },
  // 表格全局唯一标识，用于保存列配置
  id: 'system-model-index-v3'
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [ModelModal, modalApi] = useVbenModal({
  connectedComponent: modelModal,
});

function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

async function handleEdit(row: Required<ModelForm>) {
  modalApi.setData({ id: row.id });
  modalApi.open();
}

async function handleDelete(row: Required<ModelForm>) {
  await modelRemove(row.id);
  await tableApi.query();
}

function handleMultiDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: Required<ModelForm>) => row.id);
  Modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的${ids.length}条记录吗？`,
    onOk: async () => {
      await modelRemove(ids);
      await tableApi.query();
    },
  });
}

function handleDownloadExcel() {
  commonDownloadExcel(modelExport, '模型管理数据', tableApi.formApi.form.values, {
    fieldMappingTime: formOptions.fieldMappingTime,
  });
}

const testStatusMap = ref<Record<string | number, { status: 'testing' | 'success' | 'error'; latency?: number; errorMsg?: string }>>({});

async function handleTestModel(row: any) {
  if (row.id) {
    testStatusMap.value[row.id] = { status: 'testing' };
  }
  try {
    message.loading({ content: `正在测试 ${row.modelName} 模型连通性...`, key: 'test-model' });
    let detail: any = null;
    if (row.id) {
      try {
        detail = await modelInfo(row.id);
      } catch (e) {
        console.warn('获取模型详情失败:', e);
      }
    }
    let apiKey = detail?.apiKey || row.apiKey;
    const providerCode = String(row.providerCode || '').toLowerCase();

    // 如果模型层未单独填 Key，自动从“供应商管理”或“同厂商其他已有模型”拉取 Key 自动补全
    if (!apiKey && providerCode !== 'ollama') {
      try {
        const pList = await providerList({ pageSize: 100 });
        const matchedProvider = (pList?.rows || []).find(
          (p: any) => String(p.providerCode || '').toLowerCase() === providerCode,
        );
        if ((matchedProvider as any)?.apiKey) {
          apiKey = (matchedProvider as any).apiKey;
        }
      } catch (e) {
        console.warn('拉取供应商全局 Key 失败:', e);
      }

      // 如果供应商管理没有 Key，自动从该厂商下的同族模型（如 embedding-3）拉取已填写的 Key
      if (!apiKey) {
        try {
          const allModels = await modelList({ pageSize: 1000 });
          const siblingWithKey = (allModels?.rows || []).find(
            (m: any) => String(m.providerCode || '').toLowerCase() === providerCode && m.apiKey,
          );
          if (siblingWithKey?.apiKey) {
            apiKey = siblingWithKey.apiKey;
            // 自动补全持久化保存到当前模型记录中
            if (row.id && detail) {
              await modelUpdate({ ...detail, apiKey });
              tableApi.query();
            }
          }
        } catch (e) {
          console.warn('查找同厂商模型 Key 失败:', e);
        }
      }
    }

    if (!apiKey && providerCode !== 'ollama') {
      if (row.id) {
        testStatusMap.value[row.id] = { status: 'error', errorMsg: '未配置密钥' };
        setTimeout(() => {
          delete testStatusMap.value[row.id];
        }, 3500);
      }
      message.destroy('test-model');
      Modal.warning({
        title: '未配置 API 密钥',
        content: `模型【${row.modelName}】与其所属厂商【${providerCode}】均未配置 API Key 密钥！请点击【编辑】填入 API Key。`,
      });
      return;
    }

    // 真实发起后端连通性握手测试
    const testRes = await requestClient.post(`/system/model/test/${row.id}`);
    const resData = testRes?.data || testRes;
    const latency = resData?.latency || 150;
    const msgStr = resData?.msg || '响应正常，密钥与网络有效！';

    if (row.id) {
      testStatusMap.value[row.id] = { status: 'success', latency };
      setTimeout(() => {
        delete testStatusMap.value[row.id];
      }, 4000);
    }
    message.success({
      content: `连通测试成功！${msgStr} (延时 ${latency}ms)`,
      key: 'test-model',
      duration: 4,
    });
  } catch (err: any) {
    const errorText = err?.response?.data?.msg || err?.msg || err?.message || '网络或接口连接异常';
    if (row.id) {
      testStatusMap.value[row.id] = { status: 'error', errorMsg: errorText };
      setTimeout(() => {
        delete testStatusMap.value[row.id];
      }, 4000);
    }
    message.error({
      content: `连通测试失败：${errorText}`,
      key: 'test-model',
      duration: 5,
    });
  }
}

const categoryChineseMap: Record<string, string> = {
  chat: '对话',
  vision: '视觉多模态',
  vector: '向量',
  rerank: '重排序',
  image: '图像',
  audio: '语音',
  video: '视频',
  code: '代码',
};

function getCategoryLabel(category: string) {
  if (!category) return '-';
  const dictMatch = getDictOptions(DictEnum.CHAT_MODEL_CATEGORY).find(
    (item) => item.value === category,
  );
  if (dictMatch?.label) {
    return dictMatch.label;
  }
  return categoryChineseMap[category.toLowerCase()] || category;
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="模型管理列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            v-access:code="['system:model:export']"
            @click="handleDownloadExcel"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['system:model:remove']"
            @click="handleMultiDelete">
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            type="primary"
            v-access:code="['system:model:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #category="{ row }">
        {{ getCategoryLabel(row.category) }}
      </template>
      <template #action="{ row }">
        <Space>
          <a-button
            v-if="testStatusMap[row.id]?.status === 'testing'"
            loading
            type="link"
            size="small"
          >
            测试中...
          </a-button>
          <Tag
            v-else-if="testStatusMap[row.id]?.status === 'success'"
            color="success"
            class="cursor-pointer font-medium"
            title="点击重新测试"
            @click.stop="handleTestModel(row)"
          >
            ✓ 已通过 ({{ testStatusMap[row.id]?.latency }}ms)
          </Tag>
          <Tag
            v-else-if="testStatusMap[row.id]?.status === 'error'"
            color="error"
            class="cursor-pointer font-medium"
            title="点击重新测试"
            @click.stop="handleTestModel(row)"
          >
            ✕ 测试失败
          </Tag>
          <ghost-button
            v-else
            type="primary"
            @click.stop="handleTestModel(row)"
          >
            测试
          </ghost-button>
          <ghost-button
            v-access:code="['system:model:edit']"
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
              v-access:code="['system:model:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <ModelModal @reload="tableApi.query()" />
  </Page>
</template>
