import { NextRequest, NextResponse } from 'next/server';
import DocxProcessor from '@/lib/docx-processor-integrated';
import * as path from 'path';
import { promises as fs } from 'fs';

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

// 获取文档字体使用情况
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileId = formData.get('fileId') as string;

    if (!fileId) {
      return NextResponse.json({ success: false, error: '缺少文件ID' }, { status: 400 });
    }

    // 查找带有此 ID 的文件
    const files = await fs.readdir(UPLOAD_DIR);
    const targetFile = files.find(file => file.startsWith(fileId));

    if (!targetFile) {
      return NextResponse.json({ success: false, error: '找不到指定的文件' }, { status: 404 });
    }

    const filePath = path.join(UPLOAD_DIR, targetFile);
    
    // 创建 DocxProcessor 实例
    const processor = new DocxProcessor();
    
    // 获取字体使用情况
    try {
      const fontUsage = await processor.getFontUsage(filePath);
      
      // 将 Map 转换为可序列化的对象
      const fontUsageObject: Record<string, { count: number, samples: string[] }> = {};
      
      fontUsage.forEach((value, key) => {
        fontUsageObject[key] = {
          count: value.count,
          samples: value.samples
        };
      });
      
      return NextResponse.json({
        success: true,
        fileId,
        fileName: targetFile,
        fontUsage: fontUsageObject
      });
    } catch (error) {
      console.error('获取字体使用情况时出错:', error);
      
      let errorMessage = '获取字体使用情况失败';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 500 });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    let errorMessage = '处理请求时出错';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
