import type { PageQuery, BaseEntity } from '#/api/common';

export interface InfoVO {
  /**
   * 主键
   */
  id: string | number;

  /**
   * 用户ID
   */
  userId: string | number;

  /**
   * 知识库名称
   */
  name: string;

  /**
   * 是否公开知识库（0 仅自己 1对内 2对外）
   */
  share: number;

  /**
   * 作用域级别（1 集团 2 机构 3 部门 4 个人）
   */
  scopeLevel?: number;

  /**
   * 绑定部门范围
   */
  deptScope?: string | string[];

  /**
   * 相似度阈值
   */
  similarityThreshold?: number;

  /**
   * 知识库描述
   */
  description: string;

  /**
   * 知识分隔符
   */
  separator: string;

  /**
   * 重叠字符数
   */
  overlapChar: number;

  /**
   * 知识库中检索的条数
   */
  retrieveLimit: number;

  /**
   * 文本块大小
   */
  textBlockSize: number;

  /**
   * 向量库
   */
  vectorModel: string;

  /**
   * 向量模型
   */
  embeddingModel: string;

  /**
   * 是否启用重排序（0 否 1是）
   */
  enableRerank: number;

  /**
   * 重排序模型名称
   */
  rerankModel: string;

  /**
   * 重排序后返回数量
   */
  rerankTopN: number;

  /**
   * 重排序分数阈值（0-1）
   */
  rerankScoreThreshold: number;

  /**
   * 是否启用混合检索（0 否 1 是）
   */
  enableHybrid: number;

  /**
   * 混合检索权重比例 (0.0-1.0)
   */
  hybridAlpha: number;

  /**
   * 备注
   */
  remark: string;
}

export interface InfoForm extends BaseEntity {
  /**
   * 主键
   */
  id?: string | number;

  /**
   * 用户ID
   */
  userId?: string | number;

  /**
   * 知识库名称
   */
  name?: string;

  /**
   * 是否公开知识库（0 否 1是）
   */
  share?: number;

  /**
   * 作用域级别（1 集团 2 机构 3 部门 4 个人）
   */
  scopeLevel?: number;

  /**
   * 绑定部门范围
   */
  deptScope?: string | string[];

  /**
   * 相似度阈值
   */
  similarityThreshold?: number;

  /**
   * 知识库描述
   */
  description?: string;

  /**
   * 知识分隔符
   */
  separator?: string;

  /**
   * 重叠字符数
   */
  overlapChar?: number;

  /**
   * 知识库中检索的条数
   */
  retrieveLimit?: number;

  /**
   * 文本块大小
   */
  textBlockSize?: number;

  /**
   * 向量库
   */
  vectorModel?: string;

  /**
   * 向量模型
   */
  embeddingModel?: string;

  /**
   * 是否启用重排序（0 否 1是）
   */
  enableRerank?: number;

  /**
   * 重排序模型名称
   */
  rerankModel?: string;

  /**
   * 重排序后返回数量
   */
  rerankTopN?: number;

  /**
   * 重排序分数阈值（0-1）
   */
  rerankScoreThreshold?: number;

  /**
   * 是否启用混合检索（0 否 1 是）
   */
  enableHybrid?: number;

  /**
   * 混合检索权重比例 (0.0-1.0)
   */
  hybridAlpha?: number;

  /**
   * 备注
   */
  remark?: string;
}

export interface InfoQuery extends PageQuery {
  /**
   * 用户ID
   */
  userId?: string | number;

  /**
   * 知识库名称
   */
  name?: string;

  /**
   * 是否公开知识库（0 否 1是）
   */
  share?: number;

  /**
   * 知识库描述
   */
  description?: string;

  /**
   * 知识分隔符
   */
  separator?: string;

  /**
   * 重叠字符数
   */
  overlapChar?: number;

  /**
   * 知识库中检索的条数
   */
  retrieveLimit?: number;

  /**
   * 文本块大小
   */
  textBlockSize?: number;

  /**
   * 向量库
   */
  vectorModel?: string;

  /**
   * 向量模型
   */
  embeddingModel?: string;

  /**
    * 日期范围参数
    */
  params?: any;
}
