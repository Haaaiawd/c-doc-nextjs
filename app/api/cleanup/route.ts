import { NextRequest, NextResponse } from 'next/server';
import { getTmpStatus } from '@/lib/startup';
import { autoCleanup } from '@/lib/auto-cleanup';
import * as fs from 'fs/promises';

/**
 * GET - 获取tmp目录状态
 */
export async function GET() {
  try {
    const status = await getTmpStatus();
    const autoCleanupStats = await autoCleanup.getDirectoryStats();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        autoCleanup: autoCleanupStats
      }
    });
  } catch (error) {
    console.error('获取tmp状态时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST - 手动触发清理
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { type = 'auto', files = [] } = body;
    
    if (type === 'session') {
      // 向后兼容的会话清理（现在使用自动清理）
      const result = await autoCleanup.cleanupNow();
      
      return NextResponse.json({
        success: true,
        message: '会话清理完成',
        data: { 
          cleaned: { 
            cleanedCount: result.deletedFiles, 
            totalSize: result.freedSpace 
          } 
        }
      });
    } else if (type === 'session-files') {
      // 清理指定的会话文件
      const result = await cleanupSessionFiles(files);
      
      return NextResponse.json({
        success: true,
        message: '会话文件清理完成',
        data: { cleaned: result }
      });
    } else if (type === 'auto') {
      // 使用新的自动清理系统
      const result = await autoCleanup.cleanupNow();
      
      return NextResponse.json({
        success: true,
        message: '自动清理完成',
        data: {
          deletedFiles: result.deletedFiles,
          freedSpaceMB: (result.freedSpace / 1024 / 1024).toFixed(2),
          duration: result.duration,
          errors: result.errors
        }
      });
    } else {
      // 降级到旧的清理服务（向后兼容）
      try {
        const cleanupResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cleanup-service`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cleanup-now' })
        });
        
        const cleanupResult = await cleanupResponse.json();
        
        return NextResponse.json({
          success: cleanupResult.success,
          message: cleanupResult.message || '过期文件清理完成',
          data: cleanupResult.result || { totalDeleted: 0, totalSize: 0 }
        });
      } catch (error) {
        console.error('调用清理服务失败:', error);
        return NextResponse.json({
          success: false,
          error: '清理服务不可用'
        }, { status: 503 });
      }
    }
  } catch (error) {
    console.error('清理过程中出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '清理失败' 
      },
      { status: 500 }
    );
  }
}

/**
 * 清理指定的会话文件
 */
async function cleanupSessionFiles(filePaths: string[]): Promise<{cleanedCount: number, totalSize: number}> {
  let cleanedCount = 0;
  let totalSize = 0;

  console.log(`🧹 开始清理${filePaths.length}个会话文件...`);

  for (const filePath of filePaths) {
    try {
      const stat = await fs.stat(filePath);
      await fs.unlink(filePath);
      
      totalSize += stat.size;
      cleanedCount++;
      
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      console.log(`🗑️ 删除会话文件: ${fileName} (${(stat.size / 1024).toFixed(1)}KB)`);
    } catch (error) {
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      console.warn(`⚠️ 无法删除文件 ${fileName}:`, error);
    }
  }

  if (cleanedCount > 0) {
    console.log(`✅ 会话清理完成: 删除了${cleanedCount}个文件，释放了${(totalSize / 1024 / 1024).toFixed(2)}MB空间`);
  }

  return { cleanedCount, totalSize };
} 