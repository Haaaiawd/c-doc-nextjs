import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import DocxProcessor from '@/lib/docx-processor';
import os from 'os';

// 临时文件目录
const TEMP_DIR = path.join(os.tmpdir(), 'c-doc-nextjs');

// 确保临时目录存在
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('创建临时目录失败:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureTempDir();
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '请上传docx文件' },
        { status: 400 }
      );
    }
    
    // 将上传的文件写入临时目录
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(TEMP_DIR, `uploaded-${Date.now()}.docx`);
    await fs.writeFile(filePath, fileBuffer);
    
    // 分析文档
    const processor = new DocxProcessor();
    const result = await processor.analyzeDocument(filePath);
    
    // 清理临时文件
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('删除临时文件失败:', error);
    }
    
    return NextResponse.json({ 
      message: '文档分析成功',
      result: {
        title: result.title,
        author: result.author,
        bodyStylesCount: result.bodyStyles.length,
        bodyStyles: result.bodyStyles,
        paragraphsCount: result.paragraphs.length,
        // 仅返回前10个段落以限制响应大小
        paragraphs: result.paragraphs.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('API处理失败:', error);
    return NextResponse.json(
      { error: `处理失败: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}