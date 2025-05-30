import { DocumentTemplate } from '@/app/types';

/**
 * 预设的文档模板
 */

// 1. 黑体模板
const defaultTemplate: DocumentTemplate = {
  id: 'default-format',
  name: '黑体模板',
  description: '使用黑体的格式',
  isPreset: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  titleStyle: {
    fontName: '黑体',
    fontSize: '16pt',
    isBold: true,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    alignment: 'center',
  },
  authorStyle: {
    fontName: '宋体',
    fontSize: '14pt',
    isBold: true,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    alignment: 'center',
  },
  bodyStyle: {
    fontName: '宋体',
    fontSize: '12pt',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    alignment: 'left',
  },
};

// 2. 公文标准格式模板
const chineseStandardTemplate: DocumentTemplate = {
  id: 'chinese-standard',
  name: '公文标准格式模板',
  description: '符合公文文档标准的格式模板',
  isPreset: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  titleStyle: {
    fontName: '方正小标宋简体',
    fontSize: '小二',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    alignment: 'center',
  },
  authorStyle: {
    fontName: '仿宋_GB2312',
    fontSize: '小三',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    alignment: 'center',
  },
  bodyStyle: {
    fontName: '仿宋_GB2312',
    fontSize: '小三',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: '#000000',
    alignment: 'left',
  },
};

/**
 * 所有预设模板的数组
 */
export const presetTemplates: DocumentTemplate[] = [
  defaultTemplate,
  chineseStandardTemplate,
];

/**
 * 用于模板选择器的选项格式
 */
export const templateOptions = presetTemplates.map(template => ({
  value: template.id,
  label: template.name,
  description: template.description,
  template: template
}));

/**
 * 获取默认模板
 */
export function getDefaultTemplate(): DocumentTemplate {
  return defaultTemplate;
}

/**
 * 根据ID查找模板
 */
export function getTemplateById(id: string): DocumentTemplate | undefined {
  return presetTemplates.find(template => template.id === id);
} 