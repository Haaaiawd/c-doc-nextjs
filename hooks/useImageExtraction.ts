/**
 * 图片提取相关的自定义Hook - 增强版
 * 支持处理精确的图片位置信息
 */
import { useState, useCallback } from 'react';
import { ProcessedDocument } from '@/app/types';
import { ExtractedImage, ImageExtractionState, ImageRelationshipInfo, ParagraphImageInfo } from '@/types/document-processing';
import path from 'path';

interface UseImageExtractionReturn {
  imageExtractionState: Record<string, ImageExtractionState>;
  setImageExtractionState: React.Dispatch<React.SetStateAction<Record<string, ImageExtractionState>>>;
  extractImages: (fileId: string, processedDocuments: ProcessedDocument[], showToast?: (toast: any) => void) => Promise<void>;
  clearImageExtractionResults: (fileId: string) => void;
  downloadAllImages: (fileId: string, showToast?: (toast: any) => void) => void;
}

export function useImageExtraction(): UseImageExtractionReturn {
  const [imageExtractionState, setImageExtractionState] = useState<Record<string, ImageExtractionState>>({});

  // 图片提取功能 - 增强版
  const extractImages = useCallback(async (fileId: string, processedDocuments: ProcessedDocument[], showToast?: (toast: any) => void) => {
    const doc = processedDocuments.find(d => d.id === fileId);
    if (!doc) {
      if (showToast) {
        showToast({
          type: 'error',
          title: '错误',
          description: '文件未找到！'
        });
      }
      return;
    }

    // 检查是否为docx文件
    if (!doc.originalFileName.toLowerCase().endsWith('.docx')) {
      if (showToast) {
        showToast({
          type: 'warning',
          title: '文件格式不支持',
          description: '图片提取功能仅支持.docx文件！'
        });
      }
      return;
    }

    // 检查文件是否已上传到服务器
    if (doc.status !== 'uploaded_to_server' && doc.status !== 'completed') {
      if (showToast) {
        showToast({
          type: 'warning',
          title: '文件未就绪',
          description: '请先上传文件到服务器！'
        });
      }
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
      
      console.log('🔍 开始获取文件进行图片提取...');
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('无法获取已上传的文件');
      }

      const fileBlob = await fileResponse.blob();
      const formData = new FormData();
      formData.append('file', fileBlob, doc.originalFileName);

      console.log('📡 发送图片提取请求...');
      const response = await fetch('/api/extract-images', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        console.log('✅ 图片提取成功:', result.data);
        
        // 构建增强的提取状态
        const enhancedExtractionState: ImageExtractionState = {
          isExtracting: false,
          images: result.data.images,
          totalCount: result.data.totalCount,
          totalSize: result.data.totalSize,
          relationshipDetails: result.data.relationshipDetails,
          paragraphImages: result.data.paragraphImages,
          statistics: result.data.statistics
        };

        setImageExtractionState(prevState => ({
          ...prevState,
          [fileId]: enhancedExtractionState
        }));

        // 显示简化的提取结果
        if (result.data.totalCount > 0) {
          const stats = result.data.statistics;
          const matchRate = stats ? ((stats.matchedImages / result.data.totalCount) * 100).toFixed(1) : 0;
          
          if (showToast) {
            showToast({
              type: 'success',
              title: '图片提取完成',
              description: `成功提取 ${result.data.totalCount} 张图片，精确定位 ${stats?.matchedImages || 0} 张（${matchRate}%匹配率）`,
              duration: 4000
            });
          }
        } else {
          if (showToast) {
            showToast({
              type: 'default',
              title: '提取完成',
              description: '该文档不包含图片。'
            });
          }
        }
      } else {
        throw new Error(result.error || '图片提取失败');
      }
    } catch (error) {
      console.error('📛 图片提取错误:', error);
      if (showToast) {
        showToast({
          type: 'error',
          title: '图片提取失败',
          description: error instanceof Error ? error.message : '未知错误'
        });
      }
      
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

  // 下载所有图片 - 增强版
  const downloadAllImages = useCallback((fileId: string, showToast?: (toast: any) => void) => {
    const extractionState = imageExtractionState[fileId];
    if (!extractionState || extractionState.images.length === 0) {
      if (showToast) {
        showToast({
          type: 'warning',
          title: '没有图片',
          description: '没有可下载的图片！'
        });
      }
      return;
    }

    // 按段落分组下载图片
    const imagesByParagraph = extractionState.images.reduce((groups, img) => {
      const paragraphIndex = img.paragraphIndex ?? -1;
      if (!groups[paragraphIndex]) {
        groups[paragraphIndex] = [];
      }
      groups[paragraphIndex].push(img);
      return groups;
    }, {} as Record<number, ExtractedImage[]>);

    const totalImages = extractionState.images.length;
    const totalParagraphs = Object.keys(imagesByParagraph).length;
    
    // 使用Toast替代confirm
    if (showToast) {
      showToast({
        type: 'default',
        title: '开始下载',
        description: `正在下载 ${totalImages} 张图片（来自 ${totalParagraphs} 个段落），请允许浏览器下载多个文件。`,
        duration: 5000
      });
    }

    // 按段落顺序下载图片
    const sortedParagraphs = Object.keys(imagesByParagraph)
      .map(Number)
      .sort((a, b) => a - b);

    let downloadCount = 0;
    
    sortedParagraphs.forEach(paragraphIndex => {
      const images = imagesByParagraph[paragraphIndex];
      const paragraphPrefix = paragraphIndex >= 0 ? `段落${paragraphIndex}_` : '位置未知_';
      
      images.forEach((img, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = img.base64Data;
          
          // 生成有意义的文件名
          const originalName = img.name.split('/').pop() || `image_${index + 1}`;
          const baseName = originalName.replace(/\.[^/.]+$/, ""); // 移除扩展名
          const extension = originalName.match(/\.[^/.]+$/)?.[0] || '.png';
          
          link.download = `${paragraphPrefix}${baseName}_${img.relationshipId || 'norel'}${extension}`;
          
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          downloadCount++;
          
          console.log(`⬇️  下载图片 ${downloadCount}/${totalImages}: ${link.download}`);
          
          // 下载完成后显示通知
          if (downloadCount === totalImages && showToast) {
            showToast({
              type: 'success',
              title: '下载完成',
              description: `已成功下载 ${totalImages} 张图片！`
            });
          }
        }, index * 200); // 延迟200ms避免浏览器阻止多个下载
      });
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