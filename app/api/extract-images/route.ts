import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ImageExtractor } from '@/lib/image-extractor';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择要分析的docx文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return NextResponse.json(
        { error: '请上传.docx格式的文件' },
        { status: 400 }
      );
    }

    // 验证文件大小 (最大 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过20MB' },
        { status: 400 }
      );
    }

    console.log(`开始提取图片: ${file.name}, 大小: ${file.size} bytes`);

    // 创建临时文件
    const buffer = await file.arrayBuffer();
    const tempDir = path.join(process.cwd(), 'temp');
    
    // 确保临时目录存在
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
    await fs.writeFile(tempFilePath, Buffer.from(buffer));

    // 提取图片
    const imageExtractor = new ImageExtractor();
    const result = await imageExtractor.extractImages(tempFilePath);

    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('清理临时文件时出错:', cleanupError);
      }
    }

    // 计算总文件大小
    const totalSize = result.images.reduce((sum, img) => sum + img.size, 0);

    return NextResponse.json({
      success: true,
      data: {
        totalCount: result.totalCount,
        totalSize,
        images: result.images.map(img => ({
          name: img.name,
          mimeType: img.mimeType,
          size: img.size,
          paragraphIndex: img.paragraphIndex,
          relationshipId: img.relationshipId,
          base64Data: img.base64Data // 包含完整的base64数据
        })),
        relationships: Object.fromEntries(result.imageRelationships),
        metadata: {
          extractedAt: new Date().toISOString(),
          fileName: file.name,
          fileSize: file.size
        }
      }
    });

  } catch (error) {
    console.error('提取图片时出错:', error);
    
    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('清理临时文件时出错:', cleanupError);
      }
    }

    return NextResponse.json(
      { 
        success: false,
        error: '图片提取失败', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 支持GET请求获取API信息
export async function GET() {
  return NextResponse.json({
    message: 'Image Extractor API',
    version: '1.0.0',
    supportedFormats: ['.docx'],
    maxFileSize: '20MB',
    features: [
      '提取所有图片',
      '图片位置信息',
      '关系映射',
      'Base64编码输出',
      '多种图片格式支持'
    ],
    supportedImageTypes: [
      'JPEG (.jpg, .jpeg)',
      'PNG (.png)',
      'GIF (.gif)',
      'BMP (.bmp)',
      'WebP (.webp)',
      'TIFF (.tiff)',
      'SVG (.svg)'
    ],
    usage: {
      method: 'POST',
      contentType: 'multipart/form-data',
      field: 'file',
      response: {
        success: 'boolean',
        data: {
          totalCount: 'number',
          totalSize: 'number',
          images: 'array',
          relationships: 'object',
          metadata: 'object'
        }
      }
    }
  });
} 