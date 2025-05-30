/**
 * Doc到Docx转换器
 * 使用word-extractor提取.doc文件内容，然后生成.docx文件
 */
import WordExtractor from 'word-extractor';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface DocExtractionResult {
  bodyText: string;
  headerText?: string;
  footerText?: string;
  footnotes?: string;
  endnotes?: string;
}

export interface ConversionOptions {
  preserveFormatting?: boolean;
  splitParagraphs?: boolean;
  outputPath?: string;
}

export class DocConverter {
  private extractor: WordExtractor;

  constructor() {
    this.extractor = new WordExtractor();
  }

  /**
   * 转换.doc文件为.docx
   * @param inputPath .doc文件路径
   * @param outputPath 输出.docx文件路径（可选）
   * @param options 转换选项
   * @returns 转换后的文件路径
   */
  async convertDocToDocx(
    inputPath: string, 
    outputPath?: string, 
    options: ConversionOptions = {}
  ): Promise<string> {
    try {
      console.log('开始转换.doc文件:', inputPath);

      // 1. 提取.doc文件内容
      const extracted = await this.extractDocContent(inputPath);
      
      // 2. 生成输出路径
      const finalOutputPath = outputPath || this.generateOutputPath(inputPath);
      
      // 3. 创建.docx文档
      const docxBuffer = await this.createDocxFromExtracted(extracted, options);
      
      // 4. 保存文件
      await fs.writeFile(finalOutputPath, docxBuffer);
      
      console.log('转换完成:', finalOutputPath);
      return finalOutputPath;
    } catch (error) {
      console.error('转换文档时出错:', error);
      throw new Error(`Doc转换失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从buffer转换.doc为.docx buffer
   * @param docBuffer .doc文件的buffer
   * @param options 转换选项
   * @returns .docx文件的buffer
   */
  async convertDocBufferToDocxBuffer(
    docBuffer: Buffer, 
    options: ConversionOptions = {}
  ): Promise<Buffer> {
    try {
      console.log('开始从buffer转换.doc文件');

      // 1. 提取.doc文件内容
      const extracted = await this.extractDocContentFromBuffer(docBuffer);
      
      // 2. 创建.docx文档
      const docxBuffer = await this.createDocxFromExtracted(extracted, options);
      
      console.log('Buffer转换完成');
      return docxBuffer;
    } catch (error) {
      console.error('转换文档buffer时出错:', error);
      throw new Error(`Doc Buffer转换失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 提取.doc文件内容
   */
  private async extractDocContent(filePath: string): Promise<DocExtractionResult> {
    try {
      const extracted = await this.extractor.extract(filePath);
      
      return {
        bodyText: extracted.getBody(),
        headerText: extracted.getHeaders({ includeFooters: false }),
        footerText: extracted.getFooters ? extracted.getFooters() : undefined,
        footnotes: extracted.getFootnotes(),
        endnotes: extracted.getEndnotes(),
      };
    } catch (error) {
      console.error('提取.doc内容时出错:', error);
      throw new Error(`内容提取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从buffer提取.doc文件内容
   */
  private async extractDocContentFromBuffer(buffer: Buffer): Promise<DocExtractionResult> {
    try {
      const extracted = await this.extractor.extract(buffer);
      
      return {
        bodyText: extracted.getBody(),
        headerText: extracted.getHeaders({ includeFooters: false }),
        footerText: extracted.getFooters ? extracted.getFooters() : undefined,
        footnotes: extracted.getFootnotes(),
        endnotes: extracted.getEndnotes(),
      };
    } catch (error) {
      console.error('从buffer提取.doc内容时出错:', error);
      throw new Error(`Buffer内容提取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 根据提取的内容创建.docx文档
   */
  private async createDocxFromExtracted(
    extracted: DocExtractionResult, 
    options: ConversionOptions
  ): Promise<Buffer> {
    try {
      const paragraphs: Paragraph[] = [];

      // 处理正文内容
      if (extracted.bodyText) {
        const bodyParagraphs = this.createParagraphsFromText(extracted.bodyText, options);
        paragraphs.push(...bodyParagraphs);
      }

      // 处理脚注（如果存在）
      if (extracted.footnotes && extracted.footnotes.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '\n--- 脚注 ---',
                bold: true,
              }),
            ],
          })
        );
        
        const footnoteParagraphs = this.createParagraphsFromText(extracted.footnotes, options);
        paragraphs.push(...footnoteParagraphs);
      }

      // 处理尾注（如果存在）
      if (extracted.endnotes && extracted.endnotes.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '\n--- 尾注 ---',
                bold: true,
              }),
            ],
          })
        );
        
        const endnoteParagraphs = this.createParagraphsFromText(extracted.endnotes, options);
        paragraphs.push(...endnoteParagraphs);
      }

      // 创建文档
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      // 生成buffer
      return await Packer.toBuffer(doc);
    } catch (error) {
      console.error('创建docx文档时出错:', error);
      throw new Error(`文档创建失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从文本创建段落
   */
  private createParagraphsFromText(text: string, options: ConversionOptions): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    // 根据选项决定是否分割段落
    const shouldSplit = options.splitParagraphs !== false; // 默认为true
    
    if (shouldSplit) {
      // 按双换行符分割段落
      const paragraphTexts = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      for (const paragraphText of paragraphTexts) {
        // 清理段落文本，保留单个换行符
        const cleanedText = paragraphText.replace(/\n+/g, '\n').trim();
        
        if (cleanedText) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: cleanedText,
                }),
              ],
            })
          );
        }
      }
    } else {
      // 不分割，作为一个大段落
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: text.trim(),
            }),
          ],
        })
      );
    }

    return paragraphs;
  }

  /**
   * 生成输出文件路径
   */
  private generateOutputPath(inputPath: string): string {
    const parsedPath = path.parse(inputPath);
    return path.join(parsedPath.dir, `${parsedPath.name}.docx`);
  }

  /**
   * 验证文件是否为.doc格式
   */
  static isDocFile(filePath: string): boolean {
    return path.extname(filePath.toLowerCase()) === '.doc';
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件大小
   */
  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`无法获取文件大小: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default DocConverter; 