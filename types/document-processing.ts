/**
 * 文档处理相关类型定义
 */

// 字体信息接口
export interface FontInfo {
  name?: string;
  size?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  color?: string;
  alignment?: string;
  originalStyleKey?: string; // 用于在前端与后端之间传递样式的唯一标识
}

// 文本运行信息接口，扩展自FontInfo，添加文本内容
export interface TextRunInfo extends FontInfo {
  text: string;  // 文本运行的内容
}

// 段落信息接口，包含段落文本和所有文本运行
export interface ParagraphInfo {
  text: string;  // 整个段落的文本
  textRuns: TextRunInfo[];  // 段落中的所有文本运行
  alignment?: string;  // 段落的对齐方式
  originalStyleKey?: string;  // 原始样式标识
}

// 深度字体分析结果
export interface DeepFontAnalysisResult {
  fonts: Map<string, { count: number, samples: string[] }>;
  paragraphFonts: Map<number, FontInfo[]>;
  defaultFonts: {
    eastAsia: string;
    ascii: string;
    hAnsi: string;
    cs: string;
  };
  styles: unknown[];
}

// 文档分析结果
export interface DocxAnalysisResult {
  title?: {
    text: string;
    exists: boolean;
    styles: FontInfo[];
  };
  author?: {
    text: string;
    exists: boolean;
    styles: FontInfo[];
  };
  bodyText?: string;
  bodyStyles: FontInfo[];
  paragraphs: {
    text: string;
    index: number;
    isTitle?: boolean;
    isAuthor?: boolean;
    styles?: FontInfo[];
  }[];
  wordCount?: number;
  images?: {
    name: string;
    base64Data?: string;
    paragraphIndex?: number;
  }[];
  deepFontAnalysis?: DeepFontAnalysisResult;
}

// 字体修改选项
export interface FontModificationOptions {
  targetFontName?: string;
  targetFontSize?: number;
  targetIsBold?: boolean;
  targetIsItalic?: boolean;
  targetIsUnderline?: boolean;
  targetColor?: string;
  targetAlignment?: 'left' | 'center' | 'right' | 'justify';
  addPrefix?: string;
  addSuffix?: string;
  modificationRules?: {
    originalStyleKey: string;
    targetFontName?: string;
    targetFontSize?: number;
    targetIsBold?: boolean;
    targetIsItalic?: boolean;
    targetIsUnderline?: boolean;
    targetColor?: string;
    targetAlignment?: 'left' | 'center' | 'right' | 'justify';
  }[];
}

// 图片提取结果 - 增强版
export interface ExtractedImage {
  name: string;
  mimeType: string;
  size: number;
  paragraphIndex?: number;
  relationshipId?: string;
  runIndex?: number; // 在段落中的run索引
  xmlPosition?: number; // 在XML中的位置
  base64Data: string;
}

// 图片关系信息
export interface ImageRelationshipInfo {
  relationshipId: string;
  imageName: string;
  target: string;
  type: string;
}

// 段落图片信息
export interface ParagraphImageInfo {
  paragraphIndex: number;
  images: {
    relationshipId: string;
    runIndex: number;
    xmlPosition: number;
  }[];
  textContent: string; // 段落的文本内容（用于调试）
}

// 图片提取状态 - 增强版
export interface ImageExtractionState {
  isExtracting: boolean;
  images: ExtractedImage[];
  totalCount: number;
  totalSize: number;
  relationshipDetails?: ImageRelationshipInfo[]; // 详细的关系信息
  paragraphImages?: ParagraphImageInfo[]; // 段落级图片映射
  statistics?: {
    totalParagraphs: number;
    paragraphsWithImages: number;
    totalImageReferences: number;
    matchedImages: number;
    unlocatedImages: number;
  };
} 