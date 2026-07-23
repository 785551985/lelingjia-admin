<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';
import type { InfoForm } from '#/api/knowledge/info/model';

import { ref, computed, h } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { cloneDeep } from '@vben/utils';

import {
  Form,
  FormItem,
  Input,
  Select,
  RadioGroup,
  Switch,
  Slider,
  InputNumber,
  message,
  Tooltip,
  TreeSelect
} from 'ant-design-vue';
import { QuestionCircleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons-vue';

import { infoAdd } from '#/api/knowledge/info';
import { modelList } from '#/api/chat/model';
import { getDeptTree } from '#/api/system/user';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => '新增知识库');
const showAdvanced = ref(false);

const defaultValues: Partial<InfoForm> = {
  name: '',
  share: 1, // 默认为对内公开
  scopeLevel: 1, // 默认是租户/集团级
  deptScope: [] as any, // 绑定的部门列表，默认为数组以便于 TreeSelect
  description: '',
  remark: '',
  separator: '\\n',
  overlapChar: 10,
  retrieveLimit: 10,
  textBlockSize: 1000,
  vectorModel: 'pgvector',
  embeddingModel: undefined,
  enableRerank: 1,
  rerankModel: undefined,
  enableHybrid: 1,
  hybridAlpha: 0.5,
};

const formData = ref<Partial<InfoForm>>({ ...defaultValues });

type AntdFormRules<T> = Partial<Record<keyof T, RuleObject[]>> & {
  [key: string]: RuleObject[];
};

const formRules = ref<AntdFormRules<InfoForm>>({
  name: [{ required: true, message: '知识库名称不能为空' }],
  share: [{ required: true, message: '请选择是否公开' }],
  embeddingModel: [{ required: true, message: '请选择向量模型' }],
  vectorModel: [{ required: true, message: '请选择向量库' }],
});

const embeddingModelOptions = ref<Array<{ label: string; value: string }>>([]);
const rerankModelOptions = ref<Array<{ label: string; value: string }>>([]);
const vectorModelOptions = [
  { label: 'pgvector (本地向量库)', value: 'pgvector' },
];

const shareOptions = [
  { label: '对内公开', value: 1 },
  { label: '对外公开', value: 2 },
  { label: '仅自己可见', value: 0 },
];
const deptTreeData = ref<any[]>([]);

const scopeLevelOptions = [
  { label: '集团级（全集团公开，包括所有下属机构）', value: 1 },
  { label: '机构级（仅本机构/分公司公开）', value: 2 },
  { label: '部门级（仅本机构内指定部门可见）', value: 3 }
];

const { validate, validateInfos, resetFields } = Form.useForm(
  formData,
  formRules,
);

async function fetchEmbeddingModels() {
  try {
    const response = await modelList({ category: 'vector', pageSize: 1000 });
    const models = Array.isArray(response) ? response : ((response as any).rows || (response as any).records || []);
    embeddingModelOptions.value = models.map((model: any) => ({
      label: model.modelDescribe || model.modelName,
      value: model.modelName,
    }));
    if (embeddingModelOptions.value.length > 0 && !formData.value.embeddingModel) {
      formData.value.embeddingModel = embeddingModelOptions.value[0]?.value;
    }
  } catch (error) {
    console.error('Failed to fetch embedding models:', error);
  }
}

async function fetchRerankModels() {
  try {
    const response = await modelList({ category: 'rerank', pageSize: 1000 });
    const models = Array.isArray(response) ? response : ((response as any).rows || (response as any).records || []);
    rerankModelOptions.value = models.map((model: any) => ({
      label: model.modelDescribe || model.modelName,
      value: model.modelName,
    }));
    if (rerankModelOptions.value.length > 0 && !formData.value.rerankModel) {
      formData.value.rerankModel = rerankModelOptions.value[0]?.value;
    }
  } catch (error) {
    console.error('Failed to fetch rerank models:', error);
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

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[600px]',
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) return;
    modalApi.modalLoading(true);
    await Promise.all([fetchEmbeddingModels(), fetchRerankModels(), fetchDeptTreeData()]);
    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.lock(true);
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
    
    await infoAdd(data);
    message.success('新增成功');
    emit('reload');
    modalApi.close();
  } catch (error) {
    console.error(error);
  } finally {
    modalApi.lock(false);
  }
}

function handleClosed() {
  formData.value = { ...defaultValues };
  resetFields();
}
// 预设刻度样式
const renderMark = (label: string) => h('span', { style: { fontSize: '10px', opacity: 0.7 } }, label);

const alphaMarks = {
  0.3: renderMark('偏向量'),
  0.5: renderMark('平衡'),
  0.7: renderMark('偏全文')
};

const limitMarks = {
  3: renderMark('精简'),
  5: renderMark('默认'),
  10: renderMark('丰富'),
  20: renderMark('20')
};
</script>

<template>
  <BasicModal :title="title">
    <Form layout="vertical">
      <FormItem label="知识库名称" v-bind="validateInfos.name">
        <Input v-model:value="formData.name" placeholder="请输入知识库名称" />
      </FormItem>
      
      <FormItem label="是否公开" v-bind="validateInfos.share">
        <RadioGroup v-model:value="formData.share" :options="shareOptions" option-type="button" button-style="solid" />
      </FormItem>

      <!-- 只有当选择对内公开（share = 1）时，才展现作用域级别和部门选择 -->
      <template v-if="formData.share === 1">
        <FormItem label="作用域级别">
          <Select v-model:value="formData.scopeLevel" :options="scopeLevelOptions" placeholder="请选择对内公开的级别" />
        </FormItem>
        
        <FormItem v-if="formData.scopeLevel === 3" label="可见部门" v-bind="validateInfos.deptScope">
          <TreeSelect
            v-model:value="formData.deptScope"
            :tree-data="deptTreeData"
            placeholder="请选择可见部门（支持多选）"
            multiple
            tree-default-expand-all
            allow-clear
            :field-names="{ label: 'label', value: 'id', children: 'children' }"
            style="width: 100%"
          />
        </FormItem>
      </template>

      <!-- 方案二：高级配置折叠切换按钮 -->
      <div class="flex justify-end mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">
        <span 
          class="text-xs text-primary cursor-pointer hover:opacity-80 flex items-center gap-1 font-medium select-none"
          @click="showAdvanced = !showAdvanced"
        >
          {{ showAdvanced ? '收起高级设置' : '展开高级设置' }}
          <DownOutlined v-if="!showAdvanced" class="text-[10px]" />
          <UpOutlined v-else class="text-[10px]" />
        </span>
      </div>

      <!-- 高级设置包裹容器 -->
      <div v-show="showAdvanced" class="bg-gray-50/50 dark:bg-zinc-900/30 p-4 rounded-lg mb-4 border border-dashed border-gray-200 dark:border-zinc-800">
        <FormItem label="向量库" v-bind="validateInfos.vectorModel">
          <Select
            v-model:value="formData.vectorModel"
            :options="vectorModelOptions"
            placeholder="请选择向量库"
          />
        </FormItem>

        <FormItem label="向量模型" v-bind="validateInfos.embeddingModel">
          <Select
            v-model:value="formData.embeddingModel"
            :options="embeddingModelOptions"
            placeholder="请选择向量模型"
            show-search
          />
        </FormItem>

        <FormItem>
          <template #label>
            <div class="flex items-center gap-1">
              <span>启用重排</span>
              <Tooltip placement="top">
                <template #title>
                  在初步检索后的结果中，使用重排模型对待选文本块与原始问题进行二次相关性精打分。这能有效提升回答的准确度。
                </template>
                <QuestionCircleOutlined class="text-gray-400 text-xs cursor-help" />
              </Tooltip>
            </div>
          </template>
          <Switch 
            v-model:checked="formData.enableRerank" 
            :un-checked-value="0" 
            :checked-value="1" 
          />
          <span class="ml-2 text-gray-400 text-xs text-opacity-70">开启后将对检索结果进行精排，提升准确率</span>
        </FormItem>

        <FormItem v-if="formData.enableRerank" label="重排模型">
          <Select
            v-model:value="formData.rerankModel"
            :options="rerankModelOptions"
            placeholder="请选择重排模型"
            show-search
          />
        </FormItem>

        <FormItem>
          <template #label>
            <div class="flex items-center gap-1">
              <span>混合检索</span>
              <Tooltip placement="top">
                <template #title>
                  系统采用 RRF (Reciprocal Rank Fusion) 算法合并检索结果。该算法通过综合文本块在向量搜索和全文搜索中的“排名顺序”计算融合得分，能够给予两路同时命中的内容更高权重，显著提升搜索精准度。
                </template>
                <QuestionCircleOutlined class="text-gray-400 text-xs cursor-help" />
              </Tooltip>
            </div>
          </template>
          <Switch 
            v-model:checked="formData.enableHybrid" 
            :un-checked-value="0" 
            :checked-value="1" 
          />
        </FormItem>
    
        <FormItem v-if="formData.enableHybrid" label="检索权重 (α)">
          <div class="flex flex-col w-full">
            <div class="flex justify-between items-center mb-1 pr-4">
              <div class="flex items-center gap-2">
                <span class="italic text-gray-500 text-xs">vector</span>
                <span class="bg-gray-100 dark:bg-zinc-800 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-700 leading-none">
                  {{ (1 - (formData.hybridAlpha || 0.5)).toFixed(2) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="italic text-gray-500 text-xs">full-text</span>
                <span class="bg-gray-100 dark:bg-zinc-800 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-700 leading-none">
                  {{ (formData.hybridAlpha || 0.5).toFixed(2) }}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-4 pb-6">
              <Slider 
                v-model:value="formData.hybridAlpha" 
                :min="0" :max="1" :step="0.01" 
                :marks="alphaMarks"
                class="flex-1"
              />
              <InputNumber v-model:value="formData.hybridAlpha" :min="0" :max="1" :step="0.01" size="small" class="text-xs w-16" />
            </div>
          </div>
        </FormItem>

        <FormItem label="检索条数">
          <div class="flex items-center gap-4 pb-6">
            <Slider 
              v-model:value="formData.retrieveLimit" 
              :min="1" :max="20" 
              :marks="limitMarks"
              class="flex-1"
            />
            <InputNumber v-model:value="formData.retrieveLimit" :min="1" :max="20" size="small" class="text-xs w-16" />
          </div>
        </FormItem>
      </div>

      <FormItem label="备注" v-bind="validateInfos.remark">
        <Input.TextArea v-model:value="formData.remark" placeholder="请输入备注" :rows="2" />
      </FormItem>

      <FormItem label="描述" v-bind="validateInfos.description">
        <Input.TextArea v-model:value="formData.description" placeholder="请输入描述" :rows="3" />
      </FormItem>
    </Form>
  </BasicModal>
</template>
