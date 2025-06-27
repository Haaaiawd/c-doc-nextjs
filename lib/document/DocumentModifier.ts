/**
 * 文档修改器 - 专注于文档格式修改和生成
 */
import { 
  Document, Packer, Paragraph, 
  AlignmentType, UnderlineType, ImageRun
} from 'docx';
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
   * 修改文档字体和样式 (基于Buffer)
   * 创建一个新的 docx 文档，应用用户指定的字体和样式，同时保留原有图片
   * @returns {Promise<Buffer>} 返回包含新文档内容的Buffer
   */
  async modifyFonts(
    inputBuffer: Buffer, 
    titleOptions?: FontModificationOptions,
    bodyOptions?: FontModificationOptions,
    authorOptions?: FontModificationOptions
  ): Promise<Buffer> {
    try {
      // 1. 先分析文档，获取内容结构和图片
      const analysis = await this.documentAnalyzer.analyzeDocument(inputBuffer);
      
      // 2. 提取图片信息
      const imageResult = await this.imageExtractor.extractImagesFromBuffer(inputBuffer);
      const extractedImages = imageResult.images;
      console.log(`从原文档提取了${extractedImages.length}张图片用于新文档`);

      // 3. 创建新文档的段落
      const paragraphs = this.createDocumentParagraphs(
        analysis, 
        extractedImages, 
        titleOptions, 
        bodyOptions, 
        authorOptions
      );
      
      // 4. 生成最终文档对象
      const doc = this.createDocument(paragraphs, analysis, titleOptions, bodyOptions, authorOptions);
      
      // 5. 将文档打包成Buffer并返回
      const buffer = await Packer.toBuffer(doc);
      
      console.log(`文档处理完成，保留了${extractedImages.length}张图片`);
      return buffer;
    } catch (error) {
      console.error('修改文档字体和样式时出错:', error);
      throw new Error(`修改文档失败: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    return this.modifyFonts(
      inputBuffer,
      { targetAlignment: titleAlignment },
      { targetAlignment: bodyAlignment },
      { targetAlignment: authorAlignment }
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
    return this.modifyFonts(
      inputBuffer,
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
      // 确定正文开始索引
      let startIndex = 0;
      if (analysis.title?.exists) startIndex++;
      if (analysis.author?.exists) startIndex++;
      
      console.log(`正文开始索引: ${startIndex}, 总段落数: ${analysis.paragraphs.length}`);
      console.log(`提取的图片数量: ${extractedImages.length}`);
      
      // 创建图片位置映射 - 修复：图片段落索引不需要调整，直接使用原始索引
      const imagesByParagraph = new Map<number, ExtractedImage[]>();
      extractedImages.forEach(img => {
        if (img.paragraphIndex !== undefined) {
          // 直接使用原始段落索引，不进行偏移调整
          const paragraphIndex = img.paragraphIndex;
          
          if (!imagesByParagraph.has(paragraphIndex)) {
            imagesByParagraph.set(paragraphIndex, []);
          }
          imagesByParagraph.get(paragraphIndex)!.push(img);
          console.log(`📍 图片 ${img.name} 映射到段落 ${paragraphIndex}`);
        }
      });
      
      // 收集无法精确匹配的图片
      const unassignedImages = extractedImages.filter(img => img.paragraphIndex === undefined);
      if (unassignedImages.length > 0) {
        console.log(`⚠️ 发现${unassignedImages.length}张无法精确定位的图片，将使用智能分配策略`);
      }
      
      // 确定实际需要处理的段落范围
      const totalParagraphs = analysis.paragraphs.length;
      const maxParagraphIndex = Math.max(totalParagraphs - 1, ...Array.from(imagesByParagraph.keys()));
      
      console.log(`处理段落范围: ${startIndex} 到 ${Math.min(maxParagraphIndex, totalParagraphs - 1)}, 图片映射段落: [${Array.from(imagesByParagraph.keys()).join(', ')}]`);
      
      // 遍历段落并添加内容和图片
      for (let i = startIndex; i < totalParagraphs; i++) {
        const para = analysis.paragraphs[i];
        
        // 创建段落
        const bodyParagraph = this.createParagraphWithOriginalFormat(para, bodyOptions);
        paragraphs.push(bodyParagraph);
        
        // 检查是否有图片应该在这个段落后插入
        const paragraphImages = imagesByParagraph.get(i) || [];
        
        console.log(`段落${i}: "${para.text.substring(0, 50)}...", 匹配图片: ${paragraphImages.length}张`);
        
        // 添加匹配到的图片
        if (paragraphImages.length > 0) {
          console.log(`正在添加段落${i}的${paragraphImages.length}张图片...`);
          this.addParagraphImages(paragraphs, paragraphImages);
          console.log(`段落${i}的图片添加完成`);
        }
        
        // 智能分配无法精确定位的图片
        this.tryAssignUnassignedImages(paragraphs, unassignedImages, i, totalParagraphs, startIndex);
      }
      
      // 添加剩余未分配的图片到文档末尾
      this.addRemainingImages(paragraphs, unassignedImages);
    }
  }

  /**
   * 尝试智能分配无法精确定位的图片
   */
  private tryAssignUnassignedImages(
    paragraphs: Paragraph[],
    unassignedImages: ExtractedImage[],
    currentParagraphIndex: number,
    totalParagraphs: number,
    startIndex: number
  ) {
    const relativeParagraphIndex = currentParagraphIndex - startIndex;
    const totalBodyParagraphs = totalParagraphs - startIndex;
    
    // 策略：在文档的特定位置插入图片
    const shouldInsertImage = (imageIndex: number) => {
      const targetPosition = (imageIndex + 1) / (unassignedImages.length + 1);
      const currentPosition = relativeParagraphIndex / totalBodyParagraphs;
      
      // 允许一定的容差范围
      return Math.abs(currentPosition - targetPosition) < (1 / (totalBodyParagraphs + 1));
    };
    
    // 检查是否应该在当前位置插入图片
    for (let i = unassignedImages.length - 1; i >= 0; i--) {
      if (shouldInsertImage(i)) {
        const imageToInsert = unassignedImages.splice(i, 1)[0];
        console.log(`🎯 智能插入图片 ${imageToInsert.name} 在段落 ${currentParagraphIndex} 后`);
        this.addParagraphImages(paragraphs, [imageToInsert]);
      }
    }
  }

  /**
   * 添加剩余的图片到文档末尾
   */
  private addRemainingImages(paragraphs: Paragraph[], remainingImages: ExtractedImage[]) {
    if (remainingImages.length > 0) {
      console.log(`📎 添加${remainingImages.length}张剩余图片到文档末尾`);
      this.addParagraphImages(paragraphs, remainingImages);
      remainingImages.length = 0; // 清空数组
    }
  }

  /**
   * 创建保留原始格式的段落
   */
  private createParagraphWithOriginalFormat(
    para: { text: string; styles?: Array<{ name?: string; size?: number; isBold?: boolean; isItalic?: boolean; isUnderline?: boolean; color?: string; alignment?: string }> },
    bodyOptions?: FontModificationOptions
  ): Paragraph {
    // 如果有原始样式信息，尽量保留
    if (para.styles && para.styles.length > 0) {
      const firstStyle = para.styles[0];
      
      // 确定段落对齐方式
      let alignment = this.getAlignmentType('left'); // 默认左对齐
      if (firstStyle.alignment) {
        alignment = this.getAlignmentType(firstStyle.alignment);
      }
      if (bodyOptions?.targetAlignment) {
        alignment = this.getAlignmentType(bodyOptions.targetAlignment);
      }
      
      return new Paragraph({
        text: para.text,
        style: 'Body',
        alignment: alignment
      });
    } else {
      // 没有样式信息时使用默认格式
      return new Paragraph({
        text: para.text,
        style: 'Body',
        alignment: this.getAlignmentType(bodyOptions?.targetAlignment || 'left')
      });
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
        
        // 根据mimeType确定图片类型
        let imageType: 'png' | 'jpg' | 'gif' = 'png'; // 默认为png
        if (img.mimeType.includes('jpeg') || img.mimeType.includes('jpg')) {
          imageType = 'jpg';
        } else if (img.mimeType.includes('gif')) {
          imageType = 'gif';
        } // PNG和其他格式使用默认的png
        
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
              type: imageType, // 使用正确的图片类型
            }),
          ],
          alignment: AlignmentType.CENTER,
        });
        
        paragraphs.push(imageParagraph);
        console.log(`成功添加图片到新文档: ${img.name}, 类型: ${imageType}`);
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
          },
          {
            id: 'Normal',
            name: 'Normal',
            basedOn: 'Normal',
            run: {
              font: '宋体',
              size: 24,
            },
            paragraph: {
              spacing: { line: 360 }
            }
          }
        ]
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1134,
                right: 1134,
                bottom: 1134,
                left: 1134,
              },
            },
          },
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