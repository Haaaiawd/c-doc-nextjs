"use client";

import { useCallback, useState, useRef, useEffect } from "react";
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
import { ProcessedDocument, DocumentAnalysisData, DocumentTemplate } from "./types";
import { FontUsageDisplay } from "@/components/font-usage-display";
import { UploadProgress } from "@/components/upload-progress";
import { SimpleTemplateSelector } from "@/components/template-selector";
import { getFontUsage } from "./api-client/get-font-usage";
import { generateUUID } from "@/lib/utils";
import { getDefaultTemplate } from "@/lib/preset-templates";

export default function HomePage() {
  // 状态来存储已接受的文件和将被处理的文档
  const [acceptedFilesList, setAcceptedFilesList] = useState<FileWithPath[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // 模板选择状态 - 简化的状态管理
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>(getDefaultTemplate());
  
  // 文件名模板输入框引用
  const fileNameTemplateInputRef = useRef<HTMLInputElement>(null);
  const [fileNameTemplate, setFileNameTemplate] = useState<string>("{title}-{author}");

  // 插入占位符到文件名模板
  const insertPlaceholder = (placeholder: string) => {
    const input = fileNameTemplateInputRef.current;
    if (!input) return;

    const startPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;
    const beforeText = fileNameTemplate.substring(0, startPos);
    const afterText = fileNameTemplate.substring(endPos);
    
    const newValue = beforeText + placeholder + afterText;
    setFileNameTemplate(newValue);
    
    // 设置焦点并将光标移动到插入的占位符后面
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(startPos + placeholder.length, startPos + placeholder.length);
    }, 0);
  };
  
  // 简化的文档分析状态
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisData | null>(null);
  
  // 字体分析相关的状态（保留用于预览）
  const [currentFontAnalysisFileId, setCurrentFontAnalysisFileId] = useState<string | null>(null);
  const [fontUsageData, setFontUsageData] = useState<Record<string, { count: number, samples: string[] }> | null>(null);
  const [loadingFontUsage, setLoadingFontUsage] = useState<boolean>(false);
  
  // 当前选中文件的状态
  const [currentEditingFileId, setCurrentEditingFileId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // 添加上传进度状态
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    console.log("Accepted files:", acceptedFiles);
    
    // 过滤掉已存在的文件，避免重复
    setAcceptedFilesList(prevFiles => {
      const existingFileNames = prevFiles.map(file => file.name);
      const uniqueNewFiles = acceptedFiles.filter(file => !existingFileNames.includes(file.name));
      return [...prevFiles, ...uniqueNewFiles];
    });

    // 将接受的文件转换为 ProcessedDocument 结构 (初步)
    const newDocuments: ProcessedDocument[] = acceptedFiles.map(file => ({
      id: generateUUID(),
      originalFileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      status: 'selected',
    }));
    
    // 累加到当前文档列表
    setProcessedDocuments(prevDocs => {
      const existingFileNames = prevDocs.map(doc => doc.originalFileName);
      const uniqueNewDocs = newDocuments.filter(
        newDoc => !existingFileNames.includes(newDoc.originalFileName) || 
                 prevDocs.some(doc => 
                   doc.originalFileName === newDoc.originalFileName && 
                   (doc.status === 'failed' || doc.status === 'completed')
                 )
      );
      return [...prevDocs, ...uniqueNewDocs];
    });
  }, []);

  // 添加删除文件功能
  const removeFile = (fileId: string) => {
    setAcceptedFilesList(prevFiles => {
      const docToRemove = processedDocuments.find(doc => doc.id === fileId);
      if (!docToRemove) return prevFiles;
      return prevFiles.filter(file => file.name !== docToRemove.originalFileName);
    });
    
    setProcessedDocuments(prevDocs => 
      prevDocs.filter(doc => doc.id !== fileId)
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true,
  });

  const handleUpload = async () => {
    if (acceptedFilesList.length === 0) {
      alert("请先选择文件！");
      return;
    }

    setProcessing(true);

    interface UploadResponse {
      success: boolean;
      message?: string;
      files?: Array<Omit<ProcessedDocument, 'status'>>;
      error?: string;
    }

    try {
      const currentBatchFiles = acceptedFilesList.filter(file => {
        return processedDocuments.some(doc => 
          doc.originalFileName === file.name && doc.status === 'selected'
        );
      });

      if (currentBatchFiles.length === 0) {
        alert("没有新文件需要上传！");
        return;
      }

      const currentBatchIds = currentBatchFiles.map(file => {
        const doc = processedDocuments.find(d => d.originalFileName === file.name);
        return doc?.id;
      }).filter(Boolean) as string[];

      // 更新当前批次文件的状态为uploading
      setProcessedDocuments(prevDocs => 
        prevDocs.map(doc => 
          currentBatchIds.includes(doc.id) 
            ? { ...doc, status: 'uploading' as const }
            : doc
        )
      );

      // 模拟上传进度
      currentBatchIds.forEach(id => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          if (progress >= 90) {
            setUploadProgress(prev => ({ ...prev, [id]: 90 }));
            clearInterval(interval);
          } else {
            setUploadProgress(prev => ({ ...prev, [id]: progress }));
          }
        }, 200);
      });

      const formData = new FormData();
      currentBatchFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.files) {
        // 完成上传进度
        currentBatchIds.forEach(id => {
          setUploadProgress(prev => ({ ...prev, [id]: 100 }));
        });

        // 更新文档状态
        setProcessedDocuments(prevDocs => 
          prevDocs.map(doc => {
            const uploadedFile = result.files!.find(f => f.originalFileName === doc.originalFileName);
            if (uploadedFile && currentBatchIds.includes(doc.id)) {
              return {
                ...doc,
                ...uploadedFile,
                status: 'uploaded_to_server' as const
              };
            }
            return doc;
          })
        );

        alert(`成功上传 ${result.files.length} 个文件！`);
      } else {
        throw new Error(result.message || result.error || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 恢复失败文件的状态
      const currentBatchIds = acceptedFilesList.map(file => {
        const doc = processedDocuments.find(d => d.originalFileName === file.name);
        return doc?.id;
      }).filter(Boolean) as string[];

      setProcessedDocuments(prevDocs => 
        prevDocs.map(doc => 
          currentBatchIds.includes(doc.id) 
            ? { ...doc, status: 'failed' as const, errorMessage: '上传失败' }
            : doc
        )
      );
    } finally {
      setProcessing(false);
      
      // 清除当前批次的文件和进度，保留其他文件
      const currentBatchFileNames = acceptedFilesList.map(file => file.name);
      setAcceptedFilesList(prevFiles => 
        prevFiles.filter(file => !currentBatchFileNames.includes(file.name))
      );
      
      // 清除上传进度
      setTimeout(() => {
        setUploadProgress({});
      }, 2000);
    }
  };

  // 简化的文档处理函数 - 使用选定的模板
  const handleProcessDocuments = async (singleFileId?: string) => {
    if (!selectedTemplate) {
      alert("请先选择文档模板！");
      return;
    }

    const filesToProcess = singleFileId 
      ? processedDocuments.filter(doc => doc.id === singleFileId)
      : processedDocuments.filter(doc => 
          doc.status === 'uploaded_to_server' || doc.status === 'completed'
        );

    if (filesToProcess.length === 0) {
      alert("没有可处理的文件！");
      return;
    }

    setProcessing(true);

    try {
      for (const doc of filesToProcess) {
        // 更新状态为处理中
        setProcessedDocuments(prevDocs => 
          prevDocs.map(d => 
            d.id === doc.id ? { ...d, status: 'processing' } : d
          )
        );

        const requestBody = {
          fileId: doc.id,
          fileNameTemplate,
          template: selectedTemplate, // 使用选定的模板
        };

        const response = await fetch('/api/process/docx', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (result.success) {
          setProcessedDocuments(prevDocs => 
            prevDocs.map(d => 
              d.id === doc.id 
                ? { 
                    ...d, 
                    status: 'completed',
                    processedFileUrl: result.processedFileUrl,
                    processedFileName: result.processedFileName,
                    targetFileName: result.targetFileName,
                  } 
                : d
            )
          );
        } else {
          setProcessedDocuments(prevDocs => 
            prevDocs.map(d => 
              d.id === doc.id 
                ? { 
                    ...d, 
                    status: 'failed',
                    errorMessage: result.message || '处理失败'
                  } 
                : d
            )
          );
        }
      }

      const successCount = filesToProcess.length;
      alert(`处理完成！成功处理 ${successCount} 个文件。`);
    } catch (error) {
      console.error('Processing error:', error);
      alert(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setProcessing(false);
    }
  };

  // 保留文档分析功能用于预览
  const analyzeDocument = async (fileId: string) => {
    setIsAnalyzing(true);
    setCurrentEditingFileId(fileId);
    
    try {
      const response = await fetch('/api/analyze/docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        throw new Error(`分析请求失败: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setDocumentAnalysis(result.data);
      } else {
        throw new Error(result.message || '分析失败');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`文档分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 保留字体分析功能
  const handleAnalyzeFonts = async (fileId: string) => {
    setLoadingFontUsage(true);
    setCurrentFontAnalysisFileId(fileId);
    
    try {
      const fontUsage = await getFontUsage(fileId);
      setFontUsageData(fontUsage);
    } catch (error) {
      console.error('Font analysis error:', error);
      alert(`字体分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setFontUsageData(null);
    } finally {
      setLoadingFontUsage(false);
    }
  };

  // 批量应用设置
  const applySettingsToAllFiles = async () => {
    if (!selectedTemplate) {
      alert("请先选择文档模板！");
      return;
    }
    
    const confirmed = confirm(`确定要使用"${selectedTemplate.name}"模板处理所有文件吗？`);
    if (confirmed) {
      await handleProcessDocuments();
    }
  };

  // UI状态重置
  const resetUIState = (options: {
    resetEditingFile?: boolean,
    resetFontAnalysis?: boolean,
    resetDocumentAnalysis?: boolean,
    resetFontUsage?: boolean
  } = {}) => {
    if (options.resetEditingFile) {
      setCurrentEditingFileId(null);
    }
    if (options.resetFontAnalysis) {
      setCurrentFontAnalysisFileId(null);
    }
    if (options.resetDocumentAnalysis) {
      setDocumentAnalysis(null);
    }
    if (options.resetFontUsage) {
      setFontUsageData(null);
    }
  };

  // 清空所有文件
  const clearAllFiles = () => {
    const confirmed = confirm("确定要清空所有文件吗？此操作不可撤销。");
    if (confirmed) {
      setAcceptedFilesList([]);
      setProcessedDocuments([]);
      resetUIState({
        resetEditingFile: true,
        resetFontAnalysis: true,
        resetDocumentAnalysis: true,
        resetFontUsage: true
      });
    }
  };

  // 下载所有处理后的文件
  const downloadAllProcessedFiles = () => {
    const completedFiles = processedDocuments.filter(doc => 
      doc.status === 'completed' && doc.processedFileUrl
    );
    
    if (completedFiles.length === 0) {
      alert("没有可下载的处理后文件！");
      return;
    }
    
    const downloadLinks = completedFiles.map(file => {
      if (!file.processedFileUrl) return null;
      
      const link = document.createElement('a');
      link.href = file.processedFileUrl;
      link.download = file.processedFileName || file.originalFileName || 'downloaded-file.docx';
      link.style.display = 'none';
      return link;
    }).filter(Boolean);
    
    if (downloadLinks.length > 0) {
      alert(`即将下载 ${downloadLinks.length} 个文件，请确保允许浏览器下载多个文件。`);
      
      downloadLinks.forEach(link => {
        document.body.appendChild(link!);
        link!.click();
        document.body.removeChild(link!);
      });
    }
  };

  // 监听文件列表变化，确保UI状态一致
  useEffect(() => {
    if (currentEditingFileId && !processedDocuments.some(doc => doc.id === currentEditingFileId)) {
      resetUIState({
        resetEditingFile: true,
        resetDocumentAnalysis: true
      });
    }
    
    if (currentFontAnalysisFileId && !processedDocuments.some(doc => doc.id === currentFontAnalysisFileId)) {
      resetUIState({
        resetFontAnalysis: true,
        resetFontUsage: true
      });
    }
  }, [processedDocuments, currentEditingFileId, currentFontAnalysisFileId]);

  return (
    <main className="container mx-auto p-4 md:p-8 lg:p-12">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          C-Doc Next - 文档批量处理工具 (精简版)
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          选择模板，轻松批量处理您的 .docx 文档。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧布局：文件上传 + 文件列表 */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 1: File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>1. 文件上传</CardTitle>
              <CardDescription>
                选择要处理的 .docx 文件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700"
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
                  <Button onClick={handleUpload} className="w-full mt-4" disabled={processing}>
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

          {/* Section 3: File List & Results */}
          <Card>
            <CardHeader>
              <CardTitle>3. 文件列表与结果</CardTitle>
              <CardDescription>
                查看已上传文件、处理状态和下载结果。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 字体分析结果展示 */}
              {(currentFontAnalysisFileId || loadingFontUsage) && (
                <div className="mb-4">
                  <FontUsageDisplay 
                    fontUsage={fontUsageData}
                    loading={loadingFontUsage}
                  />
                </div>
              )}
              
              {/* 批量操作按钮 */}
              {processedDocuments.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
                  <h3 className="font-medium mb-2">批量操作</h3>
                  <div className="flex flex-wrap gap-2">
                    {processedDocuments.some(doc => doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        onClick={applySettingsToAllFiles}
                        disabled={processing}
                      >
                        批量应用模板处理
                      </Button>
                    )}
                    {processedDocuments.some(doc => doc.status === 'completed' && doc.processedFileUrl) && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={downloadAllProcessedFiles}
                      >
                        下载所有处理后的文件
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={clearAllFiles}
                    >
                      清空所有文件
                    </Button>
                  </div>
                </div>
              )}
              
              {processedDocuments.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {processedDocuments.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`p-3 border rounded-md ${
                        currentEditingFileId === doc.id 
                          ? "bg-blue-50 dark:bg-blue-900 border-blue-300" 
                          : "bg-zinc-50 dark:bg-zinc-800"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-sm truncate" title={doc.originalFileName}>
                          {doc.originalFileName}
                        </p>
                        {/* 文件上传进度显示 */}
                        {doc.status === 'uploading' && uploadProgress[doc.id] !== undefined && (
                          <div className="ml-2">
                            <UploadProgress 
                              progress={uploadProgress[doc.id]} 
                              showLabel={true}
                            />
                          </div>
                        )}
                      </div>
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
                      <div className="flex flex-wrap gap-2 mt-2">
                        {/* 预览按钮 */}
                        {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                          <Button 
                            variant={currentEditingFileId === doc.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => analyzeDocument(doc.id)}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing && currentEditingFileId === doc.id 
                              ? "分析中..." 
                              : "预览分析"
                            }
                          </Button>
                        )}
                        
                        {/* 字体分析按钮 */}
                        {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleAnalyzeFonts(doc.id)}
                            disabled={loadingFontUsage && currentFontAnalysisFileId === doc.id}
                          >
                            {loadingFontUsage && currentFontAnalysisFileId === doc.id 
                              ? "分析中..." 
                              : "字体分析"}
                          </Button>
                        )}
                        
                        {/* 应用模板处理按钮 */}
                        {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleProcessDocuments(doc.id)}
                            disabled={processing}
                          >
                            应用模板处理
                          </Button>
                        )}
                        
                        {/* 下载按钮 */}
                        {doc.status === 'completed' && doc.processedFileUrl && (
                          <a 
                            href={doc.processedFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              下载处理后的文件
                            </Button>
                          </a>
                        )}

                        {/* 删除按钮 */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeFile(doc.id)}
                        >
                          删除
                        </Button>
                      </div>
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

        {/* 右侧布局：模板选择和基本配置 */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 2: Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>2. 模板选择</CardTitle>
              <CardDescription>
                选择预设模板或创建自定义模板。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleTemplateSelector
                selectedTemplate={selectedTemplate}
                onTemplateSelect={setSelectedTemplate}
              />
            </CardContent>
          </Card>

          {/* 文件名配置 */}
          <Card>
            <CardHeader>
              <CardTitle>文件名配置</CardTitle>
              <CardDescription>
                设置处理后文件的命名规则。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="targetFileName">目标文件名模板</Label>
                <Input 
                  id="targetFileName" 
                  placeholder="例如：{title}-{author}" 
                  value={fileNameTemplate}
                  onChange={(e) => setFileNameTemplate(e.target.value)}
                  ref={fileNameTemplateInputRef}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  可用占位符: {"{title}"}, {"{author}"}, {"{originalName}"}
                </p>
                <div className="flex space-x-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => insertPlaceholder("{title}")}>
                    标题
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => insertPlaceholder("{author}")}>
                    作者
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => insertPlaceholder("{originalName}")}>
                    原文件名
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 文档预览 */}
          {documentAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>文档预览</CardTitle>
                <CardDescription>
                  查看文档分析结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {documentAnalysis.title && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-blue-700">检测到的标题:</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold truncate" title={documentAnalysis.title.text}>
                      {documentAnalysis.title.text}
                    </p>
                  </div>
                )}
                
                {documentAnalysis.author && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-green-700">检测到的作者:</span>
                    </div>
                    <p className="mt-1 text-sm">{documentAnalysis.author.text}</p>
                  </div>
                )}

                {documentAnalysis.wordCount && (
                  <div className="text-sm text-zinc-600">
                    字数统计: {documentAnalysis.wordCount} 字
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
} 