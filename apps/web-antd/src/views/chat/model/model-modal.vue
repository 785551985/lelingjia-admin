<!--
使用 Ant Design Vue 原生 Form 组件生成表单
详细用法参考: https://antdv.com/components/form-cn
注意: 如果 VSCode 配置了自动移除未使用的导入，可能会误删某些组件导入
-->
<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';

import type { ModelForm } from '#/api/chat/model/model';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { DictEnum } from '@vben/constants';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import {
  AutoComplete,
  Col,
  Form,
  FormItem,
  Input,
  message,
  Row,
  Select,
  Tag,
  Textarea,
} from 'ant-design-vue';
import { pick } from 'lodash-es';

import { modelAdd, modelInfo, modelList, modelUpdate } from '#/api/chat/model';
import { providerList } from '#/api/chat/provider';
import { getDictOptions } from '#/utils/dict';

interface ModelPreset {
  name: string;
  label: string;
  category: string;
  desc: string;
  dimension?: number | string;
  isFree?: boolean;
}

const modelPresets: Record<string, ModelPreset[]> = {
  deepseek: [
    { name: 'deepseek-reasoner', label: 'deepseek-reasoner (DeepSeek-R1 深度思考推理)', category: 'chat', desc: 'DeepSeek-R1 深度思考推理大模型' },
    { name: 'deepseek-chat', label: 'deepseek-chat (DeepSeek-V3 671B 通用对话)', category: 'chat', desc: 'DeepSeek-V3 经典通用对话大模型' },
  ],
  zhipu: [
    { name: 'glm-4.7-flash', label: 'glm-4.7-flash (智谱 GLM-4.7-Flash 最新极速对话 - 官方API免费)', category: 'chat', desc: '智谱 GLM-4.7-Flash 最新一代极速对话大模型 (官方API零成本免费使用)', isFree: true },
    { name: 'glm-4.6v-flash', label: 'glm-4.6v-flash (智谱 GLM-4.6V-Flash 最新视觉多模态 - 官方API免费)', category: 'vision', desc: '智谱 GLM-4.6V-Flash 最新视觉多模态大模型 (官方API零成本免费使用)', isFree: true },
    { name: 'glm-4.1v-thinking-flash', label: 'glm-4.1v-thinking-flash (智谱 GLM-4.1V 深度思考视觉模型 - 官方API免费)', category: 'vision', desc: '智谱 GLM-4.1V 深度思考视觉多模态大模型 (官方API零成本免费使用)', isFree: true },
    { name: 'cogview-3-flash', label: 'cogview-3-flash (智谱 CogView-3-Flash 图像生成 - 官方API免费)', category: 'image', desc: '智谱 CogView-3-Flash 图像生成大模型 (官方API零成本免费使用)', isFree: true },
    { name: 'cogvideox-flash', label: 'cogvideox-flash (智谱 CogVideoX-Flash 视频生成 - 官方API免费)', category: 'video', desc: '智谱 CogVideoX-Flash 视频生成大模型 (官方API零成本免费使用)', isFree: true },
    { name: 'glm-4-plus', label: 'glm-4-plus (智谱 GLM-4-Plus 旗舰通用大模型)', category: 'chat', desc: '智谱 GLM-4-Plus 旗舰通用大模型' },
    { name: 'glm-4v-plus', label: 'glm-4v-plus (智谱 GLM-4V-Plus 旗舰视觉多模态)', category: 'vision', desc: '智谱 GLM-4V-Plus 旗舰视觉多模态大模型' },
    { name: 'glm-4-air', label: 'glm-4-air (智谱 GLM-4 Air 高性价比大模型)', category: 'chat', desc: '智谱 GLM-4 Air 高性价比大模型' },
    { name: 'embedding-3', label: 'embedding-3 (智谱 embedding-3 向量模型 2048维)', category: 'vector', desc: '智谱 embedding-3 文本向量化模型', dimension: 2048 },
  ],
  qianwen: [
    { name: 'qwen-max', label: 'qwen-max (通义千问 Qwen-Max 旗舰最强对话)', category: 'chat', desc: '通义千问 Qwen-Max 旗舰大模型' },
    { name: 'qwen-plus', label: 'qwen-plus (通义千问 Qwen-Plus 增强型)', category: 'chat', desc: '通义千问 Qwen-Plus 增强型模型' },
    { name: 'qwen-vl-max', label: 'qwen-vl-max (通义千问 视觉看图多模态)', category: 'vision', desc: '通义千问 Qwen-VL-Max 视觉看图识图多模态大模型' },
    { name: 'text-embedding-v3', label: 'text-embedding-v3 (阿里云 向量模型 1536维)', category: 'vector', desc: '阿里云 text-embedding-v3 向量模型', dimension: 1536 },
    { name: 'gte-rerank', label: 'gte-rerank (阿里云 GTE 重排序模型)', category: 'rerank', desc: '阿里云 GTE 重排序 Rerank 模型' },
  ],
  alibailian: [
    { name: 'qwen-max', label: 'qwen-max (通义千问 Qwen-Max 旗舰最强对话)', category: 'chat', desc: '通义千问 Qwen-Max 旗舰大模型' },
    { name: 'qwen-plus', label: 'qwen-plus (通义千问 Qwen-Plus 增强型)', category: 'chat', desc: '通义千问 Qwen-Plus 增强型模型' },
    { name: 'qwen-vl-max', label: 'qwen-vl-max (通义千问 视觉看图多模态)', category: 'vision', desc: '通义千问 Qwen-VL-Max 视觉看图识图多模态大模型' },
    { name: 'text-embedding-v3', label: 'text-embedding-v3 (阿里云 向量模型 1536维)', category: 'vector', desc: '阿里云 text-embedding-v3 向量模型', dimension: 1536 },
    { name: 'gte-rerank', label: 'gte-rerank (阿里云 GTE 重排序模型)', category: 'rerank', desc: '阿里云 GTE 重排序 Rerank 模型' },
  ],
  ollama: [
    { name: 'deepseek-r1:7b', label: 'deepseek-r1:7b (Ollama 本地 7B 推理模型)', category: 'chat', desc: 'Ollama 本地部署 DeepSeek-R1 7B' },
    { name: 'deepseek-r1:14b', label: 'deepseek-r1:14b (Ollama 本地 14B 推理模型)', category: 'chat', desc: 'Ollama 本地部署 DeepSeek-R1 14B' },
    { name: 'deepseek-r1:32b', label: 'deepseek-r1:32b (Ollama 本地 32B 推理模型)', category: 'chat', desc: 'Ollama 本地部署 DeepSeek-R1 32B' },
    { name: 'qwen2.5:7b', label: 'qwen2.5:7b (Ollama 本地 Qwen2.5 7B)', category: 'chat', desc: 'Ollama 本地部署 Qwen2.5 7B' },
    { name: 'bge-m3', label: 'bge-m3 (Ollama 本地 BGE-M3 向量模型 1024维)', category: 'vector', desc: 'Ollama 本地 BGE-M3 多语言向量模型', dimension: 1024 },
  ],
  openai: [
    { name: 'gpt-4o', label: 'gpt-4o (OpenAI GPT-4 Omni 旗舰对话)', category: 'chat', desc: 'OpenAI GPT-4o 旗舰对话大模型' },
    { name: 'gpt-4o-mini', label: 'gpt-4o-mini (OpenAI 轻量对话)', category: 'chat', desc: 'OpenAI GPT-4o-mini 高性价比模型' },
    { name: 'o1', label: 'o1 (OpenAI o1 旗舰深度思考推理)', category: 'chat', desc: 'OpenAI o1 深度逻辑推理模型' },
    { name: 'o3-mini', label: 'o3-mini (OpenAI o3-mini 最新推理模型)', category: 'chat', desc: 'OpenAI o3-mini 最新一代推理模型' },
    { name: 'text-embedding-3-small', label: 'text-embedding-3-small (OpenAI 向量 1536维)', category: 'vector', desc: 'OpenAI text-embedding-3-small 向量模型', dimension: 1536 },
    { name: 'dall-e-3', label: 'dall-e-3 (OpenAI DALL-E 3 图像生成)', category: 'image', desc: 'OpenAI DALL-E 3 高清图像生成' },
  ],
  moonshot: [
    { name: 'moonshot-v1-128k', label: 'moonshot-v1-128k (Kimi 128K 超长上下文)', category: 'chat', desc: 'Kimi 128K 超长上下文大模型' },
    { name: 'moonshot-v1-32k', label: 'moonshot-v1-32k (Kimi 32K 长文本对话)', category: 'chat', desc: 'Kimi 32K 长文本对话模型' },
  ],
  kimi: [
    { name: 'moonshot-v1-128k', label: 'moonshot-v1-128k (Kimi 128K 超长上下文)', category: 'chat', desc: 'Kimi 128K 超长上下文大模型' },
    { name: 'moonshot-v1-32k', label: 'moonshot-v1-32k (Kimi 32K 长文本对话)', category: 'chat', desc: 'Kimi 32K 长文本对话模型' },
  ],
  claude: [
    { name: 'claude-3-5-sonnet-20241022', label: 'claude-3-5-sonnet-20241022 (Claude 3.5 Sonnet 最强对话)', category: 'chat', desc: 'Claude 3.5 Sonnet 顶尖推理模型' },
    { name: 'claude-3-5-haiku-20241022', label: 'claude-3-5-haiku-20241022 (Claude 3.5 Haiku 极速)', category: 'chat', desc: 'Claude 3.5 Haiku 极速模型' },
  ],
  doubao: [
    { name: 'doubao-pro-32k', label: 'doubao-pro-32k (豆包 Pro 32K)', category: 'chat', desc: '火山引擎 豆包 Pro 32K 对话模型' },
    { name: 'doubao-lite-32k', label: 'doubao-lite-32k (豆包 Lite 32K)', category: 'chat', desc: '火山引擎 豆包 Lite 32K 对话模型' },
    { name: 'doubao-embedding', label: 'doubao-embedding (豆包 向量模型 2048维)', category: 'vector', desc: '火山引擎 豆包 向量 Embedding 模型', dimension: 2048 },
  ],
  siliconflow: [
    { name: 'deepseek-ai/DeepSeek-R1', label: 'deepseek-ai/DeepSeek-R1 (硅基流动 满血版 R1)', category: 'chat', desc: '硅基流动托管 DeepSeek-R1 671B 满血版' },
    { name: 'deepseek-ai/DeepSeek-V3', label: 'deepseek-ai/DeepSeek-V3 (硅基流动 满血版 V3)', category: 'chat', desc: '硅基流动托管 DeepSeek-V3 671B 满血版' },
    { name: 'BAAI/bge-m3', label: 'BAAI/bge-m3 (硅基流动 BGE-M3 向量模型 1024维)', category: 'vector', desc: '硅基流动 BAAI/bge-m3 向量模型', dimension: 1024 },
    { name: 'BAAI/bge-reranker-v2-m3', label: 'BAAI/bge-reranker-v2-m3 (硅基流动 BGE 重排序)', category: 'rerank', desc: '硅基流动 BAAI/bge-reranker-v2-m3 重排序模型' },
  ],
  gemini: [
    { name: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview (双子座3号闪光预览)', category: 'chat', desc: 'Google 最强智能模型，融合了前沿推理、逻辑搜索和定位能力' },
    { name: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Gemini 3.5 Flash Lite 极速版)', category: 'chat', desc: 'Google 最高吞吐量、极具性价比的 3.5 高频模型' },
    { name: 'gemini-3.5-flash', label: 'gemini-3.5-flash (Gemini 3.5 Flash 前沿智力模型)', category: 'chat', desc: 'Google 适用于代理与代码任务的 3.5 智能模型' },
    { name: 'gemini-2.0-flash-exp', label: 'gemini-2.0-flash-exp (Google Gemini 2.0 Flash 实验版)', category: 'chat', desc: 'Google Gemini 2.0 Flash 极速模型' },
    { name: 'gemini-1.5-pro', label: 'gemini-1.5-pro (Google Gemini 1.5 Pro 2M 长上下文)', category: 'chat', desc: 'Google Gemini 1.5 Pro 2M 长上下文旗舰模型' },
    { name: 'text-embedding-004', label: 'text-embedding-004 (Google 向量模型 768维)', category: 'vector', desc: 'Google text-embedding-004 文本向量模型', dimension: 768 },
  ],
};

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
// 编辑加载数据时的标志，用于跳过watch避免apiHost被误清空
const isLoading = ref(false);
const providerOptions = ref<Array<{ label: string; value: number | string }>>(
  [],
);
const providersMap = ref<Map<number | string, any>>(new Map());
const categoryOptions = computed(() => {
  const allOptions = [...getDictOptions(DictEnum.CHAT_MODEL_CATEGORY)] as any[];
  ensureCategoryOption(allOptions, 'vision', '视觉多模态', 'cyan');
  ensureCategoryOption(allOptions, 'image', '图像', 'orange');
  ensureCategoryOption(allOptions, 'vector', '向量', 'default');
  ensureCategoryOption(allOptions, 'audio', '语音', 'purple');
  ensureCategoryOption(allOptions, 'video', '视频', 'red');
  ensureCategoryOption(allOptions, 'rerank', '重排序', 'magenta');
  if (!allOptions.some((opt) => opt.value === 'rerank')) {
    allOptions.push({ label: '重排模型', value: 'rerank', cssClass: 'magenta' });
  }

  return allOptions;
});

function ensureCategoryOption(
  options: any[],
  value: string,
  label: string,
  cssClass: string,
) {
  if (!options.some((opt) => opt.value === value)) {
    options.push({ label, value, cssClass });
  }
}

const title = computed(() => {
  return isUpdate.value ? $t('pages.common.edit') : $t('pages.common.add');
});

onMounted(async () => {
  loadProviders();
});

async function loadProviders() {
  try {
    const res = await providerList({ pageNum: 1, pageSize: 999 });
    providerOptions.value = res.rows.map((item) => ({
      label: String(item.providerName),
      value: item.providerCode,
    }));
    // 存储供应商完整信息，以便后续查询apiHost
    providersMap.value.clear();
    res.rows.forEach((item) => {
      providersMap.value.set(item.providerCode, item);
    });
  } catch (error) {
    console.error('Failed to load providers:', error);
  }
}

/**
 * 定义默认值 用于reset
 */
const defaultValues: Partial<ModelForm> = {
  id: undefined,
  category: undefined,
  modelName: undefined,
  providerCode: undefined,
  modelDescribe: undefined,
  modelShow: undefined,
  modelDimension: undefined,
  apiHost: undefined,
  apiKey: undefined,
  remark: undefined,
};

/**
 * 表单数据ref
 */
const formData = ref(defaultValues);

const showApiHost = computed(() => {
  const category = formData.value.category;
  return (
    formData.value.providerCode === 'custom_api' ||
    category === 'audio' ||
    category === 'image' ||
    category === 'video'
  );
});

/**
 * 监听供应商变化
 */
watch(
  () => formData.value.providerCode,
  (newProviderCode) => {
    // 编辑加载数据时跳过，避免apiHost被误清空
    if (isLoading.value) return;

    if (newProviderCode === 'custom_api') {
      formData.value.apiHost = undefined;
      formRules.value.apiHost = [
        { required: true, message: $t('ui.formRules.required') },
      ];
    } else {
      delete formRules.value.apiHost;
      if (newProviderCode && providersMap.value.has(newProviderCode)) {
        const pObj = providersMap.value.get(newProviderCode);
        formData.value.apiHost = pObj.apiHost;
      }
    }
  },
);

const categoryLabelMap: Record<string, string> = {
  chat: '对话',
  vision: '视觉多模态',
  vector: '向量',
  rerank: '重排序',
  image: '图像',
  audio: '语音',
  video: '视频',
};

const currentModelOptions = computed(() => {
  const provider = String(formData.value.providerCode || '').toLowerCase().trim();
  const presets = modelPresets[provider] || [];
  const selectedCategory = formData.value.category;

  // 根据当前选择的【模型分类】动态筛选匹配的预设模型
  let filteredPresets = presets;
  if (selectedCategory) {
    const matchedCategoryPresets = presets.filter((p) => p.category === selectedCategory);
    // 如果当前选中的分类有匹配的预设，则只展示该分类下的模型；否则展示全部
    if (matchedCategoryPresets.length > 0) {
      filteredPresets = matchedCategoryPresets;
    }
  }

  return filteredPresets.map((p) => {
    const cName = categoryLabelMap[p.category] || p.category;
    const freeTag = p.isFree ? ' 🎁【免费】' : '';
    return {
      label: `【${cName}】${freeTag} ${p.label}`,
      value: p.name,
    };
  });
});

const isModelSearchActive = ref(false);

function handleModelFocus(e: any) {
  isModelSearchActive.value = false;
  if (e?.target && typeof e.target.select === 'function') {
    e.target.select();
  }
}

function handleModelSearch() {
  isModelSearchActive.value = true;
}

function filterModelOption(inputValue: string, option: any) {
  if (!isModelSearchActive.value) {
    return true;
  }
  const input = (inputValue || '').toLowerCase().trim();
  if (!input) return true;
  return (
    String(option?.label || '').toLowerCase().includes(input) ||
    String(option?.value || '').toLowerCase().includes(input)
  );
}

/**
 * 监听模型名称变化，选择预设模型时自动填充分类、描述、维度
 */
watch(
  () => formData.value.modelName,
  (newModelName) => {
    if (isLoading.value || isUpdate.value || !newModelName) return;
    const provider = String(formData.value.providerCode || '').toLowerCase().trim();
    const presets = modelPresets[provider] || [];
    const matched = presets.find(
      (p) => p.name.toLowerCase() === String(newModelName).toLowerCase().trim(),
    );
    if (matched) {
      formData.value.category = matched.category;
      formData.value.modelDescribe = matched.desc;
      if (matched.dimension) {
        formData.value.modelDimension = matched.dimension as any;
      }
    }
  },
);

/**
 * 监听模型分类变化，如果新切换的分类与当前选中的模型不符，自动重置清空模型名称
 */
watch(
  () => formData.value.category,
  (newCategory) => {
    if (isLoading.value || isUpdate.value || !newCategory) return;
    const provider = String(formData.value.providerCode || '').toLowerCase().trim();
    const presets = modelPresets[provider] || [];
    const currentName = String(formData.value.modelName || '').toLowerCase().trim();
    if (!currentName) return;

    const matched = presets.find((p) => p.name.toLowerCase() === currentName);
    // 如果当前选中的模型不属于新选择的分类，强行自动重置清空
    if (matched && matched.category !== newCategory) {
      formData.value.modelName = '';
      formData.value.modelDescribe = '';
    }
  },
);

type AntdFormRules<T> = Partial<Record<keyof T, RuleObject[]>> & {
  [key: string]: RuleObject[];
};
/**
 * 表单校验规则
 */
const formRules = ref<AntdFormRules<ModelForm>>({
  providerCode: [
    { required: true, message: $t('ui.formRules.required'), trigger: 'change' },
  ],
  category: [
    { required: true, message: $t('ui.formRules.required'), trigger: 'change' },
  ],
  modelName: [
    { required: true, message: $t('ui.formRules.required'), trigger: 'blur' },
  ],
});

/**
 * useForm解构出表单方法
 */
const { validate, validateInfos, resetFields } = Form.useForm(
  formData,
  formRules,
);

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[800px]',
  fullscreenButton: false,
  closeOnClickModal: false,
  onClosed: handleCancel,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    modalApi.modalLoading(true);

    const { id } = modalApi.getData() as { id?: number | string };
    isUpdate.value = !!id;

    if (isUpdate.value && id) {
      isLoading.value = true;
      const record = await modelInfo(id);
      // 只赋值存在的字段
      const filterRecord = pick(record, Object.keys(defaultValues));
      formData.value = filterRecord;
      await nextTick();
      isLoading.value = false;
    }

    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.modalLoading(true);
    await validate();
    // 可能会做数据处理 使用cloneDeep深拷贝
    const data = cloneDeep(formData.value) as any;
    delete data.createTime;
    delete data.create_time;
    delete data.updateTime;
    delete data.update_time;
    await (isUpdate.value ? modelUpdate(data) : modelAdd(data));

    // 🌟 智能同厂商 Key 自动同步：只要配置/更新了一次 Key，同厂商下的所有模型自动同步关联，彻底无需重复配置！
    if (data.apiKey && data.providerCode) {
      try {
        const allModels = await modelList({ pageSize: 1000 });
        const providerCode = String(data.providerCode).toLowerCase();
        const siblingModels = (allModels?.rows || []).filter(
          (m: any) => String(m.providerCode).toLowerCase() === providerCode && m.id !== data.id,
        );

        const needUpdateModels = siblingModels.filter((m: any) => !m.apiKey || m.apiKey !== data.apiKey);

        if (needUpdateModels.length > 0) {
          for (const m of needUpdateModels) {
            const updateItem = { ...m, apiKey: data.apiKey };
            delete (updateItem as any).createTime;
            delete (updateItem as any).updateTime;
            await modelUpdate(updateItem);
          }
          message.success({
            content: `已自动将密钥同步至同厂商【${providerCode}】下的所有关联模型（共 ${needUpdateModels.length + 1} 个已自动配置完毕）`,
            duration: 4,
          });
        }
      } catch (e) {
        console.warn('同厂商 API Key 批量同步跳过', e);
      }
    }

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

/**
 * 获取分类颜色
 * @param category 分类值或颜色值
 * @param option 完整的选项对象，包含cssClass等信息
 */
function getCategoryColor(category: string, option?: any): string {
  // 优先使用option中的cssClass字段（可能包含自定义颜色）
  if (option?.cssClass) {
    const cssClass = option.cssClass.trim();
    // 如果是十六进制颜色或其他有效的CSS颜色值
    if (cssClass.startsWith('#') || isValidCSSColor(cssClass)) {
      return cssClass;
    }
  }

  // 其次查看category是否是有效的颜色值
  if (category.startsWith('#') || isValidCSSColor(category)) {
    return category;
  }

  // 最后使用预定义的颜色映射
  const colorMap: Record<string, string> = {
    chat: 'blue',
    embedding: 'green',
    image: 'orange',
    audio: 'purple',
    video: 'red',
    code: 'cyan',
    rerank: 'magenta',
  };
  return colorMap[category] || 'default';
}

/**
 * 判断是否为有效的CSS颜色值
 */
function isValidCSSColor(color: string): boolean {
  // 预定义的Ant Design颜色
  const antColors = [
    'red',
    'orange',
    'gold',
    'yellow',
    'lime',
    'green',
    'cyan',
    'blue',
    'geekblue',
    'purple',
    'magenta',
    'volcano',
    'default',
  ];
  if (antColors.includes(color)) {
    return true;
  }

  // 简单检查是否为有效的十六进制颜色或rgb颜色
  const hexRegex = /^#([A-F0-9]{6}|[A-F0-9]{3}|[A-F0-9]{8})$/i;
  const rgbRegex = /^rgba?\(/;

  return hexRegex.test(color) || rgbRegex.test(color);
}
</script>

<template>
  <BasicModal :title="title" class="w-[700px]">
    <Form :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }">
      <Row :gutter="16">
        <Col :span="12">
          <FormItem label="供应商" v-bind="validateInfos.providerCode">
            <Select
              v-model:value="formData.providerCode"
              :placeholder="$t('ui.formRules.required')"
              :options="providerOptions"
            />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="模型分类" v-bind="validateInfos.category">
            <Select
              v-model:value="formData.category"
              :placeholder="$t('ui.formRules.required')"
              :options="categoryOptions"
              allow-clear
              show-search
              option-filter-prop="label"
            >
              <template #option="{ label, value, cssClass }">
                <div class="flex items-center justify-between">
                  <span>{{ label }}</span>
                  <Tag
                    :color="getCategoryColor(value, { cssClass })"
                    class="ml-2"
                  >
                    {{ value }}
                  </Tag>
                </div>
              </template>
              <template #tagRender="{ label, option }">
                <Tag :color="getCategoryColor(option.value, option)">
                  {{ label }}
                </Tag>
              </template>
            </Select>
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="16">
        <Col :span="12">
          <FormItem label="模型名称" v-bind="validateInfos.modelName">
            <AutoComplete
              v-model:value="formData.modelName"
              :options="currentModelOptions"
              placeholder="下拉选择预设模型，或手动输入自定义模型名称"
              allow-clear
              :filter-option="filterModelOption"
              @focus="handleModelFocus"
              @search="handleModelSearch"
            />
          </FormItem>
        </Col>
        <Col :span="12">
          <FormItem label="模型描述" v-bind="validateInfos.modelDescribe">
            <Input
              v-model:value="formData.modelDescribe"
              :placeholder="$t('ui.formRules.required')"
            />
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="16">
        <Col v-if="formData.category === 'vector'" :span="12">
          <FormItem label="模型维度" v-bind="validateInfos.modelDimension">
            <Input
              v-model:value="formData.modelDimension"
              :placeholder="$t('ui.formRules.required')"
            />
          </FormItem>
        </Col>
        <Col v-if="showApiHost" :span="12">
          <FormItem label="请求地址" v-bind="validateInfos.apiHost">
            <Input
              v-model:value="formData.apiHost"
              :placeholder="$t('ui.formRules.required')"
            />
          </FormItem>
        </Col>
      </Row>

      <Row :gutter="16">
        <Col :span="24">
          <FormItem label="密钥" v-bind="validateInfos.apiKey">
            <Input
              v-model:value="formData.apiKey"
              :placeholder="$t('ui.formRules.required')"
            />
          </FormItem>
        </Col>
      </Row>

      <FormItem label="备注" v-bind="validateInfos.remark">
        <Textarea
          v-model:value="formData.remark"
          :placeholder="$t('ui.formRules.required')"
          :rows="4"
        />
      </FormItem>
    </Form>
  </BasicModal>
</template>

<style scoped>
:deep(.ant-form-item) {
  padding: 0 8px;
  margin-bottom: 20px;
}

:deep(.ant-form-item-label) {
  padding-bottom: 8px;
  text-align: left !important;
}

:deep(.ant-form-item-label > label) {
  justify-content: flex-start !important;
  font-weight: 500;
  color: rgb(0 0 0 / 85%);
  text-align: left !important;
}

:deep(.ant-form-item-control) {
  text-align: left !important;
}

:deep(.ant-form-item-control-input) {
  text-align: left !important;
}

:deep(.ant-input),
:deep(.ant-select),
:deep(.ant-picker),
:deep(.ant-textarea) {
  text-align: left !important;
}

:deep(.ant-input::placeholder),
:deep(.ant-textarea::placeholder) {
  color: rgb(0 0 0 / 45%);
}
</style>
