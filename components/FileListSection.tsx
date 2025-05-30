/**
 * 文件列表区域组件
 */
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProcessedDocument } from '@/app/types';
import { UploadProgress } from "@/components/upload-progress";
import { ImageExtractionResults } from './ImageExtractionResults';
import { ImageExtractionState } from '@/types/document-processing';

interface FileListSectionProps {
  processedDocuments: ProcessedDocument[];
  uploadProgress: Record<string, number>;
  currentEditingFileId: string | null;
  isAnalyzing: boolean;
  processing: boolean;
  imageExtractionState: Record<string, ImageExtractionState>;
  onAnalyzeDocument: (fileId: string) => Promise<void>;
  onProcessDocument: (fileId: string) => Promise<void>;
  onExtractImages: (fileId: string) => Promise<void>;
  onRemoveFile: (fileId: string) => void;
  onApplySettingsToAllFiles: () => Promise<void>;
  onDownloadAllProcessedFiles: () => void;
  onClearAllFiles: () => void;
  onDownloadAllImages: (fileId: string) => void;
  onClearImageResults: (fileId: string) => void;
}

export function FileListSection({
  processedDocuments,
  uploadProgress,
  currentEditingFileId,
  isAnalyzing,
  processing,
  imageExtractionState,
  onAnalyzeDocument,
  onProcessDocument,
  onExtractImages,
  onRemoveFile,
  onApplySettingsToAllFiles,
  onDownloadAllProcessedFiles,
  onClearAllFiles,
  onDownloadAllImages,
  onClearImageResults
}: FileListSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>3. 文件列表与结果</CardTitle>
        <CardDescription>
          查看已上传文件、处理状态和下载结果。
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 批量操作按钮 */}
        {processedDocuments.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
            <h3 className="font-medium mb-2">批量操作</h3>
            <div className="flex flex-wrap gap-2">
              {processedDocuments.some(doc => doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                <Button 
                  size="sm" 
                  variant="default" 
                  onClick={onApplySettingsToAllFiles}
                  disabled={processing}
                >
                  批量应用模板处理
                </Button>
              )}
              {processedDocuments.some(doc => doc.status === 'completed' && doc.processedFileUrl) && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onDownloadAllProcessedFiles}
                >
                  下载所有处理后的文件
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onClearAllFiles}
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
                  : doc.status === 'converting_doc_to_docx' ? 'text-indigo-600'
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
                    doc.status === 'converting_doc_to_docx' ? 'Doc转换中...' :
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
                      onClick={() => onAnalyzeDocument(doc.id)}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing && currentEditingFileId === doc.id 
                        ? "分析中..." 
                        : "预览分析"
                      }
                    </Button>
                  )}
                  
                  {/* 应用模板处理按钮 */}
                  {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onProcessDocument(doc.id)}
                      disabled={processing}
                    >
                      应用模板处理
                    </Button>
                  )}

                  {/* 图片提取按钮 */}
                  {(doc.status === 'uploaded_to_server' || doc.status === 'completed') && 
                   doc.originalFileName.toLowerCase().endsWith('.docx') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onExtractImages(doc.id)}
                      disabled={imageExtractionState[doc.id]?.isExtracting}
                    >
                      {imageExtractionState[doc.id]?.isExtracting 
                        ? "提取中..." 
                        : "提取图片"
                      }
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
                    onClick={() => onRemoveFile(doc.id)}
                  >
                    删除
                  </Button>
                </div>
                {doc.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">错误: {doc.errorMessage}</p>
                )}

                {/* 图片提取结果显示 */}
                <ImageExtractionResults
                  fileId={doc.id}
                  extractionState={imageExtractionState[doc.id]}
                  onDownloadAll={() => onDownloadAllImages(doc.id)}
                  onClearResults={() => onClearImageResults(doc.id)}
                />
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
  );
} 