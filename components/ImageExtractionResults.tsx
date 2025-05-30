/**
 * 图片提取结果展示组件 - 增强版
 * 支持显示精确的图片位置信息
 */
import { Button } from "@/components/ui/button";
import { ImageExtractionState } from '@/types/document-processing';
import { useToast } from '@/components/ui/toast';

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
  const { addToast } = useToast();
  
  if (!extractionState || extractionState.images.length === 0) {
    return null;
  }

  // 按段落分组显示图片
  const imagesByParagraph = extractionState.images.reduce((groups, img, index) => {
    const paragraphIndex = img.paragraphIndex ?? -1;
    if (!groups[paragraphIndex]) {
      groups[paragraphIndex] = [];
    }
    groups[paragraphIndex].push({ ...img, originalIndex: index });
    return groups;
  }, {} as Record<number, Array<typeof extractionState.images[0] & { originalIndex: number }>>);

  const sortedParagraphs = Object.keys(imagesByParagraph)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
      <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center">
        🖼️ 已提取图片 ({extractionState.totalCount} 张，
        总大小: {(extractionState.totalSize / 1024).toFixed(1)} KB)
      </h4>

      {/* 图片位置统计 */}
      <div className="mb-4 p-2 bg-white rounded border text-xs text-gray-600">
        <div className="grid grid-cols-3 gap-2">
          <div>📄 文档段落: {sortedParagraphs.filter(p => p >= 0).length} 个包含图片</div>
          <div>📍 精确定位: {extractionState.images.filter(img => img.paragraphIndex !== undefined).length} 张</div>
          <div>❓ 位置未知: {extractionState.images.filter(img => img.paragraphIndex === undefined).length} 张</div>
        </div>
      </div>

      {/* 按段落分组展示图片 */}
      <div className="space-y-4">
        {sortedParagraphs.map(paragraphIndex => (
          <div key={paragraphIndex} className="border border-gray-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-gray-700">
                {paragraphIndex >= 0 ? (
                  <>📍 段落 {paragraphIndex} <span className="text-xs text-gray-500">({imagesByParagraph[paragraphIndex].length} 张图片)</span></>
                ) : (
                  <>❓ 位置未确定 <span className="text-xs text-gray-500">({imagesByParagraph[paragraphIndex].length} 张图片)</span></>
                )}
              </h5>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {imagesByParagraph[paragraphIndex].map((img) => (
                <div key={img.originalIndex} className="border border-gray-200 rounded-lg p-2 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <img 
                    src={img.base64Data} 
                    alt={img.name}
                    className="w-full h-20 object-cover rounded mb-2"
                    title={`${img.name} (${img.mimeType}, ${(img.size / 1024).toFixed(1)} KB)`}
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-700 truncate" title={img.name}>
                      {img.name.split('/').pop() || img.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(img.size / 1024).toFixed(1)} KB
                    </p>
                    {img.relationshipId && (
                      <p className="text-xs text-blue-600" title={`关系ID: ${img.relationshipId}`}>
                        🔗 {img.relationshipId}
                      </p>
                    )}
                    {img.runIndex !== undefined && (
                      <p className="text-xs text-purple-600">
                        📝 Run {img.runIndex}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onDownloadAll}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
        >
          📥 下载全部图片
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onClearResults}
          className="bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
        >
          🗑️ 清除结果
        </Button>
        
        {/* 统计信息按钮 */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            const stats = {
              总图片数: extractionState.totalCount,
              总大小: `${(extractionState.totalSize / 1024).toFixed(1)} KB`,
              有位置信息: extractionState.images.filter(img => img.paragraphIndex !== undefined).length,
              位置未知: extractionState.images.filter(img => img.paragraphIndex === undefined).length,
              关系ID数量: new Set(extractionState.images.map(img => img.relationshipId).filter(Boolean)).size
            };
            
            // 使用Toast显示统计信息
            addToast({
              type: 'default',
              title: '📊 图片提取统计',
              description: `总数：${stats.总图片数}张，大小：${stats.总大小}，定位：${stats.有位置信息}张，关系：${stats.关系ID数量}个`,
              duration: 5000
            });
            
            console.log('📊 图片提取统计信息:', stats);
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          📊 详细统计
        </Button>
      </div>
    </div>
  );
} 