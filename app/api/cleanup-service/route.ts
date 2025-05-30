import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

// 清理服务配置
const CLEANUP_CONFIG = {
  TMP_DIR: path.join(process.cwd(), 'tmp'),
  CLEANUP_INTERVAL_MS: 30 * 60 * 1000, // 30分钟
  MAX_FILE_AGE_MS: 60 * 60 * 1000,     // 1小时
};

// 全局清理定时器
let cleanupTimer: NodeJS.Timeout | null = null;
let isCleanupRunning = false;

/**
 * POST - 启动/停止清理服务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'start' } = body;

    if (action === 'start') {
      if (cleanupTimer) {
        return NextResponse.json({
          success: false,
          message: '清理服务已在运行'
        });
      }

      // 启动定时清理
      startPeriodicCleanup();
      
      return NextResponse.json({
        success: true,
        message: '清理服务已启动',
        config: {
          interval: CLEANUP_CONFIG.CLEANUP_INTERVAL_MS / 1000 / 60 + '分钟',
          maxAge: CLEANUP_CONFIG.MAX_FILE_AGE_MS / 1000 / 60 + '分钟'
        }
      });
    } else if (action === 'stop') {
      stopPeriodicCleanup();
      
      return NextResponse.json({
        success: true,
        message: '清理服务已停止'
      });
    } else if (action === 'cleanup-now') {
      // 立即执行一次清理
      const result = await performCleanup();
      
      return NextResponse.json({
        success: true,
        message: '手动清理完成',
        result
      });
    }

    return NextResponse.json({
      success: false,
      message: '无效的操作'
    }, { status: 400 });

  } catch (error) {
    console.error('清理服务错误:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * GET - 获取清理服务状态
 */
export async function GET() {
  try {
    const status = await getCleanupStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        isRunning: cleanupTimer !== null,
        isCleanupActive: isCleanupRunning,
        ...status
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取状态失败'
    }, { status: 500 });
  }
}

/**
 * 启动定期清理
 */
function startPeriodicCleanup() {
  console.log(`🧹 启动定期清理服务，间隔: ${CLEANUP_CONFIG.CLEANUP_INTERVAL_MS / 1000 / 60}分钟`);
  
  // 立即执行一次清理
  performCleanup().then(() => {
    console.log('✅ 初始清理完成');
  }).catch(error => {
    console.warn('⚠️ 初始清理失败:', error);
  });
  
  // 设置定期清理
  cleanupTimer = setInterval(async () => {
    try {
      await performCleanup();
    } catch (error) {
      console.warn('⚠️ 定期清理失败:', error);
    }
  }, CLEANUP_CONFIG.CLEANUP_INTERVAL_MS);
}

/**
 * 停止定期清理
 */
function stopPeriodicCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('🛑 定期清理服务已停止');
  }
}

/**
 * 执行清理操作
 */
async function performCleanup(): Promise<{totalDeleted: number, totalSize: number}> {
  if (isCleanupRunning) {
    console.log('ℹ️ 清理正在进行中，跳过本次清理');
    return { totalDeleted: 0, totalSize: 0 };
  }

  isCleanupRunning = true;
  
  try {
    console.log('🧹 开始定期清理过期文件...');
    const cutoffTime = Date.now() - CLEANUP_CONFIG.MAX_FILE_AGE_MS;
    
    const result = await cleanupDirectory(CLEANUP_CONFIG.TMP_DIR, cutoffTime);
    
    if (result.totalDeleted > 0) {
      console.log(`✅ 定期清理完成: 删除了${result.totalDeleted}个文件，释放了${(result.totalSize / 1024 / 1024).toFixed(2)}MB空间`);
    } else {
      console.log('ℹ️ 定期清理完成: 没有需要删除的过期文件');
    }
    
    return result;
  } finally {
    isCleanupRunning = false;
  }
}

/**
 * 清理指定目录
 */
async function cleanupDirectory(dirPath: string, cutoffTime: number): Promise<{totalDeleted: number, totalSize: number}> {
  const stats = { totalDeleted: 0, totalSize: 0 };

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // 递归清理子目录
        const subStats = await cleanupDirectory(fullPath, cutoffTime);
        stats.totalDeleted += subStats.totalDeleted;
        stats.totalSize += subStats.totalSize;

        // 检查目录是否为空
        try {
          const remainingEntries = await fs.readdir(fullPath);
          if (remainingEntries.length === 0) {
            await fs.rmdir(fullPath);
            console.log(`📁 删除空目录: ${entry.name}`);
          }
        } catch {
          // 忽略删除目录时的错误
        }
      } else if (entry.isFile()) {
        try {
          const fileStat = await fs.stat(fullPath);
          
          // 检查文件是否过期
          if (fileStat.mtime.getTime() < cutoffTime) {
            const fileSize = fileStat.size;
            await fs.unlink(fullPath);
            
            stats.totalDeleted++;
            stats.totalSize += fileSize;
            
            const ageMinutes = Math.round((Date.now() - fileStat.mtime.getTime()) / (1000 * 60));
            console.log(`🗑️ 删除过期文件: ${entry.name} (${ageMinutes}分钟前, ${(fileSize / 1024).toFixed(1)}KB)`);
          }
        } catch (error) {
          console.warn(`⚠️ 无法处理文件 ${entry.name}:`, error);
        }
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`⚠️ 无法读取目录 ${dirPath}:`, error);
    }
  }

  return stats;
}

/**
 * 获取清理状态
 */
async function getCleanupStatus() {
  try {
    const stats = { fileCount: 0, totalSize: 0, oldestFile: null as Date | null, newestFile: null as Date | null };
    await scanDirectory(CLEANUP_CONFIG.TMP_DIR, stats);
    
    return {
      fileCount: stats.fileCount,
      totalSizeMB: (stats.totalSize / 1024 / 1024).toFixed(2),
      oldestFile: stats.oldestFile,
      newestFile: stats.newestFile,
      tmpDir: CLEANUP_CONFIG.TMP_DIR
    };
  } catch {
    console.warn('获取清理状态时出错');
    return null;
  }
}

interface ScanStats {
  fileCount: number;
  totalSize: number;
  oldestFile: Date | null;
  newestFile: Date | null;
}

async function scanDirectory(dirPath: string, stats: ScanStats) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath, stats);
      } else if (entry.isFile()) {
        try {
          const fileStat = await fs.stat(fullPath);
          stats.fileCount++;
          stats.totalSize += fileStat.size;
          
          if (!stats.oldestFile || fileStat.mtime < stats.oldestFile) {
            stats.oldestFile = fileStat.mtime;
          }
          if (!stats.newestFile || fileStat.mtime > stats.newestFile) {
            stats.newestFile = fileStat.mtime;
          }
        } catch {
          // 忽略单个文件的错误
        }
      }
    }
  } catch {
    // 忽略目录读取错误
  }
} 