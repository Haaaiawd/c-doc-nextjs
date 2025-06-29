/**
 * 存储适配器 - 根据环境自动选择本地存储或云存储
 */
import { promises as fs } from 'fs';
import path from 'path';
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

export interface FileMetadata {
  id: string;
  originalName: string;
  blobUrl?: string;
  filePath?: string; // 本地文件路径
  pathname: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  uploadedAt: string;
  processedBlobUrl: string | null;
  extractedImages: { name: string; url: string; }[] | null;
}

export class StorageAdapter {
  private isLocal: boolean;
  private uploadDir: string;

  constructor() {
    // 检测环境：本地开发时使用本地存储，生产环境使用云存储
    this.isLocal = !process.env.VERCEL && (process.env.NODE_ENV === 'development' || !process.env.BLOB_READ_WRITE_TOKEN);
    this.uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    
    console.log(`🌍 存储模式: ${this.isLocal ? '本地文件系统' : 'Vercel Blob'}`);
    
    // 确保本地上传目录存在
    if (this.isLocal) {
      this.ensureUploadDir();
    }
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      console.log(`📁 创建上传目录: ${this.uploadDir}`);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(fileContent: Buffer, originalName: string): Promise<FileMetadata> {
    const fileId = uuidv4();
    const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '');

    if (this.isLocal) {
      // 本地存储
      const fileName = `${fileId}_${sanitizedFilename}`;
      const filePath = path.join(this.uploadDir, fileName);
      await fs.writeFile(filePath, fileContent);

      const metadata: FileMetadata = {
        id: fileId,
        originalName: originalName,
        filePath: filePath,
        pathname: fileName,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        processedBlobUrl: null,
        extractedImages: null,
      };

      // 存储到内存中（本地开发时的简单实现）
      await this.setFileMetadata(fileId, metadata);
      
      return metadata;
    } else {
      // 云存储
      const blobPathname = `uploads/${fileId}/${sanitizedFilename}`;
      const blob = await put(blobPathname, fileContent, {
        access: 'public',
      });

      const metadata: FileMetadata = {
        id: fileId,
        originalName: originalName,
        blobUrl: blob.url,
        pathname: blob.pathname,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        processedBlobUrl: null,
        extractedImages: null,
      };

      await kv.set(`file:${fileId}`, metadata);
      await kv.sadd('files', fileId);

      return metadata;
    }
  }

  /**
   * 获取文件内容
   */
  async getFileContent(fileId: string): Promise<Buffer | null> {
    console.log(`📖 获取文件内容: ${fileId}`);
    
    const metadata = await this.getFileMetadata(fileId);
    if (!metadata) {
      console.log(`❌ 无法获取文件元数据: ${fileId}`);
      return null;
    }

    if (this.isLocal) {
      // 本地存储
      if (!metadata.filePath) {
        console.log(`❌ 本地文件路径为空: ${fileId}`);
        return null;
      }
      try {
        console.log(`📂 读取本地文件: ${metadata.filePath}`);
        const content = await fs.readFile(metadata.filePath);
        console.log(`✅ 成功读取本地文件，大小: ${content.length} bytes`);
        return content;
      } catch (error) {
        console.error(`❌ 读取本地文件失败: ${metadata.filePath}`, error);
        return null;
      }
    } else {
      // 云存储
      if (!metadata.blobUrl) {
        console.log(`❌ 云文件URL为空: ${fileId}`);
        return null;
      }
      try {
        console.log(`☁️ 下载云文件: ${metadata.blobUrl}`);
        const response = await fetch(metadata.blobUrl);
        if (!response.ok) {
          console.log(`❌ 云文件下载失败: ${response.status} ${response.statusText}`);
          return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        const content = Buffer.from(arrayBuffer);
        console.log(`✅ 成功下载云文件，大小: ${content.length} bytes`);
        return content;
      } catch (error) {
        console.error(`❌ 下载云文件失败: ${metadata.blobUrl}`, error);
        return null;
      }
    }
  }

  /**
   * 获取文件元数据
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    console.log(`🔍 获取文件元数据: ${fileId}, 存储模式: ${this.isLocal ? '本地' : '云端'}`);
    
    if (this.isLocal) {
      // 本地存储：从文件系统中查找
      try {
        await this.ensureUploadDir();
        const files = await fs.readdir(this.uploadDir);
        console.log(`📁 本地文件列表:`, files);
        
        const targetFile = files.find(file => file.startsWith(fileId + '_'));
        console.log(`🎯 找到目标文件: ${targetFile}`);
        
        if (!targetFile) {
          console.log(`❌ 未找到文件: ${fileId}`);
          return null;
        }

        const filePath = path.join(this.uploadDir, targetFile);
        const stats = await fs.stat(filePath);
        
        // 从文件名解析原始名称 (格式: UUID_originalname)
        const originalName = targetFile.substring(fileId.length + 1); // 移除 UUID_ 前缀
        console.log(`📄 解析的原始文件名: ${originalName}`);
        
        const metadata = {
          id: fileId,
          originalName: originalName,
          filePath: filePath,
          pathname: targetFile,
          status: 'uploaded' as const,
          uploadedAt: stats.birthtime.toISOString(),
          processedBlobUrl: null,
          extractedImages: null,
        };
        
        console.log(`✅ 本地文件元数据:`, metadata);
        return metadata;
      } catch (error) {
        console.error(`❌ 获取本地文件元数据失败: ${fileId}`, error);
        return null;
      }
    } else {
      // 云存储
      const metadata = await kv.get(`file:${fileId}`) as FileMetadata | null;
      console.log(`☁️ 云端文件元数据:`, metadata);
      return metadata;
    }
  }

  /**
   * 设置文件元数据
   */
  async setFileMetadata(fileId: string, metadata: FileMetadata): Promise<void> {
    if (this.isLocal) {
      // 本地存储：简单实现，实际项目中可以使用本地数据库
      console.log(`📝 更新本地文件元数据: ${fileId}`, metadata);
    } else {
      // 云存储
      await kv.set(`file:${fileId}`, metadata);
    }
  }

  /**
   * 获取所有文件列表
   */
  async getAllFiles(): Promise<string[]> {
    if (this.isLocal) {
      try {
        const files = await fs.readdir(this.uploadDir);
        return files.map(file => file.split('_')[0]).filter(Boolean);
      } catch (error) {
        console.error('获取本地文件列表失败:', error);
        return [];
      }
    } else {
      return await kv.smembers('files') || [];
    }
  }

  /**
   * 上传处理后的文件
   */
  async uploadProcessedFile(fileName: string, content: Buffer): Promise<string> {
    if (this.isLocal) {
      const filePath = path.join(this.uploadDir, 'processed', fileName);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content);
      return `http://localhost:3000/api/files/processed/${fileName}`;
    } else {
      const blob = await put(fileName, content, {
        access: 'public',
      });
      return blob.url;
    }
  }

  /**
   * 检查是否为本地环境
   */
  isLocalEnvironment(): boolean {
    return this.isLocal;
  }
}

// 导出单例实例
export const storageAdapter = new StorageAdapter(); 