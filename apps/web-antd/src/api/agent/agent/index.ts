import type { AgentVO, SkillOption } from './model';

import type { ID, IDS, PageQuery, PageResult } from '#/api/common';

import { commonExport } from '#/api/helper';
import { requestClient } from '#/api/request';

enum Api {
  root = '/agent/agent',
  list = '/agent/agent/list',
  agentOptions = '/agent/agent/agentOptions',
  skillOptions = '/agent/agent/skillOptions',
  modelOptions = '/system/model/list',
  mcpToolOptions = '/mcp/tool/all',
  knowledgeOptions = '/system/info/list',
}

/**
 * 过滤并确保 knowledgeIds 仅包含数字类型 ID，防御字符串类型节点分类 key 导致后端 Jackson 解析 500
 */
function cleanAgentData(data: Partial<AgentVO>) {
  const reqData = { ...data };
  if (Array.isArray(reqData.knowledgeIds)) {
    reqData.knowledgeIds = reqData.knowledgeIds
      .filter(
        (id: any) =>
          typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id)),
      )
      .map((id: any) => (typeof id === 'string' ? Number.parseInt(id, 10) : id));
  }
  return reqData;
}

/**
 * 智能体分页列表
 */
export function agentList(params?: PageQuery) {
  return requestClient.get<PageResult<AgentVO>>(Api.list, { params });
}

/**
 * 智能体详情
 */
export async function agentInfo(id: ID) {
  const res = await requestClient.get<AgentVO>(`${Api.root}/${id}`);
  if (res && res.knowledgeIds) {
    if (typeof res.knowledgeIds === 'string') {
      res.knowledgeIds = (res.knowledgeIds as string)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s))
        .map((s) => Number.parseInt(s, 10)) as any;
    }
  }
  return res;
}

/**
 * 新增智能体
 */
export function agentAdd(data: Partial<AgentVO>) {
  return requestClient.postWithMsg<void>(Api.root, cleanAgentData(data));
}

export function agentAddSilent(data: Partial<AgentVO>) {
  return requestClient.post<void>(Api.root, cleanAgentData(data));
}

/**
 * 修改智能体
 */
export function agentUpdate(data: Partial<AgentVO>) {
  return requestClient.putWithMsg<void>(Api.root, cleanAgentData(data));
}

export function agentUpdateSilent(data: Partial<AgentVO>) {
  return requestClient.put<void>(Api.root, cleanAgentData(data));
}

/**
 * 删除智能体
 */
export function agentRemove(ids: IDS) {
  return requestClient.deleteWithMsg<void>(`${Api.root}/${ids}`);
}

/**
 * 导出智能体
 */
export function agentExport(data: Partial<AgentVO>) {
  return commonExport(`${Api.root}/export`, data);
}

/**
 * 启用的智能体下拉选项（用户端聊天页用）
 */
export function agentEnabledOptions() {
  return requestClient.get<AgentVO[]>(Api.agentOptions);
}

/**
 * 磁盘 Skills 选项（表单勾选用）
 */
export function agentSkillOptions() {
  return requestClient.get<SkillOption[]>(Api.skillOptions);
}

/**
 * 聊天模型选项（category=chat）
 */
export function agentModelOptions() {
  return requestClient.get<{ rows: AgentVO[]; total: number }>(
    Api.modelOptions,
    { params: { category: 'chat', pageNum: 1, pageSize: 1000 } },
  );
}

/**
 * MCP 工具选项
 */
export async function agentMcpToolOptions() {
  try {
    const res = await requestClient.get<any>(Api.mcpToolOptions);
    return res?.data ? res : { data: Array.isArray(res) ? res : [] };
  } catch (e) {
    console.error('获取 MCP 工具列表失败:', e);
    return { data: [] };
  }
}

/**
 * 知识库选项 (集团-机构-部门-个人 4 层极简结构，支持分类一键批量全选)
 */
export async function agentKnowledgeTreeOptions() {
  try {
    const res = await requestClient.get<any>(
      Api.knowledgeOptions,
      { params: { pageNum: 1, pageSize: 1000 } },
    );

    const rows = Array.isArray(res) ? res : (res?.rows || res?.data || []);

    const groupList: any[] = [];      // 1. 集团级
    const instList: any[] = [];       // 2. 机构级
    const deptList: any[] = [];       // 3. 部门级
    const personList: any[] = [];     // 4. 个人级

    if (Array.isArray(rows)) {
      rows.forEach((item: any) => {
        const level = item.scopeLevel || 1;
        const ownerStr = item.createByName ? ` (${item.createByName})` : '';

        const node = {
          title: `${item.name}${ownerStr}`,
          label: `${item.name}${ownerStr}`,
          value: String(item.id),
          key: String(item.id),
        };

        const name = item.name || '';

        if (level === 1) {
          groupList.push(node);
        } else if (level === 2) {
          // 区分“机构级”与“部门级”：包含分公司/机构关键字划为机构级，否则划为部门级
          if (/分公司|公司|机构|分院|总院/.test(name)) {
            instList.push(node);
          } else {
            deptList.push(node);
          }
        } else if (level === 3) {
          deptList.push(node);
        } else if (level === 4) {
          personList.push(node);
        }
      });
    }

    const treeData = [];

    // 1. 集团级
    if (groupList.length > 0) {
      treeData.push({
        title: `全集团共享知识库 (共 ${groupList.length} 个)`,
        label: `全集团共享知识库 (共 ${groupList.length} 个)`,
        value: 'cat_group',
        key: 'cat_group',
        children: groupList,
      });
    }

    // 2. 机构级
    if (instList.length > 0) {
      treeData.push({
        title: `分支机构级知识库 (共 ${instList.length} 个)`,
        label: `分支机构级知识库 (共 ${instList.length} 个)`,
        value: 'cat_inst',
        key: 'cat_inst',
        children: instList,
      });
    }

    // 3. 部门级
    if (deptList.length > 0) {
      treeData.push({
        title: `部门级知识库 (共 ${deptList.length} 个)`,
        label: `部门级知识库 (共 ${deptList.length} 个)`,
        value: 'cat_dept',
        key: 'cat_dept',
        children: deptList,
      });
    }

    // 4. 个人级
    if (personList.length > 0) {
      treeData.push({
        title: `个人私有知识库 (共 ${personList.length} 个)`,
        label: `个人私有知识库 (共 ${personList.length} 个)`,
        value: 'cat_person',
        key: 'cat_person',
        children: personList,
      });
    }

    return treeData;
  } catch (e) {
    console.error('获取知识库选项失败:', e);
    return [];
  }
}


