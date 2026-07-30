<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import { agentAdd, agentInfo, agentKnowledgeTreeOptions, agentUpdate } from '#/api/agent/agent';
import { defaultFormValueGetter, useBeforeCloseDiff } from '#/utils/popup';

import { drawerSchema } from './data';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => {
  return isUpdate.value ? $t('pages.common.edit') : $t('pages.common.add');
});

const [BasicForm, formApi] = useVbenForm({
  commonConfig: {
    formItemClass: 'col-span-2',
    componentProps: {
      class: 'w-full',
    },
  },
  layout: 'vertical',
  schema: drawerSchema(),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-2 gap-x-4',
});

const { onBeforeClose, markInitialized, resetInitialized } = useBeforeCloseDiff(
  {
    initializedGetter: defaultFormValueGetter(formApi),
    currentGetter: defaultFormValueGetter(formApi),
  },
);

function findKeyInTree(nodes: any[], val: string): string {
  if (!Array.isArray(nodes) || nodes.length === 0) return String(val);
  const targetStr = String(val).trim();
  const prefix = targetStr.length >= 15 ? targetStr.substring(0, 15) : targetStr;

  function dfs(list: any[]): string | null {
    for (const node of list) {
      const nodeKey = String(node.key || node.value || '');
      if (nodeKey === targetStr) {
        return nodeKey;
      }
      if (targetStr.length >= 15 && nodeKey.length >= 15 && nodeKey.startsWith(prefix)) {
        return nodeKey;
      }
      if (Array.isArray(node.children) && node.children.length > 0) {
        const found = dfs(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  const result = dfs(nodes);
  return result || String(val);
}

const [BasicDrawer, drawerApi] = useVbenDrawer({
  onBeforeClose,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  async onOpenChange(isOpen) {
    if (!isOpen) {
      return null;
    }
    drawerApi.drawerLoading(true);

    const treeData = await agentKnowledgeTreeOptions();
    await formApi.updateSchema([
      {
        fieldName: 'knowledgeIds',
        componentProps: {
          treeData,
        },
      },
    ]);

    const { id } = drawerApi.getData() as { id?: number | string };
    isUpdate.value = !!id;
    if (isUpdate.value && id) {
      const record: any = await agentInfo(id);
      if (record) {
        if (typeof record.knowledgeIds === 'string') {
          try {
            record.knowledgeIds = JSON.parse(record.knowledgeIds);
          } catch (e) {
            console.warn('解析 knowledgeIds 失败:', e);
          }
        }
        if (Array.isArray(record.knowledgeIds)) {
          record.knowledgeIds = record.knowledgeIds.map((v: any) => findKeyInTree(treeData, String(v)));
        }
        if (typeof record.deptIds === 'string' && record.deptIds.trim() !== '') {
          record.deptIds = record.deptIds.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      // 延迟到 Vue nextTick，确保 TreeSelect 组件在挂载完 treeData 后再填入值
      await nextTick();
      await formApi.setValues(record);
    }

    drawerApi.drawerLoading(false);
  },
});

async function handleConfirm() {
  try {
    drawerApi.lock(true);
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const data = cloneDeep(await formApi.getValues());
    if (Array.isArray(data.knowledgeIds)) {
      data.knowledgeIds = data.knowledgeIds.map((v: any) => Number(v));
    }
    if (Array.isArray(data.deptIds)) {
      data.deptIds = data.deptIds.join(',');
    }
    await (isUpdate.value ? agentUpdate(data) : agentAdd(data));
    resetInitialized();
    emit('reload');
    drawerApi.close();
  } catch (error) {
    console.error(error);
  } finally {
    drawerApi.lock(false);
  }
}

async function handleClosed() {
  await formApi.resetForm();
  resetInitialized();
}
</script>

<template>
  <BasicDrawer :title="title" class="w-[600px]">
    <BasicForm />
  </BasicDrawer>
</template>
