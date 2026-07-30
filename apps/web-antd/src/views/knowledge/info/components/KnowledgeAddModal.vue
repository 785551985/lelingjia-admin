<script setup lang="ts">
import type { RuleObject } from 'ant-design-vue/es/form';
import type { InfoForm } from '#/api/knowledge/info/model';

import { ref, computed, watch, h } from 'vue';
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
  Tag,
  message,
  Tooltip,
  TreeSelect
} from 'ant-design-vue';
import { QuestionCircleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons-vue';

import { useUserStore } from '@vben/stores';

import { infoAdd, infoAddWithId, infoList } from '#/api/knowledge/info';
import { attachInitTemplate } from '#/api/knowledge/attach';
import { modelList } from '#/api/chat/model';
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

const isUpdate = ref(false);
const title = computed(() => (isUpdate.value ? '编辑知识库' : '新增知识库'));
const createType = ref<'template' | 'custom'>('template');
const showAdvanced = ref(false);

interface PresetTemplate {
  key: string;
  name: string;
  share: number;
  scopeLevel: number;
  badge: string;
  color: string;
  description: string;
}

const presetTemplates: PresetTemplate[] = [
  {
    key: 'common',
    name: '企业公共基础知识库',
    share: 1,
    scopeLevel: 1, // 集团级 - 所有机构和智能体共享
    badge: '共享底座',
    color: 'gold',
    description: '推荐首选：存放企业介绍、核心价值观、组织架构、产品概览等通用内容。培训、客服等多个智能体可同时引用此库，内容只需维护一处',
  },
  {
    key: 'brand',
    name: '企业品牌与VI视觉规范库',
    share: 1,
    scopeLevel: 1, // 集团级 - 统一品牌标准
    badge: '品牌规范',
    color: 'volcano',
    description: '集中存放品牌色彩规范、Logo 使用规则、字体规范、文案语气指南等。内容/营销类智能体生成文案时可引用，确保全机构输出风格统一',
  },
  {
    key: 'faq',
    name: '分支机构-对外客服与FAQ公开库',
    share: 2,
    scopeLevel: 2, // 机构级 - 对外公开
    badge: '对外公开',
    color: 'purple',
    description: '对外客服专用：微信公众号、小程序、官网智能客服调用的 FAQ 与服务政策。与「公共基础库」配合使用，避免重复录入企业介绍',
  },
  {
    key: 'training',
    name: '分支机构-新人入职与培训知识库',
    share: 1,
    scopeLevel: 2,
    badge: '新人培训',
    color: 'magenta',
    description: '新员工培训专用：岗位操作指南、入职流程、绩效考核制度等。企业介绍部分建议引用「公共基础库」而非重复上传',
  },
  {
    key: 'sop',
    name: '分支机构-业务SOP与标准作业流程库',
    share: 1,
    scopeLevel: 2,
    badge: '标准流程',
    color: 'green',
    description: '规范机构内部标准作业程序、业务接待、客户投诉处理与日常巡检流程',
  },
  {
    key: 'product',
    name: '分支机构-产品与服务项目手册库',
    share: 1,
    scopeLevel: 2,
    badge: '产品报价',
    color: 'orange',
    description: '本机构主营服务套餐手册、产品价格表、卖点话术与竞品对比。产品概览类内容建议放「公共基础库」',
  },
  {
    key: 'rule',
    name: '分支机构-通用管理制度与规范库',
    share: 1,
    scopeLevel: 2,
    badge: '制度规范',
    color: 'blue',
    description: '本机构/分公司内部行政、人事、考勤、财务报销等本地化管理制度（区别于集团统一制度）',
  },
  {
    key: 'contract',
    name: '分支机构-资质合规与标准合同库',
    share: 1,
    scopeLevel: 2,
    badge: '合规合同',
    color: 'cyan',
    description: '沉淀机构经营资质执照、标准业务合同范本与合规注意事项',
  },
  {
    key: 'case',
    name: '分支机构-优秀案例与最佳实践库',
    share: 1,
    scopeLevel: 2,
    badge: '经验沉淀',
    color: 'geekblue',
    description: '本机构在当地积累的成功客户案例、标杆服务经验与营销活动复盘',
  },
  {
    key: 'talent',
    name: '分支机构-内部人才档案库',
    share: 1,
    scopeLevel: 3, // 部门级 - 仅内部 HR 和管理层可访
    badge: '人才档案',
    color: 'lime',
    description: '记录员工专业技能、资质证书、项目经验等。仅内部权限，HR 和项目组建特用。不建议绑定对外客服类智能体',
  },
  {
    key: 'expert',
    name: '外部专家顾问库',
    share: 1,
    scopeLevel: 1, // 集团级 - 全机构可引用专家背书
    badge: '专家背书',
    color: 'red',
    description: '合作专家、顾问委员的个人档案与担当领域。可用于客户提案展示专家队伍背书、活动嵌评挎推荐等场景',
  },
];

const selectedTemplateKeys = ref<string[]>(['common', 'brand', 'faq', 'training', 'sop', 'product', 'rule', 'contract', 'case', 'talent', 'expert']);

const defaultValues: Partial<InfoForm> = {
  name: '',
  share: 1, // 默认为对内公开
  scopeLevel: 1, // 默认是租户/集团级
  deptScope: [] as any, // 绑定的部门列表，默认为数组以便于 TreeSelect
  description: '',
  remark: '',
  separator: '\\n',
  overlapChar: 50,
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

async function validateKnowledgeName(_rule: any, value: string) {
  if (!value || !value.trim()) {
    return Promise.reject('知识库名称不能为空');
  }
  const trimmedName = value.trim();
  const currentShare = formData.value.share;
  const currentScopeLevel = formData.value.scopeLevel;

  try {
    const listRes = await infoList({ pageNum: 1, pageSize: 1000, name: trimmedName });
    const records = (listRes as any)?.rows || (listRes as any)?.records || (Array.isArray(listRes) ? listRes : []);
    
    const duplicate = records.find((item: any) => {
      if (item.id === formData.value.id) return false;
      if (item.name !== trimmedName) return false;

      if ((currentShare === 0 || currentScopeLevel === 4) && (item.share === 0 || item.scopeLevel === 4)) {
        return true;
      }
      if (currentScopeLevel === 1 && Number(item.scopeLevel) === 1) {
        return true;
      }
      if (item.scopeLevel === currentScopeLevel) {
        return true;
      }
      return false;
    });

    if (duplicate) {
      return Promise.reject(`当前归属范围内已存在同名知识库【${trimmedName}】，请使用区分度更高的名称！`);
    }
  } catch (e) {
    console.warn('查重校验跳过:', e);
  }

  return Promise.resolve();
}

type AntdFormRules<T> = Partial<Record<keyof T, RuleObject[]>> & {
  [key: string]: RuleObject[];
};

const formRules = ref<AntdFormRules<InfoForm>>({
  name: [
    { required: true, message: '知识库名称不能为空' },
    { validator: validateKnowledgeName, trigger: 'blur' }
  ],
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

/**
 * 根据作用域级别 (2:机构级, 3:部门级) 严格按组织层级隔离树节点
 */
const computedDeptTreeData = computed(() => {
  if (!deptTreeData.value || deptTreeData.value.length === 0) return [];

  const level = formData.value.scopeLevel;

  const processNodeByDepth = (node: any, depth: number): any => {
    const item = { ...node };
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    if (level === 2) {
      // 机构级：只保留机构/分公司节点 (depth = 2)，彻底剥离下属部门节点 (depth >= 3)
      if (depth === 1 && hasChildren) {
        // 顶级集团/租户根节点 (如 乐龄家大健康科技)：递归保留机构子节点，根节点不可勾选
        item.disabled = true;
        item.disableCheckbox = true;
        item.selectable = false;
        item.children = node.children.map((child: any) => processNodeByDepth(child, depth + 1));
      } else {
        // 机构节点 (如 深圳总公司、长沙分公司)：剥离部门列表，成为可勾选的机构节点
        item.children = undefined;
        item.disabled = false;
        item.disableCheckbox = false;
        item.selectable = true;
        item.isLeaf = true;
      }
    } else if (level === 3) {
      // 部门级：仅可选择底层具体部门节点，父级机构节点仅做展开展项且禁止勾选
      if (hasChildren) {
        item.disabled = true;
        item.disableCheckbox = true;
        item.selectable = false;
        item.children = node.children.map((child: any) => processNodeByDepth(child, depth + 1));
      } else {
        item.disabled = false;
        item.disableCheckbox = false;
        item.selectable = true;
      }
    }

    return item;
  };

  return deptTreeData.value.map((rootNode: any) => processNodeByDepth(rootNode, 1));
});

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

watch(() => formData.value.scopeLevel, (level) => {
  if ((level === 2 || level === 3) && (!formData.value.deptScope || (Array.isArray(formData.value.deptScope) && formData.value.deptScope.length === 0))) {
    if (currentUserDeptId.value) {
      formData.value.deptScope = [currentUserDeptId.value];
    }
  }
});

const [BasicModal, modalApi] = useVbenModal({
  class: 'w-[600px]',
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) return;
    modalApi.modalLoading(true);
    const modalData = modalApi.getData<{ createType?: 'template' | 'custom' }>();
    if (modalData && modalData.createType) {
      createType.value = modalData.createType;
    }
    await Promise.all([fetchEmbeddingModels(), fetchRerankModels(), fetchDeptTreeData()]);
    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.lock(true);

    if (!isUpdate.value && createType.value === 'template') {
      if (selectedTemplateKeys.value.length === 0) {
        message.warning('请至少勾选一个预设模板知识库！');
        modalApi.lock(false);
        return;
      }
      
      const existingRes = await infoList({ pageNum: 1, pageSize: 1000 });
      const existingList = (existingRes as any)?.rows || (existingRes as any)?.records || (Array.isArray(existingRes) ? existingRes : []);
      
      let successCount = 0;
      let skippedCount = 0;

      for (const key of selectedTemplateKeys.value) {
        const tpl = presetTemplates.find(t => t.key === key);
        if (!tpl) continue;

        const isDup = existingList.some((ex: any) => ex.name === tpl.name && Number(ex.scopeLevel) === Number(tpl.scopeLevel));
        if (isDup) {
          skippedCount++;
          continue;
        }

        const payload = {
          ...defaultValues,
          name: tpl.name,
          share: tpl.share,
          scopeLevel: tpl.scopeLevel,
          description: tpl.description,
          deptScope: (tpl.scopeLevel === 2 && currentUserDeptId.value) ? [currentUserDeptId.value].join(',') : '',
          vectorModel: 'pgvector',
          embeddingModel: embeddingModelOptions.value[0]?.value || 'text-embedding-v3',
        };

        // 使用返回 id 的接口，用于后续挂载附件
        const newKidRes: any = await infoAddWithId(payload as any);
        // 后端 R<Long>，框架解包后 data 字段即为 id
        const newKidValue = newKidRes?.data ?? newKidRes?.id ?? newKidRes;
        if (newKidValue) {
          try {
            // 调用 initTemplate 接口：在服务端内置 Markdown 范本内容并自动解析向量化
            await attachInitTemplate(
              String(newKidValue),
              key,
              `${tpl.name}-示范指南范本.md`
            );
          } catch (attErr) {
            console.warn('挂载内置示范文档跳过:', attErr);
          }
        }
        successCount++;
      }

      if (successCount > 0) {
        message.success(`已成功为您一键生成 ${successCount} 个机构标准知识库！${skippedCount > 0 ? `(自动跳过 ${skippedCount} 个重复模板)` : ''}`);
      } else if (skippedCount > 0) {
        message.info(`您选中的 ${skippedCount} 个模板在当前机构中已存在，无需重复生成。`);
      }

      emit('reload');
      modalApi.close();
      return;
    }

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
    // postWithMsg 已经弹出"操作成功"，不再重复提示
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

      <!-- 套用标准模板模式：显示模板卡片 -->
      <div v-if="createType === 'template'" class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        <div class="text-xs text-gray-500 mb-3 flex items-center gap-1">
          <span class="font-medium text-gray-700">勾选需要的模板，点击确认后系统自动批量建库</span>
        </div>
        <div
          v-for="tpl in presetTemplates"
          :key="tpl.key"
          class="p-3 border rounded-lg cursor-pointer transition-all duration-200 flex items-start gap-3"
          :class="selectedTemplateKeys.includes(tpl.key)
            ? 'border-primary bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
            : 'border-gray-200 dark:border-zinc-800 hover:border-gray-300'"
          @click="() => {
            const idx = selectedTemplateKeys.indexOf(tpl.key);
            if (idx > -1) selectedTemplateKeys.splice(idx, 1);
            else selectedTemplateKeys.push(tpl.key);
          }"
        >
          <input
            type="checkbox"
            :checked="selectedTemplateKeys.includes(tpl.key)"
            class="mt-1 rounded text-primary focus:ring-primary cursor-pointer"
            @click.stop
            @change="() => {
              const idx = selectedTemplateKeys.indexOf(tpl.key);
              if (idx > -1) selectedTemplateKeys.splice(idx, 1);
              else selectedTemplateKeys.push(tpl.key);
            }"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5 flex-wrap">
              <span class="font-medium text-sm text-gray-800 dark:text-gray-100">{{ tpl.name }}</span>
              <Tag :color="tpl.color" style="margin:0; font-size:11px; line-height:18px; padding:0 6px; border-radius:3px;">{{ tpl.badge }}</Tag>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-0 leading-relaxed">{{ tpl.description }}</p>
          </div>
        </div>
      </div>

      <!-- 自定义新建模式：显示表单 -->
      <template v-else>
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
      </template>

    </Form>
  </BasicModal>
</template>
