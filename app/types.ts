/**
 * 表示字体信息
 */
export interface FontInfo {
  name?: string;      // 例如 'Arial', 'Times New Roman'
  size?: number;      // 例如 12 (pt)
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  color?: string;     // 例如 '#000000'
  alignment?: string; // 例如 'left', 'center', 'right', 'justify'
  originalStyleKey?: string; // 用于唯一标识原始样式组合
}

/**
 * 表示文档中一个有结构的部分，如标题或作者信息
 */
export interface DocumentPart {
  text: string;
  exists: boolean;
  font?: FontInfo; // 原始字体信息
}

/**
 * 表示对字体进行的修改请求
 */
export interface FontModification {
  targetFontName?: string;
  targetFontSize?: number; // 可以是绝对大小，或相对于当前大小的调整值
  // 可以根据需要添加其他样式修改，如 targetIsBold, targetColor 等
}

/**
 * 核心数据模型：表示一个被处理的文档及其相关信息
 */
export interface ProcessedDocument {
  id: string; // 唯一标识符，可以使用 uuid
  originalFileName: string; // 原始文件名
  targetFileName?: string; // 用户期望修改成的新文件名（基于标题/作者等）
  fileType: string; // 文件MIME类型, 主要关注 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  fileSize: number; // 文件大小（字节）
  uploadDate: string; // ISO 8601 格式的日期字符串
  blobUrl?: string; // Vercel Blob 存储的URL
  pathname?: string; // Blob 存储路径
  uploadedAt?: string; // 上传时间戳

  status: 'selected' | 'pending' | 'uploading' | 'uploaded' | 'uploaded_to_server' | 'converting_doc_to_docx' | 'analyzing' | 'processing' | 'completed' | 'failed' | 'cancelled';

  // 提取的元数据和内容 (主要针对 .docx)
  title?: DocumentPart;
  author?: DocumentPart;
  bodyText?: string; // 提取的正文纯文本
  // bodyFontInfo?: FontInfo; // 详细的正文字体信息可能比较复杂，后续迭代

  extractedImages?: Array<{
    name: string; // 图片在文档中的原始名称或生成的名称
    url?: string; // 如果图片被保存并可通过URL访问
    base64Data?: string; // 图片的Base64编码（用于前端显示或下载）
  }>;
  headings?: Array<{ // 提取的各级标题
    level: number;
    text: string;
    font?: FontInfo;
  }>;
  wordCount?: number;

  // 用户请求的修改参数 (针对 .docx)
  titleModification?: FontModification;
  bodyModification?: FontModification;
  // 处理结果
  processedFileUrl?: string; // 处理后（例如修改了字体）的文件的下载链接
  processedFileName?: string; // 处理后的文件名（基于文件名模板生成）
  previewHtml?: string; // (可选) 文档内容的HTML预览，用于前端展示 (mammoth.js 对 .docx 效果好)
  errorMessage?: string; // 如果处理失败，记录错误信息
}

/**
 * 表示文档分析结果的数据结构
 */
export interface DocumentAnalysisData {
  fileId: string;
  title?: {
    text: string;
    styles: FontInfo[]; // 一个标题部分可能包含多种样式
  };
  author?: {
    text: string;
    styles: FontInfo[]; // 一个作者部分可能包含多种样式
  };
  bodyStyles?: FontInfo[]; // 正文可能包含多种样式
  wordCount?: number;
}

/**
 * 表示文档处理状态的联合类型
 */
export type DocumentStatus = ProcessedDocument['status'];

/**
 * 表示一个待上传或刚上传的文件对象，处理前
 */
export interface UploadedFile {
  id: string;
  file: File; // 浏览器 File 对象
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress?: number; // 上传进度 0-100
  errorMessage?: string;
}

/**
 * 模板样式配置
 */
export interface TemplateStyle {
  fontName: string;
  fontSize: string; // 支持如"小四"、"14pt"等格式
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  color?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

/**
 * 文档模板定义
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  isPreset: boolean; // 是否为预设模板
  createdAt: string;
  updatedAt: string;
  
  // 各部分样式配置
  titleStyle: TemplateStyle;
  authorStyle: TemplateStyle;
  bodyStyle: TemplateStyle;
  
  // 可选的额外配置
  titlePrefix?: string;
  titleSuffix?: string;
  authorPrefix?: string;
  authorSuffix?: string;
}

/**
 * 预设模板类型
 */
export type PresetTemplateType = 'academic' | 'official' | 'report' | 'custom';

/**
 * 模板选择选项
 */
export interface TemplateOption {
  value: string;
  label: string;
  description: string;
  template: DocumentTemplate;
}

/**
 * Represents the metadata for a file stored in Vercel Blob and tracked in Vercel KV.
 * This is the primary data model for the new serverless architecture.
 */
export interface FileMetadata {
  id: string;
  originalName: string;
  blobUrl: string;
  pathname: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  uploadedAt: string;
  processedBlobUrl: string | null;
  extractedImages: { name: string; url: string; }[] | null;
}
