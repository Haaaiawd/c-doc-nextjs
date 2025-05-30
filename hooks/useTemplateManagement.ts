/**
 * 模板管理相关的自定义Hook
 */
import { useState, useRef, useCallback } from 'react';
import { DocumentTemplate } from '@/app/types';
import { getDefaultTemplate } from '@/lib/preset-templates';

interface UseTemplateManagementReturn {
  selectedTemplate: DocumentTemplate;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<DocumentTemplate>>;
  fileNameTemplate: string;
  setFileNameTemplate: React.Dispatch<React.SetStateAction<string>>;
  fileNameTemplateInputRef: React.RefObject<HTMLInputElement>;
  insertPlaceholder: (placeholder: string) => void;
}

export function useTemplateManagement(): UseTemplateManagementReturn {
  // 模板选择状态 - 简化的状态管理
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>(getDefaultTemplate());
  
  // 文件名模板输入框引用
  const fileNameTemplateInputRef = useRef<HTMLInputElement>(null);
  const [fileNameTemplate, setFileNameTemplate] = useState<string>("{title}");

  // 插入占位符到文件名模板
  const insertPlaceholder = useCallback((placeholder: string) => {
    const input = fileNameTemplateInputRef.current;
    if (!input) return;

    const startPos = input.selectionStart || 0;
    const endPos = input.selectionEnd || 0;
    const beforeText = fileNameTemplate.substring(0, startPos);
    const afterText = fileNameTemplate.substring(endPos);
    
    const newValue = beforeText + placeholder + afterText;
    setFileNameTemplate(newValue);
    
    // 设置焦点并将光标移动到插入的占位符后面
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(startPos + placeholder.length, startPos + placeholder.length);
    }, 0);
  }, [fileNameTemplate]);

  return {
    selectedTemplate,
    setSelectedTemplate,
    fileNameTemplate,
    setFileNameTemplate,
    fileNameTemplateInputRef,
    insertPlaceholder
  };
} 