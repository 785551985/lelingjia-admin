<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';
import type { InfoForm } from '#/api/knowledge/info/model';

import { computed, ref, watch } from 'vue';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import {
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  RadioGroup,
  Button,
  Space,
  Switch,
  Slider,
  TreeSelect,
} from 'ant-design-vue';
import { pick } from 'lodash-es';
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue';

import { useUserStore } from '@vben/stores';

import { infoAdd, infoInfo, infoUpdate } from '#/api/knowledge/info';
import { embeddingModelList, rerankModelList } from '#/api/chat/model';
import { getDeptTree } from '#/api/system/user';

const emit = defineEmits<{ reload: [] }>();

const userStore = useUserStore();
const currentUserDeptName = computed(() => {
  const info: any = userStore.userInfo || {};
  return info.deptName || info.dept?.deptName || '';
});
const currentUserDeptId = computed(() => {
  const info: any = userStore.userInfo || {};
  return info.deptId || info.dept?.deptId;
});

const visible = ref(false);
const loading = ref(false);
const isUpdate = ref(false);
const showAdvanced = ref(false);

const title = computed(() => {
  return isUpdate.value ? $t('pages.common.edit') : $t('pages.common.add');
});

const defaultValues: Partial<InfoForm> = {
  id: undefined,
  name: undefined,
  share: 1, // 默认为对内公开
  scopeLevel: 1, // 默认是集团级
  deptScope: [] as any, // 绑定的部门列表，默认为数组以便于 TreeSelect
  description: undefined,
  separator: undefined,
  overlapChar: undefined,
  retrieveLimit: undefined,
  textBlockSize: undefined,
  vectorModel: 'pgvector',
  embeddingModel: undefined,
  enableRerank: 1, // 默认开启重排
  rerankModel: undefined,
  rerankTopN: undefined,
  rerankScoreThreshold: undefined,
  enableHybrid: 1, // 默认开启混合检索
  hybridAlpha: 0.5,
  remark: undefined,
};

const formData = ref<Partial<InfoForm>>({ ...defaultValues });

const deptTreeData = ref<any[]>([]);

const scopeLevelOptions = [
  { label: '集团级（全集团公开，包括所有下属机构）', value: 1 },
  { label: '机构级（仅本机构/分公司公开）', value: 2 },
  { label: '部门级（仅本机构内指定部门可见）', value: 3 }
];

type AntdFormRules<T> = Partial<Record<keyof T, RuleObject[]>> & {
  [key: string]: RuleObject[];
};

const formRules = ref<AntdFormRules<InfoForm>>({
  name: [{ required: true, message: '知识库名称不能为空' }],
  share: [{ required: true, message: '请选择是否公开' }],
  vectorModel: [{ required: true, message: '请选择向量库' }],
  embeddingModel: [{ required: true, message: '请选择向量模型' }],
  retrieveLimit: [{ required: true, message: '知识库检索条数不能为空' }],
  textBlockSize: [{ required: true, message: '文本块大小不能为空' }],
  overlapChar: [{ required: true, message: '重叠字符数不能为空' }],
  rerankModel: [{ required: true, message: '请选择重排序模型' }],
  rerankTopN: [{ required: true, message: '重排序返回数量不能为空' }],
  rerankScoreThreshold: [{ required: true, message: '分数阈值不能为空' }],
});

const vectorModelOptions = [
  { label: 'pgvector (本地向量库)', value: 'pgvector' },
];

const embeddingModelOptions = ref<Array<{ label: string; value: string }>>([]);

const rerankModelOptions = ref<Array<{ label: string; value: string }>>([]);

const shareOptions = [
  { label: '是', value: 1 },
  { label: '否', value: 0 },
];

const { validate, validateInfos, resetFields } = Form.useForm(
  formData,
  formRules,
);

async function fetchEmbeddingModels() {
  try {
    const response = await embeddingModelList();
    const models = Array.isArray(response) ? response : ((response as any).rows || (response as any).records || []);
    embeddingModelOptions.value = models.map((model: any) => ({
      label: model.modelDescribe,
      value: model.modelName,
    }));
  } catch (error) {
    console.error('Failed to fetch embedding models:', error);
  }
}

async function fetchDeptTreeData() {
  try {
    const response = await getDeptTree();
    deptTreeData.value = response || [];
  } catch (error) {
    console.error('Failed to fetch dept tree:', error);
  }
}

/**
 * 根据作用域级别 (2:机构级, 3:部门级) 严格限制节点可选状态
 */
const computedDeptTreeData = computed(() => {
  if (!deptTreeData.value || deptTreeData.value.length === 0) return [];

  const level = formData.value.scopeLevel;

  const processNode = (node: any): any => {
    const item = { ...node };
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    if (level === 2) {
      // 机构级：只保留机构节点（如 深圳总公司、长沙分公司），剥离下属部门节点
      if (hasChildren) {
        const firstChildName = node.children[0]?.label || node.children[0]?.title || '';
        const childrenAreDepts = !/公司|机构|分院|总院/.test(firstChildName);

        if (childrenAreDepts) {
          // 机构节点：剥离部门列表，成为可勾选的机构节点
          item.children = undefined;
          item.disabled = false;
          item.disableCheckbox = false;
          item.selectable = true;
          item.isLeaf = true;
        } else {
          // 根分组节点（如 乐龄家大健康科技）：递归保留机构子节点，根节点不可勾选
          item.disabled = true;
          item.disableCheckbox = true;
          item.selectable = false;
          item.children = node.children.map((child: any) => processNode(child));
        }
      } else {
        item.disabled = false;
        item.disableCheckbox = false;
        item.selectable = true;
      }
    } else if (level === 3) {
      // 部门级：仅可选择具体部门节点，父级机构节点作为容器禁止勾选
      if (hasChildren) {
        item.disabled = true;
        item.disableCheckbox = true;
        item.selectable = false;
        item.children = node.children.map((child: any) => processNode(child));
      } else {
        item.disabled = false;
        item.disableCheckbox = false;
        item.selectable = true;
      }
    }

    return item;
  };

  return deptTreeData.value.map((rootNode: any) => processNode(rootNode));
});

watch(() => formData.value.scopeLevel, (level) => {
  if ((level === 2 || level === 3) && (!formData.value.deptScope || (Array.isArray(formData.value.deptScope) && formData.value.deptScope.length === 0))) {
    if (currentUserDeptId.value) {
      formData.value.deptScope = [currentUserDeptId.value];
    }
  }
});

async function fetchRerankModels() {
  try {
    const response = await rerankModelList();
    const models = Array.isArray(response) ? response : ((response as any).rows || (response as any).records || []);
    rerankModelOptions.value = models.map((model: any) => ({
      label: model.modelDescribe,
      value: model.modelName,
    }));
  } catch (error) {
    console.error('Failed to fetch rerank models:', error);
  }
}

// 监听检索条数变化，确保重排序返回数量不超过检索条数
watch(() => formData.value.retrieveLimit, (newVal) => {
  if (formData.value.rerankTopN && newVal && formData.value.rerankTopN > newVal) {
    formData.value.rerankTopN = newVal;
  }
});

// 监听启用重排序变化
watch(() => formData.value.enableRerank, (newVal) => {
  if (newVal === 1) {
    // 启用重排序时，设置默认值
    if (!formData.value.rerankModel && rerankModelOptions.value.length > 0) {
      formData.value.rerankModel = rerankModelOptions.value[0]?.value;
    }
    if (!formData.value.rerankTopN) {
      formData.value.rerankTopN = Math.min(5, formData.value.retrieveLimit || 5);
    }
    if (formData.value.rerankScoreThreshold === undefined) {
      formData.value.rerankScoreThreshold = 0.5;
    }
  }
});

async function handleOpen(id?: string | number) {
  loading.value = true;
  try {
    await Promise.all([fetchEmbeddingModels(), fetchRerankModels(), fetchDeptTreeData()]);

    isUpdate.value = !!id;

    if (isUpdate.value && id) {
      const record = await infoInfo(id);
      const filterRecord = pick(record, Object.keys(defaultValues)) as any;
      
      // 反序列化部门字段为数组，以供 TreeSelect 消费
      if (filterRecord.deptScope && typeof filterRecord.deptScope === 'string') {
        filterRecord.deptScope = filterRecord.deptScope.split(',').filter(Boolean);
      } else {
        filterRecord.deptScope = [];
      }
      formData.value = filterRecord;
    } else {
      const defaultEmbeddingModel = embeddingModelOptions.value.length > 0
        ? embeddingModelOptions.value[0]?.value
        : undefined;
      const defaultRerankModel = rerankModelOptions.value.length > 0
        ? rerankModelOptions.value[0]?.value
        : undefined;

      formData.value = {
        ...defaultValues,
        share: 1, // 默认为对内公开
        scopeLevel: 1, // 默认集团级
        deptScope: [] as any,
        vectorModel: 'pgvector',
        embeddingModel: defaultEmbeddingModel,
        retrieveLimit: 5,
        textBlockSize: 300,
        overlapChar: 30,
        enableRerank: 1,
        rerankModel: defaultRerankModel,
        rerankTopN: 5,
        rerankScoreThreshold: 0.5,
      };
    }

    visible.value = true;
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  try {
    loading.value = true;
    await validate();
    const data = cloneDeep(formData.value) as any;
    
    // 逻辑闭环：根据顶级“可见范围”自动修正后台 scopeLevel 级别
    if (data.share === 0) {
      data.scopeLevel = 4; // 仅自己可见 -> 个人级
      data.deptScope = '';
    } else if (data.share === 2) {
      data.scopeLevel = 2; // 对外公开 -> 机构级
      data.deptScope = '';
    } else if (data.share === 1) {
      // 对内公开
      if (data.scopeLevel === 3) {
        if (Array.isArray(data.deptScope)) {
          data.deptScope = data.deptScope.join(',');
        }
      } else {
        data.deptScope = '';
      }
    }
    
    await (isUpdate.value ? infoUpdate(data) : infoAdd(data));
    //message.success(isUpdate.value ? '修改成功' : '新增成功');
    emit('reload');
    handleClose();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function handleClose() {
  visible.value = false;
  formData.value = cloneDeep(defaultValues);
  resetFields();
}

defineExpose({
  open: handleOpen,
});
</script>

<template>
  <Drawer
    :title="title"
    :open="visible"
    @close="handleClose"
    :width="600"
    :body-style="{ paddingBottom: '80px' }"
  >
    <Form :model="formData" :label-col="{ span: 6 }">
      <FormItem label="知识名称" v-bind="validateInfos.name">
        <Input
          v-model:value="formData.name"
          :placeholder="$t('ui.formRules.required')"
        />
      </FormItem>
      <FormItem label="是否公开" v-bind="validateInfos.share">
        <RadioGroup v-model:value="formData.share" :options="shareOptions" option-type="button" button-style="solid" />
      </FormItem>

      <!-- 只有当选择对内公开（share = 1）时，才展现作用域级别和部门选择 -->
      <template v-if="formData.share === 1">
        <FormItem label="作用域级别">
          <Select v-model:value="formData.scopeLevel" :options="scopeLevelOptions" placeholder="请选择对内公开的级别" />
        </FormItem>
        
        <FormItem v-if="formData.scopeLevel === 2 || formData.scopeLevel === 3" :label="formData.scopeLevel === 2 ? '可见机构' : '可见部门'" v-bind="validateInfos.deptScope">
          <div v-if="currentUserDeptName" class="mb-2.5 px-3 py-1.5 bg-blue-50 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 rounded text-xs flex items-center gap-1.5 border border-blue-100 dark:border-zinc-700">
            <span>已根据您的权限身份自动锁定/预填归属：<strong>{{ currentUserDeptName }}</strong>（管理员可多选调整）</span>
          </div>
          <TreeSelect
            v-model:value="formData.deptScope"
            :tree-data="computedDeptTreeData"
            :placeholder="formData.scopeLevel === 2 ? '请选择可见的分支机构（仅展示机构）' : '请选择可见的具体部门（父级机构不可选）'"
            multiple
            tree-default-expand-all
            allow-clear
            :field-names="{ label: 'label', value: 'id', children: 'children' }"
            style="width: 100%"
          />
        </FormItem>
      </template>

      <FormItem label="知识库描述" v-bind="validateInfos.description">
        <Input.TextArea
          v-model:value="formData.description"
          :placeholder="$t('ui.formRules.required')"
          :rows="3"
        />
      </FormItem>

      <!-- 高级设置折叠切换链接 -->
      <div class="flex justify-end mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2 pl-6">
        <span 
          class="text-xs text-primary cursor-pointer hover:opacity-80 flex items-center gap-1 font-medium select-none ml-auto"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? '收起高级设置' : '展开高级设置' }}
          <DownOutlined v-if="!showAdvanced" class="text-[10px]" />
          <UpOutlined v-else class="text-[10px]" />
        </span>
      </div>

      <!-- 高级配置包裹区 -->
      <div v-show="showAdvanced" class="bg-gray-50/50 dark:bg-zinc-900/30 p-4 rounded-lg mb-4 border border-dashed border-gray-200 dark:border-zinc-800 ml-6">
        <FormItem label="知识分隔符" v-bind="validateInfos.separator">
          <Input
            v-model:value="formData.separator"
            :placeholder="$t('ui.formRules.required')"
          />
        </FormItem>
        <FormItem label="重叠字符" v-bind="validateInfos.overlapChar">
          <InputNumber
            v-model:value="formData.overlapChar"
            style="width: 100%"
            :placeholder="$t('ui.formRules.required')"
            :min="0"
          />
        </FormItem>
        <FormItem label="检索条数" v-bind="validateInfos.retrieveLimit">
          <InputNumber
            v-model:value="formData.retrieveLimit"
            style="width: 100%"
            :placeholder="$t('ui.formRules.required')"
            :min="1"
          />
        </FormItem>
        <FormItem label="文本块大小" v-bind="validateInfos.textBlockSize">
          <InputNumber
            v-model:value="formData.textBlockSize"
            style="width: 100%"
            :placeholder="$t('ui.formRules.required')"
            :min="1"
          />
        </FormItem>
        <FormItem label="向量库" v-bind="validateInfos.vectorModel">
          <Select
            v-model:value="formData.vectorModel"
            :options="vectorModelOptions"
            :placeholder="$t('ui.formRules.required')"
          />
        </FormItem>
        <FormItem label="向量模型" v-bind="validateInfos.embeddingModel">
          <Select
            :key="`embedding-${embeddingModelOptions.length}`"
            v-model:value="formData.embeddingModel"
            :options="embeddingModelOptions"
            :placeholder="$t('ui.formRules.required')"
          />
        </FormItem>
        <FormItem label="启用混合检索">
          <Switch
            v-model:checked="formData.enableHybrid"
            :checked-value="1"
            :un-checked-value="0"
          />
        </FormItem>
        <FormItem v-if="formData.enableHybrid === 1" label="混合检索权重">
          <div class="flex items-center gap-3">
            <Slider
              v-model:value="formData.hybridAlpha"
              :min="0"
              :max="1"
              :step="0.05"
              style="flex: 1"
            />
            <span class="w-12 text-right">{{
              (formData.hybridAlpha || 0.5).toFixed(2)
            }}</span>
          </div>
        </FormItem>
        <FormItem label="启用重排序">
          <Switch
            v-model:checked="formData.enableRerank"
            :checked-value="1"
            :un-checked-value="0"
          />
        </FormItem>
        <template v-if="formData.enableRerank === 1">
          <FormItem label="重排序模型" v-bind="validateInfos.rerankModel">
            <Select
              :key="`rerank-${rerankModelOptions.length}`"
              v-model:value="formData.rerankModel"
              :options="rerankModelOptions"
              :placeholder="$t('ui.formRules.required')"
            />
          </FormItem>
          <FormItem label="重排序数量" v-bind="validateInfos.rerankTopN">
            <InputNumber
              v-model:value="formData.rerankTopN"
              style="width: 100%"
              :placeholder="$t('ui.formRules.required')"
              :min="1"
              :max="formData.retrieveLimit || 100"
            />
            <div v-if="formData.retrieveLimit" class="text-gray-400 text-xs mt-1">
              不能超过检索条数 ({{ formData.retrieveLimit }})
            </div>
          </FormItem>
          <FormItem label="分数阈值" v-bind="validateInfos.rerankScoreThreshold">
            <div class="flex items-center gap-3">
              <Slider
                v-model:value="formData.rerankScoreThreshold"
                :min="0"
                :max="1"
                :step="0.01"
                style="flex: 1"
              />
              <span class="w-12 text-right">{{ (formData.rerankScoreThreshold || 0).toFixed(2) }}</span>
            </div>
          </FormItem>
        </template>
      </div>

      <FormItem label="备注" v-bind="validateInfos.remark">
        <Input.TextArea
          v-model:value="formData.remark"
          :placeholder="$t('ui.formRules.required')"
          :rows="3"
        />
      </FormItem>
    </Form>

    <template #footer>
      <Space style="float: right">
        <Button @click="handleClose">取消</Button>
        <Button type="primary" :loading="loading" @click="handleSubmit">
          {{ isUpdate ? '更新' : '新增' }}
        </Button>
      </Space>
    </template>
  </Drawer>
</template>
