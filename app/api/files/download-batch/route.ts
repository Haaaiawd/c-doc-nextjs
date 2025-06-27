import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest) {
  try {
    const { fileInfos } = await request.json(); // Expecting { url, fileName }

    if (!fileInfos || !Array.isArray(fileInfos) || fileInfos.length === 0) {
      return NextResponse.json({ error: '请提供一个包含文件信息的数组' }, { status: 400 });
    }

    const zip = new JSZip();
    let filesAdded = 0;

    for (const fileInfo of fileInfos) {
      const { url, fileName } = fileInfo;
      if (!url || !fileName) {
        console.warn(`文件信息不完整，已跳过: ${JSON.stringify(fileInfo)}`);
        continue;
      }

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`无法从Blob下载文件: ${url}`);
        }
        const fileBuffer = await response.arrayBuffer();
        zip.file(fileName, fileBuffer);
        filesAdded++;
      } catch (error) {
        console.warn(`无法处理文件 ${fileName} (从 ${url})，已跳过。`, error);
      }
    }

    if (filesAdded === 0) {
      return NextResponse.json({ message: '所有选定的文件均无法读取或处理。' }, { status: 404 });
    }

    const zipFileName = `processed_documents_${Date.now()}.zip`;
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const newBlob = await put(zipFileName, zipBuffer, {
      access: 'public',
      contentType: 'application/zip',
    });

    // Create metadata record in Vercel KV for the zip file
    const key = `batch:${newBlob.pathname}`;
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
    await kv.set(key, { url: newBlob.url, expiresAt });

    return NextResponse.json({ 
      success: true, 
      downloadUrl: newBlob.url,
      fileName: zipFileName
    });

  } catch (error) {
    console.error('批量下载处理后的文件时出错:', error);
    const errorMessage = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: '批量下载失败', details: errorMessage }, { status: 500 });
  }
} 