import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { ProcessedDocument, DocumentStatus } from '@/app/types';
import { generateUUID } from '@/lib/utils';

// 为文件创建唯一标识符并返回详细信息
function createFileInfo(file: File, blobUrl: string): ProcessedDocument {
  return {
    id: generateUUID(),
    originalFileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    uploadDate: new Date().toISOString(),
    status: 'uploaded_to_server' as const,
    processedFileUrl: blobUrl, // 使用Blob的URL
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded.' }, { status: 400 });
    }

    const processedFiles: ProcessedDocument[] = [];

    for (const fileEntry of files) {
      if (fileEntry instanceof File) {
        try {
          // 将文件上传到 Vercel Blob
          const blob = await put(fileEntry.name, fileEntry, {
            access: 'public',
          });

          const fileInfo = createFileInfo(fileEntry, blob.url);
          processedFiles.push(fileInfo);

        } catch (error) {
          console.error(`Error saving file ${fileEntry.name} to blob:`, error);
          const tempFileInfo = createFileInfo(fileEntry, '');
          processedFiles.push({
            ...tempFileInfo,
            status: 'failed',
            errorMessage: 'Failed to save file to cloud storage.',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${files.length} files received and processed.`,
      files: processedFiles
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json({ success: false, error: 'Error processing request.' }, { status: 500 });
  }
}
