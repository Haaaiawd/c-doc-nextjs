import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DocConverter } from '@/lib/doc-converter';

export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '请选择要转换的.doc文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith('.doc')) {
      return NextResponse.json(
        { error: '请上传.doc格式的文件' },
        { status: 400 }
      );
    }

    // 验证文件大小 (最大 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件大小不能超过10MB' },
        { status: 400 }
      );
    }

    console.log(`开始处理.doc文件: ${file.name}, 大小: ${file.size} bytes`);

    // 创建临时文件
    const buffer = await file.arrayBuffer();
    const tempDir = path.join(process.cwd(), 'temp');
    
    // 确保临时目录存在
    try {
      await fs.access(tempDir);
    } catch {
      await fs.mkdir(tempDir, { recursive: true });
    }

    tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);
    await fs.writeFile(tempFilePath, Buffer.from(buffer));

    // 转换.doc为.docx
    const converter = new DocConverter();
    const docxBuffer = await converter.convertDocBufferToDocxBuffer(
      Buffer.from(buffer),
      {
        splitParagraphs: true,
        preserveFormatting: false
      }
    );

    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('清理临时文件时出错:', cleanupError);
      }
    }

    // 返回转换后的文件
    const fileName = file.name.replace(/\.doc$/i, '.docx');
    
    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': docxBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('转换.doc文件时出错:', error);
    
    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('清理临时文件时出错:', cleanupError);
      }
    }

    return NextResponse.json(
      { 
        error: '转换失败', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 支持GET请求获取转换信息
export async function GET() {
  return NextResponse.json({
    message: 'Doc to Docx Converter API',
    version: '1.0.0',
    supportedFormats: {
      input: ['.doc'],
      output: ['.docx']
    },
    maxFileSize: '10MB',
    features: [
      '文本内容提取',
      '段落结构保持',
      '脚注和尾注转换',
      '基本格式保持'
    ],
    limitations: [
      '复杂格式可能丢失',
      '图片暂不支持',
      '表格格式可能简化'
    ]
  });
} 