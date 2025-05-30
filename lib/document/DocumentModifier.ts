/**
 * 文档修改器 - 专注于文档格式修改和生成
 */
import { 
  Document, Packer, Paragraph, 
  AlignmentType, UnderlineType, ImageRun
} from 'docx';
import * as fs from 'fs/promises';
import { ImageExtractor } from '../image-extractor';
import { DocumentAnalyzer } from './DocumentAnalyzer';
import { 
  FontModificationOptions,
  DocxAnalysisResult,
  ExtractedImage 
} from '@/types/document-processing';

export class DocumentModifier {
  private documentAnalyzer: DocumentAnalyzer;
  private imageExtractor: ImageExtractor;

  constructor() {
    this.documentAnalyzer = new DocumentAnalyzer();
    this.imageExtractor = new ImageExtractor();
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
    try {
      // 1. 先分析文档，获取内容结构和图片
      const analysis = await this.documentAnalyzer.analyzeDocument(inputPath);
      
      // 2. 提取图片信息
      let extractedImages: ExtractedImage[] = [];
      try {
        const imageResult = await this.imageExtractor.extractImages(inputPath);
        extractedImages = imageResult.images;
        console.log(`从原文档提取了${extractedImages.length}张图片用于新文档`);
      } catch (imgError) {
        console.warn('提取图片时出错，将创建不含图片的文档:', imgError);
      }

      // 3. 创建新文档
      const paragraphs = this.createDocumentParagraphs(
        analysis, 
        extractedImages, 
        titleOptions, 
        bodyOptions, 
        authorOptions
      );
      
      // 4. 生成最终文档
      const doc = this.createDocument(paragraphs, analysis, titleOptions, bodyOptions, authorOptions);
      
      // 5. 保存文档
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(outputPath, buffer);
      
      console.log(`文档处理完成，保留了${extractedImages.length}张图片`);
      return outputPath;
    } catch (error) {
      console.error('修改文档字体和样式时出错:', error);
      throw new Error(`修改文档失败: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    return this.modifyFonts(
      inputPath,
      outputPath,
      { targetAlignment: titleAlignment },
      { targetAlignment: bodyAlignment },
      { targetAlignment: authorAlignment }
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
    return this.modifyFonts(
      inputPath,
      outputPath,
      { addPrefix: prefix, addSuffix: suffix },
      undefined,
      undefined
    );
  }

  /**
   * 创建文档段落
   */
  private createDocumentParagraphs(
    analysis: DocxAnalysisResult,
    extractedImages: ExtractedImage[],
    titleOptions?: FontModificationOptions,
    bodyOptions?: FontModificationOptions,
    authorOptions?: FontModificationOptions
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    // 添加标题
    if (analysis.title?.exists) {
      const titleParagraph = this.createTitleParagraph(analysis.title.text, titleOptions);
      paragraphs.push(titleParagraph);
    }
    
    // 添加作者
    if (analysis.author?.exists) {
      const authorParagraph = this.createAuthorParagraph(analysis.author.text, authorOptions);
      paragraphs.push(authorParagraph);
    }
    
    // 添加正文内容和图片
    this.addBodyContentWithImages(paragraphs, analysis, extractedImages, bodyOptions);
    
    return paragraphs;
  }

  /**
   * 创建标题段落
   */
  private createTitleParagraph(titleText: string, options?: FontModificationOptions): Paragraph {
    let text = titleText;
    
    if (options?.addPrefix) {
      text = options.addPrefix + text;
    }
    if (options?.addSuffix) {
      text = text + options.addSuffix;
    }
    
    return new Paragraph({
      text: text,
      style: 'Title',
      alignment: this.getAlignmentType(options?.targetAlignment || 'center')
    });
  }

  /**
   * 创建作者段落
   */
  private createAuthorParagraph(authorText: string, options?: FontModificationOptions): Paragraph {
    let text = authorText;
    
    if (options?.addPrefix) {
      text = options.addPrefix + text;
    }
    if (options?.addSuffix) {
      text = text + options.addSuffix;
    }
    
    return new Paragraph({
      text: text,
      style: 'Author',
      alignment: this.getAlignmentType(options?.targetAlignment || 'center')
    });
  }

  /**
   * 添加正文内容和图片
   */
  private addBodyContentWithImages(
    paragraphs: Paragraph[],
    analysis: DocxAnalysisResult,
    extractedImages: ExtractedImage[],
    bodyOptions?: FontModificationOptions
  ) {
    if (analysis.paragraphs && analysis.paragraphs.length > 0) {
      const startIndex = (analysis.author?.exists ? 2 : 1);
      
      for (let i = startIndex; i < analysis.paragraphs.length; i++) {
        const para = analysis.paragraphs[i];
        
        // 使用原始段落索引匹配图片
        const paragraphImages = extractedImages.filter(img => img.paragraphIndex === i);
        
        console.log(`段落${i}: "${para.text.substring(0, 50)}...", 找到${paragraphImages.length}张图片`);
        
        // 添加段落文本
        const bodyParagraph = new Paragraph({
          text: para.text,
          style: 'Body',
          alignment: this.getAlignmentType(bodyOptions?.targetAlignment || 'left')
        });
        
        paragraphs.push(bodyParagraph);
        
        // 添加段落后的图片
        this.addParagraphImages(paragraphs, paragraphImages);
      }
      
      // 添加未匹配的图片到文档末尾
      this.addUnmatchedImages(paragraphs, extractedImages, analysis);
    }
  }

  /**
   * 添加段落图片
   */
  private addParagraphImages(paragraphs: Paragraph[], images: ExtractedImage[]) {
    for (const img of images) {
      try {
        console.log(`尝试添加图片: ${img.name}, mimeType: ${img.mimeType}`);
        
        const base64Data = img.base64Data.replace(/^data:image\/[^;]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        console.log(`图片buffer大小: ${imageBuffer.length} bytes`);
        
        const maxWidth = 600;
        const imageWidth = Math.min(maxWidth, 400);
        const imageHeight = Math.round(imageWidth * 0.75);
        
        const imageParagraph = new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: imageWidth,
                height: imageHeight,
              },
              type: 'png',
            }),
          ],
          alignment: AlignmentType.CENTER,
        });
        
        paragraphs.push(imageParagraph);
        console.log(`成功添加图片到新文档: ${img.name}`);
      } catch (imgAddError) {
        console.warn(`添加图片${img.name}时出错:`, imgAddError);
        
        const placeholderParagraph = new Paragraph({
          text: `[图片: ${img.name}]`,
          alignment: AlignmentType.CENTER,
          style: 'Body'
        });
        paragraphs.push(placeholderParagraph);
      }
    }
  }

  /**
   * 添加未匹配的图片到文档末尾
   */
  private addUnmatchedImages(
    paragraphs: Paragraph[],
    extractedImages: ExtractedImage[],
    analysis: DocxAnalysisResult
  ) {
    const startIndex = (analysis.author?.exists ? 2 : 1);
    
    const unmatchedImages = extractedImages.filter(img => 
      img.paragraphIndex === undefined || 
      img.paragraphIndex < startIndex || 
      img.paragraphIndex >= analysis.paragraphs.length
    );
    
    if (unmatchedImages.length > 0) {
      console.log(`发现${unmatchedImages.length}张未匹配的图片，将添加到文档末尾`);
      
      for (const img of unmatchedImages) {
        try {
          const base64Data = img.base64Data.replace(/^data:image\/[^;]+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const maxWidth = 600;
          const imageWidth = Math.min(maxWidth, 400);
          const imageHeight = Math.round(imageWidth * 0.75);
          
          const imageParagraph = new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: imageWidth,
                  height: imageHeight,
                },
                type: 'png',
              }),
            ],
            alignment: AlignmentType.CENTER,
          });
          
          paragraphs.push(imageParagraph);
          console.log(`添加未匹配图片到文档末尾: ${img.name}`);
        } catch (imgAddError) {
          console.warn(`添加未匹配图片${img.name}时出错:`, imgAddError);
        }
      }
    }
  }

  /**
   * 创建最终文档
   */
  private createDocument(
    paragraphs: Paragraph[],
    analysis: DocxAnalysisResult,
    titleOptions?: FontModificationOptions,
    bodyOptions?: FontModificationOptions,
    authorOptions?: FontModificationOptions
  ): Document {
    return new Document({
      title: analysis.title?.text || '文档',
      description: '由 C-Doc Next.js 处理',
      styles: {
        paragraphStyles: [
          {
            id: 'Title',
            name: 'Title',
            basedOn: 'Normal',
            next: 'Normal',
            run: {
              font: titleOptions?.targetFontName || '黑体',
              size: (titleOptions?.targetFontSize || 16) * 2,
              bold: titleOptions?.targetIsBold !== undefined ? titleOptions.targetIsBold : true,
              italics: titleOptions?.targetIsItalic || false,
              underline: titleOptions?.targetIsUnderline ? { type: UnderlineType.SINGLE } : undefined,
              color: titleOptions?.targetColor || '000000',
            },
            paragraph: {
              alignment: this.getAlignmentType(titleOptions?.targetAlignment || 'center'),
              spacing: { before: 240, after: 120 }
            }
          },
          {
            id: 'Author',
            name: 'Author',
            basedOn: 'Normal',
            next: 'Normal',
            run: {
              font: authorOptions?.targetFontName || '宋体',
              size: (authorOptions?.targetFontSize || 12) * 2,
              bold: authorOptions?.targetIsBold || false,
              italics: authorOptions?.targetIsItalic || false,
              underline: authorOptions?.targetIsUnderline ? { type: UnderlineType.SINGLE } : undefined,
              color: authorOptions?.targetColor || '000000',
            },
            paragraph: {
              alignment: this.getAlignmentType(authorOptions?.targetAlignment || 'center'),
              spacing: { before: 120, after: 240 }
            }
          },
          {
            id: 'Body',
            name: 'Body',
            basedOn: 'Normal',
            next: 'Body',
            run: {
              font: bodyOptions?.targetFontName || '宋体',
              size: (bodyOptions?.targetFontSize || 12) * 2,
              bold: bodyOptions?.targetIsBold || false,
              italics: bodyOptions?.targetIsItalic || false,
              underline: bodyOptions?.targetIsUnderline ? { type: UnderlineType.SINGLE } : undefined,
              color: bodyOptions?.targetColor || '000000',
            },
            paragraph: {
              alignment: this.getAlignmentType(bodyOptions?.targetAlignment || 'left'),
              spacing: { before: 120, after: 120 },
              indent: { firstLine: 480 }
            }
          }
        ]
      },
      sections: [
        {
          properties: {},
          children: paragraphs
        }
      ]
    });
  }

  /**
   * 将字符串对齐方式转换为 docx.js 的 AlignmentType
   */
  private getAlignmentType(alignment?: string): typeof AlignmentType[keyof typeof AlignmentType] {
    switch (alignment) {
      case 'center':
        return AlignmentType.CENTER;
      case 'right':
        return AlignmentType.RIGHT;
      case 'justify':
        return AlignmentType.JUSTIFIED;
      case 'left':
      default:
        return AlignmentType.LEFT;
    }
  }
} 