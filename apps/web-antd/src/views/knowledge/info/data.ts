import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'name',
    label: '知识库名称',
  },
  {
    component: 'Select',
    fieldName: 'share',
    label: '公开范围',
    componentProps: {
      options: [
        { label: '对内公开', value: 1 },
        { label: '对外公开', value: 2 },
        { label: '仅自己可见', value: 0 },
      ],
    },
  },
  {
    component: 'Select',
    fieldName: 'scopeLevel',
    label: '作用域级别',
    componentProps: {
      options: [
        { label: '集团级', value: 1 },
        { label: '机构级', value: 2 },
        { label: '部门级', value: 3 },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'deptScope',
    label: '归属主体',
    componentProps: {
      placeholder: '请输入机构/部门名称关键词',
    },
  },
];

/**
 * 表格列配置
 * 如果需要使用 i18n 国际化，请使用 getter 函数形式，否则切换语言时列配置不会刷新
 * 使用方式: export const columns: () => VxeGridProps['columns'] = () => [...]
 */
export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 50 },
  {
    title: '知识名称',
    field: 'name',
    minWidth: 160,
  },
  {
    title: '公开范围',
    field: 'share',
    width: 120,
    slots: { default: 'share' },
  },
  {
    title: '作用域级别',
    field: 'scopeLevel',
    width: 110,
    slots: { default: 'scopeLevel' },
  },
  {
    title: '归属主体',
    field: 'deptScope',
    minWidth: 150,
    slots: { default: 'deptScope' },
  },
  {
    title: '知识描述',
    field: 'description',
    showOverflow: 'tooltip',
    minWidth: 200,
  },
  {
    title: '文档数',
    field: 'docCount',
    width: 90,
    align: 'center',
    slots: { default: 'docCount' },
  },
  {
    title: '创建人',
    field: 'createByName',
    width: 100,
    slots: { default: 'createByName' },
  },
  {
    title: '创建时间',
    field: 'createTime',
    width: 160,
    slots: { default: 'createTime' },
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 140,
  },
];
