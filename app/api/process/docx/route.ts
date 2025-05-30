import { NextRequest, NextResponse } from 'next/server';
import DocxProcessor from '@/lib/docx-processor-integrated';
import * as path from 'path';
import { promises as fs } from 'fs';
import { FontModificationOptions } from '@/types/document-processing';
import { convertChineseFontSize } from '@/lib/font-utils';
import { trackSessionFile } from '@/lib/startup';

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
function applyFileNameTemplate(template: string, originalFileName: string, titleText?: string, authorText?: string): string {
  // 从原始文件名中提取不带扩展名的部分作为默认标题
  const titleWithoutExt = path.parse(originalFileName).name;
  
  // 使用传入的标题和作者信息，如果没有则使用默认值
  const title = titleText || titleWithoutExt;
  const author = authorText || "Unknown";
  
  // 替换模板中的占位符
  let result = template
    .replace(/\{title\}/g, title)
    .replace(/\{author\}/g, author)
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
    await ensureDir(PROCESSED_DIR);

    const requestData = await request.json();
    const { 
      fileId, 
      fileNameTemplate,
      template,  // 新增模板参数
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
    
    // 创建 DocxProcessor 实例
    const processor = new DocxProcessor();
    
    // 先分析文档，获取标题和作者信息
    let titleText: string | undefined = undefined;
    let authorText: string | undefined = undefined;
    
    try {
      const analysisResult = await processor.analyzeDocument(filePath);
      titleText = analysisResult.title?.text;
      authorText = analysisResult.author?.text;
    } catch (error) {
      // 如果分析失败，继续使用默认文件名处理
      console.warn('无法分析文档内容，将使用默认文件名:', error);
    }
    
    // 使用模板生成文件名
    const fileNameBase = applyFileNameTemplate(
      fileNameTemplate || "{title}", 
      targetFile,
      titleText,
      authorText
    );
    const outputFileName = `${fileNameBase}${path.extname(targetFile)}`;
    const outputPath = path.join(PROCESSED_DIR, outputFileName);

    // 处理文档
    try {
      let titleModOptions: FontModificationOptions | undefined;
      let bodyModOptions: FontModificationOptions | undefined; 
      let authorModOptions: FontModificationOptions | undefined;

      // 如果提供了模板参数，则从模板转换选项
      if (template) {
        // 从模板转换标题选项
        titleModOptions = {
          targetFontName: template.titleStyle.fontName,
          targetFontSize: template.titleStyle.fontSize ? 
            convertChineseFontSize(template.titleStyle.fontSize) : undefined,
          targetIsBold: template.titleStyle.isBold,
          targetIsItalic: template.titleStyle.isItalic,
          targetIsUnderline: template.titleStyle.isUnderline,
          targetColor: template.titleStyle.color,
          targetAlignment: template.titleStyle.alignment,
          addPrefix: template.titlePrefix,
          addSuffix: template.titleSuffix,
        };

        // 从模板转换正文选项
        bodyModOptions = {
          targetFontName: template.bodyStyle.fontName,
          targetFontSize: template.bodyStyle.fontSize ? 
            convertChineseFontSize(template.bodyStyle.fontSize) : undefined,
          targetIsBold: template.bodyStyle.isBold,
          targetIsItalic: template.bodyStyle.isItalic,
          targetIsUnderline: template.bodyStyle.isUnderline,
          targetColor: template.bodyStyle.color,
          targetAlignment: template.bodyStyle.alignment,
        };

        // 从模板转换作者选项
        authorModOptions = {
          targetFontName: template.authorStyle.fontName,
          targetFontSize: template.authorStyle.fontSize ? 
            convertChineseFontSize(template.authorStyle.fontSize) : undefined,
          targetIsBold: template.authorStyle.isBold,
          targetIsItalic: template.authorStyle.isItalic,
          targetIsUnderline: template.authorStyle.isUnderline,
          targetColor: template.authorStyle.color,
          targetAlignment: template.authorStyle.alignment,
          addPrefix: template.authorPrefix,
          addSuffix: template.authorSuffix,
        };
      } else {
        // 使用旧格式的选项（保持向后兼容）
        // 准备多样式修改规则
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
          targetAlignment: rule.targetAlignment,
        })) || [];

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
          targetAlignment: rule.targetAlignment,
        })) || [];

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
        titleModOptions = titleOptions ? {
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
        
        bodyModOptions = bodyOptions ? {
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
        
        authorModOptions = authorOptions ? {
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
      }

      // 调用修改字体的方法
      await processor.modifyFonts(
        filePath, 
        outputPath, 
        titleModOptions, 
        bodyModOptions, 
        authorModOptions
      );
      
      // 跟踪生成的文件以便后续清理
      trackSessionFile(outputPath);
      
      // 返回成功响应及处理后文件信息
      return NextResponse.json({
        success: true,
        fileId,
        originalFileName: targetFile,
        processedFileName: outputFileName,
        processedFileUrl: `/api/files/processed/${outputFileName}`,
        targetFileName: fileNameBase,
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
