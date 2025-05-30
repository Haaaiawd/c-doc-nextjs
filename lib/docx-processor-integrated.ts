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
   * 解析 docx 文件，提取标题、作者、正文和字体信息
   * 同时使用深度字体检测器提取更准确的字体信息
   */  
  async analyzeDocument(filePath: string, useDeepDetection: boolean = true): Promise<DocxAnalysisResult> {
    return this.documentAnalyzer.analyzeDocument(filePath, useDeepDetection);
  }

  /**
   * 获取文档的所有字体信息 (使用深度检测)
   * 返回文档中所有使用的字体及其使用情况
   */
  async getFontUsage(filePath: string): Promise<Map<string, { count: number, samples: string[] }>> {
    return this.documentAnalyzer.getFontUsage(filePath);
  }

  /**
   * 修改文档字体和样式
   * 创建一个新的 docx 文档，应用用户指定的字体和样式，同时保留原有图片
   */
  async modifyFonts(
    inputPath: string, 
    outputPath: string, 
    titleOptions?: FontModificationOptions,
    bodyOptions?: FontModificationOptions,
    authorOptions?: FontModificationOptions
  ): Promise<string> {
    return this.documentModifier.modifyFonts(
      inputPath, 
      outputPath, 
      titleOptions, 
      bodyOptions, 
      authorOptions
    );
  }
  
  /**
   * 修改文档中的对齐方式
   */
  async modifyAlignment(
    inputPath: string, 
    outputPath: string, 
    titleAlignment?: 'left' | 'center' | 'right',
    authorAlignment?: 'left' | 'center' | 'right',
    bodyAlignment?: 'left' | 'center' | 'right' | 'justify'
  ): Promise<string> {
    return this.documentModifier.modifyAlignment(
      inputPath,
      outputPath,
      titleAlignment,
      authorAlignment,
      bodyAlignment
    );
  }

  /**
   * 为标题添加前缀或后缀
   */
  async modifyTitle(
    inputPath: string, 
    outputPath: string, 
    prefix?: string,
    suffix?: string
  ): Promise<string> {
    return this.documentModifier.modifyTitle(inputPath, outputPath, prefix, suffix);
  }
} 