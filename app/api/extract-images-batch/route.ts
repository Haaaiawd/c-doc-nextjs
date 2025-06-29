import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import * as path from 'path';
import { storageAdapter } from '@/lib/storage-adapter';
import { ImageExtractor, ExtractedImage } from '@/lib/image-extractor';

/**
 * 根据fileId列表处理文件，提取图片并打包为 zip 文件下载
 */
export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json(); // Expecting { id, originalFileName }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '请提供一个包含文件信息的数组' }, { status: 400 });
    }

    const imageExtractor = new ImageExtractor();
    const zip = new JSZip();
    let totalImagesExtracted = 0;

    for (const file of files) {
      const { id, originalFileName } = file;
      if (!id || !originalFileName) {
        console.warn(`文件信息不完整，已跳过: ${JSON.stringify(file)}`);
        continue;
      }

      try {
        console.log(`正在处理文件: ${originalFileName} (ID: ${id})`);
        
        // 使用存储适配器获取文件内容
        const fileContent = await storageAdapter.getFileContent(id);
        if (!fileContent) {
          console.warn(`无法获取文件内容: ${id}`);
          continue;
        }
      
        const extractionResult = await imageExtractor.extractImagesFromBuffer(fileContent);
      
        if (extractionResult.images.length > 0) {
          const docxBaseName = path.parse(originalFileName).name;

          extractionResult.images.forEach((image: ExtractedImage) => {
            const base64Data = image.base64Data.split(',')[1];
            
            const newImageName = `${docxBaseName}-${image.name}`;

            zip.file(newImageName, base64Data, { base64: true });
            totalImagesExtracted++;
          });
        }
      } catch (error) {
        console.warn(`处理文件 ${originalFileName} 时出错，已跳过。`, error);
      }
    }

    if (totalImagesExtracted === 0) {
      return NextResponse.json({ success: true, message: '所有选定的文档中均未找到可提取的图片。' }, { status: 200 });
    }

    const zipFileName = `extracted_images_${Date.now()}.zip`;
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 使用存储适配器上传zip文件
    const zipUrl = await storageAdapter.uploadProcessedFile(zipFileName, zipBuffer);

    return NextResponse.json({
      success: true,
      downloadUrl: zipUrl,
      fileName: zipFileName
    });

  } catch (error) {
    console.error('批量提取图片时出错:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: '批量提取失败', details: errorMessage }, { status: 500 });
  }
} 