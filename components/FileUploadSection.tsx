/**
 * 文件上传区域组件
 */
import { useDropzone, FileWithPath } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FileUploadSectionProps {
  acceptedFilesList: FileWithPath[];
  processing: boolean;
  onDrop: (acceptedFiles: FileWithPath[]) => void;
  onUpload: () => void;
}

export function FileUploadSection({ 
  acceptedFilesList, 
  processing, 
  onDrop, 
  onUpload 
}: FileUploadSectionProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    multiple: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. 文件上传</CardTitle>
        <CardDescription>
          选择要处理的 .docx 文件
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700"
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5A5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            {isDragActive ? (
              <p className="mb-2 text-sm text-blue-600 dark:text-blue-400">
                松开即可上传文件
              </p>
            ) : (
              <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold">点击选择文件</span> 或拖拽到此
              </p>
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              支持 .DOC 和 .DOCX 文件
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ .doc文件转换时可能丢失图片和复杂格式
            </p>
          </div>
        </div>
        {acceptedFilesList.length > 0 && (
          <>
            <Button onClick={onUpload} className="w-full mt-4" disabled={processing}>
              上传 {acceptedFilesList.length} 个文件
            </Button>
            <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
              <p className="text-sm font-medium">已选择文件:</p>
              {acceptedFilesList.map((file, index) => (
                <div key={index} className="text-xs p-2 border rounded-md bg-zinc-50 dark:bg-zinc-800">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 