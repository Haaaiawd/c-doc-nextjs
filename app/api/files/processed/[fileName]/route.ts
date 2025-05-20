import { NextRequest, NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs/promises';
import { stat } from 'fs/promises';

const PROCESSED_DIR = path.join(process.cwd(), 'tmp', 'processed');

/**
 * 提供处理后的文件下载
 */
export async function GET(
  request: NextRequest,
  context: { params: { fileName: string } }
) {
  const { params } = context;
  try {
    const fileName = params.fileName;
    
    // 安全检查：防止目录遍历攻击
    const normalizedFileName = path.normalize(fileName).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(PROCESSED_DIR, normalizedFileName);
    
    try {
      // 检查文件是否存在
      const stats = await stat(filePath);
      
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: "找不到请求的文件" },
          { status: 404 }
        );
      }
      
      // 获取文件内容
      const fileBuffer = await fs.readFile(filePath);
      
      // 返回文件及适当的 MIME 类型
      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(normalizedFileName)}"`);
      
      return new NextResponse(fileBuffer, {
        status: 200,
        headers,
      });
    } catch (error) {
      // 文件不存在或无法读取
      console.error(`读取文件错误 ${filePath}:`, error);
      return NextResponse.json(
        { error: "找不到请求的文件" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("处理请求时出错:", error);
    return NextResponse.json(
      { error: "处理请求时出错" },
      { status: 500 }
    );
  }
}
