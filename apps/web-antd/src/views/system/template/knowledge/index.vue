<template>
  <div class="p-4">
    <Card title="平台统一知识库预设范本管理" :bordered="false">
      <template #extra>
        <Button type="primary" @click="handleCreate">新增预设范本</Button>
      </template>

      <Table :columns="columns" :data-source="tableData" :loading="loading" row-key="id">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="record.status === '0' ? 'green' : 'red'">
              {{ record.status === '0' ? '已启用' : '已停用' }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button type="link" size="small" @click="handleEdit(record)">编辑文本内容</Button>
              <Popconfirm title="确定要删除该范本吗？" @confirm="handleDelete(record.id)">
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
      :title="formData.id ? '编辑范本内容' : '新增预设范本'"
      width="800px"
      @ok="handleSave"
    >
      <Form :model="formData" :label-col="{ span: 4 }" :wrapper-col="{ span: 19 }">
        <FormItem label="范本 Key">
          <Input v-model:value="formData.templateKey" placeholder="如 common / sop / rule" :disabled="!!formData.id" />
        </FormItem>
        <FormItem label="范本名称">
          <Input v-model:value="formData.templateName" placeholder="范本显示名称" />
        </FormItem>
        <FormItem label="适用分类">
          <Input v-model:value="formData.category" placeholder="如 通用管理 / 产品报价" />
        </FormItem>
        <FormItem label="启用状态">
          <RadioGroup v-model:value="formData.status">
            <Radio value="0">正常启用</Radio>
            <Radio value="1">停用</Radio>
          </RadioGroup>
        </FormItem>
        <FormItem label="Markdown 内容">
          <Input.TextArea v-model:value="formData.content" :rows="14" font-mono placeholder="请输入标准的 Markdown 富文本规范条款..." />
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button, Card, Form, FormItem, Input, message, Modal, Popconfirm, Radio, RadioGroup, Space, Table, Tag } from 'ant-design-vue';
import { requestClient } from '#/api/request';

const loading = ref(false);
const tableData = ref<any[]>([]);
const modalVisible = ref(false);
const formData = ref<any>({});

const columns = [
  { title: '范本 Key', dataIndex: 'templateKey', key: 'templateKey', width: 120 },
  { title: '范本名称', dataIndex: 'templateName', key: 'templateName', width: 220 },
  { title: '适用分类', dataIndex: 'category', key: 'category', width: 120 },
  { title: '状态', key: 'status', width: 100 },
  { title: '更新时间', dataIndex: 'updateTime', key: 'updateTime', width: 180 },
  { title: '操作', key: 'action', width: 180 },
];

async function loadData() {
  loading.value = true;
  try {
    const res: any = await requestClient.get('/system/knowledgeTemplate/list', { params: { pageSize: 100 } });
    tableData.value = res.rows || res.records || (Array.isArray(res) ? res : []);
  } catch (e: any) {
    message.error(e.message || '加载范本列表失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  formData.value = { status: '0', sortOrder: 0, content: '# 示范范本标题\n\n## 一、核心规范\n请输入详细条款...' };
  modalVisible.value = true;
}

function handleEdit(record: any) {
  formData.value = { ...record };
  modalVisible.value = true;
}

async function handleSave() {
  try {
    if (formData.value.id) {
      await requestClient.put('/system/knowledgeTemplate', formData.value);
      message.success('编辑范本成功！已实时生效');
    } else {
      await requestClient.post('/system/knowledgeTemplate', formData.value);
      message.success('新增预设范本成功！');
    }
    modalVisible.value = false;
    loadData();
  } catch (e: any) {
    message.error(e.message || '保存失败');
  }
}

async function handleDelete(id: number) {
  try {
    await requestClient.delete(`/system/knowledgeTemplate/${id}`);
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
