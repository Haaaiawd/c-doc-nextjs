import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }    // 构建文件路径
    const filePath = path.join(UPLOAD_DIR, fileId);
    
    // 检查文件是否存在
    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 读取文件
    const fileBuffer = await readFile(filePath);

    // 确定文件的 MIME 类型
    let contentType = 'application/octet-stream'; // 默认
    if (fileId.toLowerCase().endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileId.toLowerCase().endsWith('.doc')) {
      contentType = 'application/msword';
    }

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileId}"`,
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Error serving file' }, { status: 500 });
  }
}
