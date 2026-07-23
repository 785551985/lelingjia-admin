<!--
使用 Ant Design Vue 原生 Form 组件生成表单
详细用法参考: https://antdv.com/components/form-cn
注意: 如果 VSCode 配置了自动移除未使用的导入，可能会误删某些组件导入
-->
<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';
import { computed, ref, watch } from 'vue';

import { AutoComplete, Input, Textarea, Form, FormItem } from 'ant-design-vue';
import { ImageUpload } from '#/components/upload';
import { pick } from 'lodash-es';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import { providerAdd, providerInfo, providerList, providerUpdate } from '#/api/chat/provider';
import { ossInfo } from '#/api/system/oss';
import type { ProviderForm } from '#/api/chat/provider/model';

import { providerOptions } from './options';

const providerPresetMap: Record<string, { name: string; desc: string; apiHost: string; icon: string; remark: string }> = {
  deepseek: {
    name: '深度求索',
    desc: 'DeepSeek 官方 API 大模型服务',
    apiHost: 'https://api.deepseek.com',
    icon: '/providers/deepseek.svg',
    remark: 'DeepSeek 官方 API',
  },
  zhipu: {
    name: '智谱AI',
    desc: '智谱 GLM 开放平台大模型服务',
    apiHost: 'https://open.bigmodel.cn/api/paas/v4',
    icon: '/providers/zhipu.svg',
    remark: '智谱 AI 开放平台',
  },
  qianwen: {
    name: '阿里云百炼',
    desc: '阿里云百炼 / 通义千问大模型服务',
    apiHost: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    icon: '/providers/qianwen.svg',
    remark: '阿里云 DashScope API',
  },
  alibailian: {
    name: '阿里云百炼',
    desc: '阿里云百炼 / 通义千问大模型服务',
    apiHost: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    icon: '/providers/qianwen.svg',
    remark: '阿里云 DashScope API',
  },
  ollama: {
    name: 'Ollama',
    desc: 'Ollama 本地私有化开源大模型引擎',
    apiHost: 'http://127.0.0.1:11434',
    icon: '/providers/ollama.svg',
    remark: 'Ollama 本地服务',
  },
  openai: {
    name: 'OpenAI',
    desc: 'OpenAI 官方 ChatGPT/GPT-4o API 服务',
    apiHost: 'https://api.openai.com/v1',
    icon: '/providers/openai.svg',
    remark: 'OpenAI 官方 API',
  },
  claude: {
    name: 'Anthropic Claude',
    desc: 'Anthropic Claude 3.5 官方 API 服务',
    apiHost: 'https://api.anthropic.com',
    icon: '/providers/claude.svg',
    remark: 'Claude 官方 API',
  },
  doubao: {
    name: '字节跳动 豆包',
    desc: '火山引擎 / 豆包大模型 API 服务',
    apiHost: 'https://ark.cn-beijing.volces.com/api/v3',
    icon: '/providers/doubao.svg',
    remark: '火山引擎豆包 API',
  },
  baidu: {
    name: '百度 文心一言',
    desc: '百度千帆大模型平台 API 服务',
    apiHost: 'https://aip.baidubce.com',
    icon: '/providers/baidu.svg',
    remark: '百度千帆大模型',
  },
  hunyuan: {
    name: '腾讯 混元',
    desc: '腾讯云混元大模型平台 API 服务',
    apiHost: 'https://hunyuan.tencentcloudapi.com',
    icon: '/providers/hunyuan.svg',
    remark: '腾讯云混元 API',
  },
  kimi: {
    name: '月之暗面 Kimi',
    desc: '月之暗面 Kimi 长文本大模型 API 服务',
    apiHost: 'https://api.moonshot.cn/v1',
    icon: '/providers/moonshot.svg',
    remark: 'Kimi 开放平台',
  },
  moonshot: {
    name: '月之暗面 Kimi',
    desc: '月之暗面 Kimi 长文本大模型 API 服务',
    apiHost: 'https://api.moonshot.cn/v1',
    icon: '/providers/moonshot.svg',
    remark: 'Kimi 开放平台',
  },
  baichuan: {
    name: '百川智能',
    desc: '百川智能大模型开放平台 API',
    apiHost: 'https://api.baichuan-ai.com/v1',
    icon: '/providers/baichuan.svg',
    remark: '百川智能 API',
  },
  minimax: {
    name: 'MiniMax',
    desc: 'MiniMax 开放平台大模型 API 服务',
    apiHost: 'https://api.minimax.chat/v1',
    icon: '/providers/minimax.svg',
    remark: 'MiniMax 开放平台',
  },
  spark: {
    name: '科大讯飞 星火',
    desc: '讯飞星火认知大模型 API 服务',
    apiHost: 'https://spark-api-open.xf-yun.com/v1',
    icon: '/providers/spark.svg',
    remark: '讯飞星火 API',
  },
  gemini: {
    name: 'Google Gemini',
    desc: 'Google Gemini 官方 API 服务',
    apiHost: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    icon: '/providers/gemini.svg',
    remark: 'Google Gemini API',
  },
  siliconflow: {
    name: '硅基流动 (SiliconFlow)',
    desc: '硅基流动统一 API 大模型推理服务',
    apiHost: 'https://api.siliconflow.cn/v1',
    icon: '/providers/siliconflow.svg',
    remark: '硅基流动 API',
  },
};

const isSearchActive = ref(false);

function handleFocus(e: any) {
  isSearchActive.value = false;
  if (e?.target && typeof e.target.select === 'function') {
    e.target.select();
  }
}

function handleSearch() {
  isSearchActive.value = true;
}

function filterOption(inputValue: string, option: any) {
  if (!isSearchActive.value) {
    return true; // 聚焦或点击时展示完整的全部预设厂商下拉列表
  }
  const input = (inputValue || '').toLowerCase().trim();
  if (!input) return true;
  return (
    String(option?.label || '').toLowerCase().includes(input) ||
    String(option?.value || '').toLowerCase().includes(input)
  );
}

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => {
  return isUpdate.value ? $t('pages.common.edit') : $t('pages.common.add');
});

/**
 * 定义默认值 用于reset
 */
const defaultValues: Partial<ProviderForm> = {
  id: undefined,
  providerName: undefined,
  providerCode: undefined,
  providerIcon: undefined,
  providerDesc: undefined,
  apiHost: undefined,
  status: undefined,
  sortOrder: undefined,
  remark: undefined,
  updateIp: undefined,
};

/**
 * 表单数据ref
 */
const formData = ref(defaultValues);

watch(
  () => formData.value.providerCode,
  (newCode) => {
    if (!isUpdate.value && newCode) {
      const code = String(newCode).toLowerCase().trim();
      const preset = providerPresetMap[code];
      if (preset) {
        formData.value.providerName = preset.name;
        formData.value.providerDesc = preset.desc;
        formData.value.apiHost = preset.apiHost;
        formData.value.providerIcon = preset.icon;
        formData.value.remark = preset.remark;
      }
    }
  },
);

type AntdFormRules<T> = Partial<Record<keyof T, RuleObject[]>> & {
  [key: string]: RuleObject[];
};
/**
 * 表单校验规则
 */
const formRules = ref<AntdFormRules<ProviderForm>>({
  providerName: [{ required: true, message: '厂商名称不能为空' }],
  providerCode: [{ required: true, message: '厂商编码不能为空' }],
});

/**
 * useForm解构出表单方法
 */
const { validate, validateInfos, resetFields } = Form.useForm(
  formData,
  formRules,
);

const existingCodes = ref<string[]>([]);

const availableProviderOptions = computed(() => {
  if (isUpdate.value) {
    return providerOptions;
  }
  return providerOptions.filter((opt) => {
    const code = String(opt.value || '').toLowerCase().trim();
    return !existingCodes.value.includes(code);
  });
});

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[550px]',
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

    if (!isUpdate.value) {
      try {
        const res: any = await providerList({ pageNum: 1, pageSize: 1000 });
        const rows = res.rows || res || [];
        existingCodes.value = rows.map((item: any) => String(item.providerCode || '').toLowerCase().trim());
      } catch {
        existingCodes.value = [];
      }
    }

    if (isUpdate.value && id) {
      const record = await providerInfo(id);
      // 只赋值存在的字段
      const filterRecord = pick(record, Object.keys(defaultValues));

      // 如果providerIcon是URL格式，直接保留
      if (
        filterRecord.providerIcon
        && typeof filterRecord.providerIcon === 'string'
        && filterRecord.providerIcon.startsWith('http')
      ) {
        filterRecord.providerIcon = filterRecord.providerIcon;
      }

      formData.value = filterRecord;
    }

    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.modalLoading(true);
    await validate();
    // 可能会做数据处理 使用cloneDeep深拷贝
    const data = cloneDeep(formData.value);

    // 如果providerIcon是ossId，需要转换为URL
    if (data.providerIcon && typeof data.providerIcon === 'string') {
      // 检查是否是ossId（不包含http/https的字符串被认为是ossId）
      if (!data.providerIcon.startsWith('http')) {
        try {
          const ossFileList = await ossInfo(data.providerIcon);
          if (ossFileList && ossFileList.length > 0 && ossFileList[0]) {
            data.providerIcon = ossFileList[0].url;
          }
        } catch {
          // 失败时保持原值
        }
      }
    }

    await (isUpdate.value ? providerUpdate(data) : providerAdd(data));
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
    <Form :label-col="{ span: 4 }">
      <FormItem label="厂商名称" v-bind="validateInfos.providerName">
        <Input v-model:value="formData.providerName" :placeholder="$t('ui.formRules.required')" />
      </FormItem>
      <FormItem label="厂商编码" v-bind="validateInfos.providerCode">
        <AutoComplete
          v-model:value="formData.providerCode"
          :options="availableProviderOptions"
          placeholder="可从预设列表选择，也可直接输入自定义编码（如 kimi、claude）"
          allow-clear
          :filter-option="filterOption"
          @focus="handleFocus"
          @search="handleSearch"
        />
      </FormItem>
      <FormItem label="厂商图标" v-bind="validateInfos.providerIcon">
        <ImageUpload
          v-model:value="(formData.providerIcon as string)"
          :max-count="1"
          help-message
          keep-missing-id
        />
      </FormItem>
      <FormItem label="厂商描述" v-bind="validateInfos.providerDesc">
        <Textarea
          v-model:value="formData.providerDesc"
          :placeholder="$t('ui.formRules.required')"
          :rows="4"
        />
      </FormItem>
      <FormItem label="API地址" v-bind="validateInfos.apiHost">
        <Input v-model:value="formData.apiHost" :placeholder="$t('ui.formRules.required')" />
      </FormItem>
      <FormItem label="排序" v-bind="validateInfos.sortOrder">
        <Input v-model:value="formData.sortOrder" :placeholder="$t('ui.formRules.required')" />
      </FormItem>
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

