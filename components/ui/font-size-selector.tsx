// filepath: g:\PROJECTALL\c-doc-nextjs\components\ui\font-size-selector.tsx
"use client"

import { useState, useEffect } from 'react';
import { getChineseFontSizeOptions, formatFontSizeWithChineseName } from '@/lib/font-utils';
import { Input } from './input';
import { Label } from './label';

interface FontSizeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  id: string;
  label?: string;
  placeholder?: string;
}

export function FontSizeSelector({
  value,
  onChange,
  id,
  label = '字体大小',
  placeholder = '输入字号或选择'
}: FontSizeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const options = getChineseFontSizeOptions();
  const [displayValue, setDisplayValue] = useState(value);
    // 根据value更新显示值
  useEffect(() => {
    // 检查是否是中文字号名称
    const chineseSizeNames = options.map(opt => opt.value);
    if (chineseSizeNames.includes(value)) {
      // 找到对应的选项，显示完整标签（名称+磅值）
      const selectedOption = options.find(opt => opt.value === value);
      setDisplayValue(selectedOption ? selectedOption.label : value);
    } else {
      // 尝试将值转换为数字
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        // 显示格式化的字体大小（带中文字号名称如果匹配）
        setDisplayValue(formatFontSizeWithChineseName(numValue));
      } else {
        // 无法解析为数字，直接使用原值
        setDisplayValue(value);
      }
    }
  }, [value, options]);
  
  // 点击外部关闭下拉，但允许在组件内点击
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as Element).closest(`#${id}-container`)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id]);
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    onChange(inputValue); // 更新实际值
    setDisplayValue(inputValue); // 临时更新显示值，等下一个useEffect会格式化它
  };
  
  return (
    <div className="relative" id={`${id}-container`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="pr-8 cursor-pointer"
        />
        <div 
          className="absolute inset-y-0 right-0 flex items-center pr-2 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-800 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          <div className="py-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer"
                onClick={() => {
                  onChange(option.value);
                  setDisplayValue(option.label);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
