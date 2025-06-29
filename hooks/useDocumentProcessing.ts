/**
 * 文档处理相关的自定义Hook
 */
import { useState, useCallback } from 'react';
import { ProcessedDocument, DocumentTemplate } from '@/app/types';

interface ToastOptions {
  type?: 'default' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
  duration?: number;
}

interface UseDocumentProcessingReturn {
  processing: boolean;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  handleProcessDocuments: (
    singleFileId?: string,
    processedDocuments?: ProcessedDocument[],
    selectedTemplate?: DocumentTemplate,
    fileNameTemplate?: string,
    setProcessedDocuments?: React.Dispatch<React.SetStateAction<ProcessedDocument[]>>,
    showToast?: (options: ToastOptions) => void
  ) => Promise<void>;
  applySettingsToAllFiles: (
    processedDocuments: ProcessedDocument[],
    selectedTemplate: DocumentTemplate,
    fileNameTemplate: string,
    setProcessedDocuments: React.Dispatch<React.SetStateAction<ProcessedDocument[]>>,
    showToast?: (options: ToastOptions) => void
  ) => Promise<void>;
}

export function useDocumentProcessing(): UseDocumentProcessingReturn {
  const [processing, setProcessing] = useState(false);

  // 简化的文档处理函数 - 使用选定的模板
  const handleProcessDocuments = useCallback(async (
    singleFileId?: string,
    processedDocuments: ProcessedDocument[] = [],
    selectedTemplate?: DocumentTemplate,
    fileNameTemplate: string = '{title}',
    setProcessedDocuments?: React.Dispatch<React.SetStateAction<ProcessedDocument[]>>,
    showToast?: (options: ToastOptions) => void
  ) => {
    if (!selectedTemplate) {
      showToast?.({
        type: 'warning',
        title: '请先选择模板',
        description: '请先选择文档模板！'
      });
      return;
    }

    if (!setProcessedDocuments) {
      console.error("setProcessedDocuments function is required");
      return;
    }

    const filesToProcess = singleFileId 
      ? processedDocuments.filter(doc => doc.id === singleFileId)
      : processedDocuments.filter(doc => 
          doc.status === 'uploaded_to_server' || doc.status === 'completed'
        );

    if (filesToProcess.length === 0) {
      showToast?.({
        type: 'warning',
        title: '没有可处理的文件',
        description: '没有可处理的文件！'
      });
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
          blobUrl: doc.blobUrl, // 添加blob URL
          originalFileName: doc.originalFileName,
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
      showToast?.({
        type: 'success',
        title: '处理完成',
        description: `处理完成！成功处理 ${successCount} 个文件。`
      });
    } catch (error) {
      console.error('Processing error:', error);
      showToast?.({
        type: 'error',
        title: '处理失败',
        description: `处理失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setProcessing(false);
    }
  }, []);

  // 批量应用设置
  const applySettingsToAllFiles = useCallback(async (
    processedDocuments: ProcessedDocument[],
    selectedTemplate: DocumentTemplate,
    fileNameTemplate: string,
    setProcessedDocuments: React.Dispatch<React.SetStateAction<ProcessedDocument[]>>,
    showToast?: (options: ToastOptions) => void
  ) => {
    if (!selectedTemplate) {
      showToast?.({
        type: 'warning',
        title: '请先选择模板',
        description: '请先选择文档模板！'
      });
      return;
    }
    
    // 直接执行批量处理，不需要确认弹窗
    showToast?.({
      type: 'default',
      title: '开始批量处理',
      description: `正在使用"${selectedTemplate.name}"模板处理所有文件...`
    });
    
    await handleProcessDocuments(
      undefined, 
      processedDocuments, 
      selectedTemplate, 
      fileNameTemplate, 
      setProcessedDocuments,
      showToast
    );
  }, [handleProcessDocuments]);

  return {
    processing,
    setProcessing,
    handleProcessDocuments,
    applySettingsToAllFiles
  };
} 