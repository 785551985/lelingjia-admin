<template>
  <div class="p-4">
    <Card title="平台金牌智能体预设模板管理" :bordered="false">
      <template #extra>
        <Button type="primary" @click="handleCreate">新增智能体模板</Button>
      </template>

      <Table :columns="columns" :data-source="tableData" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tag'">
            <Tag :color="record.tagColor || 'blue'">{{ record.tag }}</Tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === '0' ? 'green' : 'red'">
              {{ record.status === '0' ? '已启用' : '已停用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">编辑 Prompt 与配置</Button>
              <Popconfirm title="确定要删除该智能体模板吗？" @confirm="handleDelete(record.id)">
                <Button type="link" danger size="small">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <!-- 编辑/新增 弹窗 -->
    <Modal
      v-model:open="modalVisible"
      :title="formData.id ? '编辑智能体模板' : '新增预设智能体模板'"
      width="820px"
      @ok="handleSave"
    >
      <Form :model="formData" :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
        <FormItem label="智能体 Key">
          <Input v-model:value="formData.agentKey" placeholder="如 general / hr / sales" :disabled="!!formData.id" />
        </FormItem>
        <FormItem label="智能体名称">
          <Input v-model:value="formData.agentName" placeholder="显示名称，如 集团官方通用 AI 助手" />
        </FormItem>
        <FormItem label="分类标签">
          <Input v-model:value="formData.tag" placeholder="如 官方标杆 / 内部管理" />
        </FormItem>
        <FormItem label="匹配知识库关健字">
          <Input v-model:value="formData.matchKb" placeholder="自动匹配并选择的示例知识库关键字" />
        </FormItem>
        <FormItem label="功能描述">
          <Input v-model:value="formData.description" placeholder="对员工或管理员展现的提示说明" />
        </FormItem>
        <FormItem label="System Prompt">
          <Input.TextArea v-model:value="formData.systemPrompt" :rows="12" font-mono placeholder="请输入智能体的人设与规则 System Message..." />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button, Card, Form, FormItem, Input, message, Modal, Popconfirm, Space, Table, Tag } from 'ant-design-vue';
import { requestClient } from '#/api/request';

const loading = ref(false);
const tableData = ref<any[]>([]);
const modalVisible = ref(false);
const formData = ref<any>({});

const columns = [
  { title: 'Key', dataIndex: 'agentKey', key: 'agentKey', width: 100 },
  { title: '智能体名称', dataIndex: 'agentName', key: 'agentName', width: 220 },
  { title: '标签分类', key: 'tag', width: 110 },
  { title: '自动匹配知识库', dataIndex: 'matchKb', key: 'matchKb', width: 130 },
  { title: '状态', key: 'status', width: 90 },
  { title: '操作', key: 'action', width: 180 },
];

async function loadData() {
  loading.value = true;
  try {
    const res: any = await requestClient.get('/system/agentTemplate/list', { params: { pageSize: 100 } });
    tableData.value = res.rows || res.records || (Array.isArray(res) ? res : []);
  } catch (e: any) {
    message.error(e.message || '加载智能体模板列表失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  formData.value = { status: '0', sortOrder: 0, tagColor: 'blue', systemPrompt: '# Role: 智能体角色\n\n## 1. 职责\n...' };
  modalVisible.value = true;
}

function handleEdit(record: any) {
  formData.value = { ...record };
  modalVisible.value = true;
}

async function handleSave() {
  try {
    if (formData.value.id) {
      await requestClient.put('/system/agentTemplate', formData.value);
      message.success('编辑智能体模板成功！已实时生效');
    } else {
      await requestClient.post('/system/agentTemplate', formData.value);
      message.success('新增智能体模板成功！');
    }
    modalVisible.value = false;
    loadData();
  } catch (e: any) {
    message.error(e.message || '保存失败');
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/system/agentTemplate/${id}`);
    message.success('删除成功');
    loadData();
  } catch (e: any) {
    message.error(e.message || '删除失败');
  }
}

onMounted(() => {
  loadData();
});
</script>
