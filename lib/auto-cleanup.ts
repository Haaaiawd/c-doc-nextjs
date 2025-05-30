import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 智能自动清理配置
 */
export interface AutoCleanupConfig {
  /** 临时文件目录 */
  tmpDir: string;
  /** 文件最大保留时间（毫秒） */
  maxFileAge: number;
  /** 是否启用详细日志 */
  verbose: boolean;
  /** 是否仅在开发环境启用 */
  devOnly: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: AutoCleanupConfig = {
  tmpDir: path.join(process.cwd(), 'tmp'),
  maxFileAge: 60 * 60 * 1000, // 1小时
  verbose: process.env.NODE_ENV === 'development',
  devOnly: false,
};

/**
 * 清理结果统计
 */
export interface CleanupStats {
  /** 删除的文件数量 */
  deletedFiles: number;
  /** 释放的总空间（字节） */
  freedSpace: number;
  /** 清理耗时（毫秒） */
  duration: number;
  /** 遇到的错误数量 */
  errors: number;
}

/**
 * 智能自动清理工具类
 * 
 * 特性：
 * - 基于文件修改时间的智能清理
 * - 非阻塞异步执行
 * - 详细的统计和错误处理
 * - 可配置的清理策略
 */
export class AutoCleanup {
  private config: AutoCleanupConfig;
  private isRunning = false;

  constructor(config: Partial<AutoCleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行自动清理
   * 异步执行，不阻塞主要流程
   */
  async cleanupAsync(): Promise<CleanupStats | null> {
    // 避免重复执行
    if (this.isRunning) {
      if (this.config.verbose) {
        console.log('🔄 清理正在进行中，跳过本次清理');
      }
      return null;
    }

    // 开发环境检查
    if (this.config.devOnly && process.env.NODE_ENV === 'production') {
      return null;
    }

    this.isRunning = true;
    const startTime = Date.now();
    
    try {
      const stats = await this.performCleanup();
      stats.duration = Date.now() - startTime;
      
      if (this.config.verbose && stats.deletedFiles > 0) {
        console.log(`✅ 自动清理完成: 删除 ${stats.deletedFiles} 个文件，释放 ${(stats.freedSpace / 1024 / 1024).toFixed(2)}MB，耗时 ${stats.duration}ms`);
      }
      
      return stats;
    } catch (error) {
      if (this.config.verbose) {
        console.warn('⚠️ 自动清理失败:', error);
      }
      return {
        deletedFiles: 0,
        freedSpace: 0,
        duration: Date.now() - startTime,
        errors: 1
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 立即清理（同步等待结果）
   */
  async cleanupNow(): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats = await this.performCleanup();
    stats.duration = Date.now() - startTime;
    
    if (this.config.verbose) {
      console.log(`🧹 立即清理完成: 删除 ${stats.deletedFiles} 个文件，释放 ${(stats.freedSpace / 1024 / 1024).toFixed(2)}MB`);
    }
    
    return stats;
  }

  /**
   * 检查目录状态
   */
  async getDirectoryStats(): Promise<{fileCount: number, totalSize: number, oldestFile: Date | null}> {
    const stats = { fileCount: 0, totalSize: 0, oldestFile: null as Date | null };
    
    try {
      await this.scanDirectory(this.config.tmpDir, (filePath, stat) => {
        stats.fileCount++;
        stats.totalSize += stat.size;
        
        if (!stats.oldestFile || stat.mtime < stats.oldestFile) {
          stats.oldestFile = stat.mtime;
        }
      });
    } catch (error) {
      if (this.config.verbose) {
        console.warn('获取目录状态失败:', error);
      }
    }
    
    return stats;
  }

  /**
   * 执行实际清理操作
   */
  private async performCleanup(): Promise<CleanupStats> {
    const stats: CleanupStats = {
      deletedFiles: 0,
      freedSpace: 0,
      duration: 0,
      errors: 0
    };

    const cutoffTime = Date.now() - this.config.maxFileAge;
    
    await this.scanDirectory(this.config.tmpDir, async (filePath, stat) => {
      if (stat.mtime.getTime() < cutoffTime) {
        try {
          await fs.unlink(filePath);
          stats.deletedFiles++;
          stats.freedSpace += stat.size;
          
          if (this.config.verbose) {
            const ageMinutes = Math.round((Date.now() - stat.mtime.getTime()) / (1000 * 60));
            const fileName = path.basename(filePath);
            console.log(`🗑️ 删除过期文件: ${fileName} (${ageMinutes}分钟前, ${(stat.size / 1024).toFixed(1)}KB)`);
          }
        } catch (error) {
          stats.errors++;
          if (this.config.verbose) {
            console.warn(`⚠️ 删除文件失败 ${filePath}:`, error);
          }
        }
      }
    });

    // 清理空目录
    await this.cleanupEmptyDirectories(this.config.tmpDir);

    return stats;
  }

  /**
   * 扫描目录并对每个文件执行回调
   */
  private async scanDirectory(
    dirPath: string, 
    fileCallback: (filePath: string, stat: fs.Stats) => void | Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, fileCallback);
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(fullPath);
            await fileCallback(fullPath, stat);
          } catch (error) {
            if (this.config.verbose) {
              console.warn(`⚠️ 无法处理文件 ${entry.name}:`, error);
            }
          }
        }
      }
    } catch (error) {
      // 目录不存在是正常情况
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT' && this.config.verbose) {
        console.warn(`⚠️ 无法读取目录 ${dirPath}:`, error);
      }
    }
  }

  /**
   * 清理空目录
   */
  private async cleanupEmptyDirectories(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // 先递归清理子目录
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(dirPath, entry.name);
          await this.cleanupEmptyDirectories(subDir);
        }
      }

      // 检查目录是否现在为空
      const remainingEntries = await fs.readdir(dirPath);
      if (remainingEntries.length === 0 && dirPath !== this.config.tmpDir) {
        await fs.rmdir(dirPath);
        if (this.config.verbose) {
          console.log(`📁 删除空目录: ${path.basename(dirPath)}`);
        }
      }
    } catch {
      // 忽略清理空目录时的错误
    }
  }
}

/**
 * 全局自动清理实例
 */
export const autoCleanup = new AutoCleanup({
  verbose: process.env.NODE_ENV === 'development',
  maxFileAge: parseInt(process.env.CLEANUP_MAX_AGE || '3600000'), // 默认1小时
});

/**
 * 在API中使用的便捷函数
 * 异步执行清理，不阻塞请求处理
 */
export function triggerAutoCleanup(): void {
  autoCleanup.cleanupAsync().catch(error => {
    console.warn('后台清理失败:', error);
  });
} 