<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';
import type { InfoForm } from '#/api/knowledge/info/model';

import { ref, watch, h } from 'vue';
import { cloneDeep } from '@vben/utils';

import {
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  RadioGroup,
  RadioButton,
  Button,
  Switch,
  message,
  Tooltip,
  Slider,
  TreeSelect,
  Badge,
  Tag
} from 'ant-design-vue';
import { QuestionCircleOutlined, DownOutlined, UpOutlined, FileTextOutlined, TableOutlined, CodeOutlined } from '@ant-design/icons-vue';
import { pick } from 'lodash-es';

const activePreset = ref<'general' | 'code' | 'table' | 'custom'>('general');

import { infoAdd, infoInfo, infoUpdate } from '#/api/knowledge/info';
import { modelList } from '#/api/chat/model';
import { getDeptTree } from '#/api/system/user';

const props = defineProps<{
  knowledgeId?: string | number;
  refreshTrigger?: number;
}>();

const emit = defineEmits<{ saved: [id: string | number] }>();

const loading = ref(false);
const isUpdate = ref(false);
const showAdvanced = ref(false);

const defaultValues: Partial<InfoForm> = {
  id: undefined,
  name: undefined,
  share: 1, // 默认为对内公开
  scopeLevel: 1, // 默认集团级
  deptScope: [] as any, // 部门列表，默认为数组以便于 TreeSelect
  description: undefined,
  separator: undefined,
  overlapChar: undefined,
  retrieveLimit: undefined,
  textBlockSize: undefined,
  vectorModel: 'pgvector',
  embeddingModel: undefined,
  enableRerank: 1, // 默认开启重排
  rerankModel: undefined,
  enableHybrid: 1, // 默认开启混合检索
  hybridAlpha: 0.5,
  similarityThreshold: 0.5,
  remark: undefined,
};

const formData = ref<Partial<InfoForm>>({ ...defaultValues });
const loadedSplitConfig = ref('');
const deptTreeData = ref<any[]>([]);

const scopeLevelOptions = [
  { label: '集团级（全集团公开，包括所有下属机构）', value: 1 },
  { label: '机构级（仅本机构/分公司公开）', value: 2 },
  { label: '部门级（仅本机构内指定部门可见）', value: 3 }
];

function splitConfigKey(value: Partial<InfoForm>) {
  return JSON.stringify([value.separator ?? '', value.textBlockSize, value.overlapChar]);
}

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
});

const vectorModelOptions = [
  { label: 'pgvector (本地向量库)', value: 'pgvector' },
];

const embeddingModelOptions = ref<Array<{ label: string; value: string }>>([]);
const rerankModelOptions = ref<Array<{ label: string; value: string }>>([]);

const shareOptions = [
  { label: '对内公开', value: 1 },
  { label: '对外公开', value: 2 },
  { label: '仅自己可见', value: 0 },
];

const { validate, validateInfos } = Form.useForm(
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

async function fetchRerankModels() {
  try {
    const response = await modelList({ category: 'rerank', pageSize: 1000 });
    const models = Array.isArray(response) ? response : ((response as any).rows || (response as any).records || []);
    rerankModelOptions.value = models.map((model: any) => ({
      label: model.modelDescribe || model.modelName,
      value: model.modelName,
    }));
  } catch (error) {
    console.error('Failed to fetch rerank models:', error);
  }
}

async function loadData() {
  loading.value = true;
  try {
    await Promise.all([fetchEmbeddingModels(), fetchRerankModels(), fetchDeptTreeData()]);

    isUpdate.value = !!props.knowledgeId;

    if (isUpdate.value && props.knowledgeId) {
      const record = await infoInfo(props.knowledgeId);
      const filterRecord = pick(record, Object.keys(defaultValues)) as any;
      
      if (filterRecord.share !== undefined && filterRecord.share !== null) {
        filterRecord.share = Number(filterRecord.share);
      }
      if (filterRecord.scopeLevel !== undefined && filterRecord.scopeLevel !== null) {
        filterRecord.scopeLevel = Number(filterRecord.scopeLevel);
      }

      // 反序列化部门字段为数组，以供 TreeSelect 消费
      if (filterRecord.deptScope && typeof filterRecord.deptScope === 'string') {
        filterRecord.deptScope = filterRecord.deptScope.split(',').filter(Boolean);
      } else {
        filterRecord.deptScope = [];
      }
      formData.value = {
        ...filterRecord,
        id: String(props.knowledgeId),
      };
      loadedSplitConfig.value = splitConfigKey(filterRecord);
    } else {
      const defaultEmbeddingModel = embeddingModelOptions.value.length > 0
        ? embeddingModelOptions.value[0]?.value
        : undefined;

      formData.value = {
        ...defaultValues,
        share: 1, // 默认为对内公开
        scopeLevel: 1,
        deptScope: [] as any,
        vectorModel: 'pgvector',
        embeddingModel: defaultEmbeddingModel,
        retrieveLimit: 5,
        similarityThreshold: 0.5,
        textBlockSize: 300,
        overlapChar: 30,
      };
    }
  } finally {
    loading.value = false;
  }
}

watch(() => props.knowledgeId, () => {
  loadData();
}, { immediate: true });

watch(() => props.refreshTrigger, () => {
  loadData();
});

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
    
    delete data.createTime;
    delete data.create_time;
    delete data.updateTime;
    delete data.update_time;

    if (props.knowledgeId) {
      data.id = String(props.knowledgeId);
    }
    
    if (isUpdate.value) {
      const splitChanged = loadedSplitConfig.value !== splitConfigKey(data);
      await infoUpdate(data);
      message.success('知识库设置更新成功');
      await loadData();
      if (splitChanged) {
        message.warning('分片配置已变更，现有文档不会自动重建，请在文档管理中点击“全部重新解析”。', 8);
      }
      emit('saved', data.id!);
    } else {
      const res = await infoAdd(data);
      message.success('新增成功');
      const newId = (res as any)?.id || (res as any)?.data?.id || new Date().getTime();
      emit('saved', newId);
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function applySplitPreset(type: 'general' | 'code' | 'table') {
  activePreset.value = type;
  if (type === 'general') {
    formData.value.textBlockSize = 500;
    formData.value.overlapChar = 50;
    formData.value.separator = '\\n\\n';
    message.info('已成功应用【通用规章制度类】预设 (500字 / 50重叠)');
  } else if (type === 'code') {
    formData.value.textBlockSize = 800;
    formData.value.overlapChar = 80;
    formData.value.separator = '\\n\\n```';
    message.info('已成功应用【技术代码类】预设 (800字 / 80重叠)');
  } else if (type === 'table') {
    formData.value.textBlockSize = 300;
    formData.value.overlapChar = 20;
    formData.value.separator = '\\n';
    message.info('已成功应用【短表单与清单类】预设 (300字 / 20重叠)');
  }
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

const thresholdMarks = {
  0.2: renderMark('宽松'),
  0.5: renderMark('标准'),
  0.8: renderMark('严谨')
};
</script>

<template>
  <div class="py-4 px-2 max-w-3xl mx-auto">
    <!-- 顶端状态概览 Banner 卡片 -->
    <div class="bg-blue-50/70 dark:bg-zinc-800/50 border border-blue-100 dark:border-zinc-700 rounded-xl p-4 mb-6 shadow-sm">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Badge status="processing" color="#10b981" />
          <span class="font-bold text-gray-800 dark:text-gray-100 text-sm">当前知识库状态：服务就绪 (RAG Ready)</span>
        </div>
        <Tag color="success" class="m-0">在线运营中</Tag>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-blue-100/60 dark:border-zinc-700/60 text-xs">
        <div>
          <span class="text-gray-500">生效公开模式：</span>
          <Tag v-if="formData.share === 1" color="cyan" class="ml-1">对内公开</Tag>
          <Tag v-else-if="formData.share === 2" color="green" class="ml-1">对外公开</Tag>
          <Tag v-else color="default" class="ml-1">仅自己可见</Tag>
        </div>
        <div>
          <span class="text-gray-500">作用域级别：</span>
          <Tag v-if="formData.share === 1 && formData.scopeLevel === 1" color="cyan" class="ml-1">集团级 (全公司共享)</Tag>
          <Tag v-else-if="formData.share === 1 && formData.scopeLevel === 2" color="green" class="ml-1">机构级 (本机构可见)</Tag>
          <Tag v-else-if="formData.share === 1 && formData.scopeLevel === 3" color="orange" class="ml-1">部门级 (指定部门可见)</Tag>
          <Tag v-else-if="formData.share === 2" color="green" class="ml-1">机构级 (对外公开)</Tag>
          <Tag v-else-if="formData.share === 0" color="default" class="ml-1">个人级 (仅自己可见)</Tag>
          <Tag v-else color="blue" class="ml-1">标准作用域</Tag>
        </div>
        <div>
          <span class="text-gray-500">向量底层支持：</span>
          <span class="font-mono text-gray-700 dark:text-gray-300 ml-1">PGVector / 1024 维</span>
        </div>
      </div>
    </div>

    <Form :model="formData" :label-col="{ span: 5 }" :wrapper-col="{ span: 19 }">
      <FormItem label="知识名称" v-bind="validateInfos.name">
        <Input v-model:value="formData.name" placeholder="请输入知识库名称" />
      </FormItem>

      <FormItem label="公开范围" v-bind="validateInfos.share">
        <RadioGroup v-model:value="formData.share" button-style="solid" size="default">
          <RadioButton v-for="opt in shareOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </RadioButton>
        </RadioGroup>
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

      <FormItem label="知识库描述" v-bind="validateInfos.description">
        <Input.TextArea
          v-model:value="formData.description"
          :rows="3"
          placeholder="请输入知识库描述"
        />
      </FormItem>

      <!-- 高级设置折叠切换链接 -->
      <div class="flex justify-end mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2 pl-4">
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
      <div v-show="showAdvanced" class="bg-gray-50/50 dark:bg-zinc-900/30 p-4 rounded-xl mb-6 border border-dashed border-gray-200 dark:border-zinc-800">
        
        <!-- UI/UX Pro Max 智能切片场景推荐卡片组 -->
        <div class="mb-5">
          <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 font-bold flex items-center gap-1">
            <span>💡 智能切片推荐套餐（点击卡片一键填充最优参数）：</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- 预设卡片 1：通用规章制度 -->
            <div 
              class="border rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden"
              :class="activePreset === 'general' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500' : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-300'"
              @click="applySplitPreset('general')"
            >
              <div class="flex items-center gap-2 mb-1.5 font-bold text-xs text-gray-800 dark:text-gray-100">
                <FileTextOutlined class="text-blue-500 text-sm" />
                <span>通用规章制度类</span>
                <Tag color="processing" class="scale-75 origin-left m-0">推荐</Tag>
              </div>
              <div class="text-[11px] text-gray-500 dark:text-gray-400">块大小: <span class="font-bold text-gray-700 dark:text-gray-300">500字</span> | 重叠: <span class="font-bold text-gray-700 dark:text-gray-300">50字</span></div>
              <div class="text-[10px] text-blue-600 dark:text-blue-400 mt-1">适合制度、休假规定与常规文档</div>
            </div>

            <!-- 预设卡片 2：表格与短清单 -->
            <div 
              class="border rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden"
              :class="activePreset === 'table' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500' : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-300'"
              @click="applySplitPreset('table')"
            >
              <div class="flex items-center gap-2 mb-1.5 font-bold text-xs text-gray-800 dark:text-gray-100">
                <TableOutlined class="text-emerald-500 text-sm" />
                <span>短清单与表格类</span>
              </div>
              <div class="text-[11px] text-gray-500 dark:text-gray-400">块大小: <span class="font-bold text-gray-700 dark:text-gray-300">300字</span> | 重叠: <span class="font-bold text-gray-700 dark:text-gray-300">20字</span></div>
              <div class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">适合收费明细、评估标准与表格</div>
            </div>

            <!-- 预设卡片 3：技术代码类 -->
            <div 
              class="border rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden"
              :class="activePreset === 'code' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500' : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-blue-300'"
              @click="applySplitPreset('code')"
            >
              <div class="flex items-center gap-2 mb-1.5 font-bold text-xs text-gray-800 dark:text-gray-100">
                <CodeOutlined class="text-purple-500 text-sm" />
                <span>技术代码类</span>
              </div>
              <div class="text-[11px] text-gray-500 dark:text-gray-400">块大小: <span class="font-bold text-gray-700 dark:text-gray-300">800字</span> | 重叠: <span class="font-bold text-gray-700 dark:text-gray-300">80字</span></div>
              <div class="text-[10px] text-purple-600 dark:text-purple-400 mt-1">适合代码、API 手册与研发笔记</div>
            </div>
          </div>
        </div>

        <FormItem v-bind="validateInfos.separator">
          <template #label>
            <span>知识分隔符</span>
            <Tooltip title="优先分割段落的符号。默认双换行 \n\n，表示优先在自然段落间切割，不破坏段落语义。">
              <QuestionCircleOutlined class="ml-1 text-gray-400 cursor-pointer" />
            </Tooltip>
          </template>
          <Input.TextArea
            v-model:value="formData.separator"
            :rows="2"
            placeholder="可输入换行或多字符；对 Markdown、代码等所有格式生效"
          />
        </FormItem>

        <FormItem v-bind="validateInfos.textBlockSize">
          <template #label>
            <span>文本块大小</span>
            <Tooltip title="单个文本切片的最大字数。推荐 500 字，太大影响搜索精度，太小破坏语义上下文。">
              <QuestionCircleOutlined class="ml-1 text-gray-400 cursor-pointer" />
            </Tooltip>
          </template>
          <InputNumber v-model:value="formData.textBlockSize" :min="1" class="w-full" />
        </FormItem>

        <FormItem v-bind="validateInfos.overlapChar">
          <template #label>
            <span>重叠字符数</span>
            <Tooltip title="相邻两个文本切片之间重复保留的字数（上下文胶水），防止关键语句在边缘被切断。推荐 50 字。">
              <QuestionCircleOutlined class="ml-1 text-gray-400 cursor-pointer" />
            </Tooltip>
          </template>
          <InputNumber
            v-model:value="formData.overlapChar"
            :min="0"
            :max="Math.max(0, Number(formData.textBlockSize || 1) - 1)"
            class="w-full"
          />
        </FormItem>

        <FormItem label="向量库" v-bind="validateInfos.vectorModel">
          <Select
            v-model:value="formData.vectorModel"
            :options="vectorModelOptions"
          />
        </FormItem>

        <FormItem label="向量模型" v-bind="validateInfos.embeddingModel">
          <Select
            :key="`embedding-${embeddingModelOptions.length}`"
            v-model:value="formData.embeddingModel"
            :options="embeddingModelOptions"
            placeholder="请选择向量模型"
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
          <span class="ml-2 text-gray-400 text-xs">开启后将对检索结果进行精排，提升准确率</span>
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
          <span class="ml-2 text-gray-400 text-xs">融合向量搜素与关键词搜索，提升非语义匹配场景的精度</span>
        </FormItem>
    
        <FormItem v-if="formData.enableHybrid" label="检索权重 (α)">
          <div class="flex flex-col w-full pr-4">
            <div class="flex justify-between items-center mb-1">
              <div class="flex items-center gap-2">
                <span class="italic text-gray-500 text-xs text-opacity-70">vector</span>
                <span class="bg-gray-100 dark:bg-zinc-800 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200 dark:border-gray-700 leading-none">
                  {{ (1 - (formData.hybridAlpha || 0.5)).toFixed(2) }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="italic text-gray-500 text-xs text-opacity-70">full-text</span>
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

        <FormItem v-bind="validateInfos.retrieveLimit">
          <template #label>
            <div class="flex items-center gap-1">
              <span>检索条数</span>
              <Tooltip placement="top">
                <template #title>
                  指定从知识库中检索并提供给大模型的最大文本块数量。建议配置在 3-10 条之间。
                </template>
                <QuestionCircleOutlined class="text-gray-400 text-xs cursor-help" />
              </Tooltip>
            </div>
          </template>
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

        <FormItem v-bind="validateInfos.similarityThreshold">
          <template #label>
            <div class="flex items-center gap-1">
              <span>相似度阈值</span>
              <Tooltip placement="top">
                <template #title>
                  设置检索结果的最低相似度过滤分值。只有得分超过该阈值的文本块才会被返回。阈值越高，结果越精准但召回数量可能减少。推荐设置在 0.4-0.6 之间。
                </template>
                <QuestionCircleOutlined class="text-gray-400 text-xs cursor-help" />
              </Tooltip>
            </div>
          </template>
          <div class="flex items-center gap-4 pb-6">
            <Slider 
              v-model:value="formData.similarityThreshold" 
              :min="0" :max="1" :step="0.01" 
              :marks="thresholdMarks"
              class="flex-1"
            />
            <InputNumber v-model:value="formData.similarityThreshold" :min="0" :max="1" :step="0.01" size="small" class="text-xs w-16" />
          </div>
        </FormItem>
      </div>

      <FormItem label="备注" v-bind="validateInfos.remark">
        <Input.TextArea
          v-model:value="formData.remark"
          :rows="2"
          placeholder="备注"
        />
      </FormItem>

      <FormItem :wrapper-col="{ offset: 4, span: 18 }">
        <Button type="primary" :loading="loading" @click="handleSubmit">
          {{ isUpdate ? '保存更新' : '确认新增' }}
        </Button>
      </FormItem>

    </Form>
  </div>
</template>
