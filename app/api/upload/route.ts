import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import { ProcessedDocument } from '@/app/types';

// 确保上传目录存在
const UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

// 为文件创建唯一标识符并返回详细信息
function createFileInfo(file: File): ProcessedDocument {
  return {
    id: crypto.randomUUID(),
    originalFileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    uploadDate: new Date().toISOString(),
    status: 'uploaded', // 初始状态设置为 'uploaded'
  };
}

// 确保目录存在
async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files'); // 'files' 是我们期望在 FormData 中的字段名

    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded.' }, { status: 400 });
    }

    // 确保上传目录存在
    await ensureDir(UPLOAD_DIR);

    // 处理每个文件并收集信息
    const processedFiles: ProcessedDocument[] = [];

    for (const fileEntry of files) {
      if (fileEntry instanceof File) {
        console.log(`Processing file: ${fileEntry.name}, size: ${fileEntry.size}, type: ${fileEntry.type}`);
        
        // 创建文件信息对象
        const fileInfo = createFileInfo(fileEntry);
        
        try {
          // 确定文件存储路径
          const filePath = path.join(UPLOAD_DIR, `${fileInfo.id}${path.extname(fileEntry.name)}`);
          
          // 将文件内容转换为 ArrayBuffer
          const fileBuffer = await fileEntry.arrayBuffer();
          
          // 将文件保存到临时目录
          // 注意：在 Vercel 部署时，这种方法不适用，需要使用云存储
          await writeFile(filePath, Buffer.from(fileBuffer));
            // 更新文件信息对象，添加保存路径（仅用于本地开发）
          const updatedFileInfo = {
            ...fileInfo,
            // 在实际部署中，这可能是一个指向云存储的 URL
            processedFileUrl: `/api/files/${fileInfo.id}${path.extname(fileEntry.name)}`,
            status: 'uploaded_to_server', // 明确设置状态为可处理
          };
          
          processedFiles.push(updatedFileInfo);
          
        } catch (error) {
          console.error(`Error saving file ${fileEntry.name}:`, error);
          // 如果文件保存失败，仍然返回文件信息，但状态设置为失败
          processedFiles.push({
            ...fileInfo,
            status: 'failed',
            errorMessage: 'Failed to save file',
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${files.length} files received and processed.`,
      files: processedFiles
    });  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json({ success: false, error: 'Error processing request.' }, { status: 500 });
  }
}
