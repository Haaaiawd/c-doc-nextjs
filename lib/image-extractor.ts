/**
 * 图片提取器 - 增强版
 * 基于Python版本的图片定位技术，提供精确的段落级图片定位
 * 使用JSZip解析docx文件，避免docx4js的稳定性问题
 */
import JSZip from 'jszip';

export interface ExtractedImage {
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  paragraphIndex?: number;
  relationshipId?: string;
  runIndex?: number; // 在段落中的run索引
  xmlPosition?: number; // 在XML中的位置
}

export interface ImageRelationshipInfo {
  relationshipId: string;
  imageName: string;
  target: string;
  type: string;
}

export interface ParagraphImageInfo {
  paragraphIndex: number;
  images: {
    relationshipId: string;
    runIndex: number;
    xmlPosition: number;
  }[];
  textContent: string; // 段落的文本内容（用于调试）
}

export interface ImageExtractionResult {
  images: ExtractedImage[];
  imageRelationships: Map<string, string>; // relationshipId -> imageName
  relationshipDetails: ImageRelationshipInfo[]; // 详细的关系信息
  paragraphImages: ParagraphImageInfo[]; // 段落级图片映射
  totalCount: number;
  statistics: {
    totalParagraphs: number;
    paragraphsWithImages: number;
    totalImageReferences: number;
    matchedImages: number;
    unlocatedImages: number;
  };
}

export class ImageExtractor {
  
  /**
   * 从buffer中提取图片 - 增强版
   * @param buffer docx文件的buffer
   * @returns 提取的图片信息
   */
  async extractImagesFromBuffer(buffer: Buffer): Promise<ImageExtractionResult> {
    const result: ImageExtractionResult = {
      images: [],
      imageRelationships: new Map(),
      relationshipDetails: [],
      paragraphImages: [],
      totalCount: 0,
      statistics: {
        totalParagraphs: 0,
        paragraphsWithImages: 0,
        totalImageReferences: 0,
        matchedImages: 0,
        unlocatedImages: 0
      }
    };

    try {
      console.log('📦 解析DOCX文件结构...');
      // 使用JSZip解析docx文件
      const zip = await JSZip.loadAsync(buffer);
      
      // 1. 提取media文件夹中的图片
      console.log('🖼️  提取媒体图片...');
      const mediaImages = await this.extractMediaImages(zip);
      
      // 2. 提取详细的图片关系信息
      console.log('🔗 提取图片关系映射...');
      const relationshipDetails = await this.extractDetailedImageRelationships(zip);
      
      // 3. 精确解析文档结构和图片位置
      console.log('📍 分析图片位置信息...');
      const paragraphImages = await this.extractPreciseParagraphImages(zip, relationshipDetails);
      
      // 4. 精确匹配图片到位置
      console.log('🎯 执行精确图片位置匹配...');
      this.performPreciseImageMatching(result, mediaImages, relationshipDetails, paragraphImages);
      
      console.log('✅ 图片提取完成:', {
        总图片数: result.totalCount,
        总段落数: result.statistics.totalParagraphs,
        包含图片的段落: result.statistics.paragraphsWithImages,
        匹配成功: result.statistics.matchedImages,
        位置未知: result.statistics.unlocatedImages
      });
      
      return result;
    } catch (error) {
      console.error('解析docx文件时出错:', error);
      throw new Error(`文件解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 提取media文件夹中的图片文件
   */
  private async extractMediaImages(zip: JSZip): Promise<ExtractedImage[]> {
    const images: ExtractedImage[] = [];
    const mediaFolder = zip.folder('word/media');
    
    if (!mediaFolder) {
      console.log('未找到media文件夹，文档可能不包含图片');
      return images;
    }

    // 遍历media文件夹中的所有文件
    for (const [fileName, file] of Object.entries(mediaFolder.files)) {
      if (file.dir) continue; // 跳过目录
      
      try {
        // 检查是否是图片文件
        if (this.isImageFile(fileName)) {
          const imageBuffer = await file.async('nodebuffer');
          const mimeType = this.getMimeType(fileName);
          
          const extractedImage: ExtractedImage = {
            name: fileName,
            base64Data: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
            mimeType,
            size: imageBuffer.length,
          };
          
          images.push(extractedImage);
          console.log(`提取图片: ${fileName}, 大小: ${imageBuffer.length} bytes`);
        }
      } catch (error) {
        console.warn(`提取图片 ${fileName} 时出错:`, error);
      }
    }

    return images;
  }

  /**
   * 提取详细的图片关系信息 - 增强版
   */
  private async extractDetailedImageRelationships(zip: JSZip): Promise<ImageRelationshipInfo[]> {
    const relationships: ImageRelationshipInfo[] = [];
    
    try {
      const relsFile = zip.file('word/_rels/document.xml.rels');
      if (!relsFile) {
        console.log('⚠️  未找到关系文件');
        return relationships;
      }

      const relsXml = await relsFile.async('text');
      
      // 使用更精确的正则表达式解析关系
      const relationshipRegex = /<Relationship\s+([^>]*?)>/gi;
      let match;
      
      while ((match = relationshipRegex.exec(relsXml)) !== null) {
        const attributes = match[1];
        
        // 提取属性
        const idMatch = attributes.match(/Id="([^"]*)"/);
        const typeMatch = attributes.match(/Type="([^"]*)"/);
        const targetMatch = attributes.match(/Target="([^"]*)"/);
        
        if (idMatch && typeMatch && targetMatch) {
          const relationshipId = idMatch[1];
          const type = typeMatch[1];
          const target = targetMatch[1];
          
          // 检查是否是图片类型
          if (type.includes('image') || target.includes('media/')) {
            const imageName = target.split('/').pop() || target;
            
            relationships.push({
              relationshipId,
              imageName,
              target,
              type
            });
            
            console.log(`📎 发现图片关系: ${relationshipId} -> ${imageName} (${type})`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  提取图片关系时出错:', error);
    }

    return relationships;
  }

  /**
   * 精确提取段落中的图片信息 - 基于Python版本的实现
   */
  private async extractPreciseParagraphImages(
    zip: JSZip, 
    relationshipDetails: ImageRelationshipInfo[]
  ): Promise<ParagraphImageInfo[]> {
    const paragraphImages: ParagraphImageInfo[] = [];
    const validRelationshipIds = new Set(relationshipDetails.map(rel => rel.relationshipId));

    try {
      const docFile = zip.file('word/document.xml');
      if (!docFile) {
        console.log('⚠️  未找到document.xml文件');
        return paragraphImages;
      }

      const docXml = await docFile.async('text');
      
      // 1. 精确识别段落边界
      const paragraphRegex = /<w:p[^>]*?>[\s\S]*?<\/w:p>/gi;
      const paragraphMatches = Array.from(docXml.matchAll(paragraphRegex));
      
      console.log(`📄 文档中发现 ${paragraphMatches.length} 个段落`);
      
      // 2. 逐段落分析图片位置（模拟Python版本的逻辑）
      paragraphMatches.forEach((paragraphMatch, paragraphIndex) => {
        const paragraphContent = paragraphMatch[0];
        const paragraphStart = paragraphMatch.index || 0;
        
        // 提取段落的文本内容用于调试
        const textContent = this.extractTextFromParagraph(paragraphContent);
        
        // 3. 在段落内查找运行(run)
        const runRegex = /<w:r[^>]*?>[\s\S]*?<\/w:r>/gi;
        const runMatches = Array.from(paragraphContent.matchAll(runRegex));
        
        const paragraphImageInfo: ParagraphImageInfo = {
          paragraphIndex,
          images: [],
          textContent: textContent.substring(0, 100) + (textContent.length > 100 ? '...' : '')
        };
        
        // 4. 在每个run中查找图片引用（模拟Python的XML检测）
        runMatches.forEach((runMatch, runIndex) => {
          const runContent = runMatch[0];
          const runStart = runMatch.index || 0;
          
          // 检查是否包含图片标记（模拟Python的 <a:blip 检测）
          if (this.containsImageBlip(runContent)) {
            // 提取关系ID
            const relationshipIds = this.extractRelationshipIds(runContent);
            
            relationshipIds.forEach(relationshipId => {
              if (validRelationshipIds.has(relationshipId)) {
                paragraphImageInfo.images.push({
                  relationshipId,
                  runIndex,
                  xmlPosition: paragraphStart + runStart
                });
                
                console.log(`🎯 段落 ${paragraphIndex}, Run ${runIndex}: 发现图片 ${relationshipId}`);
                if (textContent) {
                  console.log(`   📝 段落内容: "${textContent.substring(0, 50)}..."`);
                }
              }
            });
          }
        });
        
        // 只记录包含图片的段落
        if (paragraphImageInfo.images.length > 0) {
          paragraphImages.push(paragraphImageInfo);
        }
      });
      
      console.log(`📊 分析完成: ${paragraphImages.length} 个段落包含图片`);
      
    } catch (error) {
      console.warn('⚠️  精确提取段落图片时出错:', error);
    }

    return paragraphImages;
  }

  /**
   * 检查run内容是否包含图片标记 - 模拟Python的 <a:blip 检测
   */
  private containsImageBlip(runContent: string): boolean {
    // 多种图片标记模式
    const imagePatterns = [
      /<a:blip/i,           // 标准的图片引用
      /<w:drawing/i,        // 绘图对象
      /<w:pict/i,           // 图片对象
      /<wp:inline/i,        // 内联图片
      /<wp:anchor/i,        // 锚定图片
      /r:embed=/i           // 嵌入引用
    ];
    
    return imagePatterns.some(pattern => pattern.test(runContent));
  }

  /**
   * 从run内容中提取关系ID - 模拟Python的正则表达式提取
   */
  private extractRelationshipIds(runContent: string): string[] {
    const relationshipIds: string[] = [];
    
    // 多种关系ID模式（模拟Python的 r:embed="(rId\d+)" ）
    const patterns = [
      /r:embed="(rId\d+)"/gi,
      /r:id="(rId\d+)"/gi,
      /r:link="(rId\d+)"/gi
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(runContent)) !== null) {
        const relationshipId = match[1];
        if (!relationshipIds.includes(relationshipId)) {
          relationshipIds.push(relationshipId);
        }
      }
    });
    
    return relationshipIds;
  }

  /**
   * 从段落XML中提取文本内容
   */
  private extractTextFromParagraph(paragraphContent: string): string {
    // 提取 <w:t> 标签中的文本
    const textRegex = /<w:t[^>]*?>(.*?)<\/w:t>/gi;
    const texts: string[] = [];
    let match;
    
    while ((match = textRegex.exec(paragraphContent)) !== null) {
      const text = match[1];
      if (text && text.trim()) {
        texts.push(text.trim());
      }
    }
    
    return texts.join(' ');
  }

  /**
   * 执行精确的图片位置匹配 - 整合所有信息
   */
  private performPreciseImageMatching(
    result: ImageExtractionResult,
    mediaImages: ExtractedImage[],
    relationshipDetails: ImageRelationshipInfo[],
    paragraphImages: ParagraphImageInfo[]
  ) {
    // 构建关系映射
    const relationshipMap = new Map<string, ImageRelationshipInfo>();
    relationshipDetails.forEach(rel => {
      relationshipMap.set(rel.relationshipId, rel);
      result.imageRelationships.set(rel.relationshipId, rel.imageName);
    });
    
    result.images = [...mediaImages];
    result.relationshipDetails = relationshipDetails;
    result.paragraphImages = paragraphImages;
    result.totalCount = mediaImages.length;
    
    // 统计信息
    result.statistics.totalParagraphs = paragraphImages.length > 0 ? 
      Math.max(...paragraphImages.map(p => p.paragraphIndex)) + 1 : 0;
    result.statistics.paragraphsWithImages = paragraphImages.length;
    result.statistics.totalImageReferences = paragraphImages.reduce(
      (sum, p) => sum + p.images.length, 0
    );
    
    let matchedCount = 0;
    
    // 精确匹配每个图片到段落位置
    for (const paragraphInfo of paragraphImages) {
      for (const imageRef of paragraphInfo.images) {
        const relationship = relationshipMap.get(imageRef.relationshipId);
        
        if (relationship) {
          // 查找对应的媒体图片
          const image = result.images.find(img => {
            const imgFileName = img.name.split('/').pop() || img.name;
            return imgFileName === relationship.imageName || 
                   img.name === relationship.imageName || 
                   img.name.endsWith(`/${relationship.imageName}`);
          });
          
          if (image) {
            // 设置精确位置信息
            image.paragraphIndex = paragraphInfo.paragraphIndex;
            image.relationshipId = imageRef.relationshipId;
            image.runIndex = imageRef.runIndex;
            image.xmlPosition = imageRef.xmlPosition;
            
            console.log(`✅ 精确匹配: ${image.name} -> 段落 ${paragraphInfo.paragraphIndex}, Run ${imageRef.runIndex}`);
            matchedCount++;
          } else {
            console.warn(`⚠️  未找到图片文件: ${relationship.imageName} (关系ID: ${imageRef.relationshipId})`);
          }
        }
      }
    }
    
    result.statistics.matchedImages = matchedCount;
    result.statistics.unlocatedImages = result.totalCount - matchedCount;
    
    console.log('📈 匹配统计:', {
      '总图片数': result.totalCount,
      '匹配成功': matchedCount,
      '位置未知': result.statistics.unlocatedImages,
      '匹配率': `${((matchedCount / result.totalCount) * 100).toFixed(1)}%`
    });
  }

  /**
   * 检查文件是否是图片
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
    const parts = fileName.toLowerCase().split('.');
    if (parts.length < 2) return false;
    const ext = `.${parts.pop()}`;
    return imageExtensions.includes(ext);
  }

  /**
   * 根据文件名获取MIME类型
   */
  private getMimeType(fileName: string): string {
    const parts = fileName.toLowerCase().split('.');
    const ext = parts.length > 1 ? `.${parts.pop()}` : undefined;
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml'
    };
    
    return ext ? mimeTypes[ext] || 'image/png' : 'image/png';
  }
}

export default ImageExtractor; 