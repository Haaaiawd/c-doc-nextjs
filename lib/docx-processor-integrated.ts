/**
 * 集成版DocxProcessor - 重构后的版本
 * 现在主要作为DocumentAnalyzer和DocumentModifier的门面接口
 */
import { DocumentAnalyzer } from './document/DocumentAnalyzer';
import { DocumentModifier } from './document/DocumentModifier';
import { 
  DocxAnalysisResult,
  FontModificationOptions 
} from '@/types/document-processing';

export default class DocxProcessor {
  private documentAnalyzer: DocumentAnalyzer;
  private documentModifier: DocumentModifier;

  constructor() {
    this.documentAnalyzer = new DocumentAnalyzer();
    this.documentModifier = new DocumentModifier();
  }

  /**
   * 解析 docx 文件的 Buffer，提取标题、作者、正文和字体信息
   */  
  async analyzeDocument(inputBuffer: Buffer, useDeepDetection: boolean = true): Promise<DocxAnalysisResult> {
    return this.documentAnalyzer.analyzeDocument(inputBuffer, useDeepDetection);
  }

  /**
   * 获取文档的所有字体信息 (从 Buffer)
   */
  async getFontUsage(inputBuffer: Buffer): Promise<Map<string, { count: number, samples: string[] }>> {
    return this.documentAnalyzer.getFontUsage(inputBuffer);
  }

  /**
   * 修改文档字体和样式 (基于Buffer)
   * @returns {Promise<Buffer>} 返回包含新文档内容的Buffer
   */
  async modifyFonts(
    inputBuffer: Buffer, 
    titleOptions?: FontModificationOptions,
    bodyOptions?: FontModificationOptions,
    authorOptions?: FontModificationOptions
  ): Promise<Buffer> {
    return this.documentModifier.modifyFonts(
      inputBuffer, 
      titleOptions, 
      bodyOptions, 
      authorOptions
    );
  }
  
  /**
   * 修改文档中的对齐方式 (基于Buffer)
   */
  async modifyAlignment(
    inputBuffer: Buffer,
    titleAlignment?: 'left' | 'center' | 'right',
    authorAlignment?: 'left' | 'center' | 'right',
    bodyAlignment?: 'left' | 'center' | 'right' | 'justify'
  ): Promise<Buffer> {
    return this.documentModifier.modifyAlignment(
      inputBuffer,
      titleAlignment,
      authorAlignment,
      bodyAlignment
    );
  }

  /**
   * 为标题添加前缀或后缀 (基于Buffer)
   */
  async modifyTitle(
    inputBuffer: Buffer, 
    prefix?: string,
    suffix?: string
  ): Promise<Buffer> {
    return this.documentModifier.modifyTitle(inputBuffer, prefix, suffix);
  }
} 