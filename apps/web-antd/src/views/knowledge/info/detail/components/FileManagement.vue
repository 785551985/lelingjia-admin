<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  Button,
  Upload,
  Table,
  Space,
  Popconfirm,
  message,
  Tooltip,
  Modal,
  Descriptions,
  DescriptionsItem,
  Image,
  Spin,
  Badge,
  Switch,
  Drawer,
  Tabs,
  TabPane,
  Input,
} from 'ant-design-vue';
import { InboxOutlined, CopyOutlined, DownloadOutlined, FullscreenOutlined, FullscreenExitOutlined, SaveOutlined } from '@ant-design/icons-vue';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';
import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';
import { attachList, attachRemove, attachParse, attachReparseKnowledge } from '#/api/knowledge/attach';
import { fragmentAdd, fragmentList, fragmentUpdate } from '#/api/knowledge/fragment';
import { ossInfo, checkLoginBeforeDownload, ossDownload } from '#/api/system/oss';
import { downloadByUrl } from '#/utils/file/download';
import { stringify } from '@vben/request';
import { requestClient } from '#/api/request';

const props = defineProps<{
  knowledgeId?: string | number;
}>();

const { apiURL, clientId } = useAppConfig(
  import.meta.env,
  import.meta.env.PROD,
);
const accessStore = useAccessStore();

const attachmentData = ref<any[]>([]);
const loading = ref(false);
const uploading = ref(false);

const autoParse = ref(true);

const columns = [
  { title: '附件名称', dataIndex: 'name', key: 'name' },
  { title: '附件类型', dataIndex: 'type', key: 'type' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '上传时间', dataIndex: 'createTime', key: 'createTime', width: 180 },
  { title: '分块数', dataIndex: 'fragmentCount', key: 'fragmentCount', width: 80 },
  { title: '操作', key: 'action', width: 280 },
];

const statusMap: Record<number, { text: string; status: any }> = {
  0: { text: '待解析', status: 'default' },
  1: { text: '解析中', status: 'processing' },
  2: { text: '已解析', status: 'success' },
  3: { text: '解析失败', status: 'error' },
};

const fragmentVisible = ref(false);
const fragmentLoading = ref(false);
const fragmentData = ref<any[]>([]);
const fragmentColumns = [
  { title: '序号', dataIndex: 'idx', key: 'idx', width: 80 },
  { title: '片段内容', dataIndex: 'content', key: 'content' },
];

const fileDetailVisible = ref(false);
const fileDetailLoading = ref(false);
const fileDetailData = ref<any>(null);

const uploadModalVisible = ref(false);
const fileList = ref<any[]>([]);

const fragmentDetailVisible = ref(false);
const currentFragment = ref<any>(null);
const currentSourceName = ref('');

function handleViewFragmentDetail(record: any, sourceName?: string) {
  currentFragment.value = record;
  currentSourceName.value = sourceName || '';
  fragmentDetailVisible.value = true;
}

async function handleCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  } catch (err) {
    message.error('复制失败');
  }
}

function handleOpenUpload() {
  fileList.value = [];
  uploadModalVisible.value = true;
}

async function loadAttachments() {
  if (!props.knowledgeId) return;
  loading.value = true;
  try {
    const res = await attachList({
      knowledgeId: props.knowledgeId,
      pageSize: 100,
    });
    attachmentData.value = res.rows || [];
  } finally {
    loading.value = false;
  }
}

watch(() => props.knowledgeId, () => {
  if (props.knowledgeId) {
    loadAttachments();
  }
}, { immediate: true });

function handleBeforeUpload(file: any) {
  fileList.value = [...fileList.value, file];
  return false;
}

function handleRemove(file: any) {
  const index = fileList.value.indexOf(file);
  const newFileList = fileList.value.slice();
  newFileList.splice(index, 1);
  fileList.value = newFileList;
}

async function handleManualUpload() {
  if (fileList.value.length === 0) {
    message.warning('请先选择要上传的文件');
    return;
  }

  uploading.value = true;
  try {
    for (const file of fileList.value) {
      const formData = new FormData();
      // ant-design-vue 的 fileList 中的项可能是包装过的，需获取 originFileObj
      const rawFile = file.originFileObj || file;
      formData.append('file', rawFile);
      formData.append('knowledgeId', String(props.knowledgeId));
      formData.append('autoParse', String(autoParse.value));

      // 使用原生 requestClient 发送请求
      await requestClient.post('/system/attach/upload', formData);
    }
    
    message.success('所有文件上传成功');
    fileList.value = [];
    uploadModalVisible.value = false;
    await loadAttachments();
  } catch (error: any) {
    message.error(error.message || '上传失败');
  } finally {
    uploading.value = false;
  }
}

async function handleDeleteAttachment(record: any) {
  try {
    await attachRemove(record.id);
    await loadAttachments();
  } catch (error) {
    message.error('删除失败');
  }
}

async function handleParse(record: any) {
  try {
    loading.value = true;
    await attachParse(record.id);
    message.success('已触发解析，请稍后刷新查看状态');
    await loadAttachments();
  } catch (error) {
    message.error('触发解析失败');
  } finally {
    loading.value = false;
  }
}

async function handleReparseAll() {
  if (!props.knowledgeId) return;
  loading.value = true;
  try {
    const result = await attachReparseKnowledge(props.knowledgeId);
    message.success(`已提交 ${result.submitted} 个文档，跳过 ${result.skipped} 个解析中文档`);
    await loadAttachments();
  } catch (error: any) {
    message.error(error?.message || '批量重新解析失败');
  } finally {
    loading.value = false;
  }
}

async function handleFragment(record: any) {
  fragmentLoading.value = true;
  fragmentVisible.value = true;
  try {
    const res = await fragmentList({ docId: record.docId, pageSize: 100 });
    // 初始化展开状态
    fragmentData.value = (res.rows || []).map((item: any) => ({ ...item, _expanded: false }));
  } catch (error) {
    message.error('加载片段失败');
  } finally {
    fragmentLoading.value = false;
  }
}

function closeFragment() {
  fragmentVisible.value = false;
  fragmentData.value = [];
}

const previewTextContent = ref('');
const activePreviewTab = ref('native');
const docxContainerRef = ref<HTMLElement | null>(null);
const excelHtmlContent = ref('');
const sheetNames = ref<string[]>([]);
const currentSheet = ref<string>('');
const excelWorkbook = ref<any>(null);
const isRenderingDocx = ref(false);
const isRenderingExcel = ref(false);
const isFullscreen = ref(false);

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

function selectSheet(name: string) {
  currentSheet.value = name;
  if (excelWorkbook.value && excelWorkbook.value.Sheets[name]) {
    excelHtmlContent.value = XLSX.utils.sheet_to_html(excelWorkbook.value.Sheets[name]);
  }
}

async function getFileBlob(ossId: any, fileUrl: string): Promise<Blob> {
  if (ossId) {
    try {
      const res: any = await ossDownload(ossId);
      if (res instanceof Blob) {
        return res;
      }
      if (res && res.data instanceof Blob) {
        return res.data;
      }
    } catch (e) {
      console.warn('ossDownload 方式获取文件失败，退回到 fetch fileUrl:', e);
    }
  }
  if (fileUrl) {
    const resp = await fetch(fileUrl);
    if (!resp.ok) {
      throw new Error(`HTTP 请求失败: ${resp.status}`);
    }
    return await resp.blob();
  }
  throw new Error('未提供有效的文件 ID 或 URL');
}

function isPdfFile(fileSuffix: string) {
  return fileSuffix ? fileSuffix.toLowerCase().includes('pdf') : false;
}

function isTextFile(fileSuffix: string) {
  if (!fileSuffix) return false;
  const suffix = fileSuffix.toLowerCase();
  return ['.txt', '.md', '.json', '.csv', '.log', '.xml', '.yaml', '.yml', '.js', '.ts', '.py', '.java', '.sql', '.html', '.css'].some(t => suffix.includes(t));
}

function isOfficeFile(fileSuffix: string) {
  if (!fileSuffix) return false;
  const suffix = fileSuffix.toLowerCase();
  return ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].some(t => suffix.includes(t));
}

const currentViewingRecord = ref<any>(null);
const currentFragmentRecord = ref<any>(null);
const savingFragment = ref(false);

async function handleSaveAndReparse() {
  if (!previewTextContent.value || !previewTextContent.value.trim()) {
    message.warning('预览或修改文本不能为空！');
    return;
  }
  try {
    savingFragment.value = true;
    message.loading({ content: '正在保存并发起新一轮向量解析...', key: 'save-frag' });

    let cleanText = previewTextContent.value
      .replace(/^【分块切片 #\d+】\s*\n/gm, '')
      .replace(/^[=]{20,}\s*$/gm, '')
      .trim();

    if (currentFragmentRecord.value && currentFragmentRecord.value.id) {
      await fragmentUpdate({
        id: currentFragmentRecord.value.id,
        knowledgeId: currentFragmentRecord.value.knowledgeId || currentViewingRecord.value?.knowledgeId,
        docId: currentFragmentRecord.value.docId || currentViewingRecord.value?.docId,
        fid: currentFragmentRecord.value.fid || `frag_${Date.now()}`,
        idx: currentFragmentRecord.value.idx !== undefined ? Number(currentFragmentRecord.value.idx) : 0,
        content: cleanText,
      } as any);
    } else if (currentViewingRecord.value && currentViewingRecord.value.docId) {
      await fragmentAdd({
        knowledgeId: currentViewingRecord.value.knowledgeId,
        docId: currentViewingRecord.value.docId,
        content: cleanText,
        fid: `frag_${Date.now()}`,
        idx: 0,
      } as any);
    }

    if (currentViewingRecord.value && currentViewingRecord.value.id) {
      await attachParse(currentViewingRecord.value.id);
    }

    message.success({ content: '已成功更新范本文本并完成矢量解析（已自动覆盖旧内容）！', key: 'save-frag' });
    loadAttachments();
  } catch (err: any) {
    message.error({ content: `保存失败: ${err?.message || '网络错误'}`, key: 'save-frag' });
  } finally {
    savingFragment.value = false;
  }
}

async function handleViewFile(record: any) {
  currentViewingRecord.value = record;
  currentFragmentRecord.value = null;
  fileDetailLoading.value = true;
  fileDetailVisible.value = true;
  previewTextContent.value = '';
  excelHtmlContent.value = '';
  sheetNames.value = [];
  currentSheet.value = '';
  excelWorkbook.value = null;
  activePreviewTab.value = record.ossId ? 'native' : 'fragment';

  // 1. 优先拉取 AI 训练切片分块 (必须 await，防止内嵌范本因异步加载未完而预览空白)
  if (record.docId) {
    try {
      const frags: any = await fragmentList({ docId: record.docId, pageSize: 200 });
      const rows = frags?.rows || (Array.isArray(frags) ? frags : []);
      if (rows.length > 0) {
        currentFragmentRecord.value = rows[0];
        previewTextContent.value = rows
          .map((r: any) => `【分块切片 #${Number(r.idx) + 1}】\n${r.content}`)
          .join('\n\n' + '='.repeat(40) + '\n\n');
      }
    } catch (e) {
      console.warn('拉取切片文本失败', e);
    }
  }

  // 2. 无 ossId 的场景（如预设范本模版）
  if (!record.ossId) {
    fileDetailData.value = {
      originalName: record.name,
      fileName: record.name,
      fileSuffix: record.type || 'md',
      url: '',
      createTime: record.createTime,
    };
    fileDetailLoading.value = false;
    return;
  }

  // 3. 有 ossId 的场景（正常对象存储拉取）
  try {
    const res = await ossInfo(record.ossId);
    if (res && res.length > 0 && res[0]) {
      const firstItem = res[0];
      fileDetailData.value = firstItem;
      const suffix = (firstItem.fileSuffix || record.type || '').toLowerCase();
      const fileUrl = firstItem.url || '';

      // 纯文本 / 代码文件
      if (isTextFile(suffix)) {
        try {
          const blob = await getFileBlob(record.ossId, fileUrl);
          const txt = await blob.text();
          if (txt) {
            previewTextContent.value = txt;
          }
        } catch (e) {
          console.warn('拉取纯文本内容失败:', e);
        }
      }
      // Word 文档 (.docx)
      else if (suffix.endsWith('.docx')) {
        isRenderingDocx.value = true;
        try {
          const blob = await getFileBlob(record.ossId, fileUrl);
          setTimeout(async () => {
            const container = docxContainerRef.value;
            if (container) {
              container.innerHTML = '';
              await renderAsync(blob, container, undefined, {
                className: 'docx-view-wrap',
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
              });
            }
            isRenderingDocx.value = false;
          }, 150);
        } catch (e) {
          console.warn('docx-preview 渲染失败', e);
          isRenderingDocx.value = false;
        }
      }
      // Excel 电子表格 (.xlsx / .xls)
      else if (suffix.includes('xls')) {
        isRenderingExcel.value = true;
        try {
          const blob = await getFileBlob(record.ossId, fileUrl);
          const buffer = await blob.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: 'array' });
          excelWorkbook.value = workbook;
          sheetNames.value = workbook.SheetNames || [];
          if (sheetNames.value.length > 0 && sheetNames.value[0]) {
            selectSheet(sheetNames.value[0]);
          }
        } catch (e) {
          console.warn('Excel 表格渲染失败', e);
        } finally {
          isRenderingExcel.value = false;
        }
      }
    } else {
      message.error('未找到对应文件');
      closeFileDetail();
    }
  } catch (error) {
    message.error('获取文件详情失败');
    closeFileDetail();
  } finally {
    fileDetailLoading.value = false;
  }
}

async function handleDownloadFile(ossId: string, fileName: string) {
  try {
    await checkLoginBeforeDownload();
    const params = { clientid: clientId, Authorization: `Bearer ${accessStore.accessToken}` };
    downloadByUrl({ fileName, url: `${apiURL}/resource/oss/download/${ossId}?${stringify(params)}` });
  } catch (error) { message.error('下载失败'); }
}

function closeFileDetail() { 
  fileDetailVisible.value = false; 
  fileDetailData.value = null; 
  previewTextContent.value = '';
  isFullscreen.value = false;
}

function isImageFile(fileSuffix: string) {
  return fileSuffix ? ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].some(t => fileSuffix.toLowerCase().includes(t)) : false;
}
</script>

<template>
  <div class="p-2">
    <!-- 顶部操作栏 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Button type="primary" @click="handleOpenUpload">
          <template #icon><InboxOutlined /></template>
          上传文档
        </Button>
        <Popconfirm
          title="将按当前分片配置重新解析所有文档，是否继续？"
          @confirm="handleReparseAll"
        >
          <Button>全部重新解析</Button>
        </Popconfirm>
      </div>
      <div class="flex items-center gap-2">
        <Tooltip title="刷新列表以获取最新解析状态">
          <Button @click="loadAttachments">
            刷新
          </Button>
        </Tooltip>
      </div>
    </div>

    <div class="relative">
      <div v-if="uploading" class="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
        <Spin />
      </div>
      
      <Table
        :columns="columns"
        :data-source="attachmentData"
        :loading="loading"
        :pagination="false"
        size="middle"
        bordered
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tooltip v-if="record.status === 3 && record.remark" :title="record.remark">
               <Badge v-bind="statusMap[record.status]" style="cursor: help" />
            </Tooltip>
            <Badge v-else-if="statusMap[record.status]" v-bind="statusMap[record.status]" />
            <span v-else>未知</span>
          </template>
          <template v-else-if="column.key === 'createTime'">
            {{ record.createTime ? new Date(record.createTime).toLocaleString('zh-CN', { hour12: false }) : '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <Space>
              <Button 
                v-if="record.status !== 1"
                type="link" 
                size="small" 
                @click="handleParse(record)"
              >
                {{ record.status === 2 ? '重新解析' : '解析' }}
              </Button>
              <Button 
                v-if="record.status === 2"
                type="link" 
                size="small" 
                @click="handleFragment(record)"
              >
                知识片段
              </Button>
              <Button type="link" size="small" @click="handleViewFile(record)">查看源文件</Button>
              <Popconfirm title="确定要删除这个文件吗？" @confirm="handleDeleteAttachment(record)">
                <Button type="link" danger size="small">删除</Button>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </div>

    <!-- Modals -->
    <Modal v-model:open="uploadModalVisible" title="上传文档" :width="600" :footer="null">
      <div class="mb-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-blue-800">解析策略设置</span>
          <Switch v-model:checked="autoParse" checked-children="自动解析" un-checked-children="仅上传" />
        </div>
        <p class="text-xs text-gray-500 leading-relaxed">
          <b>自动解析</b>：上传完成后立即开始文档切块并存入向量库，适用于需要立即检索的文件。<br/>
          <b>仅上传</b>：仅保存到云端存储，您可以稍后在列表中手动触发解析。
        </p>
      </div>

      <Upload.Dragger
        v-model:file-list="fileList"
        :before-upload="handleBeforeUpload"
        @remove="handleRemove"
        :show-upload-list="true"
        accept=".txt,.md,.pdf,.doc,.docx,.xlsx,.xls,.csv,.json,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.flac,.mp4,.avi,.mov,.mkv,.java,.html,.htm,.css,.js,.ts,.py,.cpp,.c,.h,.hpp,.sql,.php,.ruby,.swift,.rs,.perl,.shell,.bat,.cmd,.xml,.yaml,.yml,.properties,.ini,.log"
        multiple
        name="file"
      >
        <p class="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p class="ant-upload-text font-medium">点击或将文件拖拽到此区域上传</p>
        <p class="ant-upload-hint text-xs opacity-70 mt-1">
          支持 PDF、Word、Excel、TXT、Markdown、图片、音视频及代码文件
        </p>
      </Upload.Dragger>

      <div class="mt-6 flex justify-end gap-3">
        <Button @click="uploadModalVisible = false">取消</Button>
        <Button 
          type="primary" 
          :loading="uploading" 
          @click="handleManualUpload"
        >
          确定并保存
        </Button>
      </div>
    </Modal>

  <Modal v-model:open="fragmentVisible" title="知识分片列表" :width="1000" :footer="null" :destroyOnClose="true" @cancel="closeFragment">
    <Table :columns="fragmentColumns" :data-source="fragmentData" :loading="fragmentLoading" :pagination="{ pageSize: 10 }" size="middle" bordered row-key="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'idx'">
          {{ Number(record.idx) + 1 }}
        </template>
        <template v-else-if="column.key === 'content'">
          <div 
            class="cursor-pointer hover:text-blue-600 transition-colors py-1 group"
            @click="handleViewFragmentDetail(record)"
          >
            <div class="line-clamp-3 text-gray-800" style="white-space: pre-wrap; font-size: 13.5px; line-height: 1.6;">
              {{ record.content }}
            </div>
            <div class="text-xs text-blue-500 mt-1 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
              <span>共 {{ record.content?.length || 0 }} 字 · 点击查看完整文本</span>
            </div>
          </div>
        </template>
      </template>
    </Table>
  </Modal>

    <Modal 
      v-model:open="fileDetailVisible" 
      :width="isFullscreen ? '96vw' : 1150" 
      :style="isFullscreen ? { top: '15px', paddingBottom: 0 } : {}"
      :footer="null"
      :destroyOnClose="true"
    >
      <template #title>
        <div class="flex items-center justify-between pr-8">
          <span class="font-bold text-gray-800">文件在线预览与详情</span>
          <Button 
            type="link" 
            size="small" 
            @click="toggleFullscreen" 
            class="flex items-center gap-1 text-blue-600 font-medium"
          >
            <template #icon>
              <FullscreenExitOutlined v-if="isFullscreen" />
              <FullscreenOutlined v-else />
            </template>
            {{ isFullscreen ? '退出全屏' : '全屏放大预览' }}
          </Button>
        </div>
      </template>

      <div v-if="fileDetailLoading" class="flex justify-center p-12"><Spin size="large" tip="加载原文档与预览数据..." /></div>
      <div v-else-if="fileDetailData" class="space-y-4">
        <Descriptions :column="2" bordered size="small">
          <DescriptionsItem label="原始文件名">{{ fileDetailData.originalName }}</DescriptionsItem>
          <DescriptionsItem label="扩展名">{{ fileDetailData.fileSuffix }}</DescriptionsItem>
          <DescriptionsItem label="上传时间">{{ fileDetailData.createTime || '-' }}</DescriptionsItem>
          <DescriptionsItem label="上传人">{{ fileDetailData.createByName || '管理员' }}</DescriptionsItem>
        </Descriptions>
        
        <!-- 1. 图片预览 -->
        <div v-if="isImageFile(fileDetailData.fileSuffix)" class="mt-4 text-center p-4 bg-gray-50 rounded border">
          <Image :src="fileDetailData.url" :preview="true" :style="{ maxHeight: isFullscreen ? 'calc(100vh - 260px)' : '580px' }" />
        </div>

        <!-- 2. PDF 文件内嵌原生预览 -->
        <div v-else-if="isPdfFile(fileDetailData.fileSuffix)" class="mt-4 border rounded-lg overflow-hidden">
          <iframe :src="fileDetailData.url" class="w-full border-0" :style="{ height: isFullscreen ? 'calc(100vh - 260px)' : '620px' }" />
        </div>

        <!-- 3. Office 文档 (Word .docx / Excel .xlsx) / 文本高级双模式预览 -->
        <div v-else-if="isOfficeFile(fileDetailData.fileSuffix) || previewTextContent" class="mt-4 border rounded-lg p-4 bg-gray-50">
          <Tabs v-model:activeKey="activePreviewTab" type="card" size="small">
            
            <!-- Tab A: 原文档渲染 (Native Format Preview) -->
            <TabPane key="native" tab="原文档排版视图">
              
              <!-- Word .docx 渲染容器 -->
              <div v-if="(fileDetailData.fileSuffix || '').toLowerCase().endsWith('.docx')">
                <div v-if="isRenderingDocx" class="p-8 text-center"><Spin tip="正在解析并渲染 Word 排版..." /></div>
                <div 
                  ref="docxContainerRef" 
                  class="overflow-auto border rounded bg-slate-100 p-4 transition-all"
                  :style="{ maxHeight: isFullscreen ? 'calc(100vh - 280px)' : '620px' }"
                ></div>
              </div>

              <!-- Excel .xlsx 渲染容器 -->
              <div v-else-if="(fileDetailData.fileSuffix || '').toLowerCase().includes('xls')">
                <div v-if="isRenderingExcel" class="p-8 text-center"><Spin tip="正在渲染 Excel 电子表格..." /></div>
                <template v-else-if="excelHtmlContent">
                  <div v-if="sheetNames.length > 1" class="mb-3 flex items-center gap-2 flex-wrap border-b pb-2">
                    <span class="text-xs text-gray-500 font-medium">工作表（Sheet）：</span>
                    <Button
                      v-for="sName in sheetNames"
                      :key="sName"
                      size="small"
                      :type="currentSheet === sName ? 'primary' : 'default'"
                      @click="selectSheet(sName)"
                    >
                      {{ sName }}
                    </Button>
                  </div>
                  <div 
                    class="excel-table-container overflow-auto border rounded bg-white p-2 transition-all"
                    :style="{ maxHeight: isFullscreen ? 'calc(100vh - 290px)' : '600px' }"
                    v-html="excelHtmlContent"
                  ></div>
                </template>
                <div v-else class="p-4 text-gray-500 text-center">无法加载 Excel 表格内容</div>
              </div>

              <!-- 纯文本 / 代码预览 -->
              <div v-else class="overflow-auto" :style="{ maxHeight: isFullscreen ? 'calc(100vh - 280px)' : '600px' }">
                <pre class="text-sm text-gray-800 font-mono whitespace-pre-wrap leading-relaxed bg-white p-4 rounded border">{{ previewTextContent }}</pre>
              </div>

            </TabPane>

            <!-- Tab B: AI 提取切片 (RAG Chunks Preview & Online Editing) -->
            <TabPane key="fragment" tab="范本文本与 AI 切片 (可直接在线修改)">
              <div class="overflow-auto" :style="{ maxHeight: isFullscreen ? 'calc(100vh - 280px)' : '600px' }">
                <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center justify-between">
                  <span class="text-blue-600">✍️ 您可以在下方文本框中直接修改范本文字（修改后点击左下角保存并重新解析）：</span>
                  <span>共 {{ (previewTextContent || '').length }} 字符</span>
                </div>
                <Input.TextArea
                  v-model:value="previewTextContent"
                  :rows="16"
                  class="font-mono text-sm leading-relaxed p-3 border-blue-200 focus:border-blue-500"
                  placeholder="请输入或修改范本中的文本内容..."
                />
              </div>
            </TabPane>

          </Tabs>
        </div>

        <!-- 4. 通用下载访问链接 -->
        <div v-else class="mt-4 p-4 text-center bg-gray-50 rounded border text-gray-500">
          <p class="mb-2">二进制源文件已保存在本地 MinIO 存储桶</p>
          <a :href="fileDetailData.url" target="_blank" class="text-blue-600 underline text-sm break-all">{{ fileDetailData.url }}</a>
        </div>

        <div class="flex items-center justify-between pt-4 border-t">
          <Button
            type="primary"
            ghost
            :loading="savingFragment"
            @click="handleSaveAndReparse"
          >
            <template #icon><SaveOutlined /></template>
            保存当前修改并重新解析 (自动覆盖旧切片)
          </Button>

          <div class="flex items-center gap-3">
            <Button @click="closeFileDetail">关闭</Button>
            <Button
              v-if="fileDetailData?.ossId"
              type="primary"
              @click="handleDownloadFile(fileDetailData.ossId, fileDetailData.originalName)"
            >
              <template #icon><DownloadOutlined /></template>
              下载原文件
            </Button>
          </div>
        </div>
      </div>
    </Modal>
    
    <!-- 详情抽屉 -->
    <Drawer
      v-model:open="fragmentDetailVisible"
      title="知识片段详情"
      placement="right"
      :width="600"
    >
      <div v-if="currentFragment" class="flex flex-col h-full">
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-100 relative group">
          <div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button type="link" size="small" @click="handleCopy(currentFragment.content)">
               <template #icon><CopyOutlined /></template>
               复制
             </Button>
          </div>
          <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.8; color: #333;">
            {{ currentFragment.content }}
          </div>
        </div>

        <Descriptions title="元数据信息" :column="1" size="small" bordered>
          <DescriptionsItem label="片段 ID">{{ currentFragment.id }}</DescriptionsItem>
          <DescriptionsItem label="所属文档 ID">{{ currentFragment.docId }}</DescriptionsItem>
          <DescriptionsItem label="字符数量">{{ currentFragment.content?.length || 0 }} 字</DescriptionsItem>
          <DescriptionsItem v-if="currentSourceName" label="来源文件">{{ currentSourceName }}</DescriptionsItem>
        </Descriptions>
        
        <div class="mt-auto pt-6 flex justify-end">
          <Button @click="fragmentDetailVisible = false">关闭</Button>
        </div>
      </div>
    </Drawer>
  </div>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.excel-table-container table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  background-color: #fff;
}
:deep(.excel-table-container th) {
  position: sticky;
  top: 0;
  background-color: #f1f5f9;
  z-index: 5;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  padding: 8px 12px;
  text-align: left;
  white-space: nowrap;
}
:deep(.excel-table-container td) {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
  white-space: nowrap;
}
:deep(.excel-table-container tr:nth-child(even)) {
  background-color: #f8fafc;
}
:deep(.excel-table-container tr:hover) {
  background-color: #e2e8f0;
}
:deep(.docx-view-wrap) {
  background: #f1f5f9;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 6px;
}
:deep(.docx-view-wrap > section.docx) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px !important;
  background: #ffffff !important;
  max-width: 100% !important;
  border-radius: 4px;
}
</style>
