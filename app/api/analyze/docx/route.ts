import { NextRequest, NextResponse } from 'next/server';
import DocxProcessor from '@/lib/docx-processor';
import * as path from 'path';
import { promises as fs } from 'fs';

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

// 分析上传的 .docx 文件
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
    
    // 分析文档
    try {
      const analysisResult = await processor.analyzeDocument(filePath);
      
      return NextResponse.json({
        success: true,
        fileId,
        fileName: targetFile,
        analysis: analysisResult
      });
    } catch (error) {
      console.error('文档分析错误:', error);
      return NextResponse.json({ 
        success: false, 
        error: `文档分析失败: ${error instanceof Error ? error.message : String(error)}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return NextResponse.json({ success: false, error: '处理请求时出错' }, { status: 500 });
  }
}
