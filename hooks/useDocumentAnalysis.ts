/**
 * 文档分析相关的自定义Hook
 */
import { useState, useCallback, useEffect } from 'react';
import { ProcessedDocument, DocumentAnalysisData } from '@/app/types';

interface UseDocumentAnalysisReturn {
  documentAnalysis: DocumentAnalysisData | null;
  setDocumentAnalysis: React.Dispatch<React.SetStateAction<DocumentAnalysisData | null>>;
  currentEditingFileId: string | null;
  setCurrentEditingFileId: React.Dispatch<React.SetStateAction<string | null>>;
  isAnalyzing: boolean;
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  analyzeDocument: (fileId: string) => Promise<void>;
  resetUIState: (options?: {
    resetEditingFile?: boolean;
    resetDocumentAnalysis?: boolean;
  }) => void;
}

export function useDocumentAnalysis(): UseDocumentAnalysisReturn {
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisData | null>(null);
  const [currentEditingFileId, setCurrentEditingFileId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // 保留文档分析功能用于预览
  const analyzeDocument = useCallback(async (fileId: string) => {
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
      
      if (result.success && result.analysis) {
        setDocumentAnalysis(result.analysis);
      } else {
        throw new Error(result.error || '分析失败');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`文档分析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // UI状态重置
  const resetUIState = useCallback((options: {
    resetEditingFile?: boolean;
    resetDocumentAnalysis?: boolean;
  } = {}) => {
    if (options.resetEditingFile) {
      setCurrentEditingFileId(null);
    }
    if (options.resetDocumentAnalysis) {
      setDocumentAnalysis(null);
    }
  }, []);

  return {
    documentAnalysis,
    setDocumentAnalysis,
    currentEditingFileId,
    setCurrentEditingFileId,
    isAnalyzing,
    setIsAnalyzing,
    analyzeDocument,
    resetUIState
  };
} 