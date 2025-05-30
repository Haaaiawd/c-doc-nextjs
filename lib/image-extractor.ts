/**
 * 图片提取器 - 使用JSZip解析docx文件
 * 避免docx4js的稳定性问题，直接操作ZIP结构
 */
import JSZip from 'jszip';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExtractedImage {
  name: string;
  base64Data: string;
  mimeType: string;
  size: number;
  paragraphIndex?: number;
  relationshipId?: string;
}

export interface ImageExtractionResult {
  images: ExtractedImage[];
  imageRelationships: Map<string, string>; // relationshipId -> imageName
  totalCount: number;
}

export class ImageExtractor {
  
  /**
   * 从docx文件中提取所有图片
   * @param filePath docx文件路径
   * @returns 提取的图片信息
   */
  async extractImages(filePath: string): Promise<ImageExtractionResult> {
    try {
      console.log('开始提取图片:', filePath);
      
      // 读取docx文件
      const fileBuffer = await fs.readFile(filePath);
      return await this.extractImagesFromBuffer(fileBuffer);
    } catch (error) {
      console.error('提取图片时出错:', error);
      throw new Error(`图片提取失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 从buffer中提取图片
   * @param buffer docx文件的buffer
   * @returns 提取的图片信息
   */
  async extractImagesFromBuffer(buffer: Buffer): Promise<ImageExtractionResult> {
    const result: ImageExtractionResult = {
      images: [],
      imageRelationships: new Map(),
      totalCount: 0
    };

    try {
      // 使用JSZip解析docx文件
      const zip = await JSZip.loadAsync(buffer);
      
      // 1. 提取media文件夹中的图片
      const mediaImages = await this.extractMediaImages(zip);
      
      // 2. 提取图片关系映射
      const relationships = await this.extractImageRelationships(zip);
      
      // 3. 解析document.xml中的图片引用
      const imageReferences = await this.extractImageReferences(zip);
      
      // 4. 合并信息
      result.images = mediaImages;
      result.imageRelationships = relationships;
      result.totalCount = mediaImages.length;
      
      // 5. 尝试匹配图片与段落位置（基于引用关系）
      this.matchImagesToParagraphs(result, imageReferences);
      
      console.log(`成功提取${result.totalCount}张图片`);
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
   * 提取图片关系映射（从word/_rels/document.xml.rels）
   */
  private async extractImageRelationships(zip: JSZip): Promise<Map<string, string>> {
    const relationships = new Map<string, string>();
    
    try {
      const relsFile = zip.file('word/_rels/document.xml.rels');
      if (!relsFile) {
        console.log('未找到关系文件');
        return relationships;
      }

      const relsXml = await relsFile.async('text');
      
      // 解析XML中的关系
      // 查找类型为图片的关系
      const imageRelRegex = /<Relationship[^>]*Id="([^"]*)"[^>]*Type="[^"]*image[^"]*"[^>]*Target="([^"]*)"/gi;
      let match;
      
      while ((match = imageRelRegex.exec(relsXml)) !== null) {
        const relationshipId = match[1];
        const target = match[2];
        const imageName = path.basename(target);
        
        relationships.set(relationshipId, imageName);
        console.log(`发现图片关系: ${relationshipId} -> ${imageName}`);
      }
    } catch (error) {
      console.warn('提取图片关系时出错:', error);
    }

    return relationships;
  }

  /**
   * 从document.xml中提取图片引用信息
   */
  private async extractImageReferences(zip: JSZip): Promise<Array<{
    relationshipId: string;
    paragraphIndex?: number;
  }>> {
    const references: Array<{
      relationshipId: string;
      paragraphIndex?: number;
    }> = [];

    try {
      const docFile = zip.file('word/document.xml');
      if (!docFile) {
        console.log('未找到document.xml文件');
        return references;
      }

      const docXml = await docFile.async('text');
      
      // 简化的解析：查找图片引用
      // 在真实的docx中，图片通常在<a:blip>标签中通过r:embed属性引用
      const imageRefRegex = /<a:blip[^>]*r:embed="([^"]*)"/gi;
      
      // 按段落分割来估算位置
      const paragraphs = docXml.split('<w:p>');
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i];
        const imgMatches = paragraph.match(imageRefRegex);
        
        if (imgMatches) {
          for (const imgMatch of imgMatches) {
            const relMatch = imgMatch.match(/r:embed="([^"]*)"/);
            if (relMatch) {
              references.push({
                relationshipId: relMatch[1],
                paragraphIndex: i
              });
            }
          }
        }
      }
      
      console.log(`发现${references.length}个图片引用`);
    } catch (error) {
      console.warn('提取图片引用时出错:', error);
    }

    return references;
  }

  /**
   * 匹配图片到段落位置
   */
  private matchImagesToParagraphs(
    result: ImageExtractionResult, 
    references: Array<{relationshipId: string; paragraphIndex?: number}>
  ) {
    for (const ref of references) {
      const imageName = result.imageRelationships.get(ref.relationshipId);
      if (imageName) {
        const image = result.images.find(img => img.name === imageName);
        if (image && ref.paragraphIndex !== undefined) {
          image.paragraphIndex = ref.paragraphIndex;
          image.relationshipId = ref.relationshipId;
          console.log(`匹配图片${imageName}到段落${ref.paragraphIndex}`);
        }
      }
    }
  }

  /**
   * 检查文件是否是图片
   */
  private isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.svg'];
    const ext = path.extname(fileName.toLowerCase());
    return imageExtensions.includes(ext);
  }

  /**
   * 根据文件扩展名获取MIME类型
   */
  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName.toLowerCase());
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml',
    };
    
    return mimeTypes[ext] || 'image/png';
  }
}

export default ImageExtractor; 