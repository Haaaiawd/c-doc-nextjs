/**
 * 文档分析器 - 专注于文档内容分析和字体检测
 */
import mammoth from 'mammoth';
import docx4js, { DocxDocument, DocxNode } from 'docx4js';
import { DeepFontDetector } from '../deep-font-detector';
import { ImageExtractor } from '../image-extractor';
import { 
  DocxAnalysisResult, 
  FontInfo, 
  TextRunInfo, 
  ParagraphInfo
} from '@/types/document-processing';

export class DocumentAnalyzer {
  private deepFontDetector: DeepFontDetector;
  private imageExtractor: ImageExtractor;

  constructor() {
    this.deepFontDetector = new DeepFontDetector();
    this.imageExtractor = new ImageExtractor();
  }

  /**
   * 解析 docx 文件的 Buffer，提取标题、作者、正文和字体信息
   */  
  async analyzeDocument(inputBuffer: Buffer, useDeepDetection: boolean = true): Promise<DocxAnalysisResult> {
    try {      
      // 使用 mammoth.js 提取文本内容
      const { value: extractedText } = await mammoth.extractRawText({ buffer: inputBuffer });
      
      const result: DocxAnalysisResult = {
        paragraphs: [],
        bodyStyles: [],
        wordCount: this.countWords(extractedText)
      };
      
      const paragraphs = extractedText.split('\n').filter(p => p.trim().length > 0);
      
      // 使用 docx4js 提取详细的样式信息
      // @ts-expect-error - docx4js的类型定义似乎不完整，但它底层应能处理Buffer
      const docx = await docx4js.load(inputBuffer);
      
      if (!docx) {
        throw new Error('文档格式无法解析');
      }
      
      const paragraphInfoMap = await this.extractStyleInfo(docx);
      
      if (useDeepDetection) {
        try {
          console.log('开始使用深度字体检测...');
          const deepAnalysisResult = await this.deepFontDetector.analyzeDocx(inputBuffer);
          
          // 收集字体使用情况统计
          const fontUsage = new Map<string, { count: number, samples: string[] }>();
          
          // 分析深度检测结果，统计字体使用情况
          deepAnalysisResult.paragraphFonts.forEach((fontInfoList, paragraphIndex) => {
            fontInfoList.forEach(fontInfo => {
              const fontName = fontInfo.name || '未知字体';
              
              if (!fontUsage.has(fontName)) {
                fontUsage.set(fontName, { count: 0, samples: [] });
              }
              
              const usage = fontUsage.get(fontName)!;
              usage.count++;
              
              // 添加样本文本
              if (paragraphIndex < paragraphs.length && usage.samples.length < 3) {
                const text = paragraphs[paragraphIndex];
                const sample = text.substring(0, 50) + (text.length > 50 ? '...' : '');
                
                if (!usage.samples.includes(sample)) {
                  usage.samples.push(sample);
                }
              }
            });
          });
          
          // 将深度分析结果添加到返回值中
          result.deepFontAnalysis = {
            fonts: fontUsage,
            paragraphFonts: deepAnalysisResult.paragraphFonts,
            defaultFonts: {
              eastAsia: deepAnalysisResult.defaultFonts.eastAsia,
              ascii: deepAnalysisResult.defaultFonts.ascii,
              hAnsi: deepAnalysisResult.defaultFonts.hAnsi,
              cs: deepAnalysisResult.defaultFonts.cs
            },
            styles: deepAnalysisResult.styles
          };
          
          // 整合深度检测结果到段落样式中
          for (let i = 0; i < paragraphs.length; i++) {
            if (deepAnalysisResult.paragraphFonts.has(i)) {
              const deepFontInfoList = deepAnalysisResult.paragraphFonts.get(i)!;
              
              if (i === 0 && deepFontInfoList.length > 0) {
                if (!paragraphInfoMap[0]) {
                  paragraphInfoMap[0] = {
                    text: paragraphs[0],
                    textRuns: [],
                    originalStyleKey: 'p-0'
                  };
                }
                
                const textRuns: TextRunInfo[] = deepFontInfoList.map((fontInfo, j) => ({
                  text: j === 0 ? paragraphs[0] : '',
                  name: fontInfo.name,
                  size: fontInfo.size,
                  isBold: fontInfo.isBold,
                  isItalic: fontInfo.isItalic,
                  isUnderline: fontInfo.isUnderline,
                  color: fontInfo.color,
                  alignment: fontInfo.alignment,
                  originalStyleKey: `p-${i}-r-${j}`
                }));
                
                paragraphInfoMap[0].textRuns = textRuns;
              }
            }
          }
          
          console.log('深度字体检测完成，检测到的字体:', Array.from(fontUsage.keys()));
        } catch (deepError) {
          console.error('深度字体检测时出错:', deepError);
        }
      }
      
      this.processDocumentStructure(result, paragraphs, paragraphInfoMap);
      
      // 提取图片信息
      try {
        console.log('开始提取图片...');
        const imageResult = await this.imageExtractor.extractImagesFromBuffer(inputBuffer);
        if (imageResult.images.length > 0) {
          result.images = imageResult.images;
          console.log(`成功提取${result.images.length}张图片`);
        } else {
          console.log('文档中未找到图片');
        }
      } catch (imgError) {
        console.warn('提取图片时出错:', imgError);
      }
      
      this.deduplicateStyles(result);

      return result;
    } catch (error) {
      console.error('解析文档时出错:', error);
      throw new Error(`文档解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取文档的所有字体信息 (从 Buffer)
   */
  async getFontUsage(inputBuffer: Buffer): Promise<Map<string, { count: number, samples: string[] }>> {
    try {
      const analysis = await this.analyzeDocument(inputBuffer, true);
      
      if (analysis.deepFontAnalysis?.fonts) {
        return analysis.deepFontAnalysis.fonts;
      }
      
      return new Map();
    } catch (error) {
      console.error('获取字体使用情况时出错:', error);
      throw new Error(`获取字体使用情况失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 计算文本中的字数
   */
  private countWords(text: string): number {
    const trimmedText = text.replace(/\s+/g, '');
    const chinesePattern = /[\u4e00-\u9fa5]/g;
    const chineseMatches = trimmedText.match(chinesePattern);
    
    if (chineseMatches && chineseMatches.length > trimmedText.length * 0.5) {
      return trimmedText.length;
    } else {
      return text.split(/\s+/).filter(word => word.length > 0).length;
    }
  }

  /**
   * 处理文档结构（标题、作者、段落）
   */
  private processDocumentStructure(
    result: DocxAnalysisResult, 
    paragraphs: string[], 
    paragraphInfoMap: Record<number, ParagraphInfo>
  ) {
    if (paragraphs.length > 0) {
      // 智能识别标题 - 必须是第一段，并且满足特定条件
      const isTitle = this.identifyTitle(paragraphs, paragraphInfoMap);
      
      if (isTitle) {
        // 处理标题
        result.title = {
          text: paragraphs[0],
          exists: true,
          styles: paragraphInfoMap[0] ? paragraphInfoMap[0].textRuns.map(run => ({
            name: run.name,
            size: run.size,
            isBold: run.isBold,
            isItalic: run.isItalic,
            isUnderline: run.isUnderline,
            color: run.color,
            alignment: run.alignment,
            originalStyleKey: run.originalStyleKey
          })) : [{
            name: '默认字体',
            size: 16,
            isBold: true,
            isItalic: false,
            isUnderline: false,
            alignment: 'center',
            originalStyleKey: 'default-title'
          }]
        };
      } else {
        // 第一段不是标题，不设置title
        result.title = undefined;
      }
      
      // 尝试识别作者信息（只有在有标题的情况下才检查第二段作为作者）
      if (isTitle && paragraphs.length > 1 && paragraphs[1].length < 30) {
        const authorPattern = /[\（\(](.+)[\)\）]|作者[：:]\s*(.+)/;
        const authorMatch = paragraphs[1].match(authorPattern);
        
        if (authorMatch) {
          result.author = {
            text: authorMatch[1] || authorMatch[2],
            exists: true,
            styles: paragraphInfoMap[1] ? paragraphInfoMap[1].textRuns.map(run => ({
              name: run.name,
              size: run.size,
              isBold: run.isBold,
              isItalic: run.isItalic,
              isUnderline: run.isUnderline,
              color: run.color,
              alignment: run.alignment,
              originalStyleKey: run.originalStyleKey
            })) : [{
              name: '默认字体',
              size: 12,
              isBold: false,
              isItalic: false,
              isUnderline: false,
              alignment: 'center',
              originalStyleKey: 'default-author'
            }]
          };
        }
      }
      
      // 处理段落
      this.processParagraphs(result, paragraphs, paragraphInfoMap);
      
      // 构建正文
      const startIndex = result.author?.exists ? 2 : (result.title?.exists ? 1 : 0);
      result.bodyText = paragraphs.slice(startIndex).join('\n\n');
    }
  }

  /**
   * 智能识别标题
   * 必要条件：在第一段
   * 充分条件：字体大小和第二段不同，或为居中排列
   */
  private identifyTitle(
    paragraphs: string[], 
    paragraphInfoMap: Record<number, ParagraphInfo>
  ): boolean {
    if (paragraphs.length === 0) return false;
    
    // 获取第一段的样式信息
    const firstParagraph = paragraphInfoMap[0];
    if (!firstParagraph || !firstParagraph.textRuns || firstParagraph.textRuns.length === 0) {
      // 如果没有样式信息，通过深度分析检查
      return this.checkTitleByDeepAnalysis(paragraphs);
    }

    const firstParagraphStyle = firstParagraph.textRuns[0];
    
    // 检查是否居中排列
    const isCenter = firstParagraph.alignment === 'center' || 
                    firstParagraphStyle.alignment === 'center';
    
    if (isCenter) {
      console.log('第一段识别为标题：居中排列');
      return true;
    }
    
    // 如果有第二段，比较字体大小
    if (paragraphs.length > 1) {
      const secondParagraph = paragraphInfoMap[1];
      if (secondParagraph && secondParagraph.textRuns && secondParagraph.textRuns.length > 0) {
        const secondParagraphStyle = secondParagraph.textRuns[0];
        
        const firstSize = firstParagraphStyle.size || 12;
        const secondSize = secondParagraphStyle.size || 12;
        
        // 如果第一段字体比第二段大，认为是标题
        if (firstSize > secondSize) {
          console.log(`第一段识别为标题：字体大小 ${firstSize} > ${secondSize}`);
          return true;
        }
        
        // 如果第一段加粗而第二段不加粗，也可能是标题
        if (firstParagraphStyle.isBold && !secondParagraphStyle.isBold) {
          console.log('第一段识别为标题：第一段加粗，第二段不加粗');
          return true;
        }
      }
    }
    
    // 检查第一段是否明显像标题（短且简洁）
    const firstParagraphText = paragraphs[0].trim();
    if (firstParagraphText.length < 50 && !firstParagraphText.includes('。') && 
        !firstParagraphText.includes('.') && paragraphs.length > 1) {
      console.log('第一段识别为标题：短且简洁，类似标题格式');
      return true;
    }
    
    console.log('第一段不符合标题特征，作为正文处理');
    return false;
  }

  /**
   * 通过深度分析检查标题
   */
  private checkTitleByDeepAnalysis(paragraphs: string[]): boolean {
    if (paragraphs.length === 0) return false;
    
    const firstParagraph = paragraphs[0].trim();
    
    // 如果第一段很短且不包含句号，可能是标题
    if (firstParagraph.length < 30 && !firstParagraph.includes('。') && 
        !firstParagraph.includes('.') && paragraphs.length > 1) {
      console.log('深度分析：第一段识别为标题（短且无句号）');
      return true;
    }
    
    return false;
  }

  /**
   * 处理段落信息
   */
  private processParagraphs(
    result: DocxAnalysisResult, 
    paragraphs: string[], 
    paragraphInfoMap: Record<number, ParagraphInfo>
  ) {
    paragraphs.forEach((text, index) => {
      let paragraphStyles: FontInfo[] = [];
      
      // 优先使用深度检测的字体信息
      if (result.deepFontAnalysis?.paragraphFonts.has(index)) {
        paragraphStyles = result.deepFontAnalysis.paragraphFonts.get(index)!.map((fontInfo, j) => ({
          name: fontInfo.name,
          size: fontInfo.size,
          isBold: fontInfo.isBold,
          isItalic: fontInfo.isItalic,
          isUnderline: fontInfo.isUnderline,
          color: fontInfo.color,
          alignment: fontInfo.alignment,
          originalStyleKey: `deep-p-${index}-r-${j}`
        }));
      } 
      else if (paragraphInfoMap[index]) {
        paragraphStyles = paragraphInfoMap[index].textRuns.map(run => ({
          name: run.name,
          size: run.size,
          isBold: run.isBold,
          isItalic: run.isItalic,
          isUnderline: run.isUnderline,
          color: run.color,
          alignment: run.alignment,
          originalStyleKey: run.originalStyleKey
        }));
      } 
      else {
        paragraphStyles = [{
          name: index === 0 ? '默认标题字体' : '默认正文字体',
          size: index === 0 ? 16 : 12,
          isBold: index === 0,
          isItalic: false,
          isUnderline: false,
          alignment: index === 0 ? 'center' : 'left',
          originalStyleKey: index === 0 ? 'default-title' : `default-body-${index}`
        }];
      }

      const paragraph = {
        text,
        index,
        isTitle: index === 0,
        isAuthor: index === 1 && result.author?.exists,
        styles: paragraphStyles
      };
      
      result.paragraphs.push(paragraph);
      
      // 收集正文样式
      if (!paragraph.isTitle && !paragraph.isAuthor && paragraph.styles) {
        paragraph.styles.forEach(style => {
          const existingStyleIndex = result.bodyStyles.findIndex(s => 
            s.name === style.name && 
            s.size === style.size && 
            s.isBold === style.isBold && 
            s.isItalic === style.isItalic && 
            s.isUnderline === style.isUnderline &&
            ((s.color === style.color) || (!s.color && !style.color)) &&
            ((s.alignment === style.alignment) || (!s.alignment && !style.alignment))
          );
            
          if (existingStyleIndex === -1) {
            console.log(`添加正文样式: ${style.name || '未命名'}, 大小: ${style.size || '未知'}, 粗体: ${style.isBold}`);
            result.bodyStyles.push(style);
          }
        });
      }
    });
  }

  /**
   * 样式去重
   */
  private deduplicateStyles(result: DocxAnalysisResult) {
    if (result.bodyStyles && result.bodyStyles.length > 1) {
      const unique = [];
      const seen = new Set();
      for (const style of result.bodyStyles) {
        if (!style.name || style.name === 'undefined') {
          style.name = '默认字体';
        }
        
        const key = JSON.stringify({
          name: style.name,
          size: style.size,
          isBold: style.isBold,
          isItalic: style.isItalic,
          isUnderline: style.isUnderline,
          color: style.color,
          alignment: style.alignment
        });
        
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(style);
        }
      }
      
      console.log(`样式去重: 原有${result.bodyStyles.length}个样式，去重后剩余${unique.length}个样式`);
      result.bodyStyles = unique;
    }
  }

  /**
   * 从 docx4js 解析对象中提取样式信息
   */
  private async extractStyleInfo(docx: DocxDocument): Promise<Record<number, ParagraphInfo>> {
    const paragraphInfoMap: Record<number, ParagraphInfo> = {};
    let paragraphIndex = 0;
    
    try {
      if (docx && typeof docx.parse === 'function') {
        const parseFn = docx.parse.bind(docx);
        await parseFn((node: DocxNode) => {
          if (node.tag === 'w:p') {
            const textRuns: TextRunInfo[] = [];
            let paragraphText = '';
            
            const alignment = node.style?.align;
            const textRunNodes = node.children?.filter((child: DocxNode) => child.tag === 'w:r') || [];
            
            for (const run of textRunNodes) {
              try {
                let text = '';
                const textNodes = run.children?.filter((child: DocxNode) => child.tag === 'w:t') || [];
                for (const textNode of textNodes) {
                  if (textNode.val) {
                    text += typeof textNode.val === 'string' ? textNode.val : String(textNode.val);
                  }
                }
                
                if (text) {
                  paragraphText += text;
                  
                  // 提取样式信息
                  const styleObj = run.style ? { ...run.style } : {};
                  
                  const textRunInfo: TextRunInfo = {
                    text,
                    name: (typeof styleObj.font === 'string' ? styleObj.font : undefined) || '默认字体',
                    size: typeof styleObj.size === 'string' ? parseFloat(styleObj.size) : 
                          typeof styleObj.size === 'number' ? styleObj.size : undefined,
                    isBold: Boolean(styleObj.bold),
                    isItalic: Boolean(styleObj.italic),
                    isUnderline: Boolean(styleObj.underline),
                    color: typeof styleObj.color === 'string' ? styleObj.color : undefined,
                    alignment: this.mapAlignment(typeof alignment === 'string' ? alignment : undefined),
                    originalStyleKey: `p-${paragraphIndex}-r-${textRuns.length}`
                  };
                  
                  textRuns.push(textRunInfo);
                }
              } catch (error) {
                console.warn('处理文本运行时出错:', error);
              }
            }
            
            if (paragraphText.length > 0) {
              paragraphInfoMap[paragraphIndex] = {
                text: paragraphText,
                textRuns,
                alignment: this.mapAlignment(alignment),
                originalStyleKey: `p-${paragraphIndex}`
              };
            }
            paragraphIndex++;
          }
          
          return true;
        });
      } else {
        console.warn('docx对象无效或parse方法不可用');
      }
    } catch (error) {
      console.warn('提取样式信息时出错:', error);
    }
    
    return paragraphInfoMap;
  }

  /**
   * 将 docx4js 的对齐方式映射到 FontInfo 中的对齐方式
   */
  private mapAlignment(align: string | undefined): string | undefined {
    if (!align) return undefined;
    
    console.log(`映射对齐方式: ${align}`);
    
    switch (align.toLowerCase()) {
      case 'center':
        return 'center';
      case 'right':
        return 'right';
      case 'justify':
        return 'justify';
      case 'left':
      default:
        return 'left';
    }
  }
} 