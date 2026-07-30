<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, InputSearch, message, Table, Tag } from 'ant-design-vue';

import {
  mcpMarketLoadTool,
  mcpMarketRefresh,
  mcpMarketToolList,
} from '#/api/mcp/market';
import type { McpMarketTool } from '#/api/mcp/market/model';

const emit = defineEmits<{ reload: [] }>();

const currentMarketId = ref<number | string | null>(null);
const currentMarketName = ref<string>('');
const loading = ref(false);
const toolList = ref<McpMarketTool[]>([]);
const searchKeyword = ref<string>('');

const filteredToolList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return toolList.value;
  }
  const kw = searchKeyword.value.trim().toLowerCase();
  return toolList.value.filter(
    (item) =>
      (item.toolName && item.toolName.toLowerCase().includes(kw)) ||
      (item.toolDescription && item.toolDescription.toLowerCase().includes(kw)),
  );
});

const columns = [
  { title: '工具名称', dataIndex: 'toolName', key: 'toolName', width: 160 },
  { title: '版本', dataIndex: 'toolVersion', key: 'toolVersion', width: 90 },
  { title: '工具描述', dataIndex: 'toolDescription', key: 'toolDescription', ellipsis: true },
  { title: '状态', dataIndex: 'isLoaded', key: 'isLoaded', width: 110 },
  { title: '操作', key: 'action', width: 120 },
];

const [BasicModal, modalApi] = useVbenModal({
  title: '市场工具列表',
  class: 'w-[900px]',
  showCancelButton: false,
  confirmText: '关闭',
  onConfirm: () => modalApi.close(),
  async onOpenChange(isOpen) {
    if (!isOpen) return;
    searchKeyword.value = '';
    const data = modalApi.getData() as { id: number | string; name: string };
    if (data?.id) {
      currentMarketId.value = data.id;
      currentMarketName.value = data.name || '';
      modalApi.setState({ title: `[${currentMarketName.value}] 扩展工具库` });
      await loadTools();
    }
  },
});

async function loadTools() {
  if (!currentMarketId.value) return;
  loading.value = true;
  try {
    const res = await mcpMarketToolList(currentMarketId.value, { pageSize: 1000 });
    const rawData = (res as any)?.data || res;
    toolList.value = rawData?.list || (Array.isArray(rawData) ? rawData : []);
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

async function handleRefreshMarket() {
  if (!currentMarketId.value) return;
  loading.value = true;
  try {
    const res = await mcpMarketRefresh(currentMarketId.value);
    if (res?.success) {
      const added = res.addedCount || 0;
      const updated = res.updatedCount || 0;
      if (added === 0 && updated === 0) {
        message.success('已同步最新数据，市场工具列表已是最新状态！');
      } else {
        message.success(`刷新成功！新增 ${added} 个工具，更新 ${updated} 个工具`);
      }
    } else {
      message.warning(res?.message || '刷新提示：未发现新增工具');
    }
    await loadTools();
  } catch (err: any) {
    message.error(err?.message || '刷新失败');
  } finally {
    loading.value = false;
  }
}

async function handleLoadTool(record: any) {
  try {
    await mcpMarketLoadTool(record.id);
    message.success(`成功载入工具 [${record.toolName}] 到本地 MCP 工具箱！`);
    record.isLoaded = true;
    emit('reload');
  } catch (err) {
    message.error('载入失败');
  }
}
</script>

<template>
  <BasicModal>
    <div class="mb-4 flex items-center justify-between gap-4">
      <InputSearch
        v-model:value="searchKeyword"
        placeholder="搜索 MCP 工具名称或描述..."
        class="max-w-[320px]"
        allow-clear
      />
      <Button type="primary" ghost :loading="loading" @click="handleRefreshMarket">
        刷新同步工具
      </Button>
    </div>
    <Table
      :columns="columns"
      :data-source="filteredToolList"
      :loading="loading"
      row-key="id"
      :pagination="{ pageSize: 6 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'isLoaded'">
          <Tag :color="record.isLoaded ? 'green' : 'orange'">
            {{ record.isLoaded ? '已载入本地' : '未载入' }}
          </Tag>
        </template>
        <template v-if="column.key === 'action'">
          <Button
            type="primary"
            size="small"
            :disabled="record.isLoaded"
            @click="handleLoadTool(record)"
          >
            {{ record.isLoaded ? '已导入' : '载入本地' }}
          </Button>
        </template>
      </template>
    </Table>
  </BasicModal>
</template>
