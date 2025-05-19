import React from 'react';

interface UploadProgressProps {
  progress: number;
  fileName?: string;
  showLabel?: boolean;
}

export function UploadProgress({ 
  progress, 
  fileName,
  showLabel = false 
}: UploadProgressProps) {
  return (
    <div className="w-full">
      {fileName && showLabel && (
        <div className="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400 flex justify-between">
          <span className="truncate">{fileName}</span>
          <span>{progress}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700 overflow-hidden">
        <div 
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      {!fileName && showLabel && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
          {progress}%
        </div>
      )}
    </div>
  );
}