/**
 * 文件管理相关的自定义Hook
 */
import { useState, useCallback } from 'react';
import { FileWithPath } from 'react-dropzone';
import { ProcessedDocument } from '@/app/types';
import { generateUUID } from '@/lib/utils';
import path from 'path';

interface ToastOptions {
  type?: 'default' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
  duration?: number;
}

interface UseFileManagementReturn {
  acceptedFilesList: FileWithPath[];
  processedDocuments: ProcessedDocument[];
  processing: boolean;
  isBatchDownloading: boolean;
  uploadProgress: Record<string, number>;
  setAcceptedFilesList: React.Dispatch<React.SetStateAction<FileWithPath[]>>;
  setProcessedDocuments: React.Dispatch<React.SetStateAction<ProcessedDocument[]>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onDrop: (acceptedFiles: FileWithPath[]) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: (showToast?: (options: ToastOptions) => void) => void;
  downloadAllProcessedFiles: (showToast?: (options: ToastOptions) => void) => void;
  handleUpload: (showToast?: (options: ToastOptions) => void) => Promise<void>;
}

export function useFileManagement(): UseFileManagementReturn {
  const [acceptedFilesList, setAcceptedFilesList] = useState<FileWithPath[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  // 文件拖拽处理
  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    console.log("Accepted files:", acceptedFiles);
    
    // 过滤掉已存在的文件，避免重复
    setAcceptedFilesList(prevFiles => {
      const existingFileNames = prevFiles.map(file => file.name);
      const uniqueNewFiles = acceptedFiles.filter(file => !existingFileNames.includes(file.name));
      return [...prevFiles, ...uniqueNewFiles];
    });

    // 将接受的文件转换为 ProcessedDocument 结构
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

  // 删除文件
  const removeFile = useCallback((fileId: string) => {
    setAcceptedFilesList(prevFiles => {
      const docToRemove = processedDocuments.find(doc => doc.id === fileId);
      if (!docToRemove) return prevFiles;
      return prevFiles.filter(file => file.name !== docToRemove.originalFileName);
    });
    
    setProcessedDocuments(prevDocs => 
      prevDocs.filter(doc => doc.id !== fileId)
    );
  }, [processedDocuments]);

  // 清空所有文件
  const clearAllFiles = useCallback((showToast?: (options: ToastOptions) => void) => {
    setAcceptedFilesList([]);
    setProcessedDocuments([]);
    showToast?.({
      type: 'success',
      title: '清空完成',
      description: '所有文件已清空'
    });
  }, []);

  // 下载所有处理后的文件 - 更新为批量下载
  const downloadAllProcessedFiles = useCallback(async (showToast?: (options: ToastOptions) => void) => {
    const completedFiles = processedDocuments.filter(doc => 
      doc.status === 'completed' && doc.processedFileUrl && doc.processedFileName
    );
    
    if (completedFiles.length === 0) {
      showToast?.({
        type: 'warning',
        title: '没有可下载的文件',
        description: '没有可供批量下载的处理后文件！'
      });
      return;
    }
    
    setIsBatchDownloading(true);
    showToast?.({
      type: 'default',
      title: '开始打包下载...',
      description: `正在准备 ${completedFiles.length} 个文件，请稍候。`
    });

    try {
      const fileInfos = completedFiles.map(file => ({
        id: file.id,
        processedFileName: file.processedFileName,
      }));

      const response = await fetch('/api/files/download-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileInfos }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '下载失败，无法解析错误响应' }));
        throw new Error(errorData.details || errorData.error || '下载请求失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // 从 content-disposition 头获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      let downloadFileName = `processed_documents_${Date.now()}.zip`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match && match[1]) {
          downloadFileName = match[1];
        }
      }
      a.download = downloadFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast?.({
        type: 'success',
        title: '打包成功',
        description: `${completedFiles.length} 个文件已打包成 zip 文件下载。`,
      });

    } catch (error) {
      showToast?.({
        type: 'error',
        title: '打包下载失败',
        description: error instanceof Error ? error.message : '发生未知错误',
      });
    } finally {
      setIsBatchDownloading(false);
    }
  }, [processedDocuments]);

  // 文件上传处理
  const handleUpload = useCallback(async (showToast?: (options: ToastOptions) => void) => {
    if (acceptedFilesList.length === 0) {
      showToast?.({
        type: 'warning',
        title: '请先选择文件',
        description: '请先选择文件！'
      });
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
        showToast?.({
          type: 'warning',
          title: '没有新文件',
          description: '没有新文件需要上传！'
        });
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

      // 处理需要转换的doc文件和直接上传的docx文件
      const processedFiles: File[] = [];
      
      for (const file of currentBatchFiles) {
        const docId = processedDocuments.find(d => d.originalFileName === file.name)?.id;
          
        try {
          if (file.name.toLowerCase().endsWith('.doc')) {
            // 提示用户使用外部转换工具
            showToast?.({
              type: 'warning',
              title: '不支持.doc格式',
              description: `文件 "${file.name}" 是 .doc 格式，请先使用 FreeConvert 转换为 .docx 格式后再上传。`,
              duration: 8000
            });
            
            // 更新状态为失败
            if (docId) {
              setProcessedDocuments(prevDocs => 
                prevDocs.map(doc => 
                  doc.id === docId 
                    ? { 
                        ...doc, 
                        status: 'failed' as const, 
                        errorMessage: '不支持 .doc 格式，请转换为 .docx'
                      }
                    : doc
                )
              );
            }
            continue;
          } else {
            processedFiles.push(file);
          }
        } catch (conversionError) {
          console.error(`处理文件${file.name}时出错:`, conversionError);
          
          // 更新状态为失败
          if (docId) {
            setProcessedDocuments(prevDocs => 
              prevDocs.map(doc => 
                doc.id === docId 
                  ? { 
                      ...doc, 
                      status: 'failed' as const, 
                      errorMessage: `文件处理失败: ${conversionError instanceof Error ? conversionError.message : '未知错误'}`
                    }
                  : doc
              )
            );
          }
          continue;
        }
      }

      if (processedFiles.length === 0) {
        showToast?.({
          type: 'warning',
          title: '没有可上传的文件',
          description: '没有可上传的 .docx 文件！'
        });
        return;
      }

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
      processedFiles.forEach((file) => {
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

        showToast?.({
          type: 'success',
          title: '上传成功',
          description: `成功上传 ${result.files.length} 个文件！`
        });
      } else {
        throw new Error(result.message || result.error || '上传失败');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast?.({
        type: 'error',
        title: '上传失败',
        description: `上传失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
      
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
  }, [acceptedFilesList, processedDocuments]);

  return {
    acceptedFilesList,
    processedDocuments,
    processing,
    isBatchDownloading,
    uploadProgress,
    setAcceptedFilesList,
    setProcessedDocuments,
    setProcessing,
    setUploadProgress,
    onDrop,
    removeFile,
    clearAllFiles,
    downloadAllProcessedFiles,
    handleUpload
  };
} 