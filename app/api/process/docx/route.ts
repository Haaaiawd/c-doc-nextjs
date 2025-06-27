import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import DocxProcessor from '@/lib/docx-processor-integrated';
import * as path from 'path';
import { FontModificationOptions } from '@/types/document-processing';
import { convertChineseFontSize } from '@/lib/font-utils';

function applyFileNameTemplate(template: string, originalFileName: string, titleText?: string, authorText?: string): string {
  const titleWithoutExt = path.parse(originalFileName).name;
  const title = titleText || titleWithoutExt;
  const author = authorText || "Unknown";
  let result = template
    .replace(/\{title\}/g, title)
    .replace(/\{author\}/g, author)
    .replace(/\{originalName\}/g, titleWithoutExt);
  result = result.replace(/[\/\\:*?"<>|]/g, "_");
  if (result.trim() === "") {
    result = "document";
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { 
      fileId,
      originalFileName,
      fileNameTemplate,
      template,
      titleOptions,
      bodyOptions,
      authorOptions
    } = requestData;

    if (!fileId || !originalFileName) {
      return NextResponse.json({ success: false, error: '缺少文件URL或原始文件名' }, { status: 400 });
    }

    const response = await fetch(fileId);
    if (!response.ok) {
      throw new Error(`无法从Blob存储下载文件: ${response.statusText}`);
    }
    const fileBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(fileBuffer);

    const processor = new DocxProcessor();
    
    let titleText: string | undefined, authorText: string | undefined;
    try {
      const analysisResult = await processor.analyzeDocument(inputBuffer);
      titleText = analysisResult.title?.text;
      authorText = analysisResult.author?.text;
    } catch (error) {
      console.warn('无法分析文档内容，将使用默认文件名:', error);
    }
    
    const fileNameBase = applyFileNameTemplate(fileNameTemplate || "{title}", originalFileName, titleText, authorText);
    const outputFileName = `${fileNameBase}.docx`;

    let finalTitleOptions: FontModificationOptions | undefined;
    let finalBodyOptions: FontModificationOptions | undefined;
    let finalAuthorOptions: FontModificationOptions | undefined;

    if (template) {
      finalTitleOptions = {
        targetFontName: template.titleStyle.fontName,
        targetFontSize: template.titleStyle.fontSize ? convertChineseFontSize(template.titleStyle.fontSize) : undefined,
        targetIsBold: template.titleStyle.isBold,
        targetIsItalic: template.titleStyle.isItalic,
        targetIsUnderline: template.titleStyle.isUnderline,
        targetColor: template.titleStyle.color,
        targetAlignment: template.titleStyle.alignment,
        addPrefix: template.titlePrefix,
        addSuffix: template.titleSuffix,
      };
      finalBodyOptions = {
        targetFontName: template.bodyStyle.fontName,
        targetFontSize: template.bodyStyle.fontSize ? convertChineseFontSize(template.bodyStyle.fontSize) : undefined,
        targetIsBold: template.bodyStyle.isBold,
        targetIsItalic: template.bodyStyle.isItalic,
        targetIsUnderline: template.bodyStyle.isUnderline,
        targetColor: template.bodyStyle.color,
        targetAlignment: template.bodyStyle.alignment,
      };
      finalAuthorOptions = {
        targetFontName: template.authorStyle.fontName,
        targetFontSize: template.authorStyle.fontSize ? convertChineseFontSize(template.authorStyle.fontSize) : undefined,
        targetIsBold: template.authorStyle.isBold,
        targetIsItalic: template.authorStyle.isItalic,
        targetIsUnderline: template.authorStyle.isUnderline,
        targetColor: template.authorStyle.color,
        targetAlignment: template.authorStyle.alignment,
        addPrefix: template.authorPrefix,
        addSuffix: template.authorSuffix,
      };
    } else {
      finalTitleOptions = titleOptions;
      finalBodyOptions = bodyOptions;
      finalAuthorOptions = authorOptions;
    }

    const modifiedBuffer = await processor.modifyFonts(inputBuffer, finalTitleOptions, finalBodyOptions, finalAuthorOptions);

    const newBlob = await put(outputFileName, modifiedBuffer, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      processedFileUrl: newBlob.url,
      processedFileName: outputFileName,
    });

  } catch (error) {
    console.error('处理文档时出错:', error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ success: false, error: `处理失败: ${errorMessage}` }, { status: 500 });
  }
}
