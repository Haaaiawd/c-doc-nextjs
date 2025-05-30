/**
 * 图片提取相关的自定义Hook
 */
import { useState, useCallback } from 'react';
import { ProcessedDocument } from '@/app/types';
import { ExtractedImage, ImageExtractionState } from '@/types/document-processing';
import path from 'path';

interface UseImageExtractionReturn {
  imageExtractionState: Record<string, ImageExtractionState>;
  setImageExtractionState: React.Dispatch<React.SetStateAction<Record<string, ImageExtractionState>>>;
  extractImages: (fileId: string, processedDocuments: ProcessedDocument[]) => Promise<void>;
  clearImageExtractionResults: (fileId: string) => void;
  downloadAllImages: (fileId: string) => void;
}

export function useImageExtraction(): UseImageExtractionReturn {
  const [imageExtractionState, setImageExtractionState] = useState<Record<string, ImageExtractionState>>({});

  // 图片提取功能
  const extractImages = useCallback(async (fileId: string, processedDocuments: ProcessedDocument[]) => {
    const doc = processedDocuments.find(d => d.id === fileId);
    if (!doc) {
      alert("文件未找到！");
      return;
    }

    // 检查是否为docx文件
    if (!doc.originalFileName.toLowerCase().endsWith('.docx')) {
      alert("图片提取功能仅支持.docx文件！");
      return;
    }

    // 检查文件是否已上传到服务器
    if (doc.status !== 'uploaded_to_server' && doc.status !== 'completed') {
      alert("请先上传文件到服务器！");
      return;
    }

    // 设置提取状态
    setImageExtractionState(prevState => ({
      ...prevState,
      [fileId]: {
        isExtracting: true,
        images: [],
        totalCount: 0,
        totalSize: 0
      }
    }));

    try {
      // 通过文件服务API获取文件
      const fileExtension = path.extname(doc.originalFileName);
      const fileUrl = `/api/files/${fileId}${fileExtension}`;
      
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('无法获取已上传的文件');
      }

      const fileBlob = await fileResponse.blob();
      const formData = new FormData();
      formData.append('file', fileBlob, doc.originalFileName);

      const response = await fetch('/api/extract-images', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        setImageExtractionState(prevState => ({
          ...prevState,
          [fileId]: {
            isExtracting: false,
            images: result.data.images,
            totalCount: result.data.totalCount,
            totalSize: result.data.totalSize
          }
        }));

        if (result.data.totalCount > 0) {
          alert(`成功提取 ${result.data.totalCount} 张图片！`);
        } else {
          alert('该文档不包含图片。');
        }
      } else {
        throw new Error(result.error || '图片提取失败');
      }
    } catch (error) {
      console.error('图片提取错误:', error);
      alert(`图片提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
      
      // 清除提取状态
      setImageExtractionState(prevState => {
        const newState = { ...prevState };
        delete newState[fileId];
        return newState;
      });
    }
  }, []);

  // 清除图片提取结果
  const clearImageExtractionResults = useCallback((fileId: string) => {
    setImageExtractionState(prevState => {
      const newState = { ...prevState };
      delete newState[fileId];
      return newState;
    });
  }, []);

  // 下载所有图片
  const downloadAllImages = useCallback((fileId: string) => {
    const extractionState = imageExtractionState[fileId];
    if (!extractionState || extractionState.images.length === 0) {
      alert("没有可下载的图片！");
      return;
    }

    extractionState.images.forEach((img, index) => {
      const link = document.createElement('a');
      link.href = img.base64Data;
      link.download = img.name || `image_${index + 1}`;
      link.click();
    });
  }, [imageExtractionState]);

  return {
    imageExtractionState,
    setImageExtractionState,
    extractImages,
    clearImageExtractionResults,
    downloadAllImages
  };
} 