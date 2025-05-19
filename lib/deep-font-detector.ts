/**
 * 深度字体检测器
 * 专注于从DOCX内部XML结构中提取精确的字体信息
 */
import * as fs from 'fs';
import * as JSZip from 'jszip';
import { DOMParser } from 'xmldom';
import { FontInfo } from './docx-processor-integrated';

export interface StyleInfo {
  id: string;
  name: string;
  fonts: {
    eastAsia?: string;
    ascii?: string;
    hAnsi?: string;
    cs?: string;
  };
  size?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  color?: string;
  basedOn?: string;
}

export interface StyleElementInfo {
  type: 'paragraph' | 'character' | 'table' | 'numbering';
  id: string;
  name?: string;
  basedOn?: string;
  next?: string;
  properties: Record<string, unknown>;
}

export class DeepFontDetector {
  private styleMap: Map<string, StyleInfo> = new Map();
  private defaultFonts: {
    eastAsia?: string;
    ascii?: string;
    hAnsi?: string;
    cs?: string;
  } = {};
  private xmlParser = new DOMParser();
  
  /**
   * 从DOCX文件中提取详细的字体和样式信息
   */
  public async analyzeDocx(filePath: string): Promise<{ 
    styles: StyleInfo[],
    paragraphFonts: Map<number, FontInfo[]>,
    defaultFonts: Record<string, string>
  }> {
    console.log(`深度分析文档字体: ${filePath}`);
    
    try {      // 读取DOCX文件（实际上是ZIP文件）
      const fileData = await fs.promises.readFile(filePath);
      const zip = await JSZip.loadAsync(fileData);
      
      // 解析样式表
      await this.parseStyles(zip);
      
      // 解析文档内容
      const paragraphFonts = await this.parseDocumentContent(zip);
      
      return {
        styles: Array.from(this.styleMap.values()),
        paragraphFonts,
        defaultFonts: {
          // 修复默认字体设置，不再使用"默认字体"替代实际字体名称
          eastAsia: this.defaultFonts.eastAsia || '等线', // 使用"等线"作为默认中文字体
          ascii: this.defaultFonts.ascii || 'Times New Roman',
          hAnsi: this.defaultFonts.hAnsi || 'Times New Roman',
          cs: this.defaultFonts.cs || 'Times New Roman'
        }
      };
    } catch (error) {
      console.error('深度字体分析失败:', error);
      throw new Error(`字体分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }  /**
   * 解析DOCX中的样式表
   */
  private async parseStyles(zip: unknown): Promise<void> {
    try {
      // 提取styles.xml
      const jsZip = zip as {
        file: (path: string) => { async: (type: string) => Promise<string> } | null;
      };
      const stylesXml = await jsZip.file('word/styles.xml')?.async('text');
      if (!stylesXml) {
        console.warn('文档中没有找到styles.xml');
        return;
      }
      
      // 解析XML
      const doc = this.xmlParser.parseFromString(stylesXml, 'text/xml');
      
      // 解析默认字体
      this.parseDocDefaultsAndTheme(doc);
      
      // 解析样式定义
      const styles = doc.getElementsByTagName('w:style');
      for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        const type = style.getAttribute('w:type');
        const styleId = style.getAttribute('w:styleId');
        
        if (styleId) {
          const styleInfo = this.parseStyle(style);
          this.styleMap.set(styleId, styleInfo);
          
          console.log(`解析到样式: ID=${styleId}, 名称=${styleInfo.name}, 类型=${type}`);
          if (styleInfo.fonts.eastAsia) {
            console.log(`  - 中文字体: ${styleInfo.fonts.eastAsia}`);
          }
        }
      }
      
      // 解析样式继承关系
      this.resolveStyleInheritance();
      
    } catch (error) {
      console.warn('解析样式表时出错:', error);
    }
  }
  
  /**
   * 解析文档默认设置和主题
   */
  private parseDocDefaultsAndTheme(doc: Document): void {
    try {
      // 解析docDefaults
      const docDefaults = doc.getElementsByTagName('w:docDefaults')[0];
      if (docDefaults) {
        const rPrDefault = docDefaults.getElementsByTagName('w:rPrDefault')[0];
        if (rPrDefault) {
          const rPr = rPrDefault.getElementsByTagName('w:rPr')[0];
          if (rPr) {
            // 获取默认字体
            const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
            if (rFonts) {
              this.defaultFonts = {
                eastAsia: rFonts.getAttribute('w:eastAsia') || undefined,
                ascii: rFonts.getAttribute('w:ascii') || undefined,
                hAnsi: rFonts.getAttribute('w:hAnsi') || undefined,
                cs: rFonts.getAttribute('w:cs') || undefined
              };
              
              console.log('文档默认字体:', this.defaultFonts);
            }
          }
        }
      }
    } catch (error) {
      console.warn('解析文档默认设置时出错:', error);
    }
  }
  
  /**
   * 解析单个样式定义
   */
  private parseStyle(styleNode: Element): StyleInfo {
    const styleId = styleNode.getAttribute('w:styleId') || '';
    let styleName = '';
    
    // 获取样式名称
    const nameNode = styleNode.getElementsByTagName('w:name')[0];
    if (nameNode) {
      styleName = nameNode.getAttribute('w:val') || styleId;
    }
    
    // 获取基于的样式
    let basedOn = undefined;
    const basedOnNode = styleNode.getElementsByTagName('w:basedOn')[0];
    if (basedOnNode) {
      basedOn = basedOnNode.getAttribute('w:val') || undefined;
    }
    
    // 获取字体信息
    const rPr = styleNode.getElementsByTagName('w:rPr')[0];
    const fonts = {
      eastAsia: undefined as string | undefined,
      ascii: undefined as string | undefined,
      hAnsi: undefined as string | undefined,
      cs: undefined as string | undefined
    };
    
    let size: number | undefined = undefined;
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let color: string | undefined = undefined;
    
    if (rPr) {
      // 字体
      const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
      if (rFonts) {
        fonts.eastAsia = rFonts.getAttribute('w:eastAsia') || undefined;
        fonts.ascii = rFonts.getAttribute('w:ascii') || undefined;
        fonts.hAnsi = rFonts.getAttribute('w:hAnsi') || undefined;
        fonts.cs = rFonts.getAttribute('w:cs') || undefined;
      }
      
      // 字号
      const szNode = rPr.getElementsByTagName('w:sz')[0];
      if (szNode) {
        const szVal = szNode.getAttribute('w:val');
        if (szVal) {
          // Word中的字号是磅值的2倍
          size = parseInt(szVal, 10) / 2;
        }
      }
      
      // 粗体
      const bNode = rPr.getElementsByTagName('w:b')[0];
      if (bNode) {
        isBold = bNode.getAttribute('w:val') !== 'false';
      }
      
      // 斜体
      const iNode = rPr.getElementsByTagName('w:i')[0];
      if (iNode) {
        isItalic = iNode.getAttribute('w:val') !== 'false';
      }
      
      // 下划线
      const uNode = rPr.getElementsByTagName('w:u')[0];
      if (uNode) {
        isUnderline = uNode.getAttribute('w:val') !== 'none';
      }
      
      // 颜色
      const colorNode = rPr.getElementsByTagName('w:color')[0];
      if (colorNode) {
        color = colorNode.getAttribute('w:val') || undefined;
      }
    }
    
    return {
      id: styleId,
      name: styleName,
      fonts,
      size,
      isBold,
      isItalic,
      isUnderline,
      color,
      basedOn
    };
  }
    /**
   * 解析文档内容，提取段落及其字体信息
   */
  private async parseDocumentContent(zip: unknown): Promise<Map<number, FontInfo[]>> {
    const paragraphFonts = new Map<number, FontInfo[]>();
    
    try {
      // 提取document.xml
      const jsZip = zip as {
        file: (path: string) => { async: (type: string) => Promise<string> } | null;
      };
      const documentXml = await jsZip.file('word/document.xml')?.async('text');
      if (!documentXml) {
        console.warn('文档中没有找到document.xml');
        return paragraphFonts;
      }
      
      // 解析XML
      const doc = this.xmlParser.parseFromString(documentXml, 'text/xml');
      
      // 获取所有段落
      const paragraphs = doc.getElementsByTagName('w:p');
      console.log(`文档共有 ${paragraphs.length} 个段落`);
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const fontInfoList: FontInfo[] = [];
        
        // 获取段落样式
        const pPr = paragraph.getElementsByTagName('w:pPr')[0];
        let paragraphStyleId = '';
        
        if (pPr) {
          const pStyle = pPr.getElementsByTagName('w:pStyle')[0];
          if (pStyle) {
            paragraphStyleId = pStyle.getAttribute('w:val') || '';
            console.log(`段落 ${i} 使用样式ID: ${paragraphStyleId}`);
            
            // 如果存在段落样式，添加它的字体信息
            if (paragraphStyleId && this.styleMap.has(paragraphStyleId)) {
              const styleInfo = this.styleMap.get(paragraphStyleId)!;
              
              // 使用中文字体优先，然后回退到其他字体
              const fontName = styleInfo.fonts.eastAsia || 
                styleInfo.fonts.hAnsi || 
                styleInfo.fonts.ascii || 
                this.defaultFonts.eastAsia || 
                this.defaultFonts.hAnsi;
              
              fontInfoList.push({
                name: fontName,
                size: styleInfo.size,
                isBold: styleInfo.isBold,
                isItalic: styleInfo.isItalic,
                isUnderline: styleInfo.isUnderline,
                color: styleInfo.color,
                alignment: this.getParagraphAlignment(pPr)
              });
            }
          }
        }
        
        // 获取段落中的所有文本运行
        const runs = paragraph.getElementsByTagName('w:r');
        for (let j = 0; j < runs.length; j++) {
          const run = runs[j];
          const rPr = run.getElementsByTagName('w:rPr')[0];
          
          // 提取文本内容
          let text = '';
          const textNodes = run.getElementsByTagName('w:t');
          for (let k = 0; k < textNodes.length; k++) {
            text += textNodes[k].textContent || '';
          }
            // 如果有文本内容且有样式，解析字体信息
          if (text && rPr) {
            const fontInfo: FontInfo = {
              name: '',
              size: undefined,
              isBold: false,
              isItalic: false,
              isUnderline: false,
              color: undefined,
              alignment: undefined
            };
            
            // 获取字体
            const rFonts = rPr.getElementsByTagName('w:rFonts')[0];
            if (rFonts) {
              // 保留原始的字体名称，不再使用默认字体替代
              fontInfo.name = rFonts.getAttribute('w:eastAsia') || 
                rFonts.getAttribute('w:hAnsi') || 
                rFonts.getAttribute('w:ascii') || 
                this.defaultFonts.eastAsia || 
                this.defaultFonts.hAnsi;
            } else if (paragraphStyleId && this.styleMap.has(paragraphStyleId)) {
              // 如果文本运行没有指定字体，从段落样式获取
              const styleInfo = this.styleMap.get(paragraphStyleId)!;
              fontInfo.name = styleInfo.fonts.eastAsia || 
                styleInfo.fonts.hAnsi || 
                styleInfo.fonts.ascii || 
                this.defaultFonts.eastAsia || 
                this.defaultFonts.hAnsi;
            }
            
            // 获取字号
            const szNode = rPr.getElementsByTagName('w:sz')[0];
            if (szNode) {
              const szVal = szNode.getAttribute('w:val');
              if (szVal) {
                fontInfo.size = parseInt(szVal, 10) / 2; // Word中的字号是磅值的2倍
              }
            }
            
            // 粗体
            const bNode = rPr.getElementsByTagName('w:b')[0];
            if (bNode) {
              fontInfo.isBold = bNode.getAttribute('w:val') !== 'false';
            }
            
            // 斜体
            const iNode = rPr.getElementsByTagName('w:i')[0];
            if (iNode) {
              fontInfo.isItalic = iNode.getAttribute('w:val') !== 'false';
            }
            
            // 下划线
            const uNode = rPr.getElementsByTagName('w:u')[0];
            if (uNode) {
              fontInfo.isUnderline = uNode.getAttribute('w:val') !== 'none';
            }
            
            // 颜色
            const colorNode = rPr.getElementsByTagName('w:color')[0];
            if (colorNode) {
              fontInfo.color = colorNode.getAttribute('w:val') || undefined;
            }
            
            // 对齐方式
            fontInfo.alignment = this.getParagraphAlignment(pPr);
            
            // 添加到结果列表
            fontInfoList.push(fontInfo);
            
            // 输出调试信息
            console.log(`段落 ${i}, 文本运行 ${j}: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}", 字体: ${fontInfo.name}, 大小: ${fontInfo.size || '默认'}`);
          }
        }
        
        // 保存段落的字体信息
        if (fontInfoList.length > 0) {
          paragraphFonts.set(i, fontInfoList);
        }
      }
    } catch (error) {
      console.warn('解析文档内容时出错:', error);
    }
    
    return paragraphFonts;
  }
  
  /**
   * 获取段落的对齐方式
   */
  private getParagraphAlignment(pPr: Element | null): string | undefined {
    if (!pPr) return undefined;
    
    const jcNode = pPr.getElementsByTagName('w:jc')[0];
    if (jcNode) {
      const jcVal = jcNode.getAttribute('w:val');
      switch (jcVal) {
        case 'center': return 'center';
        case 'right': return 'right';
        case 'justify': return 'justify';
        case 'left': default: return 'left';
      }
    }
    
    return undefined;
  }
  
  /**
   * 解析并处理样式继承关系
   */
  private resolveStyleInheritance(): void {
    // 递归函数，合并样式及其基础样式的属性
    const mergeWithBaseStyle = (styleId: string, visited = new Set<string>()): StyleInfo => {
      if (visited.has(styleId)) {
        console.warn(`检测到样式循环依赖: ${styleId}`);
        return this.styleMap.get(styleId) || {
          id: styleId,
          name: styleId,
          fonts: {},
          size: undefined,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          color: undefined,
          basedOn: undefined
        };
      }
      
      visited.add(styleId);
      
      const style = this.styleMap.get(styleId);
      if (!style) {
        console.warn(`找不到样式: ${styleId}`);
        return {
          id: styleId,
          name: styleId,
          fonts: {},
          size: undefined,
          isBold: false,
          isItalic: false,
          isUnderline: false,
          color: undefined,
          basedOn: undefined
        };
      }
      
      // 如果没有基础样式，直接返回当前样式
      if (!style.basedOn || !this.styleMap.has(style.basedOn)) {
        return style;
      }
      
      // 获取基础样式的继承属性
      const baseStyle = mergeWithBaseStyle(style.basedOn, new Set(visited));
      
      // 合并属性，当前样式的属性优先
      return {
        id: style.id,
        name: style.name,
        fonts: {
          eastAsia: style.fonts.eastAsia || baseStyle.fonts.eastAsia,
          ascii: style.fonts.ascii || baseStyle.fonts.ascii,
          hAnsi: style.fonts.hAnsi || baseStyle.fonts.hAnsi,
          cs: style.fonts.cs || baseStyle.fonts.cs
        },
        size: style.size !== undefined ? style.size : baseStyle.size,
        isBold: style.isBold !== undefined ? style.isBold : baseStyle.isBold,
        isItalic: style.isItalic !== undefined ? style.isItalic : baseStyle.isItalic,
        isUnderline: style.isUnderline !== undefined ? style.isUnderline : baseStyle.isUnderline,
        color: style.color || baseStyle.color,
        basedOn: style.basedOn
      };
    };
    
    // 处理所有样式
    for (const styleId of this.styleMap.keys()) {
      const resolvedStyle = mergeWithBaseStyle(styleId);
      this.styleMap.set(styleId, resolvedStyle);
    }
  }
}
