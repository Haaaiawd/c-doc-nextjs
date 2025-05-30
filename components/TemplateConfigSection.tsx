/**
 * 模板配置区域组件
 */
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleTemplateSelector } from "@/components/template-selector";
import { DocumentTemplate } from '@/app/types';

interface TemplateConfigSectionProps {
  selectedTemplate: DocumentTemplate;
  onTemplateSelect: (template: DocumentTemplate) => void;
  fileNameTemplate: string;
  onFileNameTemplateChange: (value: string) => void;
  fileNameTemplateInputRef: React.RefObject<HTMLInputElement>;
  onInsertPlaceholder: (placeholder: string) => void;
}

export function TemplateConfigSection({
  selectedTemplate,
  onTemplateSelect,
  fileNameTemplate,
  onFileNameTemplateChange,
  fileNameTemplateInputRef,
  onInsertPlaceholder
}: TemplateConfigSectionProps) {
  return (
    <div className="space-y-6">
      {/* Section 2: Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>2. 模板选择</CardTitle>
          <CardDescription>
            选择预设模板或创建自定义模板。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateSelect={onTemplateSelect}
          />
        </CardContent>
      </Card>

      {/* 文件名配置 */}
      <Card>
        <CardHeader>
          <CardTitle>文件名配置</CardTitle>
          <CardDescription>
            设置处理后文件的命名规则。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="targetFileName">目标文件名模板</Label>
            <Input 
              id="targetFileName" 
              placeholder="例如：{title}" 
              value={fileNameTemplate}
              onChange={(e) => onFileNameTemplateChange(e.target.value)}
              ref={fileNameTemplateInputRef}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              可用占位符: {"{title}"}, {"{author}"}, {"{originalName}"}
            </p>
            <div className="flex space-x-1 mt-2">
              <Button size="sm" variant="outline" onClick={() => onInsertPlaceholder("{title}")}>
                标题
              </Button>
              <Button size="sm" variant="outline" onClick={() => onInsertPlaceholder("{author}")}>
                作者
              </Button>
              <Button size="sm" variant="outline" onClick={() => onInsertPlaceholder("{originalName}")}>
                原文件名
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 