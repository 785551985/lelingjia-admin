<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';
import type { AttachForm } from '#/api/knowledge/attach/model';

import { computed, ref, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { cloneDeep } from '@vben/utils';

import {
  Form,
  FormItem,
  Input,
  Textarea,
  Select,
  RadioGroup,
  RadioButton,
  Upload,
  Button,
  message,
  TreeSelect
} from 'ant-design-vue';
import { UploadOutlined } from '@ant-design/icons-vue';
import { pick } from 'lodash-es';

import { attachAdd, attachInfo, attachUpdate } from '#/api/knowledge/attach';
import { infoList } from '#/api/knowledge/info';
import { getDeptTree } from '#/api/system/user';

const props = defineProps<{
  knowledgeId?: string | number;
}>();

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => isUpdate.value ? '编辑文档附件' : '新增文档附件');

const knowledgeOptions = ref<{ label: string; value: string | number }[]>([]);
const deptTreeData = ref<any[]>([]);

const defaultValues: Partial<AttachForm> & { share?: number; scopeLevel?: number; deptScope?: any } = {
  id: undefined,
  knowledgeId: undefined,
  name: '',
  type: 'pdf',
  share: 1,
  scopeLevel: 1,
  deptScope: [],
  remark: '',
};

const formData = ref(cloneDeep(defaultValues));

type AntdFormRules<T> = Partial<Record<keyof T, RuleObject[]>> & {
  [key: string]: RuleObject[];
};

const formRules = ref<AntdFormRules<any>>({
  knowledgeId: [{ required: true, message: '请选择归属知识库' }],
  name: [{ required: true, message: '请输入附件名称' }],
  scopeLevel: [{ required: true, message: '请选择作用域级别' }],
});

const shareOptions = [
  { label: '对内公开', value: 1 },
  { label: '对外公开', value: 2 },
  { label: '仅自己可见', value: 0 },
];

const scopeLevelOptions = [
  { label: '集团级', value: 1 },
  { label: '机构级', value: 2 },
  { label: '部门级', value: 3 },
];

const { validate, validateInfos, resetFields } = Form.useForm(
  formData,
  formRules,
);

async function fetchKnowledgeList() {
  if (props.knowledgeId) return;
  try {
    const res = await infoList({ pageSize: 100 });
    const list = Array.isArray(res) ? res : ((res as any).rows || (res as any).records || []);
    knowledgeOptions.value = list.map((item: any) => ({
      label: item.name,
      value: item.id,
    }));
  } catch (error) {
    console.error('Failed to fetch knowledge list:', error);
  }
}

async function fetchDeptTreeData() {
  try {
    const res = await getDeptTree();
    deptTreeData.value = res || [];
  } catch (error) {
    console.error('Failed to fetch dept tree:', error);
  }
}

function handleFileChange(info: any) {
  const file = info.file;
  if (file) {
    if (!formData.value.name) {
      formData.value.name = file.name;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext) {
      formData.value.type = ext;
    }
  }
}

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[600px]',
  fullscreenButton: false,
  closeOnClickModal: false,
  onClosed: handleCancel,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    modalApi.modalLoading(true);

    await Promise.all([fetchKnowledgeList(), fetchDeptTreeData()]);

    const { id } = modalApi.getData() as { id?: number | string };
    isUpdate.value = !!id;

    if (isUpdate.value && id) {
      const record = await attachInfo(id);
      const filterRecord = pick(record, Object.keys(defaultValues)) as any;
      if (filterRecord.deptScope && typeof filterRecord.deptScope === 'string') {
        filterRecord.deptScope = filterRecord.deptScope.split(',').filter(Boolean);
      } else {
        filterRecord.deptScope = [];
      }
      formData.value = filterRecord;
    } else {
      formData.value = cloneDeep(defaultValues);
      if (props.knowledgeId) {
        formData.value.knowledgeId = props.knowledgeId;
      }
    }

    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.modalLoading(true);
    await validate();

    const payload = cloneDeep(formData.value) as any;

    if (props.knowledgeId) {
      payload.knowledgeId = props.knowledgeId;
    }

    if (payload.share === 0) {
      payload.scopeLevel = 4;
      payload.deptScope = '';
    } else if (payload.share === 2) {
      payload.scopeLevel = 2;
      payload.deptScope = '';
    } else if (payload.scopeLevel === 3) {
      if (Array.isArray(payload.deptScope)) {
        payload.deptScope = payload.deptScope.join(',');
      }
    } else {
      payload.deptScope = '';
    }

    await (isUpdate.value ? attachUpdate(payload) : attachAdd(payload));
    message.success(isUpdate.value ? '更新文档成功' : '新增文档成功');
    emit('reload');
    await handleCancel();
  } catch (error) {
    console.error(error);
  } finally {
    modalApi.modalLoading(false);
  }
}

async function handleCancel() {
  modalApi.close();
  formData.value = cloneDeep(defaultValues);
  resetFields();
}
</script>

<template>
  <BasicModal :title="title">
    <Form :label-col="{ span: 5 }" class="pt-2">
      <!-- 1. 所属知识库下拉（在传了 knowledgeId 时自动锁定，不传时提供全库下拉自选） -->
      <FormItem v-if="!props.knowledgeId" label="归属知识库" v-bind="validateInfos.knowledgeId">
        <Select
          v-model:value="formData.knowledgeId"
          :options="knowledgeOptions"
          placeholder="请选择归属的知识库"
          class="w-full"
        />
      </FormItem>

      <!-- 2. 附件上传与名称 -->
      <FormItem label="选择文件">
        <Upload :before-upload="() => false" @change="handleFileChange" :max-count="1">
          <Button><UploadOutlined /> 选择本地文档 (PDF/Word/Excel/TXT等)</Button>
        </Upload>
      </FormItem>

      <FormItem label="附件名称" v-bind="validateInfos.name">
        <Input
          v-model:value="formData.name"
          placeholder="请输入文档附件名称"
        />
      </FormItem>

      <!-- 3. 公开范围按钮组 -->
      <FormItem label="公开范围">
        <RadioGroup v-model:value="formData.share" button-style="solid">
          <RadioButton
            v-for="opt in shareOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </RadioButton>
        </RadioGroup>
      </FormItem>

      <!-- 4. 作用域级别 & 部门树联动 -->
      <template v-if="formData.share === 1">
        <FormItem label="作用域级别" v-bind="validateInfos.scopeLevel">
          <Select
            v-model:value="formData.scopeLevel"
            :options="scopeLevelOptions"
            placeholder="请选择作用域级别"
          />
        </FormItem>

        <FormItem
          v-if="formData.scopeLevel === 3"
          label="指定部门"
        >
          <TreeSelect
            v-model:value="formData.deptScope"
            :tree-data="deptTreeData"
            tree-checkable
            allow-clear
            placeholder="请选择可访问的具体部门"
            :field-names="{ label: 'label', value: 'id', children: 'children' }"
          />
        </FormItem>
      </template>

      <!-- 5. 备注说明 -->
      <FormItem label="备注说明" v-bind="validateInfos.remark">
        <Textarea
          v-model:value="formData.remark"
          placeholder="请输入文档备注信息"
          :rows="3"
        />
      </FormItem>
    </Form>
  </BasicModal>
</template>
