import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'content',
    label: '文档内容',
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
    title: '所属知识库',
    field: 'knowledgeName',
    minWidth: 220,
    slots: { default: 'knowledgeName' },
  },
  {
    title: '片段序号 / 向量ID',
    field: 'idx',
    width: 140,
    slots: { default: 'idx' },
  },
  {
    title: '文本切片内容',
    field: 'content',
    minWidth: 420,
    slots: { default: 'content' },
  },
  {
    title: '切片标记/章节',
    field: 'remark',
    width: 130,
    slots: { default: 'remark' },
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 190,
  },
];
