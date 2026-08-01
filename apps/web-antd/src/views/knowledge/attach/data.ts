import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'name',
    label: '附件名称',
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
        { label: '个人级', value: 4 },
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
  {
    component: 'Select',
    fieldName: 'type',
    label: '文件格式',
    componentProps: {
      options: [
        { label: 'PDF 文档', value: 'pdf' },
        { label: 'Word 文档 (.docx)', value: 'docx' },
        { label: 'Excel 表格 (.xlsx)', value: 'xlsx' },
        { label: '纯文本 (.txt)', value: 'txt' },
        { label: 'Markdown (.md)', value: 'md' },
      ],
    },
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '解析状态',
    componentProps: {
      options: [
        { label: '解析成功', value: '2' },
        { label: '解析中', value: '1' },
        { label: '未解析', value: '0' },
        { label: '解析失败', value: '3' },
      ],
    },
  },
  {
    component: 'Select',
    fieldName: 'approveStatus',
    label: '审批状态',
    componentProps: {
      options: [
        { label: '待审核', value: '1' },
        { label: '已通过', value: '2' },
        { label: '已驳回', value: '3' },
      ],
    },
  },
];

/**
 * 表格列配置
 */
export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 50 },
  {
    title: '附件名称',
    field: 'name',
    minWidth: 180,
    slots: { default: 'name' },
  },
  {
    title: '所属知识库',
    field: 'knowledgeName',
    minWidth: 160,
    slots: { default: 'knowledgeName' },
  },
  {
    title: '作用域级别',
    field: 'scopeLevel',
    width: 105,
    slots: { default: 'scopeLevel' },
  },
  {
    title: '归属主体',
    field: 'deptScope',
    minWidth: 150,
    slots: { default: 'deptScope' },
  },
  {
    title: '文件格式',
    field: 'type',
    width: 95,
    slots: { default: 'type' },
  },
  {
    title: '解析状态',
    field: 'status',
    width: 105,
    slots: { default: 'status' },
  },
  {
    title: '审批状态',
    field: 'approveStatus',
    width: 105,
    slots: { default: 'approveStatus' },
  },
  {
    title: '上传人',
    field: 'createByName',
    width: 95,
    slots: { default: 'createByName' },
  },
  {
    title: '上传时间',
    field: 'createTime',
    width: 160,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 260,
  },
];
