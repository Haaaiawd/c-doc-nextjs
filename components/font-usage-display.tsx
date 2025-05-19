import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface FontUsageProps {
  fontUsage: Record<string, { count: number, samples: string[] }> | null;
  loading: boolean;
}

export function FontUsageDisplay({ fontUsage, loading }: FontUsageProps) {
  const [sortedFonts, setSortedFonts] = useState<[string, { count: number; samples: string[] }][]>([]);
  
  useEffect(() => {
    if (fontUsage) {
      // 将字体使用情况按使用次数排序
      const sorted = Object.entries(fontUsage).sort((a, b) => b[1].count - a[1].count);
      setSortedFonts(sorted);
    } else {
      setSortedFonts([]);
    }
  }, [fontUsage]);
  
  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>正在分析字体使用情况...</CardTitle>
          <CardDescription>请稍候，正在处理文档中的字体信息</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="animate-pulse flex flex-col items-center space-y-4">
            <div className="h-8 w-2/3 bg-gray-200 rounded"></div>
            <div className="h-8 w-1/2 bg-gray-200 rounded"></div>
            <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!fontUsage || sortedFonts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>字体使用情况</CardTitle>
          <CardDescription>没有可用的字体使用数据</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-4 text-gray-500">请先上传并分析一个DOCX文件</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>字体使用情况</CardTitle>
        <CardDescription>通过深度字体检测获取的文档字体统计</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedFonts.map(([fontName, { count, samples }]) => (
            <div key={fontName} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{fontName}</h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  出现 {count} 次
                </span>
              </div>
              
              {samples.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-1">样本文本:</p>
                  <ul className="text-sm space-y-1">
                    {samples.slice(0, 3).map((sample, index) => (
                      <li key={index} className="bg-gray-50 p-2 rounded">
                        {sample}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
