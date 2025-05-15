// filepath: g:\PROJECTALL\c-doc-nextjs\components\ui\font-size-selector.tsx
"use client"

import { useState, useEffect } from 'react';
import { getChineseFontSizeOptions } from '@/lib/font-utils';
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
  
  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      setIsOpen(false);
    }
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="pr-8"
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer"
                onClick={() => {
                  onChange(option.value);
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
