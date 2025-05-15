/**
 * DocxProcessor 服务类
 * 用于解析和修改 .docx 文件，包括标题/作者识别、字体样式修改等
 */
import { 
  Document, Packer, Paragraph, 
  AlignmentType, UnderlineType
} from 'docx';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';

export interface DocxAnalysisResult {
  title?: {
    text: string;
    exists: boolean;
    fontInfo?: {
      name?: string;
      size?: number;
      isBold?: boolean;
      isItalic?: boolean;
      isUnderline?: boolean;
      color?: string;
      alignment?: string;
    }
  };
  author?: {
    text: string;
    exists: boolean;
    fontInfo?: {
      name?: string;
      size?: number;
      isBold?: boolean;
      isItalic?: boolean;
      isUnderline?: boolean;
      color?: string;
      alignment?: string;
    }
  };
  bodyText?: string;  bodyFontInfo?: {
    name?: string;
    size?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    color?: string;
    alignment?: string;
  };
  paragraphs: {
    text: string;
    index: number;
    isTitle?: boolean;
    isAuthor?: boolean;
    fontInfo?: {
      name?: string;
      size?: number;
      isBold?: boolean;
      isItalic?: boolean;
      isUnderline?: boolean;
      color?: string;
      alignment?: string;
    }
  }[];
  wordCount?: number;
  images?: {
    name: string;
    base64Data?: string;
    paragraphIndex?: number;
  }[];
}

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
}

export default class DocxProcessor {
  /**
   * 解析 docx 文件，提取标题、作者、正文和字体信息
   */
  async analyzeDocument(filePath: string): Promise<DocxAnalysisResult> {
    try {      // 使用 mammoth.js 提取文本内容
      const { value: extractedText } = await mammoth.extractRawText({ path: filePath });
      
      // 基本解析结果
      const result: DocxAnalysisResult = {
        paragraphs: [],
        wordCount: this.countWords(extractedText)
      };
      
      // 解析段落
      const paragraphs = extractedText.split('\n').filter(p => p.trim().length > 0);
      
      if (paragraphs.length > 0) {
        // 假设第一段是标题
        result.title = {
          text: paragraphs[0],
          exists: true,          fontInfo: {
            // 由于 mammoth 无法直接提取字体信息，我们需要在后续步骤中使用 docx.js 获取
            // 这里先使用占位值
            name: '默认字体',
            size: 16,
            isBold: true,
            isItalic: false,
            isUnderline: false,
            alignment: 'center'
          }
        };
        
        // 尝试识别作者信息
        // 1. 检查第二段是否短且可能是作者名
        if (paragraphs.length > 1 && paragraphs[1].length < 30) {
          // 通过特定模式识别作者，如括号内的名字或以特定字符开头的内容
          const authorPattern = /[\（\(](.+)[\)\）]|作者[：:]\s*(.+)/;
          const authorMatch = paragraphs[1].match(authorPattern);
          
          if (authorMatch) {
            result.author = {
              text: authorMatch[1] || authorMatch[2],
              exists: true,              fontInfo: {
                name: '默认字体',
                size: 12,
                isBold: false,
                isItalic: false,
                isUnderline: false,
                alignment: 'center'
              }
            };
          }
        }
        
        // 收集段落信息
        paragraphs.forEach((text, index) => {
          const paragraph = {
            text,
            index,
            isTitle: index === 0,
            isAuthor: index === 1 && result.author?.exists,
            fontInfo: {              // 暂时使用默认值
              name: index === 0 ? '默认标题字体' : '默认正文字体',
              size: index === 0 ? 16 : 12,
              isBold: index === 0,
              isItalic: false,
              isUnderline: false,
              alignment: index === 0 ? 'center' : 'left'
            }
          };
          
          result.paragraphs.push(paragraph);
        });
        
        // 构建正文 (去除标题和作者)
        const startIndex = result.author?.exists ? 2 : 1;
        result.bodyText = paragraphs.slice(startIndex).join('\n\n');
        
        // 设置正文字体信息
        result.bodyFontInfo = {          name: '默认正文字体',
          size: 12,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          alignment: 'left'
        };
      }
      
      // TODO: 使用 docx.js 提取更详细的字体信息
      // 这需要额外的步骤，因为 docx.js 目前主要用于创建文档而非解析
      
      // TODO: 提取图片信息
      // 可以从 HTML 内容中提取图片，或使用专门的库

      return result;
    } catch (error) {
      console.error('解析文档时出错:', error);
      throw new Error(`文档解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 计算文本中的字数
   */
  private countWords(text: string): number {
    // 对于中文文本，直接计算不含空白字符的字符数
    // 对于英文文本，按空格分隔计算单词数
    // 这是一个简化的实现，可能需要更复杂的逻辑

    // 去除空白字符
    const trimmedText = text.replace(/\s+/g, '');
    
    // 检查是否主要是中文内容
    const chinesePattern = /[\u4e00-\u9fa5]/g;
    const chineseMatches = trimmedText.match(chinesePattern);
    
    if (chineseMatches && chineseMatches.length > trimmedText.length * 0.5) {
      // 如果主要是中文，直接返回字符数
      return trimmedText.length;
    } else {
      // 如果主要是英文，按空格分隔计算单词数
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
  }

  /**
   * 修改文档字体和样式
   * 创建一个新的 docx 文档，应用用户指定的字体和样式
   */
  async modifyFonts(
    inputPath: string, 
    outputPath: string, 
    titleOptions?: FontModificationOptions,
    bodyOptions?: FontModificationOptions,
    authorOptions?: FontModificationOptions
  ): Promise<string> {
    try {
      // 1. 先分析文档，获取内容结构
      const analysis = await this.analyzeDocument(inputPath);
      
      // 创建段落数组
      const paragraphs: Paragraph[] = [];
      
      // 2. 添加标题（如果存在）
      if (analysis.title?.exists) {
        let titleText = analysis.title.text;
        
        // 添加前缀或后缀
        if (titleOptions?.addPrefix) {
          titleText = titleOptions.addPrefix + titleText;
        }
        if (titleOptions?.addSuffix) {
          titleText = titleText + titleOptions.addSuffix;
        }
        
        const titleParagraph = new Paragraph({
          text: titleText,
          style: 'Title',
          alignment: this.getAlignmentType(titleOptions?.targetAlignment || 'center')
        });
        
        paragraphs.push(titleParagraph);
      }
      
      // 3. 添加作者（如果存在）
      if (analysis.author?.exists) {
        let authorText = analysis.author.text;
        
        // 添加前缀或后缀
        if (authorOptions?.addPrefix) {
          authorText = authorOptions.addPrefix + authorText;
        }
        if (authorOptions?.addSuffix) {
          authorText = authorOptions.addSuffix + authorText;
        }
        
        const authorParagraph = new Paragraph({
          text: authorText,
          style: 'Author',
          alignment: this.getAlignmentType(authorOptions?.targetAlignment || 'center')
        });
        
        paragraphs.push(authorParagraph);
      }
      
      // 4. 添加正文内容
      if (analysis.paragraphs && analysis.paragraphs.length > 0) {
        // 跳过标题和作者段落
        const startIndex = (analysis.author?.exists ? 2 : 1);
        
        for (let i = startIndex; i < analysis.paragraphs.length; i++) {
          const para = analysis.paragraphs[i];
          
          const bodyParagraph = new Paragraph({
            text: para.text,
            style: 'Body',
            alignment: this.getAlignmentType(bodyOptions?.targetAlignment || 'left')
          });
          
          paragraphs.push(bodyParagraph);
        }
      }
      
      // 5. 创建文档并添加一个章节
      const doc = new Document({
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
                size: (titleOptions?.targetFontSize || 16) * 2, // docx.js中的大小是pt的两倍
                bold: titleOptions?.targetIsBold !== undefined ? titleOptions.targetIsBold : true,
                italics: titleOptions?.targetIsItalic || false, // 注意: 是italics而不是italic
                underline: titleOptions?.targetIsUnderline ? { type: UnderlineType.SINGLE } : undefined,
                color: titleOptions?.targetColor || '000000',
              },
              paragraph: {
                alignment: this.getAlignmentType(titleOptions?.targetAlignment || 'center'),
                spacing: { before: 240, after: 120 } // 段前段后距离
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
                italics: authorOptions?.targetIsItalic || false, // 注意: 是italics而不是italic
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
                italics: bodyOptions?.targetIsItalic || false, // 注意: 是italics而不是italic
                underline: bodyOptions?.targetIsUnderline ? { type: UnderlineType.SINGLE } : undefined,
                color: bodyOptions?.targetColor || '000000',
              },
              paragraph: {
                alignment: this.getAlignmentType(bodyOptions?.targetAlignment || 'left'),
                spacing: { before: 120, after: 120 },
                indent: { firstLine: 480 } // 首行缩进2字符(按240为1字符计算)
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
      
      // 6. 将文档保存到指定路径
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(outputPath, buffer);
      
      return outputPath;
    } catch (error) {
      console.error('修改文档字体和样式时出错:', error);
      throw new Error(`修改文档失败: ${error instanceof Error ? error.message : String(error)}`);
    }
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
    // 复用 modifyFonts 方法，只设置对齐方式
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
    // 复用 modifyFonts 方法，只设置前缀或后缀
    return this.modifyFonts(
      inputPath,
      outputPath,
      { addPrefix: prefix, addSuffix: suffix },
      undefined,
      undefined
    );
  }
}
