/**
 * 集成版DocxProcessor
 * 结合了增强版处理器的所有功能和深度字体检测能力
 */
import { 
  Document, Packer, Paragraph, 
  AlignmentType, UnderlineType
} from 'docx';
import mammoth from 'mammoth';
import * as fs from 'fs/promises';
import docx4js, { DocxDocument, DocxNode } from 'docx4js';
import { DeepFontDetector } from './deep-font-detector'; 

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
  deepFontAnalysis?: DeepFontAnalysisResult; // 新增：深度字体分析结果
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

export default class DocxProcessor {
  /**
   * 解析 docx 文件，提取标题、作者、正文和字体信息
   * 同时使用深度字体检测器提取更准确的字体信息
   */  
  async analyzeDocument(filePath: string, useDeepDetection: boolean = true): Promise<DocxAnalysisResult> {
    try {      
      // 使用 mammoth.js 提取文本内容
      const { value: extractedText } = await mammoth.extractRawText({ path: filePath });
      
      // 基本解析结果
      const result: DocxAnalysisResult = {
        paragraphs: [],
        bodyStyles: [],
        wordCount: this.countWords(extractedText)
      };
      
      // 解析段落
      const paragraphs = extractedText.split('\n').filter(p => p.trim().length > 0);
      
      // 使用 docx4js 提取详细的样式信息
      const docx = await docx4js.load(filePath);
      
      // 确保docx对象成功加载
      if (!docx) {
        console.error('docx对象加载失败');
        throw new Error('文档格式无法解析');
      }
      
      const paragraphInfoMap = await this.extractStyleInfo(docx);
      
      // 使用深度字体检测器提取更精确的字体信息
      if (useDeepDetection) {
        try {
          console.log('开始使用深度字体检测...');
          const deepDetector = new DeepFontDetector();
          const deepAnalysisResult = await deepDetector.analyzeDocx(filePath);
          
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
          // 这将增强原有的段落样式信息，使用更准确的字体信息替换默认值
          for (let i = 0; i < paragraphs.length; i++) {
            if (deepAnalysisResult.paragraphFonts.has(i)) {
              const deepFontInfoList = deepAnalysisResult.paragraphFonts.get(i)!;
              
              // 如果有深度字体信息，优先使用它来更新标题样式
              if (i === 0 && deepFontInfoList.length > 0) {
                if (!paragraphInfoMap[0]) {
                  paragraphInfoMap[0] = {
                    text: paragraphs[0],
                    textRuns: [],
                    originalStyleKey: 'p-0'
                  };
                }
                
                // 创建文本运行信息，将深度检测的字体信息集成进来
                const textRuns: TextRunInfo[] = deepFontInfoList.map((fontInfo, j) => ({
                  text: j === 0 ? paragraphs[0] : '', // 只有第一个run包含文本，避免重复
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
          // 即使深度检测失败，也继续使用常规方法
        }
      }
      
      if (paragraphs.length > 0) {
        // 假设第一段是标题
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
        
        // 尝试识别作者信息
        // 1. 检查第二段是否短且可能是作者名
        if (paragraphs.length > 1 && paragraphs[1].length < 30) {
          // 通过特定模式识别作者，如括号内的名字或以特定字符开头的内容
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
        
        // 收集段落信息
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
          // 回退到常规检测的字体信息
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
          // 如果两种方法都没有检测到，使用默认值
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
            // 收集段落中的所有样式，而不仅仅是第一个
            paragraph.styles.forEach(style => {
              // 检查样式是否已存在
              const existingStyleIndex = result.bodyStyles.findIndex(s => 
                s.name === style.name && 
                s.size === style.size && 
                s.isBold === style.isBold && 
                s.isItalic === style.isItalic && 
                s.isUnderline === style.isUnderline &&
                // 修复color属性比较的类型安全问题
                ((s.color === style.color) || (!s.color && !style.color)) &&
                // 修复alignment属性比较的类型安全问题
                ((s.alignment === style.alignment) || (!s.alignment && !style.alignment))
              );
                
              if (existingStyleIndex === -1) {
                console.log(`添加正文样式: ${style.name || '未命名'}, 大小: ${style.size || '未知'}, 粗体: ${style.isBold}`);
                result.bodyStyles.push(style);
              }
            });
          }
        });
        
        // 构建正文 (去除标题和作者)
        const startIndex = result.author?.exists ? 2 : 1;
        result.bodyText = paragraphs.slice(startIndex).join('\n\n');
      }
      
      // 提取图片信息
      try {
        // 再次检查docx对象是否有效，防止在提取样式后变为undefined
        if (docx && typeof docx.parse === 'function') {
          const images = await this.extractImages(docx);
          if (images.length > 0) {
            result.images = images;
          }
        } else {
          console.warn('无法提取图片：docx对象无效');
        }
      } catch (imgError) {
        console.warn('提取图片时出错:', imgError);
      }      
      
      // 样式去重：正文样式完全一致的只保留一个
      if (result.bodyStyles && result.bodyStyles.length > 1) {
        const unique = [];
        const seen = new Set();
        for (const style of result.bodyStyles) {
          if (!style.name || style.name === 'undefined') {
            style.name = '默认字体'; // 将未定义的字体名称替换为更友好的显示文本
          }
          
          // 只比较核心属性 - 更高效的对比方式
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
   * 获取文档的所有字体信息 (使用深度检测)
   * 返回文档中所有使用的字体及其使用情况
   */
  async getFontUsage(filePath: string): Promise<Map<string, { count: number, samples: string[] }>> {
    try {
      // 使用深度字体检测
      const analysis = await this.analyzeDocument(filePath, true);
      
      if (analysis.deepFontAnalysis?.fonts) {
        return analysis.deepFontAnalysis.fonts;
      }
      
      // 如果没有深度分析结果，返回空Map
      return new Map();
    } catch (error) {
      console.error('获取字体使用情况时出错:', error);
      throw new Error(`获取字体使用情况失败: ${error instanceof Error ? error.message : String(error)}`);
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
          authorText = authorText + authorOptions.addSuffix;
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
  
  /**
   * 提取 docx 文档中的样式信息
   */
  private async extractStyleInfo(docx: DocxDocument): Promise<Record<number, ParagraphInfo>> {
    const paragraphInfoMap: Record<number, ParagraphInfo> = {};
    
    try {
      // 遍历文档中的段落
      let paragraphIndex = 0;
      
      // 确保docx对象存在且其parse方法可用
      if (docx && typeof docx.parse === 'function') {
        await docx.parse((node: DocxNode) => {
          // 检查是否是段落节点
          if (node.tag === 'w:p') {
            const textRuns: TextRunInfo[] = [];
            let paragraphText = '';
            
            // 提取段落级别的样式
            const alignment = node.style?.align;
            
            // 查找段落中的文本运行(text runs)
            const textRunNodes = node.children?.filter((child: DocxNode) => child.tag === 'w:r') || [];
            
            // 遍历所有文本运行，提取每个运行的样式和文本内容
            for (const run of textRunNodes) {
              try {
                // 提取文本内容
                let text = '';
                const textNodes = run.children?.filter((child: DocxNode) => child.tag === 'w:t') || [];
                for (const textNode of textNodes) {
                  if (textNode.val) {
                    // 确保val是字符串
                    text += typeof textNode.val === 'string' ? textNode.val : String(textNode.val);
                  }
                }
                
                // 寻找 rFonts 信息（包含在 w:rPr 节点中）
                const rPrNode = run.children?.find((child: DocxNode) => child.tag === 'w:rPr');
                let rFonts: { eastAsia?: string; ascii?: string; hAnsi?: string } | undefined = undefined;
                
                if (rPrNode && rPrNode.children) {
                  // 尝试获取字体信息
                  const rFontsNode = rPrNode.children.find((child: DocxNode) => child.tag === 'w:rFonts');
                  
                  if (rFontsNode) {
                    // 增强字体检测 - 处理不同格式的属性值
                    // 检查是否存在对象形式的val
                    const valObj = typeof rFontsNode.val === 'object' && rFontsNode.val ? rFontsNode.val : {};
                    // 构建字体信息，优先使用直接属性，回退到val对象内的属性
                    rFonts = {
                      eastAsia: rFontsNode.eastAsia || (valObj as Record<string, string>)?.eastAsia,
                      ascii: rFontsNode.ascii || (valObj as Record<string, string>)?.ascii,
                      hAnsi: rFontsNode.hAnsi || (valObj as Record<string, string>)?.hAnsi
                    };
                    // 遍历所有属性，查找可能包含字体信息的属性
                    for (const key in rFontsNode) {
                      if (typeof key === 'string' && key !== 'tag' && key !== 'val' && 
                          key !== 'eastAsia' && key !== 'ascii' && key !== 'hAnsi' && 
                          key !== 'children' && typeof rFontsNode[key as keyof typeof rFontsNode] === 'string') {
                        console.log(`字体相关属性: ${key} = ${rFontsNode[key as keyof typeof rFontsNode]}`);
                        
                        // 如果属性名包含特定关键字，可能是字体信息
                        if (key.toLowerCase().includes('font') || 
                            key.toLowerCase().includes('asia') || 
                            key.toLowerCase().includes('hansi')) {
                          if (!rFonts.eastAsia) rFonts.eastAsia = rFontsNode[key as keyof typeof rFontsNode] as string;
                        }
                      }
                    }
                    
                    // 调试输出
                    if (rFonts.eastAsia) {
                      console.log(`发现中文字体: ${rFonts.eastAsia}`);
                    }
                  }
                }
                
                // 如果文本运行有内容，保存其样式信息
                if (text) {
                  paragraphText += text;
                  
                  // 提取字体信息，优先获取中文字体设置
                  const styleObj: {
                    eastAsia?: string; 
                    ascii?: string; 
                    hAnsi?: string;
                    font?: string; 
                    size?: string; 
                    bold?: boolean; 
                    italic?: boolean; 
                    underline?: boolean; 
                    color?: string;                  
                    rFonts?: {
                      eastAsia?: string;
                      ascii?: string;
                      hAnsi?: string;
                    };
                  } = run.style ? { ...run.style as Record<string, unknown> } : {};
                  
                  // 合并 rFonts 信息到 styleObj
                  if (rFonts) {
                    styleObj.rFonts = rFonts;
                  }
                  
                  // 获取字体名称，优先顺序：rFonts.eastAsia > eastAsia > font > rFonts.hAnsi > hAnsi > rFonts.ascii > ascii
                  let fontName = 
                    (styleObj.rFonts?.eastAsia) || 
                    styleObj.eastAsia || 
                    styleObj.font || 
                    (styleObj.rFonts?.hAnsi) ||
                    styleObj.hAnsi ||
                    (styleObj.rFonts?.ascii) ||
                    styleObj.ascii ||
                    '默认字体'; // 确保始终有字体名称
                  
                  // 调试字体检测
                  console.log(`检测到字体: "${fontName}", 文本: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
                  
                  // 如果字体名含有特殊字符或过长，可能是编码问题，尝试提取有效部分
                  if (fontName && (fontName.includes('+') || fontName.length > 20)) {
                    // 尝试提取更可能是真实字体名的部分
                    const cleanedNameParts = fontName.split('+');
                    const cleanedName = cleanedNameParts.length > 1 
                      ? cleanedNameParts[cleanedNameParts.length - 1]
                          .split('_').join(' ')
                          .replace(/([A-Z])/g, ' $1').trim()
                      : fontName;
                    
                    if (cleanedName) {
                      console.log(`清理后的字体名: "${cleanedName}"`);
                      fontName = cleanedName;
                    }
                  }
                
                  const textRunInfo: TextRunInfo = {
                    text,
                    name: fontName,
                    size: styleObj.size ? parseFloat(styleObj.size) : undefined,
                    isBold: !!styleObj.bold,
                    isItalic: !!styleObj.italic,
                    isUnderline: !!styleObj.underline,
                    color: styleObj.color,
                    alignment: this.mapAlignment(alignment),
                    originalStyleKey: `p-${paragraphIndex}-r-${textRuns.length}`
                  };
                  
                  textRuns.push(textRunInfo);
                }
              } catch (error) {
                console.warn('处理文本运行时出错:', error);
              }
            }
            
            // 如果段落有文本内容，保存其信息
            if (paragraphText.length > 0) {
              paragraphInfoMap[paragraphIndex] = {
                text: paragraphText,
                textRuns,
                alignment: this.mapAlignment(alignment), // 段落对齐
                originalStyleKey: `p-${paragraphIndex}`
              };
            }
            paragraphIndex++;
          }
          
          return true; // 继续遍历
        });
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
    
    console.log(`映射对齐方式: ${align}`); // 增加日志输出
    
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
  
  /**
   * 提取文档中的所有图片
   * @param docx Docx解析对象
   * @returns 提取的图片数组
   */
  async extractImages(docx: DocxDocument): Promise<{
    name: string;
    base64Data?: string;
    paragraphIndex?: number;
  }[]> {
    const images: {
      name: string;
      base64Data?: string;
      paragraphIndex?: number;
    }[] = [];
    
    try {
      let currentParagraphIndex = 0;
      
      // 修复: 确保docx对象存在且其parse方法可用
      if (docx && typeof docx.parse === 'function') {
        await docx.parse((node: DocxNode) => {
          if (node.tag === 'w:p') {
            currentParagraphIndex++;
          }
        
          // 检查是否是图片节点
          if (node.tag === 'w:drawing' || node.tag === 'w:pict') {
            // 增加健壮性检查，确保node.children是有效的数组
            if (!node.children || !Array.isArray(node.children)) {
              return true; // 没有子节点，继续遍历
            }
            
            // 找到图片数据
            const imageNode = node.children.find((child: DocxNode) => 
              child && (child.tag === 'w:binData' || child.tag === 'v:imagedata')
            );
            
            if (imageNode && imageNode.val) {
              const imageName = `image_${images.length + 1}`;
              
              // 提取图片数据
              const imageData = {
                name: imageName,
                base64Data: `data:image/png;base64,${imageNode.val}`, // 假设是PNG格式
                paragraphIndex: currentParagraphIndex
              };
              
              images.push(imageData);
            }
          }
          
          return true; // 继续遍历
        });
      }
    } catch (error) {
      console.warn('提取图片时出错:', error);
    }
    
    return images;
  }
}
