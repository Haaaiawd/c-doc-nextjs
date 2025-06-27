import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { ProcessedDocument, DocumentStatus } from '@/app/types';
import { generateUUID } from '@/lib/utils';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'No body provided' }, { status: 400 });
  }

  const blob = await put(filename, request.body, {
    access: 'public',
  });

  // Create metadata record in Vercel KV
  const key = `blob:${uuidv4()}`;
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours in milliseconds
  await kv.set(key, { url: blob.url, expiresAt });

  // Return the original blob response to the client
  return NextResponse.json(blob);
}
