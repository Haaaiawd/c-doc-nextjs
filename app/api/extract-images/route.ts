import { NextRequest, NextResponse } from 'next/server';
import { storageAdapter } from '@/lib/storage-adapter';
import { ImageExtractor, ExtractedImage } from '@/lib/image-extractor';

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { fileId } = requestData;

    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少文件ID' }, { status: 400 });
    }

    // 使用存储适配器获取文件
    const fileContent = await storageAdapter.getFileContent(fileId);
    if (!fileContent) {
      return NextResponse.json({ success: false, error: '找不到指定的文件' }, { status: 404 });
    }

    const metadata = await storageAdapter.getFileMetadata(fileId);
    if (!metadata) {
      return NextResponse.json({ success: false, error: '无法获取文件元数据' }, { status: 404 });
    }

    const imageExtractor = new ImageExtractor();
    const extractionResult = await imageExtractor.extractImagesFromBuffer(fileContent);

    // 将提取的图片保存（本地或云存储）
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
          
          const imageUrl = await storageAdapter.uploadProcessedFile(fileName, imageBuffer);
          
          uploadedImages.push({
            name: fileName,
            url: imageUrl
          });
        } catch (error) {
          console.error(`保存图片 ${fileName} 失败:`, error);
        }
      }
    }

    // 更新文件元数据中的提取图片信息
    await storageAdapter.setFileMetadata(fileId, {
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