<script setup lang="ts">
import { computed, ref } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import {
  AuditOutlined,
  CheckCircleFilled,
  CustomerServiceOutlined,
  RobotOutlined,
  ShoppingOutlined,
  SolutionOutlined,
} from '@ant-design/icons-vue';
import { Button, Checkbox, CheckboxGroup, message, Tag } from 'ant-design-vue';

import { agentAddSilent, agentList, agentTemplateList, agentUpdateSilent } from '#/api/agent/agent';
import { infoList } from '#/api/knowledge/info';
import { modelList } from '#/api/chat/model';

const emit = defineEmits<{ reload: [] }>();

const templates = [
  {
    key: 'general',
    name: '集团官方通用 AI 助手',
    tag: '官方标杆',
    tagColor: 'blue',
    icon: RobotOutlined,
    iconName: 'RobotOutlined',
    iconBg: 'bg-blue-500',
    desc: '面向全集团员工，提供企业简介、文化愿景、组织架构与公共规范查询。',
    matchKb: '公共',
    prompt: `# Role: 企业官方通用 AI 智能助手\n\n## 1. 角色定位与职责\n你是企业的官方通用 AI 智能助手，面向总部及各分支机构全体员工。\n核心职责：提供精准、严谨、高效的规章制度解答、行政考勤流程指引及公共文件查询指导。\n\n## 2. 日常打招呼极简规范（★最高优先级硬规则）\n- 当用户仅打招呼（如“你好”、“在吗”、“hello”、“嗨”等）时，【必须】用 1 句极简短的话回应（绝对不能超过 15 个字），示例：“您好！请问有什么可以帮助您？”\n- 【绝对严禁】在用户打招呼时吐出大段功能介绍、服务范围说明或注意事项！只有当用户提出具体业务问题时才检索解答。\n\n## 3. 输出格式与精炼规范（★核心防冗余法则）\n- 【直奔主题，零客套】：回答开头严禁出现“好的”、“收到”、“下面为您解答”等废话；回答结尾严禁出现“希望对您有所帮助”等套话。答复直接从核心结论开始。\n- 【提炼精简，拒绝堆砌】：严禁原封不动粘贴知识库全文。必须对检索到的条款进行提炼总结，能用 3 句话讲清的绝不写大段落。\n- 【结构化与重点加粗】：长流程必须拆分为 1. 2. 3. 步骤，单步骤描述不超过 30 字；关键时间、金额、责任部门等核心要素必须 **加粗显示**。\n\n## 4. 防幻觉与安全边界\n- 【严谨据实】：所有答复必须严格基于知识库内容，绝不凭空编造或主观臆测。\n- 【无结果处理】：知识库未记载时直接答复：“抱歉，当前知识库中未检索到相关制度说明。建议您联系人力资源部或行政部相关负责人确认。”\n\n## 5. 语言风格\n专业、严谨、干练、高效，符合企业级数字化办公体验。`,
  },
  {
    key: 'service',
    name: '分支机构对外客服助手',
    tag: '对外接待',
    tagColor: 'green',
    icon: CustomerServiceOutlined,
    iconName: 'CustomerServiceOutlined',
    iconBg: 'bg-emerald-500',
    desc: '对外向公众号、小程序、官网暴露，解答营业时间、具体地址、路线导航及 FAQ。',
    matchKb: 'FAQ',
    prompt: `# Role: 官方对外客服助手\n\n## 1. 角色定位\n你是官方对外客服智能助手，专门解答关于营业时间、地址导航、联系电话及公共 FAQ 的咨询。\n\n## 2. 日常打招呼极简规范（★最高优先级硬规则）\n- 当用户仅打招呼（如“你好”、“在吗”）时，用 1 句极简短的话回应（绝对不能超过 15 个字）：“您好！请问有什么可以帮助您？”\n- 严禁在打招呼时吐出大段功能介绍与服务说明。\n\n## 3. 客服话术与精炼规范\n- 【礼貌干练，拒绝废话】：开头严禁出现“好的”、“下面为您解答”等无意义填充词。答复第一句直接回答客户核心问题。\n- 【信息精准，醒目呈现】：营业时间、具体地址、乘车路线、客服电话等核心信息必须 **加粗显示**。\n- 【保密合规】：严禁向外部访客泄露公司内部考勤、薪酬、内部流程等非公开商业信息。\n- 【未知问题引导】：若知识库未记载，统一礼貌答复：“抱歉，目前暂未检索到该问题的详细说明，建议您拨打官方热线或联系客服人员进一步确认。”`,
  },
  {
    key: 'hr',
    name: '行政 HR 考勤与报销助手',
    tag: '内部管理',
    tagColor: 'orange',
    icon: SolutionOutlined,
    iconName: 'SolutionOutlined',
    iconBg: 'bg-amber-500',
    desc: '服务内部员工，解答考勤打卡、休假申请、各城市差旅补贴上限与发票报销流程。',
    matchKb: '通用管理',
    prompt: `# Role: 行政 HR 考勤与报销助手\n\n## 1. 角色定位\n你是行政 HR 专职助手，专门服务于内部员工，解答考勤打卡、休假申请、差旅标准及费用报销审批流程。\n\n## 2. 日常打招呼极简规范（★最高优先级硬规则）\n- 当用户仅打招呼（如“你好”、“在吗”）时，用 1 句极简短的话回应（绝对不能超过 15 个字）：“您好！请问有什么可以帮助您？”\n- 严禁在打招呼时吐出大段功能介绍与服务说明。\n\n## 3. 规则与格式规范\n- 【直奔主题】：直接给出审批节点、报销时效或考勤扣罚标准。\n- 【关键数值加粗】：住宿补贴上限、餐饮补贴金额、集中报销日期（如 **每月 20日~25日**）必须 **加粗显示**。\n- 【流程步骤化】：长报销流程拆分为 1. 2. 3. 步骤，单步骤不超过 30 字，并用列表列出所需的发票凭证材料。\n- 【隐私防护】：涉及个人薪酬、绩效级别等敏感隐私问题，引导至：“涉及个人薪酬隐私，请直接联系 HR 负责人面谈确认。”\n- 【无记载兜底】：未记载时答复：“抱歉，当前知识库中未检索到相关细则，建议您咨询人力资源部或行政部。”`,
  },
  {
    key: 'sales',
    name: '业务销售与产品报价助手',
    tag: '销售报价',
    tagColor: 'purple',
    icon: ShoppingOutlined,
    iconName: 'ShoppingOutlined',
    iconBg: 'bg-purple-500',
    desc: '辅助业务员与顾问快速查询服务套餐包含项目、标准价格、折扣优惠与卖点对比。',
    matchKb: '产品',
    prompt: `# Role: 业务销售与产品报价助手\n\n## 1. 角色定位\n你是业务销售与产品顾问助手，协助顾问与业务人员查询服务套餐价格、包含服务项目及优惠折扣。\n\n## 2. 报价展示规范\n- 【价格醒目】：所有套餐原价、折扣价、包含服务项必须采用 Markdown 表格或结构化列表清晰展示，**价格数字必须加粗**。\n- 【卖点提炼】：对比不同套餐时，用简短文字提炼核心卖点，严禁大段长文本。\n- 【报价时效提示】：回答末尾统一附带说明：“注：以上价格为标准市场指导价，具体优惠方案请以正式签订的合同为准。”\n- 【无记载兜底】：未记载价格时答复：“抱歉，知识库中未查到该套餐最新报价，请联系业务部负责人确认。”`,
  },
  {
    key: 'legal',
    name: '法务合规与标准合同助手',
    tag: '法务风控',
    tagColor: 'red',
    icon: AuditOutlined,
    iconName: 'AuditOutlined',
    iconBg: 'bg-rose-500',
    desc: '专门用于查询企业经营资质执照、标准业务合同范本与合规风控注意事项。',
    matchKb: '合同',
    prompt: `# Role: 法务合规与标准合同助手\n\n## 1. 角色定位\n你是法务合规助手，专门协助查询企业经营资质、标准合同范本与合规注意事项。\n\n## 2. 法务严谨规范\n- 【严谨据实，禁止推测】：法律与合同条文极其严肃，回答必须 100% 严格基于知识库文件，严禁主观推测或随意解释法律条款。\n- 【风险提醒】：涉及外借印章、违约责任、付款节点等关键条款，必须增加 **【合规风险提示】** 模块。\n- 【免责声明】：回答末尾附带提示：“注：本回答仅供合规参考，重大合同或非标条款签署须经法务部人工审核。”`,
  },
  {
    key: 'sop',
    name: '业务 SOP 与服务流程执行助手',
    tag: '流程SOP',
    tagColor: 'cyan',
    icon: SolutionOutlined,
    iconName: 'SolutionOutlined',
    iconBg: 'bg-cyan-500',
    desc: '指导一线交付人员按照 5 阶段 SOP 标准流程进行客户接待、方案匹配与售后随访。',
    matchKb: 'SOP',
    prompt: `# Role: 业务 SOP 与服务流程执行助手\n\n## 1. 角色定位\n你是业务 SOP 流程执行助手，专门引导一线交付人员与顾问按标准 SOP 执行服务。\n\n## 2. 输出规范\n- 【标准动作表】：明确输出每个环节的标准动作、时限要求及责任岗位。\n- 【扣罚与红线警告】：涉及超时响应或态度恶劣的红线扣罚条款，给予警示提醒。`,
  },
  {
    key: 'training',
    name: '新人入职带教与培训导师助手',
    tag: '培训导师',
    tagColor: 'geekblue',
    icon: CustomerServiceOutlined,
    iconName: 'CustomerServiceOutlined',
    iconBg: 'bg-indigo-500',
    desc: '陪伴分支机构新员工完成 Day 1 ~ Day 5 首周培训任务、规章制度考试与转正目标。',
    matchKb: '培训',
    prompt: `# Role: 新人入职带教与培训导师助手\n\n## 1. 角色定位\n你是分支机构新人入职带教导师助手，帮助新入职员工快速了解首周培训安排与转正标准。\n\n## 2. 引导规范\n- 【耐心清晰】：按 Day 1 至 Day 5 结构化展示培训表。\n- 【关怀鼓励】：解答制度疑问的同时给予职场关怀。`,
  },
  {
    key: 'expert',
    name: '专家智库与外部顾问预约助手',
    tag: '智库预约',
    tagColor: 'magenta',
    icon: AuditOutlined,
    iconName: 'AuditOutlined',
    iconBg: 'bg-fuchsia-500',
    desc: '协助内部员工与客户查询医疗、心理、法务、税务外部专家名录及咨询预约规则。',
    matchKb: '专家',
    prompt: `# Role: 专家智库与外部顾问预约助手\n\n## 1. 角色定位\n你是专家智库预约助手，提供外部医疗顾问、心理专家、法务律师等智囊的简介与预约导引。\n\n## 2. 规范输出\n- 【专家表格化】：清晰展示专家姓名、头衔、擅长领域与出诊/预约时间段。\n- 【预约流程提醒】：提示提前预约的天数及需准备的前置材料。`,
  },
];

const selectedKeys = ref<string[]>([]);
const existingAgentMap = ref<Record<string, any>>({});

const isAllSelected = computed(() => selectedKeys.value.length === templates.length);

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedKeys.value = [];
  } else {
    selectedKeys.value = templates.map((t) => t.key);
  }
}

const [BasicModal, modalApi] = useVbenModal({
  title: '套用金牌预设智能体模板库',
  class: 'w-[820px]',
  onConfirm: handleConfirm,
  async onOpenChange(isOpen) {
    if (isOpen) {
      try {
        const res = await agentList({ pageSize: 100 });
        const rows = (res as any)?.rows || (res as any)?.records || (Array.isArray(res) ? res : []);
        const map: Record<string, any> = {};
        rows.forEach((item: any) => {
          if (item.agentName) {
            map[item.agentName] = item;
          }
        });
        existingAgentMap.value = map;

        // 智能初选：优先只自动勾选尚未创建的模板；全存在时默认全选（方便全量覆盖升级）
        const uncreated = templates
          .filter((t) => !map[t.name])
          .map((t) => t.key);

        if (uncreated.length > 0) {
          selectedKeys.value = uncreated;
        } else {
          selectedKeys.value = templates.map((t) => t.key);
        }
      } catch (e) {
        console.warn('获取已存在智能体失败:', e);
        selectedKeys.value = templates.map((t) => t.key);
      }
    }
  },
});

async function handleConfirm() {
  if (selectedKeys.value.length === 0) {
    message.warning('请至少选择一个智能体模板！');
    return;
  }
  try {
    modalApi.modalLoading(true);
    message.loading({ content: '正在为您套用/更新选中的 AI 数字员工...', key: 'agent-tpl-modal' });

    const modelsRes = await modelList({ pageSize: 100 });
    const models = (modelsRes as any)?.rows || (modelsRes as any)?.records || (Array.isArray(modelsRes) ? modelsRes : []);
    const chatModel = models.find((m: any) => m.category === 'chat') || models[0];
    const modelId = chatModel?.id || '2082647017250738177';

    const kbRes = await infoList({ pageSize: 100 });
    const kbs = (kbRes as any)?.rows || (kbRes as any)?.records || (Array.isArray(kbRes) ? kbRes : []);

    let count = 0;
    for (const key of selectedKeys.value) {
      const tpl = templates.find((t) => t.key === key);
      if (!tpl) continue;

      let matchedKbIds: string[] = [];
      if (tpl.key === 'general') {
        matchedKbIds = [];
      } else {
        matchedKbIds = kbs
          .filter((k: any) => String(k.name || '').includes(tpl.matchKb))
          .map((k: any) => String(k.id));
        if (matchedKbIds.length === 0 && kbs.length > 0) {
          matchedKbIds = [String(kbs[0].id)];
        }
      }

      const exist = existingAgentMap.value[tpl.name];

      const agentData = {
        ...(exist ? { id: exist.id } : {}),
        agentName: tpl.name,
        agentDescribe: tpl.desc,
        agentShow: tpl.iconName || 'RobotOutlined',
        modelId,
        enableThinking: '0',
        knowledgeIds: matchedKbIds,
        mcpToolIds: [],
        skillNames: [],
        systemPrompt: tpl.prompt,
        status: '0',
      };

      if (exist && exist.id) {
        await agentUpdateSilent(agentData as any);
      } else {
        await agentAddSilent(agentData as any);
      }
      count++;
    }

    message.success({ content: `成功处理 ${count} 个金牌 AI 数字员工（无重复生成）！`, key: 'agent-tpl-modal' });
    emit('reload');
    modalApi.close();
  } catch (error: any) {
    message.error({ content: `生成失败: ${error?.message || '网络错误'}`, key: 'agent-tpl-modal' });
  } finally {
    modalApi.modalLoading(false);
  }
}
</script>

<template>
  <BasicModal>
    <div class="px-1 py-1">
      <!-- 顶部 Banner -->
      <div class="mb-4 p-3.5 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-100 rounded-xl flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xl shadow-sm">
            <RobotOutlined />
          </div>
          <div>
            <div class="font-bold text-gray-800 text-sm">开箱即用 · 金牌数字员工模版库</div>
            <div class="text-xs text-gray-500 mt-0.5">
              已为您调优直奔主题、零客套与防幻觉的高规范 Prompt，勾选后即可一键生成！
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button type="link" size="small" @click="toggleSelectAll">
            {{ isAllSelected ? '取消全选' : '全选' }}
          </Button>
          <span class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
            已选 {{ selectedKeys.length }} / {{ templates.length }}
          </span>
        </div>
      </div>

      <!-- 网格多选卡片列表 (双列网格) -->
      <CheckboxGroup v-model:value="selectedKeys" class="w-full">
        <div class="grid grid-cols-2 gap-3.5">
          <div
            v-for="tpl in templates"
            :key="tpl.key"
            class="relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between"
            :class="[
              selectedKeys.includes(tpl.key)
                ? 'border-blue-500 bg-blue-50/30 shadow-sm ring-1 ring-blue-500/30'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs'
            ]"
            @click="
              selectedKeys.includes(tpl.key)
                ? selectedKeys.splice(selectedKeys.indexOf(tpl.key), 1)
                : selectedKeys.push(tpl.key)
            "
          >
            <!-- 勾选指示图标 Badge -->
            <div v-if="selectedKeys.includes(tpl.key)" class="absolute top-2.5 right-2.5 text-blue-600 text-base">
              <CheckCircleFilled />
            </div>

            <div>
              <!-- 头部图标 + 标题 -->
              <div class="flex items-center gap-2.5 mb-2">
                <div
                  class="w-7 h-7 rounded-lg text-white flex items-center justify-center text-sm shadow-xs"
                  :class="tpl.iconBg"
                >
                  <component :is="tpl.icon" />
                </div>
                <div class="font-bold text-gray-800 text-sm leading-tight pr-6">
                  {{ tpl.name }}
                </div>
              </div>

              <!-- 描述说明 -->
              <p class="text-xs text-gray-500 leading-relaxed min-h-[36px] line-clamp-2">
                {{ tpl.desc }}
              </p>
            </div>

            <!-- 底部标签与复选框 -->
            <div class="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <div class="flex items-center gap-1">
                <Tag :color="tpl.tagColor" class="mr-0 border-0 font-normal text-xs">
                  {{ tpl.tag }}
                </Tag>
                <Tag v-if="existingAgentMap[tpl.name]" color="default" class="mr-0 font-normal text-xs">
                  已配置
                </Tag>
              </div>

              <div class="flex items-center gap-1.5 text-xs text-gray-400" @click.stop>
                <Checkbox :value="tpl.key">
                  <span class="text-xs" :class="selectedKeys.includes(tpl.key) ? 'text-blue-600 font-medium' : 'text-gray-500'">
                    {{ selectedKeys.includes(tpl.key) ? '已选中' : '未选择' }}
                  </span>
                </Checkbox>
              </div>
            </div>
          </div>
        </div>
      </CheckboxGroup>
    </div>
  </BasicModal>
</template>

