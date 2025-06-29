import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileName: string } }
) {
  try {
    const fileName = params.fileName;
    const filePath = path.join(process.cwd(), 'tmp', 'uploads', 'processed', fileName);
    
    // 检查文件是否存在
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 读取文件
    const fileBuffer = await fs.readFile(filePath);
    
    // 确定MIME类型
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.docx')) {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (fileName.endsWith('.zip')) {
      contentType = 'application/zip';
    } else if (fileName.endsWith('.png')) {
      contentType = 'image/png';
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 