import { DocumentTemplate, TemplateOption } from '@/app/types';

/**
 * 预设文档模板集合
 */
export const presetTemplates: DocumentTemplate[] = [
  {
    id: 'academic-paper',
    name: '学术论文',
    description: '适用于学术论文：标题黑体4号居中，正文宋体5号两端对齐，作者宋体小四居中',
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    titleStyle: {
      fontName: '黑体',
      fontSize: '4号',
      isBold: true,
      alignment: 'center',
      color: '#000000'
    },
    authorStyle: {
      fontName: '宋体',
      fontSize: '小四',
      alignment: 'center',
      color: '#000000'
    },
    bodyStyle: {
      fontName: '宋体',
      fontSize: '5号',
      alignment: 'justify',
      color: '#000000'
    }
  },
  {
    id: 'official-document',
    name: '公文格式',
    description: '适用于公文：标题宋体二号加粗居中，正文仿宋三号，作者宋体四号右对齐',
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    titleStyle: {
      fontName: '宋体',
      fontSize: '二号',
      isBold: true,
      alignment: 'center',
      color: '#000000'
    },
    authorStyle: {
      fontName: '宋体',
      fontSize: '四号',
      alignment: 'right',
      color: '#000000'
    },
    bodyStyle: {
      fontName: '仿宋',
      fontSize: '三号',
      alignment: 'justify',
      color: '#000000'
    }
  },
  {
    id: 'business-report',
    name: '商务报告',
    description: '适用于商务报告：标题微软雅黑三号加粗，正文微软雅黑小四，作者微软雅黑五号',
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    titleStyle: {
      fontName: '微软雅黑',
      fontSize: '三号',
      isBold: true,
      alignment: 'center',
      color: '#000000'
    },
    authorStyle: {
      fontName: '微软雅黑',
      fontSize: '五号',
      alignment: 'center',
      color: '#000000'
    },
    bodyStyle: {
      fontName: '微软雅黑',
      fontSize: '小四',
      alignment: 'justify',
      color: '#000000'
    }
  },
  {
    id: 'simple-document',
    name: '简洁文档',
    description: '适用于一般文档：标题宋体小二加粗居中，正文宋体小四，作者宋体五号',
    isPreset: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    titleStyle: {
      fontName: '宋体',
      fontSize: '小二',
      isBold: true,
      alignment: 'center',
      color: '#000000'
    },
    authorStyle: {
      fontName: '宋体',
      fontSize: '五号',
      alignment: 'center',
      color: '#000000'
    },
    bodyStyle: {
      fontName: '宋体',
      fontSize: '小四',
      alignment: 'justify',
      color: '#000000'
    }
  }
];

/**
 * 将预设模板转换为选择选项
 */
export const templateOptions: TemplateOption[] = presetTemplates.map(template => ({
  value: template.id,
  label: template.name,
  description: template.description,
  template
}));

/**
 * 根据ID获取模板
 */
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return presetTemplates.find(template => template.id === id);
}

/**
 * 获取默认模板（学术论文模板）
 */
export function getDefaultTemplate(): DocumentTemplate {
  return presetTemplates[0]; // 学术论文模板作为默认
} 