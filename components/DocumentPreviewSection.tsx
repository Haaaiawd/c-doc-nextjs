/**
 * 文档预览区域组件
 */
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DocumentAnalysisData } from '@/app/types';

interface DocumentPreviewSectionProps {
  documentAnalysis: DocumentAnalysisData | null;
}

export function DocumentPreviewSection({ documentAnalysis }: DocumentPreviewSectionProps) {
  if (!documentAnalysis) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>文档预览</CardTitle>
        <CardDescription>
          查看文档分析结果
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documentAnalysis.title && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-blue-700">检测到的标题:</span>
            </div>
            <p className="mt-1 text-sm font-semibold truncate" title={documentAnalysis.title.text}>
              {documentAnalysis.title.text}
            </p>
          </div>
        )}
        
        {documentAnalysis.author && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center text-sm">
              <span className="font-medium text-green-700">检测到的作者:</span>
            </div>
            <p className="mt-1 text-sm">{documentAnalysis.author.text}</p>
          </div>
        )}

        {documentAnalysis.wordCount && (
          <div className="text-sm text-zinc-600">
            字数统计: {documentAnalysis.wordCount} 字
          </div>
        )}
      </CardContent>
    </Card>
  );
} 