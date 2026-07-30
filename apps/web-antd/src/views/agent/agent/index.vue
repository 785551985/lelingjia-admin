<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';

import type { VxeGridProps } from '#/adapter/vxe-table';
import type { AgentVO } from '#/api/agent/agent/model';

import { Page, useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { getVxePopupContainer } from '@vben/utils';

import {
  AuditOutlined,
  BulbOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  SafetyOutlined,
  ShoppingOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { message, Modal, Popconfirm, Space } from 'ant-design-vue';

import { useVbenVxeGrid, vxeCheckboxChecked } from '#/adapter/vxe-table';
import {
  agentAdd,
  agentExport,
  agentList,
  agentRemove,
} from '#/api/agent/agent';
import { infoList } from '#/api/knowledge/info';
import { modelList } from '#/api/chat/model';
import { commonDownloadExcel } from '#/utils/file/download';

import agentDrawer from './agent-drawer.vue';
import AgentTemplateModal from './AgentTemplateModal.vue';
import { columns, querySchema } from './data';

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
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
        return await agentList({
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
  id: 'agent-agent-index',
  showOverflow: false,
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

const [AgentDrawer, drawerApi] = useVbenDrawer({
  connectedComponent: agentDrawer,
});

const [TplModal, tplModalApi] = useVbenModal({
  connectedComponent: AgentTemplateModal,
});

function handleAdd() {
  drawerApi.setData({});
  drawerApi.open();
}

function handleAddTemplate() {
  tplModalApi.open();
}

async function handleEdit(record: AgentVO) {
  drawerApi.setData({ id: record.id });
  drawerApi.open();
}

async function handleDelete(row: AgentVO) {
  await agentRemove([row.id]);
  await tableApi.query();
}

function handleMultiDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  const ids = rows.map((row: AgentVO) => row.id);
  Modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的${ids.length}条记录吗？`,
    onOk: async () => {
      await agentRemove(ids);
      await tableApi.query();
    },
  });
}

function handleDownloadExcel() {
  commonDownloadExcel(agentExport, '智能体数据', tableApi.formApi.form.values);
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="智能体列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            v-access:code="['agent:agent:export']"
            @click="handleDownloadExcel"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            v-access:code="['agent:agent:remove']"
            @click="handleMultiDelete"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
          <a-button
            type="primary"
            ghost
            v-access:code="['agent:agent:add']"
            @click="handleAddTemplate"
          >
            套用预设智能体模板
          </a-button>
          <a-button
            type="primary"
            v-access:code="['agent:agent:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #agentShow="{ row }">
        <div class="flex items-center justify-center">
          <RobotOutlined v-if="row.agentShow === 'RobotOutlined'" class="text-blue-500 text-lg" />
          <CustomerServiceOutlined v-else-if="row.agentShow === 'CustomerServiceOutlined'" class="text-emerald-500 text-lg" />
          <SolutionOutlined v-else-if="row.agentShow === 'SolutionOutlined'" class="text-amber-500 text-lg" />
          <ShoppingOutlined v-else-if="row.agentShow === 'ShoppingOutlined'" class="text-purple-500 text-lg" />
          <AuditOutlined v-else-if="row.agentShow === 'AuditOutlined'" class="text-rose-500 text-lg" />
          <UserOutlined v-else-if="row.agentShow === 'UserOutlined'" class="text-indigo-500 text-lg" />
          <BulbOutlined v-else-if="row.agentShow === 'BulbOutlined'" class="text-yellow-500 text-lg" />
          <SafetyOutlined v-else-if="row.agentShow === 'SafetyOutlined'" class="text-cyan-500 text-lg" />
          <img v-else-if="row.agentShow && row.agentShow.startsWith('http')" :src="row.agentShow" class="w-5 h-5 rounded-full object-cover" />
          <RobotOutlined v-else class="text-blue-500 text-lg" />
        </div>
      </template>
      <template #action="{ row }">
        <Space>
          <ghost-button
            v-access:code="['agent:agent:edit']"
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
              v-access:code="['agent:agent:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </ghost-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <AgentDrawer @reload="tableApi.query()" />
    <TplModal @reload="tableApi.query()" />
  </Page>
</template>
