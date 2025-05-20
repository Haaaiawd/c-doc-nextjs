"use client";

import { useCallback, useState, useRef } from "react";
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
import { ProcessedDocument, DocumentAnalysisData, FontInfo } from "./types";
import { FontUsageDisplay } from "@/components/font-usage-display";
import { UploadProgress } from "@/components/upload-progress";
import { getFontUsage } from "./api-client/get-font-usage";
import { generateUUID } from "@/lib/utils";

export default function HomePage() {
  // 状态来存储已接受的文件和将被处理的文档
  const [acceptedFilesList, setAcceptedFilesList] = useState<FileWithPath[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [processing, setProcessing] = useState(false);
  
  // 文件名模板输入框引用
  const fileNameTemplateInputRef = useRef<HTMLInputElement>(null);

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
  
  // 使用导入的 DocumentAnalysisData 类型
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisData | null>(null);
  
  // 字体分析相关的状态
  const [currentFontAnalysisFileId, setCurrentFontAnalysisFileId] = useState<string | null>(null);
  const [fontUsageData, setFontUsageData] = useState<Record<string, { count: number, samples: string[] }> | null>(null);
  const [loadingFontUsage, setLoadingFontUsage] = useState<boolean>(false);
  
  // 当前选中文件的状态
  const [currentEditingFileId, setCurrentEditingFileId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // 添加上传进度状态
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const [titleOptions, setTitleOptions] = useState<DocumentPartOptions>({
    enabled: false,
    fontName: "微软雅黑",
    fontSize: "小二",
    isBold: true,
    isItalic: false,
    isUnderline: false,
    color: "#000000",
    alignment: "center",
    prefix: "",
    suffix: "",
    detectedStyles: [],
    modificationRules: []
  });

  const [authorOptions, setAuthorOptions] = useState<DocumentPartOptions>({
    enabled: false,
    fontName: "宋体",
    fontSize: "小四",
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: "#000000",
    alignment: "center",
    detectedStyles: [],
    modificationRules: []
  });

  const [bodyOptions, setBodyOptions] = useState<DocumentPartOptions>({
    enabled: false,
    fontName: "宋体",
    fontSize: "五号",
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: "#000000",
    alignment: "justify",
    detectedStyles: [],
    modificationRules: []
  });

  const [fileNameTemplate, setFileNameTemplate] = useState<string>("{title}-{author}");
  
  // 更新特定样式的规则（暂未使用，保留供未来功能扩展）
  /* 
  const handleRuleChange = (
    partType: 'title' | 'author' | 'body', 
    styleKey: string, 
    property: keyof StyleModificationRule, 
    value: string | boolean
  ) => {
    // 基于部件类型选择正确的状态更新函数
    const setOptions = 
      partType === 'title' ? setTitleOptions :
      partType === 'author' ? setAuthorOptions :
      setBodyOptions;
    
    // 更新状态
    setOptions(prev => {
      // 找到与给定样式键匹配的规则
      const updatedRules = prev.modificationRules.map(rule => {
        if (rule.originalStyleKey === styleKey) {
          return { ...rule, [property]: value };
        }
        return rule;
      });
      
      return { ...prev, modificationRules: updatedRules };
    });
  };
  */

  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    // 当文件被拖拽或选择时
    console.log("Accepted files:", acceptedFiles);
    
    // 过滤掉已存在的文件，避免重复
    setAcceptedFilesList(prevFiles => {
      const existingFileNames = prevFiles.map(file => file.name);
      const uniqueNewFiles = acceptedFiles.filter(file => !existingFileNames.includes(file.name));
      return [...prevFiles, ...uniqueNewFiles];
    });

    // 将接受的文件转换为 ProcessedDocument 结构 (初步)
    const newDocuments: ProcessedDocument[] = acceptedFiles.map(file => ({
      id: generateUUID(), // 使用安全的 UUID 生成函数
      originalFileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      status: 'selected', // 初始状态为 'selected'
    }));
    
    // 累加到当前文档列表，避免添加重复的文件名
    setProcessedDocuments(prevDocs => {
      const existingFileNames = prevDocs.map(doc => doc.originalFileName);
      const uniqueNewDocs = newDocuments.filter(
        newDoc => !existingFileNames.includes(newDoc.originalFileName) || 
                 // 如果文件名相同但状态是failed或completed，允许重新上传
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
    // 从acceptedFilesList中移除
    setAcceptedFilesList(prevFiles => {
      const docToRemove = processedDocuments.find(doc => doc.id === fileId);
      if (!docToRemove) return prevFiles;
      
      // 根据文件名匹配要删除的文件
      return prevFiles.filter(file => file.name !== docToRemove.originalFileName);
    });
    
    // 从processedDocuments中移除
    setProcessedDocuments(prevDocs => 
      prevDocs.filter(doc => doc.id !== fileId)
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { // 只接受 .docx 文件
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    multiple: true, // 允许选择多个文件
  });    const handleUpload = async () => {
    if (acceptedFilesList.length === 0) {
      alert("请先选择文件！");
      return;
    }

    // 初始化每个文件的上传进度
    const initialProgress: Record<string, number> = {};
    // 获取当前要上传的文件名列表
    const filesToUploadNames = acceptedFilesList.map(file => file.name);
    // 只更新当前批次要上传的文件状态
    const newProcessedDocs = processedDocuments.map(doc => {
      // 如果文件在当前上传批次中，则设为uploading状态
      if (filesToUploadNames.includes(doc.originalFileName) || doc.status === 'selected') {
        initialProgress[doc.id] = 0;
        return { ...doc, status: 'uploading' as const };
      }
      // 否则保持原状态不变
      return doc;
    });
    setUploadProgress(initialProgress);
    setProcessedDocuments(newProcessedDocs);
    
    // 创建 FormData 对象
    const formData = new FormData();
    acceptedFilesList.forEach(file => {
      formData.append("files", file); // 后端API期望的字段名是 'files'
    });

    // 定义上传响应类型
    interface UploadResponse {
      success: boolean;
      message?: string;
      files?: Array<Omit<ProcessedDocument, 'status'>>;
      error?: string;
    }
    
    // 声明result变量在try块外部，这样finally块也能访问
    let result: UploadResponse | undefined;

    try {
      // 使用 XMLHttpRequest 代替 fetch 以支持进度监控
      const xhr = new XMLHttpRequest();
      
      // 创建一个Promise来包装XMLHttpRequest
      const uploadPromise = new Promise<UploadResponse>((resolve, reject) => {
        xhr.open("POST", "/api/upload", true);
        
        // 添加进度事件监听
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            
            // 只为当前批次上传中的文件更新进度
            const updatedProgress = { ...uploadProgress };
            Object.keys(updatedProgress).forEach(id => {
              updatedProgress[id] = percentComplete;
            });
            setUploadProgress(updatedProgress);
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const responseData = JSON.parse(xhr.responseText);
              resolve(responseData);
            } catch {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`HTTP Error: ${xhr.status}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        
        // 发送请求
        xhr.send(formData);
      });
      
      // 等待上传完成
      result = await uploadPromise;

      console.log("Upload successful:", result);
      
      if (result.success) {
        // 如果API返回了处理过的文件信息，则更新UI状态
        if (result.files && Array.isArray(result.files)) {
          // 确保上传成功后文件状态设置为'uploaded_to_server'
          const updatedFiles = result.files.map((file) => ({
            ...file,
            status: 'uploaded_to_server' as const
          }));
          // 合并现有文档和新上传文档
          setProcessedDocuments(prevDocs => {
            const namesToReplace = updatedFiles.map(f => f.originalFileName);
            const existingDocs = prevDocs.filter(doc => !namesToReplace.includes(doc.originalFileName));
            return [...existingDocs, ...updatedFiles];
          });
          // 基于返回的updatedFiles清理acceptedFilesList，避免丢失其他文件
          const namesToClear = updatedFiles.map(f => f.originalFileName);
          setAcceptedFilesList(prevFiles => prevFiles.filter(file => !namesToClear.includes(file.name)));

          // 如果有文件上传成功，自动分析第一个文件（已注释，避免覆盖当前分析文档）
          // if (updatedFiles.length > 0 && updatedFiles[0].id) {
          //   setTimeout(() => {
          //     analyzeDocument(updatedFiles[0].id);
          //   }, 500);
          // }
        } else {
          // 明确设置状态为'uploaded_to_server'
          setProcessedDocuments(prevDocs => {
            // 获取当前批次中的文件ID（状态为'selected'或'uploading'的文件）
            const currentBatchIds = prevDocs
              .filter(doc => doc.status === 'selected' || doc.status === 'uploading')
              .map(doc => doc.id);
              
            // 只将当前上传批次中的文件状态改为'uploaded_to_server'
            const updatedDocs = prevDocs.map(doc => 
              currentBatchIds.includes(doc.id)
                ? { ...doc, status: 'uploaded_to_server' as const } 
                : doc
            );
            
            // 找出当前批次中第一个上传成功的文件
            const firstUploadedFile = updatedDocs.find(doc => 
              currentBatchIds.includes(doc.id) && doc.status === 'uploaded_to_server');
            
            // 如果有文件上传成功，自动分析该文件
            if (firstUploadedFile?.id) {
              setTimeout(() => {
                analyzeDocument(firstUploadedFile.id);
              }, 500);
            }
            
            return updatedDocs;
          });
          console.log("Files uploaded and status set to 'uploaded_to_server'");
        }
      } else {
        console.error("Upload failed:", result?.error);
        alert(`上传失败: ${result?.error || '未知错误'}`);
        setProcessedDocuments(prevDocs =>
          prevDocs.map(doc => ({ ...doc, status: 'failed', errorMessage: result?.error || 'Upload failed' }))
        );
      }
    } catch (error) {
      console.error("Error during upload:", error);
      alert("上传过程中发生错误。");
      setProcessedDocuments(prevDocs =>
        prevDocs.map(doc => ({ ...doc, status: 'failed', errorMessage: 'Network or client-side error' }))
      );
    }    finally {
      // 上传完成后acceptedFilesList的清理已在成功处理时完成，此处无需额外操作
      // 如果上传失败，保留所有文件，允许用户重试
    }
  };

  // 处理文档的函数 - 支持单个文件处理和批量处理
  const handleProcessDocuments = async (singleFileId?: string) => {
    // 检查是否有可处理的文档
    if (processedDocuments.length === 0 || 
        !processedDocuments.some(doc => 
          doc.status === 'uploaded_to_server' || doc.status === 'completed'
        )) {
      alert('没有可处理的文档！');
      return;
    }
    
    // 设置处理中状态
    setProcessing(true);
    
    // 准备要处理的文档列表
    const docsToProcess = singleFileId 
      ? processedDocuments.filter(doc => 
          doc.id === singleFileId && 
          (doc.status === 'uploaded_to_server' || doc.status === 'completed')
        )
      : processedDocuments.filter(doc => 
          doc.status === 'uploaded_to_server' || doc.status === 'completed'
        );
    
    if (docsToProcess.length === 0) {
      alert('没有符合条件的文档可处理！');
      setProcessing(false);
      return;
    }
    
    // 处理每个文档
    for (const doc of docsToProcess) {
      // 更新文档状态为处理中
      setProcessedDocuments(prevDocs =>
        prevDocs.map(d => d.id === doc.id ? { ...d, status: 'processing' as const } : d)
      );
      
      try {
        const response = await fetch('/api/process/docx', {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId: doc.id,
            fileNameTemplate: fileNameTemplate, // 添加文件名模板
            titleOptions: titleOptions.enabled ? {
              ...titleOptions,
              modificationRules: titleOptions.modificationRules
            } : undefined,
            bodyOptions: bodyOptions.enabled ? {
              ...bodyOptions,
              modificationRules: bodyOptions.modificationRules
            } : undefined,
            authorOptions: authorOptions.enabled ? {
              ...authorOptions,
              modificationRules: authorOptions.modificationRules
            } : undefined
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
              processedFileUrl: result.processedFileUrl,
              processedFileName: result.processedFileName
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

  // 文档分析函数
  const analyzeDocument = async (fileId: string) => {
    try {
      setIsAnalyzing(true);
      setCurrentEditingFileId(fileId); // 设置当前编辑的文件ID
      
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
          applyAnalysisResults(); // 自动应用分析结果
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
    } finally {
      setIsAnalyzing(false);
    }
    return null;
  };

  // 字体分析函数
  const handleAnalyzeFonts = async (fileId: string) => {
    // 如果当前已经在分析同一个文件，则不重复操作
    if (loadingFontUsage && currentFontAnalysisFileId === fileId) return;
    
    setCurrentFontAnalysisFileId(fileId);
    setLoadingFontUsage(true);
    setFontUsageData(null);
    
    try {
      const result = await getFontUsage(fileId);
      if (result.success) {
        setFontUsageData(result.fontUsage);
      } else {
        console.error('获取字体分析失败:', result.error);
        // 可以显示错误信息或提醒
      }
    } catch (error) {
      console.error('字体分析过程出错:', error);
      // 可以显示错误信息或提醒
    } finally {
      setLoadingFontUsage(false);
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

  // 应用分析结果到设置
  const applyAnalysisResults = () => {
    if (!documentAnalysis) return;

    // Helper function to create a default modification rule for a style
    const createDefaultModificationRule = (style: FontInfo) => ({
      originalStyleKey: style.originalStyleKey || generateUUID(), // 使用安全的 UUID 生成函数
      targetFontName: style.name || "",
      targetFontSize: style.size?.toString() || "",
      targetIsBold: style.isBold || false,
      targetIsItalic: style.isItalic || false,
      targetIsUnderline: style.isUnderline || false,
      targetColor: style.color || "",
      targetAlignment: style.alignment || "left", // Default alignment
    });

    if (documentAnalysis.title?.styles && documentAnalysis.title.styles.length > 0) {
      // 使用一个临时变量存储title样式，确保类型安全
      const titleStyles = documentAnalysis.title.styles;
      setTitleOptions(prev => ({
        ...prev,
        enabled: true, // Enable if analysis provides data
        // For simplicity, let's assume we apply the first detected style's properties
        // to the main options, and store all detected styles for detailed modification
        fontName: titleStyles[0].name || '',
        fontSize: titleStyles[0].size?.toString() || '',
        isBold: titleStyles[0].isBold || false,
        isItalic: titleStyles[0].isItalic || false,
        isUnderline: titleStyles[0].isUnderline || false,
        alignment: titleStyles[0].alignment || prev.alignment,
        // Store all detected styles for detailed modification UI
        detectedStyles: titleStyles,
        // Initialize modification rules based on detected styles
        modificationRules: titleStyles.map(createDefaultModificationRule)
      }));
    } else {
      // If no title styles detected, reset or keep existing, but clear detectedStyles and rules
      setTitleOptions(prev => ({ ...prev, detectedStyles: [], modificationRules: [] }));
    }

    if (documentAnalysis.author?.styles && documentAnalysis.author.styles.length > 0) {
      // 使用临时变量存储author样式，确保类型安全
      const authorStyles = documentAnalysis.author.styles;
      setAuthorOptions(prev => ({
        ...prev,
        enabled: true,
        fontName: authorStyles[0].name || '',
        fontSize: authorStyles[0].size?.toString() || '',
        isBold: authorStyles[0].isBold || false,
        isItalic: authorStyles[0].isItalic || false,
        isUnderline: authorStyles[0].isUnderline || false,
        alignment: authorStyles[0].alignment || prev.alignment,
        detectedStyles: authorStyles,
        modificationRules: authorStyles.map(createDefaultModificationRule)
      }));
    } else {
      setAuthorOptions(prev => ({ ...prev, detectedStyles: [], modificationRules: [] }));
    }

    if (documentAnalysis.bodyStyles && documentAnalysis.bodyStyles.length > 0) {
      // 使用临时变量存储body样式，确保类型安全
      const bodyStyles = documentAnalysis.bodyStyles;
      setBodyOptions(prev => ({
        ...prev,
        enabled: true,
        // For simplicity, apply first detected body style to main options
        fontName: bodyStyles[0].name || '',
        fontSize: bodyStyles[0].size?.toString() || '',
        isBold: bodyStyles[0].isBold || false,
        isItalic: bodyStyles[0].isItalic || false,
        isUnderline: bodyStyles[0].isUnderline || false,
        alignment: bodyStyles[0].alignment || prev.alignment,
        detectedStyles: bodyStyles,
        modificationRules: bodyStyles.map(createDefaultModificationRule)
      }));
    } else {
      setBodyOptions(prev => ({ ...prev, detectedStyles: [], modificationRules: [] }));
    }
  };

  // 将当前设置应用到所有文件
  const applySettingsToAllFiles = async () => {
    if (!confirmBeforeBatchOperation()) return;
    
    // 记录当前所有设置状态，确保样式和启用状态都被应用
    const currentTitleSettings = {...titleOptions};
    const currentAuthorSettings = {...authorOptions};
    const currentBodySettings = {...bodyOptions};
    
    // 应用设置到所有可处理的文件(包括已上传和已完成的文件)
    const filesToProcess = processedDocuments.filter(doc => 
      doc.status === 'uploaded_to_server' || doc.status === 'completed'
    );
    
    if (filesToProcess.length === 0) {
      alert('没有可处理的文件！');
      return;
    }
    
    if (window.confirm("是否也应用字体样式设置的启用状态？")) {
      // 如果用户确认，我们将启用状态也应用到所有文件
      setTitleOptions(currentTitleSettings);
      setAuthorOptions(currentAuthorSettings);
      setBodyOptions(currentBodySettings);
    }
    
    // 批量处理所有文件
    handleProcessDocuments();
  };

  // 确认批量操作
  const confirmBeforeBatchOperation = () => {
    return window.confirm("确定要将当前设置应用到所有文件吗？");
  };

  // 清空所有文件
  const clearAllFiles = () => {
    if (window.confirm("确定要清空所有文件吗？此操作不可恢复。")) {
      setProcessedDocuments([]);
      setAcceptedFilesList([]);
      setCurrentEditingFileId(null);
      setCurrentFontAnalysisFileId(null);
      setFontUsageData(null);
      setDocumentAnalysis(null);
    }
  };

  // 下载所有已处理文件
  const downloadAllProcessedFiles = () => {
    // 找出所有已处理完成且有下载链接的文件
    const completedFiles = processedDocuments.filter(
      doc => doc.status === 'completed' && doc.processedFileUrl
    );
    
    if (completedFiles.length === 0) {
      alert('没有已处理完成的文件可下载！');
      return;
    }

    // 创建一个隐藏的下载链接列表，并点击它们
    const downloadLinks = completedFiles.map(file => {
      if (!file.processedFileUrl) return null;
      
      // 创建临时下载链接
      const link = document.createElement('a');
      link.href = file.processedFileUrl;
      link.download = file.processedFileName || file.originalFileName || 'downloaded-file.docx';
      link.style.display = 'none';
      return link;
    }).filter(Boolean);
    
    // 依次下载所有文件
    if (downloadLinks.length > 0) {
      // 提示用户将开始下载多个文件
      alert(`即将下载 ${downloadLinks.length} 个文件，请确保允许浏览器下载多个文件。`);
      
      // 添加链接到文档并依次点击
      downloadLinks.forEach(link => {
        document.body.appendChild(link!);
        link!.click();
        document.body.removeChild(link!);
      });
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧布局：文件上传 + 文件列表与结果 */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 1: File Upload */}
          <Card>
            <CardHeader>
              <CardTitle>1. 文件上传</CardTitle>
              <CardDescription>
                选择要处理的文件
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

          {/* Section 3: File List & Status / Results (Moved under File Upload) */}
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
              
              {/* 添加批量操作按钮 */}
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
                        一键应用设置到所有文件
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
                        {/* 编辑按钮 */}
                        {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                          <Button 
                            variant={currentEditingFileId === doc.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => analyzeDocument(doc.id)}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing && currentEditingFileId === doc.id 
                              ? "分析中..." 
                              : currentEditingFileId === doc.id
                                ? "正在编辑"
                                : "编辑"
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
                              : "分析字体"}
                          </Button>
                        )}
                        
                        {/* 应用处理按钮 - 支持上传后或已处理完成的文件 */}
                        {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleProcessDocuments(doc.id)}
                            disabled={processing}
                          >
                            应用设置并处理
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

        {/* 右侧布局：处理选项 */}
        <div className="lg:col-span-1">
          {/* Section 2: Processing Options */}
          <Card>
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
                  ref={fileNameTemplateInputRef}
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  可用占位符: {"{title}"}, {"{author}"}, {"{originalName}"}
                </p>
                <div className="flex space-x-2 mt-2">
                  <Button size="sm" variant="outline" onClick={() => insertPlaceholder("{title}")}>
                    插入标题占位符
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => insertPlaceholder("{author}")}>
                    插入作者占位符
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => insertPlaceholder("{originalName}")}>
                    插入原文件名占位符
                  </Button>
                </div>
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
                
                {documentAnalysis?.title && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-blue-700">系统识别的标题:</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold truncate" title={documentAnalysis.title.text}>
                      {documentAnalysis.title.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      识别到的字体: {documentAnalysis.title.styles[0]?.name || '未知'} 
                      {documentAnalysis.title.styles[0]?.size ? ` (${documentAnalysis.title.styles[0].size}pt)` : ''}
                    </p>
                  </div>
                )}
                
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
                    <FontSizeSelector
                      id="titleFontSize"
                      label=""
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
                
                {documentAnalysis?.author && (
                  <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center text-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-green-700">系统识别的作者:</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold truncate" title={documentAnalysis.author.text}>
                      {documentAnalysis.author.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      识别到的字体: {documentAnalysis.author.styles[0]?.name || '未知'} 
                      {documentAnalysis.author.styles[0]?.size ? ` (${documentAnalysis.author.styles[0].size}pt)` : ''}
                    </p>
                  </div>
                )}
                
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
                    <FontSizeSelector
                      id="authorFontSize"
                      label=""
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
                    <FontSizeSelector
                      id="bodyFontSize"
                      label=""
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
                onClick={() => handleProcessDocuments()}
                disabled={
                  processing || 
                  processedDocuments.length === 0 || 
                  !processedDocuments.some(doc => doc.status === 'uploaded_to_server' || doc.status === 'completed')
                }
              >
                应用选项并处理
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* 不再需要全局操作页脚，移除 */}
    </main>
  );
}
