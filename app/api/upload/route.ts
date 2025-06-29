import { NextRequest, NextResponse } from 'next/server';
import { storageAdapter } from '@/lib/storage-adapter';


export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const originalName = searchParams.get('filename');

  if (!originalName) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }
  
  if (!request.body) {
    return NextResponse.json({ error: 'File body is required' }, { status: 400 });
  }

  try {
    // 将请求体转换为Buffer
    const arrayBuffer = await request.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer);

    // 使用存储适配器上传文件
    const metadata = await storageAdapter.uploadFile(fileContent, originalName);

    // 返回元数据给客户端
    return NextResponse.json(metadata, { status: 200 });

  } catch (error) {
    console.error('Error during file upload and metadata creation:', error);
    // @ts-expect-error - error object may not have message property
    const message = error.message || 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to upload file.', details: message }, { status: 500 });
  }
}
