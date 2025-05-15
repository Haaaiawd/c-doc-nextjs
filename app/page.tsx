"use client";

import { useCallback, useState } from "react";
import { useDropzone, FileWithPath } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontSizeSelector } from "@/components/ui/font-size-selector";
import { ProcessedDocument, DocumentAnalysisData, DocumentStatus } from "./types";

export default function HomePage() {
  // 状态来存储已接受的文件和将被处理的文档
  const [acceptedFilesList, setAcceptedFilesList] = useState<FileWithPath[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // 使用导入的 DocumentAnalysisData 类型
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisData | null>(null);
  
  // 文档分析函数
  const analyzeDocument = async (fileId: string) => {
    try {
      const formData = new FormData();
      formData.append('fileId', fileId);

      const response = await fetch('/api/analyze/docx', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Document analysis:', result);
        if (result.success && result.analysis) {
          // 直接设置分析结果，如果API返回的结构与DocumentAnalysisData一致
          // 或者进行必要的转换/断言
          setDocumentAnalysis(result.analysis as DocumentAnalysisData); 
          
          // 自动填充到选项中
          // applyAnalysisResults(); // 考虑是否在这里自动应用，或者让用户点击按钮
          return result.analysis;
        } else if (result.success && !result.analysis) {
          console.warn("Analysis successful but no analysis data returned.");
          setDocumentAnalysis(null); // 清空旧的分析数据
        }
      } else {
        console.error('Analysis failed:', await response.json());
        setDocumentAnalysis(null); // 清空旧的分析数据
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      setDocumentAnalysis(null); // 清空旧的分析数据
    }
    return null;
  };

  // 应用分析结果到设置
  const applyAnalysisResults = () => {
    if (!documentAnalysis) return;

    // Helper function to create a default modification rule for a style
    const createDefaultModificationRule = (style: FontInfo) => ({
      originalStyleKey: style.originalStyleKey || crypto.randomUUID(), // Ensure a key
      targetFontName: style.name || "",
      targetFontSize: style.size?.toString() || "",
      targetIsBold: style.isBold || false,
      targetIsItalic: style.isItalic || false,
      targetIsUnderline: style.isUnderline || false,
      targetColor: style.color || "",
      targetAlignment: style.alignment || "left", // Default alignment
    });

    if (documentAnalysis.title?.styles && documentAnalysis.title.styles.length > 0) {
      setTitleOptions(prev => ({
        ...prev,
        enabled: true, // Enable if analysis provides data
        // For simplicity, let's assume we apply the first detected style's properties
        // to the main options, and store all detected styles for detailed modification
        fontName: documentAnalysis.title!.styles[0].name || '',
        fontSize: documentAnalysis.title!.styles[0].size?.toString() || '',
        isBold: documentAnalysis.title!.styles[0].isBold || false,
        isItalic: documentAnalysis.title!.styles[0].isItalic || false,
        isUnderline: documentAnalysis.title!.styles[0].isUnderline || false,
        alignment: documentAnalysis.title!.styles[0].alignment || prev.alignment,
        // Store all detected styles for detailed modification UI
        detectedStyles: documentAnalysis.title.styles,
        // Initialize modification rules based on detected styles
        modificationRules: documentAnalysis.title.styles.map(createDefaultModificationRule)
      }));
    } else {
      // If no title styles detected, reset or keep existing, but clear detectedStyles and rules
      setTitleOptions(prev => ({ ...prev, detectedStyles: [], modificationRules: [] }));
    }

    if (documentAnalysis.author?.styles && documentAnalysis.author.styles.length > 0) {
      setAuthorOptions(prev => ({
        ...prev,
        enabled: true,
        fontName: documentAnalysis.author!.styles[0].name || '',
        fontSize: documentAnalysis.author!.styles[0].size?.toString() || '',
        isBold: documentAnalysis.author!.styles[0].isBold || false,
        isItalic: documentAnalysis.author!.styles[0].isItalic || false,
        isUnderline: documentAnalysis.author!.styles[0].isUnderline || false,
        alignment: documentAnalysis.author!.styles[0].alignment || prev.alignment,
        detectedStyles: documentAnalysis.author.styles,
        modificationRules: documentAnalysis.author.styles.map(createDefaultModificationRule)
      }));
    } else {
      setAuthorOptions(prev => ({ ...prev, detectedStyles: [], modificationRules: [] }));
    }

    if (documentAnalysis.bodyStyles && documentAnalysis.bodyStyles.length > 0) {
      setBodyOptions(prev => ({
        ...prev,
        enabled: true,
        // For simplicity, apply first detected body style to main options
        fontName: documentAnalysis.bodyStyles![0].name || '',
        fontSize: documentAnalysis.bodyStyles![0].size?.toString() || '',
        isBold: documentAnalysis.bodyStyles![0].isBold || false,
        isItalic: documentAnalysis.bodyStyles![0].isItalic || false,
        isUnderline: documentAnalysis.bodyStyles![0].isUnderline || false,
        alignment: documentAnalysis.bodyStyles![0].alignment || prev.alignment,
        detectedStyles: documentAnalysis.bodyStyles,
        modificationRules: documentAnalysis.bodyStyles.map(createDefaultModificationRule)
      }));
    } else {
      setBodyOptions(prev => ({ ...prev, detectedStyles: [], modificationRules: [] }));
    }
  };

  // Define a type for individual style modification rules
  interface StyleModificationRule {
    originalStyleKey: string; // To link back to the detected style
    targetFontName: string;
    targetFontSize: string;
    targetIsBold: boolean;
    targetIsItalic: boolean;
    targetIsUnderline: boolean;
    targetColor: string;
    targetAlignment: string;
  }
  
  // Define a type for the options for each document part, now including detected styles and rules
  interface DocumentPartOptions {
    enabled: boolean;
    fontName: string; // General/fallback font name
    fontSize: string; // General/fallback font size
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    color: string;
    alignment: string;
    prefix?: string; // Specific to title
    suffix?: string; // Specific to title
    detectedStyles: FontInfo[]; // Styles detected by analysis
    modificationRules: StyleModificationRule[]; // User-defined rules for each detected style
  }


  const [titleOptions, setTitleOptions] = useState<DocumentPartOptions>({
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: doc.id,
            titleOptions: titleOptions.enabled ? titleOptions : undefined,
            bodyOptions: bodyOptions.enabled ? bodyOptions : undefined,
            authorOptions: authorOptions.enabled ? authorOptions : undefined
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log("Processing successful:", result);
          
          // 更新文档状态
          setProcessedDocuments(prevDocs =>
            prevDocs.map(d => d.id === doc.id ? { 
              ...d, 
              status: 'completed' as const,
              processedFileUrl: result.processedFileUrl
            } : d)
          );
        } else {
          const errorResult = await response.json();
          console.error("Processing failed:", errorResult);
          
          // 更新文档状态为失败
          setProcessedDocuments(prevDocs =>
            prevDocs.map(d => d.id === doc.id ? { 
              ...d, 
              status: 'failed' as const,
              errorMessage: errorResult.error || 'Processing failed'
            } : d)
          );
        }
      } catch (error) {
        console.error("Error during processing:", error);
        
        // 更新文档状态为失败
        setProcessedDocuments(prevDocs =>
          prevDocs.map(d => d.id === doc.id ? { 
            ...d, 
            status: 'failed',
            errorMessage: 'Network or client-side error'
          } : d)
        );
      }
    }
    
    setProcessing(false);
  };

  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    // 当文件被拖拽或选择时
    console.log("Accepted files:", acceptedFiles);
    // 清空上一次选择的文件列表，仅处理当前新选择的文件
    setAcceptedFilesList(acceptedFiles);

    // 将接受的文件转换为 ProcessedDocument 结构 (初步)
    const newDocuments: ProcessedDocument[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(), // 简单的唯一ID生成
      originalFileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      status: 'selected', // 初始状态为 'selected'
    }));
    // 替换之前的文档列表，仅显示当前选择的
    setProcessedDocuments(newDocuments);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { // 只接受 .docx 文件
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true, // 允许选择多个文件
  });

  const handleUpload = async () => {
    if (acceptedFilesList.length === 0) {
      alert("请先选择文件！");
      return;
    }

    const formData = new FormData();
    acceptedFilesList.forEach(file => {
      formData.append("files", file); // 后端API期望的字段名是 'files'
    });

    // 更新UI状态为处理中
    setProcessedDocuments(prevDocs =>
      prevDocs.map(doc => ({ ...doc, status: 'uploading' as const }))
    );

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);
        
        // 如果API返回了处理过的文件信息，则更新UI状态
        if (result.files && Array.isArray(result.files)) {
          setProcessedDocuments(result.files);
          
          // 如果有文件上传成功，自动分析第一个文件
          if (result.files.length > 0 && result.files[0].id) {
            // 延迟一点点再分析，确保文件已处理完成
            setTimeout(() => {
              analyzeDocument(result.files[0].id);
            }, 500);
          }
        } else {
          // 明确设置状态为'uploaded_to_server'
          setProcessedDocuments(prevDocs => {
            const updatedDocs = prevDocs.map(doc => ({ ...doc, status: 'uploaded_to_server' as const }));
            
            // 如果有文件上传成功，自动分析第一个文件
            if (updatedDocs.length > 0 && updatedDocs[0].id) {
              setTimeout(() => {
                analyzeDocument(updatedDocs[0].id);
              }, 500);
            }
            
            return updatedDocs;
          });
          console.log("Files uploaded and status set to 'uploaded_to_server'");
        }
      } else {
        const errorResult = await response.json();
        console.error("Upload failed:", errorResult);
        alert(`上传失败: ${errorResult.error || response.statusText}`);
        setProcessedDocuments(prevDocs =>
          prevDocs.map(doc => ({ ...doc, status: 'failed', errorMessage: errorResult.error || 'Upload failed' }))
        );
      }
    } catch (error) {
      console.error("Error during upload:", error);
      alert("上传过程中发生错误。");
      setProcessedDocuments(prevDocs =>
        prevDocs.map(doc => ({ ...doc, status: 'failed', errorMessage: 'Network or client-side error' }))
      );
    } finally {
      // 清空已选择文件列表，避免重复上传
      setAcceptedFilesList([]);
    }
  };

  return (
    <main className="container mx-auto p-4 md:p-8 lg:p-12">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          C-Doc Next - 文档批量处理工具
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          轻松处理您的 .docx 文档：提取信息、修改样式、批量操作。
        </p>
      </header>

      {/* 添加分析结果展示区域 */}
      {documentAnalysis && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>文档分析结果</CardTitle>
            <CardDescription>
              已自动检测出以下文档结构和样式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documentAnalysis.title && (
                <div className="border-b pb-3">
                  <p className="font-medium">标题</p>
                  <p className="text-sm my-1 p-2 bg-zinc-50 dark:bg-zinc-800 rounded">{documentAnalysis.title.text}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-xs text-zinc-500">字体：</span>
                      <span className="text-sm">{documentAnalysis.title.fontInfo?.name || '未检测到'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">大小：</span>
                      <span className="text-sm">{documentAnalysis.title.fontInfo?.size || '未检测到'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">样式：</span>
                      <span className="text-sm">
                        {documentAnalysis.title.fontInfo?.isBold ? '粗体 ' : ''}
                        {documentAnalysis.title.fontInfo?.isItalic ? '斜体 ' : ''}
                        {documentAnalysis.title.fontInfo?.isUnderline ? '下划线 ' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">对齐：</span>
                      <span className="text-sm">{documentAnalysis.title.fontInfo?.alignment || '未检测到'}</span>
                    </div>
                  </div>
                </div>
              )}

              {documentAnalysis.author && (
                <div className="border-b pb-3">
                  <p className="font-medium">作者</p>
                  <p className="text-sm my-1 p-2 bg-zinc-50 dark:bg-zinc-800 rounded">{documentAnalysis.author.text}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-xs text-zinc-500">字体：</span>
                      <span className="text-sm">{documentAnalysis.author.fontInfo?.name || '未检测到'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">大小：</span>
                      <span className="text-sm">{documentAnalysis.author.fontInfo?.size || '未检测到'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">样式：</span>
                      <span className="text-sm">
                        {documentAnalysis.author.fontInfo?.isBold ? '粗体 ' : ''}
                        {documentAnalysis.author.fontInfo?.isItalic ? '斜体 ' : ''}
                        {documentAnalysis.author.fontInfo?.isUnderline ? '下划线 ' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">对齐：</span>
                      <span className="text-sm">{documentAnalysis.author.fontInfo?.alignment || '未检测到'}</span>
                    </div>
                  </div>
                </div>
              )}

              {documentAnalysis.bodyFontInfo && (
                <div>
                  <p className="font-medium">正文样式</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <span className="text-xs text-zinc-500">字体：</span>
                      <span className="text-sm">{documentAnalysis.bodyFontInfo.name || '未检测到'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">大小：</span>
                      <span className="text-sm">{documentAnalysis.bodyFontInfo.size || '未检测到'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">样式：</span>
                      <span className="text-sm">
                        {documentAnalysis.bodyFontInfo.isBold ? '粗体 ' : ''}
                        {documentAnalysis.bodyFontInfo.isItalic ? '斜体 ' : ''}
                        {documentAnalysis.bodyFontInfo.isUnderline ? '下划线 ' : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">对齐：</span>
                      <span className="text-sm">{documentAnalysis.bodyFontInfo.alignment || '未检测到'}</span>
                    </div>
                  </div>
                </div>
              )}

              {documentAnalysis.wordCount !== undefined && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">字数统计：</span>
                  <span>{documentAnalysis.wordCount} 字</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={applyAnalysisResults} className="w-full">
              应用检测结果到设置
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {/* Section 1: File Upload */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>1. 上传文件</CardTitle>
            <CardDescription>
              选择或拖拽您的 .docx 文件到此处。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Dropzone Area */}
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center w-full h-64 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer 
                         bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-900 hover:bg-zinc-100 
                         dark:border-zinc-600 dark:hover:border-zinc-500
                         ${isDragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900" : ""}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-8 h-8 mb-4 text-zinc-500 dark:text-zinc-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5A5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                {isDragActive ? (
                  <p className="mb-2 text-sm text-blue-600 dark:text-blue-400">
                    松开即可上传文件
                  </p>
                ) : (
                  <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold">点击选择文件</span> 或拖拽到此
                  </p>
                )}
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  仅支持 .DOCX 文件
                </p>
              </div>
            </div>
            {acceptedFilesList.length > 0 && (
              <>
                <Button onClick={handleUpload} className="w-full mt-4">
                  上传 {acceptedFilesList.length} 个文件
                </Button>
                <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                  <p className="text-sm font-medium">已选择文件:</p>
                  {acceptedFilesList.map((file, index) => (
                    <div key={index} className="text-xs p-2 border rounded-md bg-zinc-50 dark:bg-zinc-800">
                      {file.name} ({(file.size / 1024).toFixed(2)} KB)
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Processing Options */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>2. 处理选项</CardTitle>
            <CardDescription>
              配置文档处理参数。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="targetFileName">目标文件名模板</Label>
              <Input 
                id="targetFileName" 
                placeholder="例如：{title}-{author}" 
                value={fileNameTemplate}
                onChange={(e) => setFileNameTemplate(e.target.value)}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                可用占位符: {"{title}"}, {"{author}"}, {"{originalName}"}
              </p>
            </div>
            
            {/* Title Options */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">标题样式设置</p>
                <div className="flex items-center">
                  <input
                    id="titleEnabled"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={titleOptions.enabled}
                    onChange={(e) => setTitleOptions({...titleOptions, enabled: e.target.checked})}
                  />
                  <Label htmlFor="titleEnabled" className="ml-2">启用修改</Label>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-3 ${titleOptions.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <Label htmlFor="titleFontName">字体名称</Label>
                  <Input 
                    id="titleFontName" 
                    placeholder="例如：微软雅黑" 
                    value={titleOptions.fontName}
                    onChange={(e) => setTitleOptions({...titleOptions, fontName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="titleFontSize">字体大小</Label>
                  <FontSizeSelector
                    id="titleFontSize"
                    placeholder="例如：小四、22"
                    value={titleOptions.fontSize}
                    onChange={(value) => setTitleOptions({...titleOptions, fontSize: value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="titlePrefix">标题前缀</Label>
                  <Input 
                    id="titlePrefix" 
                    placeholder="添加到标题前的文本" 
                    value={titleOptions.prefix}
                    onChange={(e) => setTitleOptions({...titleOptions, prefix: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="titleSuffix">标题后缀</Label>
                  <Input 
                    id="titleSuffix" 
                    placeholder="添加到标题后的文本" 
                    value={titleOptions.suffix}
                    onChange={(e) => setTitleOptions({...titleOptions, suffix: e.target.value})}
                  />
                </div>
                <div className="col-span-2 flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="titleBold"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={titleOptions.isBold}
                      onChange={(e) => setTitleOptions({...titleOptions, isBold: e.target.checked})}
                    />
                    <Label htmlFor="titleBold" className="ml-2">粗体</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="titleItalic"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={titleOptions.isItalic}
                      onChange={(e) => setTitleOptions({...titleOptions, isItalic: e.target.checked})}
                    />
                    <Label htmlFor="titleItalic" className="ml-2">斜体</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="titleUnderline"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={titleOptions.isUnderline}
                      onChange={(e) => setTitleOptions({...titleOptions, isUnderline: e.target.checked})}
                    />
                    <Label htmlFor="titleUnderline" className="ml-2">下划线</Label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Author Options */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">作者样式设置</p>
                <div className="flex items-center">
                  <input
                    id="authorEnabled"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={authorOptions.enabled}
                    onChange={(e) => setAuthorOptions({...authorOptions, enabled: e.target.checked})}
                  />
                  <Label htmlFor="authorEnabled" className="ml-2">启用修改</Label>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-3 ${authorOptions.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <Label htmlFor="authorFontName">字体名称</Label>
                  <Input 
                    id="authorFontName" 
                    placeholder="例如：宋体" 
                    value={authorOptions.fontName}
                    onChange={(e) => setAuthorOptions({...authorOptions, fontName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="authorFontSize">字体大小</Label>
                  <FontSizeSelector
                    id="authorFontSize"
                    placeholder="例如：小四、12"
                    value={authorOptions.fontSize}
                    onChange={(value) => setAuthorOptions({...authorOptions, fontSize: value})}
                  />
                </div>
                <div className="col-span-2 flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="authorBold"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={authorOptions.isBold}
                      onChange={(e) => setAuthorOptions({...authorOptions, isBold: e.target.checked})}
                    />
                    <Label htmlFor="authorBold" className="ml-2">粗体</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="authorItalic"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={authorOptions.isItalic}
                      onChange={(e) => setAuthorOptions({...authorOptions, isItalic: e.target.checked})}
                    />
                    <Label htmlFor="authorItalic" className="ml-2">斜体</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="authorUnderline"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={authorOptions.isUnderline}
                      onChange={(e) => setAuthorOptions({...authorOptions, isUnderline: e.target.checked})}
                    />
                    <Label htmlFor="authorUnderline" className="ml-2">下划线</Label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Body Options */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">正文样式设置</p>
                <div className="flex items-center">
                  <input
                    id="bodyEnabled"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={bodyOptions.enabled}
                    onChange={(e) => setBodyOptions({...bodyOptions, enabled: e.target.checked})}
                  />
                  <Label htmlFor="bodyEnabled" className="ml-2">启用修改</Label>
                </div>
              </div>
              <div className={`grid grid-cols-2 gap-3 ${bodyOptions.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                <div>
                  <Label htmlFor="bodyFontName">字体名称</Label>
                  <Input 
                    id="bodyFontName" 
                    placeholder="例如：宋体" 
                    value={bodyOptions.fontName}
                    onChange={(e) => setBodyOptions({...bodyOptions, fontName: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="bodyFontSize">字体大小</Label>
                  <FontSizeSelector
                    id="bodyFontSize"
                    placeholder="例如：五号、10.5"
                    value={bodyOptions.fontSize}
                    onChange={(value) => setBodyOptions({...bodyOptions, fontSize: value})}
                  />
                </div>
                <div className="col-span-2 flex space-x-4">
                  <div className="flex items-center">
                    <input
                      id="bodyBold"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={bodyOptions.isBold}
                      onChange={(e) => setBodyOptions({...bodyOptions, isBold: e.target.checked})}
                    />
                    <Label htmlFor="bodyBold" className="ml-2">粗体</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="bodyItalic"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={bodyOptions.isItalic}
                      onChange={(e) => setBodyOptions({...bodyOptions, isItalic: e.target.checked})}
                    />
                    <Label htmlFor="bodyItalic" className="ml-2">斜体</Label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="bodyUnderline"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={bodyOptions.isUnderline}
                      onChange={(e) => setBodyOptions({...bodyOptions, isUnderline: e.target.checked})}
                    />
                    <Label htmlFor="bodyUnderline" className="ml-2">下划线</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleProcessDocuments}
              disabled={processedDocuments.length === 0 || !processedDocuments.some(doc => doc.status === 'uploaded_to_server')}
            >
              应用选项并处理
            </Button>
          </CardFooter>
        </Card>

        {/* Section 3: File List & Status / Results */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>3. 文件列表与结果</CardTitle>
            <CardDescription>
              查看已上传文件、处理状态和下载结果。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processedDocuments.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {processedDocuments.map((doc) => (
                  <div key={doc.id} className="p-3 border rounded-md bg-zinc-50 dark:bg-zinc-800">
                    <p className="font-semibold text-sm truncate" title={doc.originalFileName}>
                      {doc.originalFileName}
                    </p>
                    <p className={`text-xs ${
                      doc.status === 'completed' ? 'text-green-600' 
                      : doc.status === 'failed' ? 'text-red-600' 
                      : doc.status === 'uploading' ? 'text-blue-600'
                      : doc.status === 'processing' ? 'text-orange-600'
                      : doc.status === 'uploaded_to_server' ? 'text-purple-600'
                      : doc.status === 'selected' ? 'text-gray-600'
                      : 'text-zinc-500'
                    }`}>
                      状态: {
                        doc.status === 'selected' ? '已选择' :
                        doc.status === 'uploading' ? '上传中...' :
                        doc.status === 'uploaded_to_server' ? '已上传，等待处理' :
                        doc.status === 'processing' ? '处理中...' :
                        doc.status === 'completed' ? '处理完成' :
                        doc.status === 'failed' ? '失败' :
                        doc.status === 'pending' ? '待处理' :
                        doc.status === 'converting_doc_to_docx' ? '转换中...' :
                        doc.status === 'analyzing' ? '分析中...' :
                        doc.status === 'cancelled' ? '已取消' :
                        doc.status
                      }
                    </p>
                    {doc.status === 'completed' && doc.processedFileUrl && (
                      <a 
                        href={doc.processedFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="mt-2">
                          下载处理后的文件
                        </Button>
                      </a>
                    )}
                    {doc.errorMessage && (
                      <p className="text-xs text-red-500 mt-1">错误: {doc.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                <p>此处将显示文件列表和处理结果...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Actions Footer */}
      <footer className="mt-12 text-center">
        <Button 
          size="lg"
          onClick={handleProcessDocuments}
          disabled={
            processing || 
            processedDocuments.length === 0 || 
            !processedDocuments.some(doc => doc.status === 'uploaded_to_server')
          }
        ></Button>
          {processing ? '处理中...' : '开始批量处理所有文件'}
        </Button>
      </footer>
    </main>
  );
}
