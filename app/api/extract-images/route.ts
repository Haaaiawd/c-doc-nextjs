import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';
import { ImageExtractor, ExtractedImage } from '@/lib/image-extractor';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { fileId } = requestData;

    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少文件ID' }, { status: 400 });
    }

    // 从KV存储获取文件元数据
    const fileMetadata = await kv.get(`file:${fileId}`);
    if (!fileMetadata) {
      return NextResponse.json({ success: false, error: '找不到指定的文件' }, { status: 404 });
    }

    const metadata = fileMetadata as { blobUrl: string; originalName: string; extractedImages?: { name: string; url: string; }[] };
    const blobUrl = metadata.blobUrl;
    
    if (!blobUrl) {
      return NextResponse.json({ success: false, error: '文件URL不存在' }, { status: 404 });
    }

    // 从Blob存储下载文件
    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`无法从Blob存储下载文件: ${response.statusText}`);
    }
    const fileBuffer = await response.arrayBuffer();

    const imageExtractor = new ImageExtractor();
    const extractionResult = await imageExtractor.extractImagesFromBuffer(Buffer.from(fileBuffer));

    // 将提取的图片上传到Blob存储
    const uploadedImages: { name: string; url: string; }[] = [];
    
    if (extractionResult.images.length > 0) {
      const originalName = metadata.originalName.replace(/\.[^/.]+$/, ""); // 移除扩展名
      
      for (let i = 0; i < extractionResult.images.length; i++) {
        const image = extractionResult.images[i];
        const fileName = i === 0 ? `${originalName}.png` : `${originalName}-${i}.png`;
        
        try {
          // 从base64数据转换为Buffer
          const base64Data = image.base64Data.split(',')[1]; // 移除data:image/png;base64,前缀
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          const blob = await put(fileName, imageBuffer, {
            access: 'public',
            contentType: image.mimeType || 'image/png',
          });
          
          uploadedImages.push({
            name: fileName,
            url: blob.url
          });
        } catch (error) {
          console.error(`上传图片 ${fileName} 失败:`, error);
        }
      }
    }

    // 更新文件元数据中的提取图片信息
    await kv.set(`file:${fileId}`, {
      ...metadata,
      extractedImages: uploadedImages
    });

    return NextResponse.json({
      success: true,
      totalImages: extractionResult.images.length,
      uploadedImages: uploadedImages,
      imageData: extractionResult.images.map((img: ExtractedImage) => ({
        name: img.name,
        paragraphIndex: img.paragraphIndex,
        runIndex: img.runIndex,
        size: img.size
      })),
      relationshipDetails: extractionResult.relationshipDetails,
      paragraphImages: extractionResult.paragraphImages
    });

  } catch (error) {
    console.error('提取图片时出错:', error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: `提取失败: ${errorMessage}` }, { status: 500 });
  }
} 