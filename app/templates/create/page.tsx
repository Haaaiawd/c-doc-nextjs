"use client";

import React, { useState, useCallback } from "react";
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
import { FontSizeSelector } from "@/components/ui/font-size-selector";
import { DocumentTemplate, TemplateStyle } from "@/app/types";
import { generateUUID } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

// 字体样式配置组件 - 使用React.memo防止不必要的重新渲染
const StyleConfigSection = React.memo(({ 
  title, 
  style, 
  setStyle, 
  showPrefix = false, 
  prefix, 
  setPrefix, 
  suffix, 
  setSuffix 
}: {
  title: string;
  style: TemplateStyle;
  setStyle: (style: TemplateStyle) => void;
  showPrefix?: boolean;
  prefix?: string;
  setPrefix?: (value: string) => void;
  suffix?: string;
  setSuffix?: (value: string) => void;
}) => {
  const handleFontNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStyle({...style, fontName: e.target.value});
  }, [style, setStyle]);

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStyle({...style, color: e.target.value});
  }, [style, setStyle]);

  const handleAlignmentChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStyle({...style, alignment: e.target.value as 'left' | 'center' | 'right' | 'justify'});
  }, [style, setStyle]);

  const handleBoldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStyle({...style, isBold: e.target.checked});
  }, [style, setStyle]);

  const handleItalicChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStyle({...style, isItalic: e.target.checked});
  }, [style, setStyle]);

  const handleUnderlineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStyle({...style, isUnderline: e.target.checked});
  }, [style, setStyle]);

  const handleFontSizeChange = useCallback((value: string) => {
    setStyle({...style, fontSize: value});
  }, [style, setStyle]);

  const handlePrefixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (setPrefix) setPrefix(e.target.value);
  }, [setPrefix]);

  const handleSuffixChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (setSuffix) setSuffix(e.target.value);
  }, [setSuffix]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}样式配置</CardTitle>
        <CardDescription>配置{title}的字体、大小、样式和对齐方式</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${title}-fontName`}>字体名称</Label>
            <Input 
              id={`${title}-fontName`}
              placeholder="例如：微软雅黑" 
              value={style.fontName}
              onChange={handleFontNameChange}
            />
          </div>
          <div>
            <FontSizeSelector
              id={`${title}-fontSize`}
              label=""
              placeholder="例如：小四、22"
              value={style.fontSize}
              onChange={handleFontSizeChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${title}-color`}>字体颜色</Label>
            <div className="flex space-x-2">
              <Input 
                id={`${title}-color`}
                type="color"
                value={style.color}
                onChange={handleColorChange}
                className="w-16 h-8"
              />
              <Input 
                placeholder="#000000"
                value={style.color}
                onChange={handleColorChange}
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`${title}-alignment`}>对齐方式</Label>
            <select
              id={`${title}-alignment`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-600"
              value={style.alignment}
              onChange={handleAlignmentChange}
            >
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
              <option value="justify">两端对齐</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={style.isBold}
              onChange={handleBoldChange}
            />
            <span className="ml-2">加粗</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={style.isItalic}
              onChange={handleItalicChange}
            />
            <span className="ml-2">斜体</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={style.isUnderline}
              onChange={handleUnderlineChange}
            />
            <span className="ml-2">下划线</span>
          </label>
        </div>

        {showPrefix && prefix !== undefined && setPrefix && suffix !== undefined && setSuffix && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`${title}-prefix`}>{title}前缀</Label>
              <Input 
                id={`${title}-prefix`}
                placeholder={`添加到${title}前的文本`}
                value={prefix}
                onChange={handlePrefixChange}
              />
            </div>
            <div>
              <Label htmlFor={`${title}-suffix`}>{title}后缀</Label>
              <Input 
                id={`${title}-suffix`}
                placeholder={`添加到${title}后的文本`}
                value={suffix}
                onChange={handleSuffixChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

StyleConfigSection.displayName = 'StyleConfigSection';

export default function CreateTemplatePage() {
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");
  
  // 使用Toast系统
  const { addToast } = useToast();
  
  // 标题样式配置
  const [titleStyle, setTitleStyle] = useState<TemplateStyle>({
    fontName: "微软雅黑",
    fontSize: "小二",
    isBold: true,
    isItalic: false,
    isUnderline: false,
    color: "#000000",
    alignment: "center",
  });

  // 作者样式配置
  const [authorStyle, setAuthorStyle] = useState<TemplateStyle>({
    fontName: "宋体",
    fontSize: "小四",
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: "#000000",
    alignment: "center",
  });

  // 正文样式配置
  const [bodyStyle, setBodyStyle] = useState<TemplateStyle>({
    fontName: "宋体",
    fontSize: "五号",
    isBold: false,
    isItalic: false,
    isUnderline: false,
    color: "#000000",
    alignment: "justify",
  });

  // 额外配置
  const [titlePrefix, setTitlePrefix] = useState<string>("");
  const [titleSuffix, setTitleSuffix] = useState<string>("");
  const [authorPrefix, setAuthorPrefix] = useState<string>("");
  const [authorSuffix, setAuthorSuffix] = useState<string>("");

  // 保存模板
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      addToast({
        type: 'warning',
        title: '请输入模板名称',
        description: '请输入模板名称！'
      });
      return;
    }

    const newTemplate: DocumentTemplate = {
      id: generateUUID(),
      name: templateName.trim(),
      description: templateDescription.trim() || `自定义模板：${templateName}`,
      isPreset: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      titleStyle,
      authorStyle,
      bodyStyle,
      titlePrefix: titlePrefix || undefined,
      titleSuffix: titleSuffix || undefined,
      authorPrefix: authorPrefix || undefined,
      authorSuffix: authorSuffix || undefined,
    };

    try {
      // TODO: 实现保存模板到后端的API
      console.log("保存模板:", newTemplate);
      
      // 暂时保存到localStorage作为演示
      const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
      savedTemplates.push(newTemplate);
      localStorage.setItem('customTemplates', JSON.stringify(savedTemplates));
      
      // 触发自定义事件通知模板选择器更新
      window.dispatchEvent(new CustomEvent('customTemplateAdded'));
      
      addToast({
        type: 'success',
        title: '模板保存成功',
        description: '模板保存成功！正在返回主页...'
      });
      
      // 延迟返回主页面，让用户看到成功消息
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error("保存模板失败:", error);
      addToast({
        type: 'error',
        title: '保存失败',
        description: '保存模板失败，请重试。'
      });
    }
  };

  // 重置表单
  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTitleStyle({
      fontName: "微软雅黑",
      fontSize: "小二",
      isBold: true,
      isItalic: false,
      isUnderline: false,
      color: "#000000",
      alignment: "center",
    });
    setAuthorStyle({
      fontName: "宋体",
      fontSize: "小四",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      color: "#000000",
      alignment: "center",
    });
    setBodyStyle({
      fontName: "宋体",
      fontSize: "五号",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      color: "#000000",
      alignment: "justify",
    });
    setTitlePrefix("");
    setTitleSuffix("");
    setAuthorPrefix("");
    setAuthorSuffix("");
  };

  return (
    <main className="container mx-auto p-4 md:p-8 lg:p-12">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              创建新模板
            </h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              自定义文档样式模板，设置标题、作者和正文的格式。
            </p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            返回主页
          </Button>
        </div>
      </header>

      <div className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>模板基本信息</CardTitle>
            <CardDescription>设置模板的名称和描述</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="templateName">模板名称</Label>
              <Input 
                id="templateName"
                placeholder="例如：学术论文模板"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="templateDescription">模板描述</Label>
              <Input 
                id="templateDescription"
                placeholder="简要描述模板的用途和特点"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 标题样式配置 */}
        <StyleConfigSection
          title="标题"
          style={titleStyle}
          setStyle={setTitleStyle}
          showPrefix={true}
          prefix={titlePrefix}
          setPrefix={setTitlePrefix}
          suffix={titleSuffix}
          setSuffix={setTitleSuffix}
        />

        {/* 作者样式配置 */}
        <StyleConfigSection
          title="作者"
          style={authorStyle}
          setStyle={setAuthorStyle}
          showPrefix={true}
          prefix={authorPrefix}
          setPrefix={setAuthorPrefix}
          suffix={authorSuffix}
          setSuffix={setAuthorSuffix}
        />

        {/* 正文样式配置 */}
        <StyleConfigSection
          title="正文"
          style={bodyStyle}
          setStyle={setBodyStyle}
        />

        {/* 模板预览 */}
        <Card>
          <CardHeader>
            <CardTitle>模板预览</CardTitle>
            <CardDescription>查看应用模板后的效果</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 border rounded-lg bg-white space-y-4">
              {/* 标题预览 */}
              <div 
                className="font-bold"
                style={{
                  fontFamily: titleStyle.fontName,
                  fontSize: titleStyle.fontSize,
                  color: titleStyle.color,
                  textAlign: titleStyle.alignment,
                  fontWeight: titleStyle.isBold ? 'bold' : 'normal',
                  fontStyle: titleStyle.isItalic ? 'italic' : 'normal',
                  textDecoration: titleStyle.isUnderline ? 'underline' : 'none',
                }}
              >
                {titlePrefix}示例标题{titleSuffix}
              </div>
              
              {/* 作者预览 */}
              <div 
                style={{
                  fontFamily: authorStyle.fontName,
                  fontSize: authorStyle.fontSize,
                  color: authorStyle.color,
                  textAlign: authorStyle.alignment,
                  fontWeight: authorStyle.isBold ? 'bold' : 'normal',
                  fontStyle: authorStyle.isItalic ? 'italic' : 'normal',
                  textDecoration: authorStyle.isUnderline ? 'underline' : 'none',
                }}
              >
                {authorPrefix}示例作者{authorSuffix}
              </div>
              
              {/* 正文预览 */}
              <div 
                style={{
                  fontFamily: bodyStyle.fontName,
                  fontSize: bodyStyle.fontSize,
                  color: bodyStyle.color,
                  textAlign: bodyStyle.alignment,
                  fontWeight: bodyStyle.isBold ? 'bold' : 'normal',
                  fontStyle: bodyStyle.isItalic ? 'italic' : 'normal',
                  textDecoration: bodyStyle.isUnderline ? 'underline' : 'none',
                }}
              >
                这是正文的示例内容。使用此模板时，文档的正文部分将采用这种样式。您可以在左侧调整各种样式参数，实时查看效果。
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={resetForm}>
            重置
          </Button>
          <Button onClick={saveTemplate}>
            保存模板
          </Button>
        </div>
      </div>
    </main>
  );
} 