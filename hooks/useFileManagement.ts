/**
 * 文件管理相关的自定义Hook
 */
import { useState, useCallback } from 'react';
import { FileWithPath } from 'react-dropzone';
import { ProcessedDocument } from '@/app/types';
import { generateUUID } from '@/lib/utils';
import path from 'path';

interface UseFileManagementReturn {
  acceptedFilesList: FileWithPath[];
  processedDocuments: ProcessedDocument[];
  processing: boolean;
  uploadProgress: Record<string, number>;
  setAcceptedFilesList: React.Dispatch<React.SetStateAction<FileWithPath[]>>;
  setProcessedDocuments: React.Dispatch<React.SetStateAction<ProcessedDocument[]>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setUploadProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onDrop: (acceptedFiles: FileWithPath[]) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  downloadAllProcessedFiles: () => void;
  handleUpload: () => Promise<void>;
}

export function useFileManagement(): UseFileManagementReturn {
  const [acceptedFilesList, setAcceptedFilesList] = useState<FileWithPath[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

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
  const clearAllFiles = useCallback(() => {
    const confirmed = confirm("确定要清空所有文件吗？此操作不可撤销。");
    if (confirmed) {
      setAcceptedFilesList([]);
      setProcessedDocuments([]);
    }
  }, []);

  // 下载所有处理后的文件
  const downloadAllProcessedFiles = useCallback(() => {
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
  }, [processedDocuments]);

  // 文件上传处理
  const handleUpload = useCallback(async () => {
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

      // 处理需要转换的doc文件和直接上传的docx文件
      const processedFiles: File[] = [];
      
      for (const file of currentBatchFiles) {
        const docId = processedDocuments.find(d => d.originalFileName === file.name)?.id;
          
        try {
          if (file.name.toLowerCase().endsWith('.doc')) {
            // 提示用户使用外部转换工具
            alert(`文件 "${file.name}" 是 .doc 格式，请先使用 FreeConvert (https://www.freeconvert.com/zh) 转换为 .docx 格式后再上传。`);
            
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
        alert("没有可上传的 .docx 文件！");
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
  }, [acceptedFilesList, processedDocuments]);

  return {
    acceptedFilesList,
    processedDocuments,
    processing,
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