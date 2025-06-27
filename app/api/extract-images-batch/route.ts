import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ImageExtractor, ExtractedImage } from '@/lib/image-extractor';

const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

/**
 * 根据fileId列表处理文件，提取图片并打包为 zip 文件下载
 */
export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: '请提供一个包含文件信息的数组' }, { status: 400 });
    }

    const imageExtractor = new ImageExtractor();
    const zip = new JSZip();
    const allServerFiles = await fs.readdir(UPLOAD_DIR);
    let totalImagesExtracted = 0;

    for (const file of files) {
      const { id: fileId, originalFileName } = file;
      const targetFile = allServerFiles.find(f => f.startsWith(fileId));

      if (!targetFile) {
        console.warn(`未找到 fileId 为 ${fileId} 的文件，已跳过。`);
        continue;
      }

      console.log(`正在处理文件: ${targetFile} (原始文件名: ${originalFileName})`);
      const filePath = path.join(UPLOAD_DIR, targetFile);
      const fileBuffer = await fs.readFile(filePath);
      
      const extractionResult = await imageExtractor.extractImagesFromBuffer(fileBuffer);
      
      if (extractionResult.images.length > 0) {
        const docxBaseName = path.parse(originalFileName).name;

        extractionResult.images.forEach((image: ExtractedImage, index: number) => {
          const base64Data = image.base64Data.split(',')[1];
          const extension = image.name.split('.').pop() || 'png';
          
          let newImageName;
          if (index === 0) {
            newImageName = `${docxBaseName}.${extension}`;
          } else {
            newImageName = `${docxBaseName}-${index}.${extension}`;
          }

          zip.file(newImageName, base64Data, { base64: true });
          totalImagesExtracted++;
        });
      }
    }

    if (totalImagesExtracted === 0) {
      return NextResponse.json({ message: '所有选定的文档中均未找到可提取的图片。' }, { status: 200 });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="extracted_images_${Date.now()}.zip"`,
      },
    });

  } catch (error) {
    console.error('批量提取图片时出错:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: '批量提取失败', details: errorMessage }, { status: 500 });
  }
} 