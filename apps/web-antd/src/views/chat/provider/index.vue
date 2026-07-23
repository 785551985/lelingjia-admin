<script setup lang="ts">
import { ref } from 'vue';

import { Page, useVbenModal, type VbenFormProps } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import { Modal, Popconfirm, Space, Switch, Tooltip } from 'ant-design-vue';

import {
  useVbenVxeGrid,
  vxeCheckboxChecked,
  type VxeGridProps
} from '#/adapter/vxe-table';

import {
  providerExport,
  providerList,
  providerRemove,
} from '#/api/chat/provider';
import type { ProviderForm } from '#/api/chat/provider/model';
import { commonDownloadExcel } from '#/utils/file/download';

import providerModal from './provider-modal.vue';
import { columns, querySchema } from './data';

// 图片预览相关配置
const preview = ref(true);  // 默认开启预览
const imageErrorMap = ref<Record<string | number, boolean>>({});

function handleImageError(id: string | number) {
  if (id !== undefined && id !== null) {
    imageErrorMap.value[id] = true;
  }
}

const localLogos: Record<string, string> = {
  deepseek: '/providers/deepseek.svg',
  zhipu: '/providers/zhipu.svg',
  qianwen: '/providers/qianwen.svg',
  alibailian: '/providers/qianwen.svg',
  ollama: '/providers/ollama.svg',
  kimi: '/providers/moonshot.svg',
  moonshot: '/providers/moonshot.svg',
  baichuan: '/providers/baichuan.svg',
  baidu: '/providers/baidu.svg',
  wenxin: '/providers/baidu.svg',
  claude: '/providers/claude.svg',
  doubao: '/providers/doubao.svg',
  gemini: '/providers/gemini.svg',
  hunyuan: '/providers/hunyuan.svg',
  minimax: '/providers/minimax.svg',
  mistral: '/providers/mistral.svg',
  openai: '/providers/openai.svg',
  ppio: '/providers/ppio.svg',
  sensenova: '/providers/sensenova.svg',
  spark: '/providers/spark.svg',
  stepfun: '/providers/stepfun.svg',
  yi: '/providers/yi.svg',
};

/**
 * 动态匹配与自动解析 LobeHub 官方大模型图标
 */
function getProviderLogoUrl(row: any): string {
  const icon = row.providerIcon;
  if (icon && typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('/'))) {
    return icon;
  }
  const code = String(row.providerCode || '').toLowerCase();
  if (localLogos[code]) {
    return localLogos[code];
  }
  // 自动从 LobeHub 官方 Icon 镜像动态匹配
  return `https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons/${code}-color.svg`;
}
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
        return await providerList({
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
  id: 'system-provider-index'
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [ProviderModal, modalApi] = useVbenModal({
  connectedComponent: providerModal,
});

function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

async function handleEdit(row: Required<ProviderForm>) {
  modalApi.setData({ id: row.id });
  modalApi.open();
}

async function handleDelete(row: Required<ProviderForm>) {
  await providerRemove(row.id);
  await tableApi.query();
}

function handleMultiDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: Required<ProviderForm>) => row.id);
  Modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的${ids.length}条记录吗？`,
    onOk: async () => {
      await providerRemove(ids);
      await tableApi.query();
    },
  });
}

function handleDownloadExcel() {
  commonDownloadExcel(providerExport, '厂商管理数据', tableApi.formApi.form.values, {
    fieldMappingTime: formOptions.fieldMappingTime,
  });
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="厂商管理列表">
      <template #toolbar-tools>
        <Space>
          <Tooltip title="预览图片">
            <Switch v-model:checked="preview" />
          </Tooltip>
          <a-button
            v-access:code="['system:provider:export']"
            @click="handleDownloadExcel"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['system:provider:remove']"
            @click="handleMultiDelete">
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            type="primary"
            v-access:code="['system:provider:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #providerIcon="{ row }">
        <div class="flex items-center justify-center">
          <img
            v-if="getProviderLogoUrl(row)"
            :src="getProviderLogoUrl(row)"
            style="width: 34px; height: 34px; object-fit: contain; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.12);"
          />
        </div>
      </template>
      <template #action="{ row }">
        <Space>
          <ghost-button
            v-access:code="['system:provider:edit']"
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
              v-access:code="['system:provider:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <ProviderModal @reload="tableApi.query()" />
  </Page>
</template>
