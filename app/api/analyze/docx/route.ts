import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import DocxProcessor from '@/lib/docx-processor-integrated';
import { promises as fs } from 'fs';

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

// 分析上传的 .docx 文件
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { fileId } = requestData;

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
        analysis: analysisResult,
        usedDeepDetection: !!analysisResult.deepFontAnalysis
      });
    } catch (error) { // This is the catch block for errors from processor.analyzeDocument
      console.error('文档分析错误 (raw): ', error); // Log the raw error from processor

      let descriptiveMessage = '分析文档时发生内部错误。'; // Default simple message

      if (error instanceof Error) {
        if (error.message && typeof error.message === 'string') {
          // If error.message already contains "文档解析失败", don't prepend it again.
          if (error.message.startsWith('文档解析失败:')) {
            descriptiveMessage = error.message;
          } else {
            descriptiveMessage = `文档解析失败: ${error.message}`;
          }
        }
      } else if (typeof error === 'string' && error.length > 0) {
        descriptiveMessage = `文档解析失败: ${error}`;
      } else {
        // If the error is an object but not an Error instance, try a simple stringification
        descriptiveMessage = `文档解析失败: [未知对象错误]`;
        try {
            const simpleString = String(error);
            if (simpleString && simpleString !== '[object Object]' && simpleString.length > 0) {
                descriptiveMessage = `文档解析失败: ${simpleString}`;
            }
        } catch {
            // ignore if String(error) fails
        }
      }

      // Sanitize the message to ensure it's a simple string for JSON
      if (typeof descriptiveMessage !== 'string' || descriptiveMessage.trim().length === 0) {
          descriptiveMessage = '分析过程中发生未知错误。';
      }

      // Limit length to prevent overly long messages from breaking things
      if (descriptiveMessage.length > 500) {
          descriptiveMessage = descriptiveMessage.substring(0, 497) + "...";
      }

      console.error('将返回给客户端的错误信息:', descriptiveMessage);

      return NextResponse.json({
        success: false,
        error: descriptiveMessage // Ensure this is a simple, safe string
      }, { status: 500 });
    }
  } catch (error) { // Outermost catch
    console.error('处理请求时出错 (raw):', error);
    let outerErrorMessage = '处理分析请求时发生意外错误。';
    
    if (error instanceof Error && error.message && typeof error.message === 'string') {
        outerErrorMessage = `请求处理失败: ${error.message}`;
    } else if (typeof error === 'string' && error.length > 0) {
        outerErrorMessage = `请求处理失败: ${error}`;
    } else {
        try {
            const simpleString = String(error);
            if (simpleString && simpleString !== '[object Object]' && simpleString.length > 0) {
                outerErrorMessage = `请求处理失败: ${simpleString}`;
            }
        } catch {
            // ignore
        }
    }

    if (typeof outerErrorMessage !== 'string' || outerErrorMessage.trim().length === 0) {
        outerErrorMessage = '处理请求时发生未知类型的外部错误。';
    }
    if (outerErrorMessage.length > 500) {
        outerErrorMessage = outerErrorMessage.substring(0, 497) + "...";
    }
    console.error('将返回给客户端的外部错误信息:', outerErrorMessage);
    return NextResponse.json({ success: false, error: outerErrorMessage }, { status: 500 });
  }
}
