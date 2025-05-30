/**
 * 图片提取结果展示组件
 */
import { Button } from "@/components/ui/button";
import { ImageExtractionState } from '@/types/document-processing';

interface ImageExtractionResultsProps {
  fileId: string;
  extractionState: ImageExtractionState;
  onDownloadAll: () => void;
  onClearResults: () => void;
}

export function ImageExtractionResults({ 
  extractionState, 
  onDownloadAll, 
  onClearResults 
}: ImageExtractionResultsProps) {
  if (!extractionState || extractionState.images.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
      <h4 className="text-sm font-medium text-green-800 mb-2">
        已提取图片 ({extractionState.totalCount} 张，
        总大小: {(extractionState.totalSize / 1024).toFixed(1)} KB)
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {extractionState.images.map((img, index) => (
          <div key={index} className="border border-gray-200 rounded p-2 bg-white">
            <img 
              src={img.base64Data} 
              alt={img.name}
              className="w-full h-20 object-cover rounded mb-1"
              title={`${img.name} (${img.mimeType}, ${(img.size / 1024).toFixed(1)} KB)`}
            />
            <p className="text-xs text-gray-600 truncate">{img.name}</p>
            <p className="text-xs text-gray-500">
              {img.paragraphIndex !== undefined ? `段落 ${img.paragraphIndex}` : '位置未知'}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex space-x-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onDownloadAll}
        >
          下载所有图片
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onClearResults}
        >
          清除结果
        </Button>
      </div>
    </div>
  );
} 