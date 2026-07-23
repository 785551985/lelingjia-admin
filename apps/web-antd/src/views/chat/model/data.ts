import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { providerList } from '#/api/chat/provider';

export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'modelName',
    label: '模型名称',
    componentProps: {
      placeholder: '请输入模型名称',
    },
  },
  {
    component: 'ApiSelect',
    fieldName: 'providerCode',
    label: '模型供应商',
    componentProps: {
      api: async () => {
        const res = await providerList();
        const rows = (res as any)?.rows || res || [];
        return (rows as any[]).map((item: any) => ({
          label: item.providerName || item.providerCode,
          value: item.providerCode,
        }));
      },
      placeholder: '请选择供应商',
    },
  },
  {
    component: 'Select',
    fieldName: 'category',
    label: '模型分类',
    componentProps: {
      options: [
        { label: '对话', value: 'chat' },
        { label: '视觉多模态', value: 'vision' },
        { label: '向量', value: 'vector' },
        { label: '重排序', value: 'rerank' },
        { label: '图像', value: 'image' },
        { label: '语音', value: 'audio' },
        { label: '视频', value: 'video' },
      ],
      placeholder: '请选择模型分类',
    },
  },
];

/**
 * 表格列配置
 * 如果需要使用 i18n 国际化，请使用 getter 函数形式，否则切换语言时列配置不会刷新
 * 使用方式: export const columns: () => VxeGridProps['columns'] = () => [...]
 */
export const columns: VxeGridProps['columns'] = [
  { type: 'checkbox', width: 60 },
  {
    title: '模型名称',
    field: 'modelName',
  },
  {
    title: '模型描述',
    field: 'modelDescribe',
  },
  {
    title: '模型供应商',
    field: 'providerCode',
  },
  {
    title: '模型分类',
    field: 'category',
    slots: { default: 'category' },
  },
  {
    title: '创建时间',
    field: 'createTime',
    width: 180,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 270,
  },
];
