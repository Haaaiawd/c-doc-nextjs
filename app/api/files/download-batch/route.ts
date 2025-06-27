import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import * as path from 'path';
import * as fs from 'fs/promises';
import { trackSessionFile } from '@/lib/startup';

const PROCESSED_DIR = path.join(process.cwd(), 'tmp', 'processed');

export async function POST(request: NextRequest) {
  try {
    const { fileInfos } = await request.json(); // Expecting { id, processedFileName }

    if (!fileInfos || !Array.isArray(fileInfos) || fileInfos.length === 0) {
      return NextResponse.json({ error: '请提供一个包含文件信息的数组' }, { status: 400 });
    }

    const zip = new JSZip();
    let filesAdded = 0;

    for (const fileInfo of fileInfos) {
      const { processedFileName } = fileInfo;
      if (!processedFileName) {
        console.warn(`文件信息不完整，已跳过: ${JSON.stringify(fileInfo)}`);
        continue;
      }
      const filePath = path.join(PROCESSED_DIR, processedFileName);

      try {
        const fileBuffer = await fs.readFile(filePath);
        // Use the user-facing processedFileName for the name inside the zip.
        zip.file(processedFileName, fileBuffer);
        filesAdded++;
      } catch (error) {
        console.warn(`无法读取文件 ${filePath}，已跳过。`, error);
      }
    }

    if (filesAdded === 0) {
      return NextResponse.json({ message: '所有选定的文件均无法读取或处理。' }, { status: 404 });
    }

    const zipFileName = `processed_documents_${Date.now()}.zip`;
    const zipFilePath = path.join(process.cwd(), 'tmp', zipFileName);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    await fs.writeFile(zipFilePath, zipBuffer);

    // Track for cleanup
    trackSessionFile(zipFilePath);

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
      },
    });

  } catch (error) {
    console.error('批量下载处理后的文件时出错:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: '批量下载失败', details: errorMessage }, { status: 500 });
  }
} 