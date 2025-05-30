import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId;
    
    if (!fileId) {
      return NextResponse.json(
        { error: '文件ID缺失' },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = path.join(UPLOAD_DIR, fileId);
    
    try {
      // 检查文件是否存在
      await fs.access(filePath);
      
      // 读取文件
      const fileBuffer = await fs.readFile(filePath);
      
      // 根据文件扩展名设置MIME类型
      const fileExtension = path.extname(fileId).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      switch (fileExtension) {
        case '.docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case '.doc':
          mimeType = 'application/msword';
          break;
        case '.pdf':
          mimeType = 'application/pdf';
          break;
        case '.txt':
          mimeType = 'text/plain';
          break;
      }
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'private, max-age=3600', // 缓存1小时
        },
      });
      
    } catch (fileError) {
      console.error(`文件不存在或无法访问: ${filePath}`, fileError);
      return NextResponse.json(
        { error: '文件未找到' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('获取文件时出错:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
