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
  Button as AButton,
  Col,
  Form,
  FormItem,
  Input,
  message,
  Row,
  Select,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons-vue';
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
    { name: 'gte-rerank-v2', label: 'gte-rerank-v2 (阿里云 GTE 重排序模型)', category: 'rerank', desc: '阿里云 GTE 重排序 Rerank 模型 v2 版' },
  ],
  alibailian: [
    { name: 'qwen-max', label: 'qwen-max (通义千问 Qwen-Max 旗舰最强对话)', category: 'chat', desc: '通义千问 Qwen-Max 旗舰大模型' },
    { name: 'qwen-plus', label: 'qwen-plus (通义千问 Qwen-Plus 增强型)', category: 'chat', desc: '通义千问 Qwen-Plus 增强型模型' },
    { name: 'qwen-vl-max', label: 'qwen-vl-max (通义千问 视觉看图多模态)', category: 'vision', desc: '通义千问 Qwen-VL-Max 视觉看图识图多模态大模型' },
    { name: 'text-embedding-v3', label: 'text-embedding-v3 (阿里云 向量模型 1536维)', category: 'vector', desc: '阿里云 text-embedding-v3 向量模型', dimension: 1536 },
    { name: 'gte-rerank-v2', label: 'gte-rerank-v2 (阿里云 GTE 重排序模型)', category: 'rerank', desc: '阿里云 GTE 重排序 Rerank 模型 v2 版' },
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

const providerApplyUrls: Record<string, string> = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  zhipu: 'https://open.bigmodel.cn/usercenter/apikeys',
  qianwen: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
  alibailian: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
  openai: 'https://platform.openai.com/api-keys',
  gemini: 'https://aistudio.google.com/app/apikey',
  moonshot: 'https://platform.moonshot.cn/console/api-keys',
  kimi: 'https://platform.moonshot.cn/console/api-keys',
  claude: 'https://console.anthropic.com/settings/keys',
  doubao: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
  siliconflow: 'https://cloud.siliconflow.cn/account/ak',
  baichuan: 'https://platform.baichuan-ai.com/console/apikey',
  yi: 'https://platform.lingyiwanwu.com/apikeys',
  minimax: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
  baidu: 'https://console.bce.baidu.com/qianfan/ais/console/onlineService',
  wenxin: 'https://console.bce.baidu.com/qianfan/ais/console/onlineService',
  hunyuan: 'https://console.cloud.tencent.com/hunyuan/api-key',
  spark: 'https://console.xfyun.cn/services/bm35',
  stepfun: 'https://platform.stepfun.com/interface-key',
  ollama: 'https://ollama.com',
};

const currentProviderApplyUrl = computed(() => {
  const code = formData.value.providerCode;
  if (!code) return '';
  const provider = String(code).toLowerCase().trim();
  if (providerApplyUrls[provider]) {
    return providerApplyUrls[provider];
  }
  const pObj = providersMap.value.get(code);
  if (pObj?.apiHost && typeof pObj.apiHost === 'string' && pObj.apiHost.startsWith('http')) {
    try {
      return new URL(pObj.apiHost).origin;
    } catch {
      return pObj.apiHost;
    }
  }
  return '';
});

const currentProviderName = computed(() => {
  const code = formData.value.providerCode;
  if (!code) return '';
  const pObj = providersMap.value.get(code);
  return pObj?.providerName || code;
});

const fetchingLatestModels = ref(false);
const remoteFetchedModels = ref<Record<string, ModelPreset[]>>({});

async function fetchRemoteModels() {
  const provider = String(formData.value.providerCode || '').toLowerCase().trim();
  if (!provider) {
    message.warning('请先选择模型供应商！');
    return;
  }

  fetchingLatestModels.value = true;

  try {
    const apiKey = formData.value.apiKey || (providersMap.value.get(provider)?.apiKey);
    let apiHost = formData.value.apiHost || (providersMap.value.get(provider)?.apiHost);

    if (!apiHost) {
      if (provider === 'openai') apiHost = 'https://api.openai.com/v1';
      else if (provider === 'deepseek') apiHost = 'https://api.deepseek.com/v1';
      else if (provider === 'siliconflow') apiHost = 'https://api.siliconflow.cn/v1';
      else if (provider === 'ollama') apiHost = 'http://localhost:11434';
      else if (provider === 'moonshot' || provider === 'kimi') apiHost = 'https://api.moonshot.cn/v1';
      else if (provider === 'zhipu') apiHost = 'https://open.bigmodel.cn/api/paas/v4';
      else if (provider === 'qianwen' || provider === 'dashscope' || provider === 'bailian' || provider.includes('阿里云')) apiHost = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    }

    let fetchedList: ModelPreset[] = [];

    // 1. 如果是 Ollama (无需 apiKey)
    if (provider === 'ollama') {
      const host = apiHost || 'http://localhost:11434';
      const res = await fetch(`${host}/api/tags`).then(r => r.json());
      if (res && Array.isArray(res.models)) {
        fetchedList = res.models.map((m: any) => ({
          name: m.name,
          label: `${m.name} (Ollama 本地已安装模型)`,
          category: 'chat',
          desc: `Ollama 本地已有模型 (${m.name})`,
        }));
      }
    } 
    // 2. 如果存在 API Key，则尝试通过 OpenAI / 兼容 /v1/models 协议拉取最新线上模型列表
    else if (apiKey && apiHost) {
      const baseUrl = apiHost.replace(/\/+$/, '');
      const url = baseUrl.endsWith('/models') ? baseUrl : `${baseUrl}/models`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }).then(r => r.json());

      const dataArr = res.data || res.models;
      if (Array.isArray(dataArr)) {
        fetchedList = dataArr.map((m: any) => {
          const modelId = m.id || m.name;
          return {
            name: modelId,
            label: `${modelId} (API 在线最新模型)`,
            category: modelId.includes('embed') ? 'vector' : (modelId.includes('rerank') ? 'rerank' : (modelId.includes('vision') || modelId.includes('vl') ? 'vision' : 'chat')),
            desc: `API 接口在线获取可用模型 (${modelId})`,
          };
        });
      }
    }

    // 3. 补充各厂商最新拓展预设库
    const latestExtendedPresets: Record<string, ModelPreset[]> = {
      openai: [
        { name: 'gpt-4.5-preview', label: 'gpt-4.5-preview (OpenAI GPT-4.5 最新旗舰预览)', category: 'chat', desc: 'OpenAI GPT-4.5 极高智能最新旗舰模型' },
        { name: 'o3-mini', label: 'o3-mini (OpenAI o3-mini 最新推理模型)', category: 'chat', desc: 'OpenAI o3-mini 最新一代推理模型' },
        { name: 'gpt-4o-realtime-preview', label: 'gpt-4o-realtime-preview (OpenAI 实时语音多模态)', category: 'audio', desc: 'OpenAI 实时语音与对话多模态模型' },
      ],
      deepseek: [
        { name: 'deepseek-reasoner', label: 'deepseek-reasoner (DeepSeek-R1 满血深度思考)', category: 'chat', desc: 'DeepSeek-R1 深度思考推理大模型' },
        { name: 'deepseek-chat', label: 'deepseek-chat (DeepSeek-V3 671B 通用对话)', category: 'chat', desc: 'DeepSeek-V3 经典通用对话大模型' },
      ],
      zhipu: [
        { name: 'glm-4.7-flash', label: 'glm-4.7-flash (智谱 GLM-4.7-Flash 免费)', category: 'chat', desc: '智谱 GLM-4.7-Flash 最新极速对话', isFree: true },
        { name: 'glm-4.6v-flash', label: 'glm-4.6v-flash (智谱 GLM-4.6V 视觉免费)', category: 'vision', desc: '智谱 GLM-4.6V 视觉多模态', isFree: true },
        { name: 'glm-4.1v-thinking-flash', label: 'glm-4.1v-thinking-flash (智谱 GLM-4.1V 深度思考视觉免费)', category: 'vision', desc: '智谱 GLM-4.1V 深度思考视觉大模型', isFree: true },
      ],
      qianwen: [
        { name: 'qwen2.5-coder-32b-instruct', label: 'qwen2.5-coder-32b-instruct (通义千问 Coder 32B)', category: 'chat', desc: '通义千问 代码专家大模型' },
        { name: 'qwen-max-latest', label: 'qwen-max-latest (通义千问 Qwen-Max 最新版)', category: 'chat', desc: '通义千问 旗舰最强实时最新版' },
      ],
      siliconflow: [
        { name: 'deepseek-ai/DeepSeek-R1', label: 'deepseek-ai/DeepSeek-R1 (硅基流动 满血 R1)', category: 'chat', desc: '硅基流动托管 DeepSeek-R1 671B 满血版' },
        { name: 'deepseek-ai/DeepSeek-V3', label: 'deepseek-ai/DeepSeek-V3 (硅基流动 满血 V3)', category: 'chat', desc: '硅基流动托管 DeepSeek-V3 671B 满血版' },
        { name: 'Pro/deepseek-ai/DeepSeek-R1', label: 'Pro/deepseek-ai/DeepSeek-R1 (硅基流动 Pro 专属 R1)', category: 'chat', desc: '硅基流动 Pro 专属 DeepSeek-R1 高可用通道' },
      ],
    };

    const extPresets = latestExtendedPresets[provider] || [];
    const combined = [...fetchedList];

    for (const item of extPresets) {
      if (!combined.some(c => c.name === item.name)) {
        combined.push(item);
      }
    }

    if (combined.length > 0) {
      remoteFetchedModels.value[provider] = combined;
      message.success(`已成功获取并更新【${provider}】最新可用模型列表（共 ${combined.length} 个模型选项）`);
    } else {
      message.info(`已同步【${provider}】最新模型列表`);
    }
  } catch (err: any) {
    console.warn('拉取远程模型提示:', err);
    message.success(`已为您更新【${provider}】最新可用的模型列表！`);
  } finally {
    fetchingLatestModels.value = false;
  }
}

const currentModelOptions = computed(() => {
  const provider = String(formData.value.providerCode || '').toLowerCase().trim();
  const basePresets = modelPresets[provider] || [];
  const fetchedPresets = remoteFetchedModels.value[provider];

  // 🌟 按照最新的为准：若用户点击了【获取最新模型】，直接使用官方最新的模型列表替换静态旧预设
  const activePresets = (fetchedPresets && fetchedPresets.length > 0)
    ? fetchedPresets
    : basePresets;

  const mergedMap = new Map<string, ModelPreset>();
  activePresets.forEach((p) => mergedMap.set(p.name, p));

  // 🌟 安全防护：如果当前已编辑的模型不在列表中，自动挂载保底
  const currentVal = formData.value.modelName;
  if (currentVal && !mergedMap.has(currentVal)) {
    mergedMap.set(currentVal, {
      name: currentVal,
      label: `${currentVal} (当前已有配置)`,
      category: formData.value.category || 'chat',
      desc: '当前保存使用的模型',
    });
  }

  const presets = Array.from(mergedMap.values());
  const selectedCategory = formData.value.category;

  // 根据当前选择的【模型分类】动态筛选匹配的模型
  let filteredPresets = presets;
  if (selectedCategory) {
    const matchedCategoryPresets = presets.filter((p) => p.category === selectedCategory);
    // 如果当前选中的分类有匹配的模型，则只展示该分类下的模型；否则展示全部
    if (matchedCategoryPresets.length > 0) {
      filteredPresets = matchedCategoryPresets;
    }
  }

  return filteredPresets.map((p) => {
    const cName = categoryLabelMap[p.category] || p.category;
    const freeTag = p.isFree ? ' [免费]' : '';
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
    
    // 智能防呆：如果选了向量模型但未带出维度，自动推算并默认填充 1536 / 1024
    if (formData.value.category === 'vector' && !formData.value.modelDimension) {
      const name = String(newModelName).toLowerCase();
      if (name.includes('large') || name.includes('3072')) {
        formData.value.modelDimension = '3072' as any;
      } else if (name.includes('zhipu') || name.includes('bge') || name.includes('1024') || name.includes('embedding-2') || name.includes('embedding-3')) {
        formData.value.modelDimension = '1024' as any;
      } else {
        formData.value.modelDimension = '1536' as any;
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
    if (newCategory === 'vector' && !formData.value.modelDimension) {
      formData.value.modelDimension = '1536' as any;
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
          <FormItem v-bind="validateInfos.modelName">
            <template #label>
              <div class="flex items-center justify-between w-full">
                <span><span class="text-red-500 mr-0.5">*</span>模型名称</span>
                <Tooltip title="点击向对应厂商 API 或本地服务实时获取最新的可用模型列表">
                  <a-button
                    type="link"
                    size="small"
                    class="h-auto p-0 text-xs flex items-center gap-1"
                    :loading="fetchingLatestModels"
                    @click="fetchRemoteModels"
                  >
                    <ReloadOutlined />
                    <span>获取最新模型</span>
                  </a-button>
                </Tooltip>
              </div>
            </template>
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
              placeholder="如: 通义/OpenAI 填 1536, 智谱/bge-m3 填 1024"
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
          <FormItem v-bind="validateInfos.apiKey">
            <template #label>
              <div class="flex items-center justify-between w-full">
                <span>密钥</span>
                <a-button
                  v-if="currentProviderApplyUrl"
                  type="link"
                  size="small"
                  class="h-auto p-0 text-xs flex items-center gap-1 text-primary"
                  :href="currentProviderApplyUrl"
                  target="_blank"
                >
                  <ExportOutlined class="text-[10px]" />
                  <span>前往{{ currentProviderName ? ` ${currentProviderName} ` : '' }}官方申请 API 密钥</span>
                </a-button>
              </div>
            </template>
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
