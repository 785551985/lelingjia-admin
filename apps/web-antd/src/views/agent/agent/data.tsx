import { h } from 'vue';
import {
  AuditOutlined,
  BulbOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  SafetyOutlined,
  ShoppingOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import {
  agentKnowledgeTreeOptions,
  agentMcpToolOptions,
  agentModelOptions,
  agentSkillOptions,
} from '#/api/agent/agent';
import { getDeptTree } from '#/api/system/user';

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'agentName',
    label: '智能体名称',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '正常', value: '0' },
        { label: '停用', value: '1' },
      ],
    },
    fieldName: 'status',
    label: '状态',
  },
];

export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 60 },
  {
    title: 'ID',
    field: 'id',
    visible: false,
  },
  {
    title: '头像图标',
    field: 'agentShow',
    width: 90,
    slots: { default: 'agentShow' },
  },
  {
    title: '智能体名称',
    field: 'agentName',
    showOverflow: true,
    width: 200,
  },
  {
    title: '描述',
    field: 'agentDescribe',
    showOverflow: true,
  },
  {
    title: '绑定模型',
    field: 'modelName',
    width: 160,
  },
  {
    title: '深度思考',
    field: 'enableThinking',
    width: 100,
    formatter({ cellValue }) {
      return cellValue === '1' ? '是' : '否';
    },
  },
  {
    title: '作用域级别',
    field: 'scopeLevel',
    width: 120,
    formatter({ cellValue }) {
      switch (cellValue) {
        case 1:
          return '集团级';
        case 2:
          return '机构级';
        case 3:
          return '部门级';
        case 4:
          return '个人级';
        default:
          return '集团级';
      }
    },
  },
  {
    title: '状态',
    field: 'status',
    width: 90,
    formatter({ cellValue }) {
      return cellValue === '1' ? '停用' : '正常';
    },
  },
  {
    title: '创建时间',
    field: 'createTime',
    width: 160,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    resizable: false,
    width: 'auto',
  },
];

export const drawerSchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    dependencies: {
      show: () => false,
      triggerFields: [''],
    },
    fieldName: 'id',
    label: 'id',
  },
  {
    component: 'Input',
    fieldName: 'agentName',
    label: '智能体名称',
    rules: 'required',
    formItemClass: 'col-span-2',
  },
  {
    component: 'Textarea',
    componentProps: {
      rows: 2,
    },
    fieldName: 'agentDescribe',
    formItemClass: 'col-span-2',
    label: '智能体描述',
  },
  {
    component: 'Select',
    componentProps: {
      allowClear: true,
      placeholder: '请选择展示图标头像（支持常用图标或直接填图片URL）',
      options: [
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(RobotOutlined, { class: 'text-blue-500 text-base' }), h('span', '通用 AI 机器人头像 (RobotOutlined)')]),
          value: 'RobotOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(CustomerServiceOutlined, { class: 'text-emerald-500 text-base' }), h('span', '官方客服接待头像 (CustomerServiceOutlined)')]),
          value: 'CustomerServiceOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(SolutionOutlined, { class: 'text-amber-500 text-base' }), h('span', '行政 HR 助手头像 (SolutionOutlined)')]),
          value: 'SolutionOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(ShoppingOutlined, { class: 'text-purple-500 text-base' }), h('span', '业务销售报价头像 (ShoppingOutlined)')]),
          value: 'ShoppingOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(AuditOutlined, { class: 'text-rose-500 text-base' }), h('span', '法务合规审核头像 (AuditOutlined)')]),
          value: 'AuditOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(UserOutlined, { class: 'text-indigo-500 text-base' }), h('span', '常规用户助手头像 (UserOutlined)')]),
          value: 'UserOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(BulbOutlined, { class: 'text-yellow-500 text-base' }), h('span', '灵感脑暴助手头像 (BulbOutlined)')]),
          value: 'BulbOutlined',
        },
        {
          label: () => h('div', { class: 'flex items-center gap-2 py-0.5' }, [h(SafetyOutlined, { class: 'text-cyan-500 text-base' }), h('span', '安全风控防护头像 (SafetyOutlined)')]),
          value: 'SafetyOutlined',
        },
      ],
    },
    defaultValue: 'RobotOutlined',
    fieldName: 'agentShow',
    label: '展示图标',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: agentModelOptions,
      resultField: 'rows',
      labelField: 'modelDescribe',
      valueField: 'id',
      placeholder: '请选择聊天模型',
    },
    fieldName: 'modelId',
    label: '绑定模型',
    rules: 'selectRequired',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      buttonStyle: 'solid',
      options: [
        { label: '否', value: '0' },
        { label: '是', value: '1' },
      ],
      optionType: 'button',
    },
    defaultValue: '0',
    fieldName: 'enableThinking',
    label: '深度思考',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: agentMcpToolOptions,
      resultField: 'data',
      labelField: 'name',
      valueField: 'id',
      mode: 'multiple',
      placeholder: '请选择关联的 MCP 工具',
    },
    fieldName: 'mcpToolIds',
    formItemClass: 'col-span-2',
    label: '关联工具',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: agentSkillOptions,
      labelField: 'description',
      valueField: 'name',
      mode: 'multiple',
      placeholder: '请选择关联的磁盘技能',
    },
    fieldName: 'skillNames',
    formItemClass: 'col-span-2',
    label: '关联技能',
  },
  {
    component: 'ApiTreeSelect',
    componentProps: {
      api: agentKnowledgeTreeOptions,
      fieldNames: {
        children: 'children',
        label: 'title',
        value: 'value',
      },
      placeholder: '请选择关联的知识库（留空默认自动检索当前员工全量权限知识库）',
      showCheckedStrategy: 'SHOW_CHILD',
      showSearch: true,
      treeCheckable: true,
      treeCheckStrictly: false,
      treeDefaultExpandAll: true,
      treeNodeFilterProp: 'title',
      treeNodeLabelProp: 'title',
    },
    fieldName: 'knowledgeIds',
    formItemClass: 'col-span-2',
    helpMessage: '留空说明：留空表示不限定具体知识库，提问时将自动按数据权限检索当前员工可见的所有知识库（集团级、机构级、部门级、个人私有级）。',
    label: '关联知识库',
  },
  {
    component: 'Textarea',
    componentProps: {
      rows: 6,
    },
    fieldName: 'systemPrompt',
    formItemClass: 'col-span-2',
    label: '自定义提示词',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      buttonStyle: 'solid',
      options: [
        { label: '正常', value: '0' },
        { label: '停用', value: '1' },
      ],
      optionType: 'button',
    },
    defaultValue: '0',
    fieldName: 'status',
    label: '状态',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      buttonStyle: 'solid',
      options: [
        { label: '对内公开', value: 1 },
        { label: '对外公开', value: 2 },
        { label: '仅自己可见', value: 0 },
      ],
      optionType: 'button',
    },
    defaultValue: 1,
    fieldName: 'isPublic',
    formItemClass: 'col-span-2',
    label: '是否公开',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '集团级（全集团公开，包括所有下属机构）', value: 1 },
        { label: '机构级（仅本机构/分公司公开）', value: 2 },
        { label: '部门级（仅本机构内指定部门可见）', value: 3 },
      ],
      placeholder: '请选择作用域级别',
    },
    defaultValue: 1,
    dependencies: {
      show(values) {
        return values.isPublic === 1;
      },
      triggerFields: ['isPublic'],
    },
    fieldName: 'scopeLevel',
    formItemClass: 'col-span-2',
    helpMessage: '作用域权限说明：控制该智能体在集团、分公司、部门或个人层级的可见范围。',
    label: '作用域级别',
    rules: 'selectRequired',
  },
  {
    component: 'ApiTreeSelect',
    componentProps: {
      api: getDeptTree,
      fieldNames: {
        children: 'children',
        label: 'label',
        value: 'id',
      },
      placeholder: '请选择可见的分支机构/部门（可多选）',
      showCheckedStrategy: 'SHOW_ALL',
      showSearch: true,
      treeCheckable: true,
      treeCheckStrictly: false,
      treeDefaultExpandAll: true,
    },
    dependencies: {
      show(values) {
        return values.isPublic === 1 && (values.scopeLevel === 2 || values.scopeLevel === 3);
      },
      triggerFields: ['isPublic', 'scopeLevel'],
    },
    fieldName: 'deptIds',
    formItemClass: 'col-span-2',
    helpMessage: '机构/部门限制：勾选后只有属于这些分公司或部门的员工才能在客户端看到并使用该智能体。',
    label: '可见机构/部门',
  },
  {
    component: 'Textarea',
    componentProps: {
      rows: 2,
    },
    fieldName: 'remark',
    formItemClass: 'col-span-2',
    label: '备注',
  },
];
