"use client";

import { useEffect } from "react";
import { FileUploadSection } from "@/components/FileUploadSection";
import { FileListSection } from "@/components/FileListSection";
import { TemplateConfigSection } from "@/components/TemplateConfigSection";
import { DocumentPreviewSection } from "@/components/DocumentPreviewSection";
import PageCleanupHandler from "@/components/PageCleanupHandler";
import { useFileManagement } from "@/hooks/useFileManagement";
import { useImageExtraction } from "@/hooks/useImageExtraction";
import { useDocumentProcessing } from "@/hooks/useDocumentProcessing";
import { useDocumentAnalysis } from "@/hooks/useDocumentAnalysis";
import { useTemplateManagement } from "@/hooks/useTemplateManagement";
import { useToast } from "@/components/ui/toast";

export default function HomePage() {
  // 使用自定义hooks
  const fileManagement = useFileManagement();
  const imageExtraction = useImageExtraction();
  const documentProcessing = useDocumentProcessing();
  const documentAnalysis = useDocumentAnalysis();
  const templateManagement = useTemplateManagement();
  
  // 使用Toast系统
  const { addToast } = useToast();

  // 监听文件列表变化，确保UI状态一致
  useEffect(() => {
    if (documentAnalysis.currentEditingFileId && 
        !fileManagement.processedDocuments.some(doc => doc.id === documentAnalysis.currentEditingFileId)) {
      documentAnalysis.resetUIState({
        resetEditingFile: true,
        resetDocumentAnalysis: true
      });
    }
  }, [fileManagement.processedDocuments, documentAnalysis.currentEditingFileId, documentAnalysis]);

  // 处理单个文档
  const handleProcessDocument = async (fileId: string) => {
    await documentProcessing.handleProcessDocuments(
      fileId,
      fileManagement.processedDocuments,
      templateManagement.selectedTemplate,
      templateManagement.fileNameTemplate,
      fileManagement.setProcessedDocuments,
      addToast
    );
  };

  // 批量应用设置
  const handleApplySettingsToAllFiles = async () => {
    await documentProcessing.applySettingsToAllFiles(
      fileManagement.processedDocuments,
      templateManagement.selectedTemplate,
      templateManagement.fileNameTemplate,
      fileManagement.setProcessedDocuments,
      addToast
    );
  };

  // 图片提取相关处理 - 现在使用Toast
  const handleExtractImages = async (fileId: string) => {
    await imageExtraction.extractImages(fileId, fileManagement.processedDocuments, addToast);
  };

  const handleBatchExtractImages = async () => {
    await imageExtraction.batchExtractImages(fileManagement.processedDocuments, addToast);
  };

  const handleDownloadAllImages = (fileId: string) => {
    imageExtraction.downloadAllImages(fileId, addToast);
  };

  const handleClearImageResults = (fileId: string) => {
    imageExtraction.clearImageExtractionResults(fileId);
  };

  // 包装其他需要Toast的函数
  const handleUpload = () => fileManagement.handleUpload(addToast);
  const handleDownloadAllProcessedFiles = () => fileManagement.downloadAllProcessedFiles(addToast);
  const handleClearAllFiles = () => fileManagement.clearAllFiles(addToast);
  const handleAnalyzeDocument = (fileId: string) => documentAnalysis.analyzeDocument(fileId, addToast);

  return (
    <main className="container mx-auto p-4 md:p-8 lg:p-12">
      {/* 页面清理处理组件 */}
      <PageCleanupHandler />
      
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
          <FileUploadSection
            acceptedFilesList={fileManagement.acceptedFilesList}
            processing={fileManagement.processing || documentProcessing.processing}
            onDrop={fileManagement.onDrop}
            onUpload={handleUpload}
          />

          {/* Section 3: File List & Results */}
          <FileListSection
            processedDocuments={fileManagement.processedDocuments}
            uploadProgress={fileManagement.uploadProgress}
            currentEditingFileId={documentAnalysis.currentEditingFileId}
            isAnalyzing={documentAnalysis.isAnalyzing}
            processing={fileManagement.processing || documentProcessing.processing}
            isBatchExtracting={imageExtraction.isBatchExtracting}
            isBatchDownloading={fileManagement.isBatchDownloading}
            imageExtractionState={imageExtraction.imageExtractionState}
            onAnalyzeDocument={handleAnalyzeDocument}
            onProcessDocument={handleProcessDocument}
            onExtractImages={handleExtractImages}
            onBatchExtractImages={handleBatchExtractImages}
            onRemoveFile={fileManagement.removeFile}
            onApplySettingsToAllFiles={handleApplySettingsToAllFiles}
            onDownloadAllProcessedFiles={handleDownloadAllProcessedFiles}
            onClearAllFiles={handleClearAllFiles}
            onDownloadAllImages={handleDownloadAllImages}
            onClearImageResults={handleClearImageResults}
          />
        </div>

        {/* 右侧布局：模板选择、配置和预览 */}
        <div className="lg:col-span-1 space-y-6">
          {/* Section 2: Template Selection & Configuration */}
          <TemplateConfigSection
            selectedTemplate={templateManagement.selectedTemplate}
            onTemplateSelect={templateManagement.setSelectedTemplate}
            fileNameTemplate={templateManagement.fileNameTemplate}
            onFileNameTemplateChange={templateManagement.setFileNameTemplate}
            fileNameTemplateInputRef={templateManagement.fileNameTemplateInputRef}
            onInsertPlaceholder={templateManagement.insertPlaceholder}
          />

          {/* Document Preview */}
          <DocumentPreviewSection
            documentAnalysis={documentAnalysis.documentAnalysis}
          />
        </div>
      </div>
    </main>
  );
} 