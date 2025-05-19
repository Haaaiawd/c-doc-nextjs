import { NextRequest, NextResponse } from 'next/server';
import DocxProcessor from '@/lib/docx-processor-integrated';
import * as path from 'path';
import { promises as fs } from 'fs';
import { FontModificationOptions } from '@/lib/docx-processor-integrated';
import { convertChineseFontSize } from '@/lib/font-utils';

// 确保上传目录和处理结果目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');
const PROCESSED_DIR = path.join(process.cwd(), 'tmp', 'processed');

// 确保目录存在
async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

// 应用文件名模板，替换占位符并清理文件名
function applyFileNameTemplate(template: string, originalFileName: string): string {
  // 从原始文件名中提取不带扩展名的部分作为默认标题
  const titleWithoutExt = path.parse(originalFileName).name;
  
  // 替换模板中的占位符
  let result = template
    .replace(/\{title\}/g, titleWithoutExt)
    .replace(/\{author\}/g, "Unknown") // 默认作者
    .replace(/\{originalName\}/g, titleWithoutExt);
  
  // 清理文件名（删除不允许的字符）
  result = result.replace(/[\/\\:*?"<>|]/g, "_");
  
  // 确保文件名不为空
  if (result.trim() === "") {
    result = "document";
  }
  
  return result;
}

// 处理上传的 .docx 文件，修改字体和样式
export async function POST(request: NextRequest) {
  try {
    // 确保处理目录存在
    await ensureDir(PROCESSED_DIR);    const requestData = await request.json();
    const { 
      fileId, 
      fileNameTemplate,
      titleOptions, 
      bodyOptions, 
      authorOptions 
    } = requestData;

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
    
    // 使用模板生成文件名
    const fileNameBase = applyFileNameTemplate(fileNameTemplate || "{title}", targetFile);
    const outputFileName = `${fileNameBase}${path.extname(targetFile)}`;
    const outputPath = path.join(PROCESSED_DIR, outputFileName);
    
    // 创建 DocxProcessor 实例
    const processor = new DocxProcessor();
      // 处理文档
    try {      // 准备多样式修改规则
      const titleModificationRules = titleOptions?.modificationRules?.map((rule: {
        originalStyleKey: string;
        targetFontName?: string;
        targetFontSize?: number;
        targetIsBold?: boolean;
        targetIsItalic?: boolean;
        targetIsUnderline?: boolean;
        targetColor?: string;
        targetAlignment?: 'left' | 'center' | 'right' | 'justify';
      }) => ({
        originalStyleKey: rule.originalStyleKey,
        targetFontName: rule.targetFontName,
        targetFontSize: rule.targetFontSize ? 
          convertChineseFontSize(rule.targetFontSize) : undefined,
        targetIsBold: rule.targetIsBold,
        targetIsItalic: rule.targetIsItalic,
        targetIsUnderline: rule.targetIsUnderline,
        targetColor: rule.targetColor,
        targetAlignment: rule.targetAlignment,      })) || [];

      const bodyModificationRules = bodyOptions?.modificationRules?.map((rule: {
        originalStyleKey: string;
        targetFontName?: string;
        targetFontSize?: number;
        targetIsBold?: boolean;
        targetIsItalic?: boolean;
        targetIsUnderline?: boolean;
        targetColor?: string;
        targetAlignment?: 'left' | 'center' | 'right' | 'justify';
      }) => ({
        originalStyleKey: rule.originalStyleKey,
        targetFontName: rule.targetFontName,
        targetFontSize: rule.targetFontSize ? 
          convertChineseFontSize(rule.targetFontSize) : undefined,
        targetIsBold: rule.targetIsBold,
        targetIsItalic: rule.targetIsItalic,
        targetIsUnderline: rule.targetIsUnderline,
        targetColor: rule.targetColor,
        targetAlignment: rule.targetAlignment,      })) || [];

      const authorModificationRules = authorOptions?.modificationRules?.map((rule: {
        originalStyleKey: string;
        targetFontName?: string;
        targetFontSize?: number;
        targetIsBold?: boolean;
        targetIsItalic?: boolean;
        targetIsUnderline?: boolean;
        targetColor?: string;
        targetAlignment?: 'left' | 'center' | 'right' | 'justify';
      }) => ({
        originalStyleKey: rule.originalStyleKey,
        targetFontName: rule.targetFontName,
        targetFontSize: rule.targetFontSize ? 
          convertChineseFontSize(rule.targetFontSize) : undefined,
        targetIsBold: rule.targetIsBold,
        targetIsItalic: rule.targetIsItalic,
        targetIsUnderline: rule.targetIsUnderline,
        targetColor: rule.targetColor,
        targetAlignment: rule.targetAlignment,
      })) || [];
      
      // 转换前端传递的选项为 FontModificationOptions 对象（保留这部分作为默认选项）
      const titleModOptions: FontModificationOptions | undefined = titleOptions ? {
        targetFontName: titleOptions.fontName,
        targetFontSize: titleOptions.fontSize ? 
          convertChineseFontSize(titleOptions.fontSize) : undefined,
        targetIsBold: titleOptions.isBold,
        targetIsItalic: titleOptions.isItalic,
        targetIsUnderline: titleOptions.isUnderline,
        targetColor: titleOptions.color,
        targetAlignment: titleOptions.alignment,
        addPrefix: titleOptions.prefix,
        addSuffix: titleOptions.suffix,
        modificationRules: titleModificationRules
      } : undefined;
      
      const bodyModOptions: FontModificationOptions | undefined = bodyOptions ? {
        targetFontName: bodyOptions.fontName,
        targetFontSize: bodyOptions.fontSize ? 
          convertChineseFontSize(bodyOptions.fontSize) : undefined,
        targetIsBold: bodyOptions.isBold,
        targetIsItalic: bodyOptions.isItalic,
        targetIsUnderline: bodyOptions.isUnderline,
        targetColor: bodyOptions.color,
        targetAlignment: bodyOptions.alignment,
        modificationRules: bodyModificationRules
      } : undefined;
      
      const authorModOptions: FontModificationOptions | undefined = authorOptions ? {
        targetFontName: authorOptions.fontName,
        targetFontSize: authorOptions.fontSize ? 
          convertChineseFontSize(authorOptions.fontSize) : undefined,
        targetIsBold: authorOptions.isBold,
        targetIsItalic: authorOptions.isItalic,
        targetIsUnderline: authorOptions.isUnderline,
        targetColor: authorOptions.color,
        targetAlignment: authorOptions.alignment,
        modificationRules: authorModificationRules
      } : undefined;

      // 调用修改字体的方法
      await processor.modifyFonts(
        filePath, 
        outputPath, 
        titleModOptions, 
        bodyModOptions, 
        authorModOptions
      );
      
      // 返回成功响应及处理后文件信息
      return NextResponse.json({
        success: true,
        fileId,
        originalFileName: targetFile,
        processedFileName: outputFileName,
        processedFileUrl: `/api/files/processed/${outputFileName}`,
        message: '文档处理成功'
      });
    } catch (error) {
      console.error('文档处理错误:', error);
      return NextResponse.json({ 
        success: false, 
        error: `文档处理失败: ${error instanceof Error ? error.message : String(error)}` 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('处理请求时出错:', error);
    return NextResponse.json({ success: false, error: '处理请求时出错' }, { status: 500 });
  }
}
