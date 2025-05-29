"use client";

import React, { useState, useEffect } from 'react';
import { DocumentTemplate } from '@/app/types';
import { templateOptions } from '@/lib/preset-templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TemplateSelectorProps {
  selectedTemplate: DocumentTemplate | null;
  onTemplateSelect: (template: DocumentTemplate) => void;
  className?: string;
}

export function TemplateSelector({ selectedTemplate, onTemplateSelect, className = "" }: TemplateSelectorProps) {
  const [allTemplates, setAllTemplates] = useState(templateOptions);

  useEffect(() => {
    // 加载自定义模板
    const loadCustomTemplates = () => {
      try {
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
        const customOptions = customTemplates.map((template: DocumentTemplate) => ({
          value: template.id,
          label: template.name,
          description: template.description,
          template: template
        }));
        
        // 合并预设模板和自定义模板
        setAllTemplates([...templateOptions, ...customOptions]);
      } catch (error) {
        console.error('加载自定义模板失败:', error);
      }
    };

    loadCustomTemplates();

    // 监听localStorage变化（当创建新模板时）
    const handleStorageChange = () => {
      loadCustomTemplates();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 也监听自定义事件（同一页面内的变化）
    window.addEventListener('customTemplateAdded', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customTemplateAdded', handleStorageChange);
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-lg font-medium mb-2">选择文档模板</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          选择预设模板快速配置文档样式，或点击"创建新模板"进行自定义。
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allTemplates.map((option) => (
          <Card
            key={option.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedTemplate?.id === option.value
                ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            onClick={() => onTemplateSelect(option.template)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                {option.label}
                {!option.template.isPreset && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    自定义
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm">
                {option.description}
              </CardDescription>
              <div className="mt-2 text-xs text-zinc-500 space-y-1">
                <div>标题: {option.template.titleStyle.fontName} {option.template.titleStyle.fontSize}</div>
                <div>正文: {option.template.bodyStyle.fontName} {option.template.bodyStyle.fontSize}</div>
                <div>作者: {option.template.authorStyle.fontName} {option.template.authorStyle.fontSize}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="pt-4 border-t">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            window.location.href = '/templates/create';
          }}
        >
          创建新模板
        </Button>
      </div>
    </div>
  );
}

/**
 * 简化版模板选择器 - 下拉选择形式
 */
interface SimpleTemplateSelectorProps {
  selectedTemplate: DocumentTemplate | null;
  onTemplateSelect: (template: DocumentTemplate) => void;
  className?: string;
}

export function SimpleTemplateSelector({ selectedTemplate, onTemplateSelect, className = "" }: SimpleTemplateSelectorProps) {
  const [allTemplates, setAllTemplates] = useState(templateOptions);

  useEffect(() => {
    // 加载自定义模板
    const loadCustomTemplates = () => {
      try {
        const customTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
        const customOptions = customTemplates.map((template: DocumentTemplate) => ({
          value: template.id,
          label: template.name,
          description: template.description,
          template: template
        }));
        
        // 合并预设模板和自定义模板
        setAllTemplates([...templateOptions, ...customOptions]);
      } catch (error) {
        console.error('加载自定义模板失败:', error);
      }
    };

    loadCustomTemplates();

    // 监听localStorage变化
    const handleStorageChange = () => {
      loadCustomTemplates();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customTemplateAdded', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customTemplateAdded', handleStorageChange);
    };
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor="template-select" className="block text-sm font-medium">
        选择文档模板
      </label>
      <select
        id="template-select"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-zinc-800 dark:border-zinc-600"
        value={selectedTemplate?.id || ''}
        onChange={(e) => {
          const template = allTemplates.find(opt => opt.value === e.target.value)?.template;
          if (template) {
            onTemplateSelect(template);
          }
        }}
      >
        <option value="">请选择模板</option>
        {allTemplates.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}{!option.template.isPreset ? ' (自定义)' : ''} - {option.description}
          </option>
        ))}
      </select>
      
      {selectedTemplate && (
        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
          <h4 className="font-medium text-sm">
            {selectedTemplate.name}
            {!selectedTemplate.isPreset && (
              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                自定义
              </span>
            )}
          </h4>
          <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <div>标题: {selectedTemplate.titleStyle.fontName} {selectedTemplate.titleStyle.fontSize}</div>
            <div>正文: {selectedTemplate.bodyStyle.fontName} {selectedTemplate.bodyStyle.fontSize}</div>
            <div>作者: {selectedTemplate.authorStyle.fontName} {selectedTemplate.authorStyle.fontSize}</div>
          </div>
        </div>
      )}
      
      <Button 
        variant="outline" 
        size="sm"
        className="w-full mt-2"
        onClick={() => {
          window.location.href = '/templates/create';
        }}
      >
        创建新模板
      </Button>
    </div>
  );
} 