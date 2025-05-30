/**
 * 应用启动初始化脚本
 */
import { fileCleanup } from './cleanup';
import { startScheduledCleanup } from './scheduled-cleanup';

let isInitialized = false;

/**
 * 初始化应用程序
 */
export function initializeApp() {
  if (isInitialized) {
    return;
  }

  console.log('🚀 正在初始化C-Doc Next.js应用...');

  // 启动新的定时清理服务
  try {
    const success = startScheduledCleanup();
    if (success) {
      console.log('✅ 定时清理服务已启动');
    } else {
      console.log('ℹ️ 定时清理服务未启动（可能被配置禁用）');
    }
  } catch (error) {
    console.warn('⚠️ 启动定时清理服务时出错:', error);
  }

  isInitialized = true;
  console.log('🎉 应用初始化完成');
}

/**
 * 获取会话文件列表
 */
export function getSessionFiles() {
  return fileCleanup.getSessionFiles();
}

/**
 * 清理当前会话文件
 */
export async function cleanupSession() {
  console.log('🧹 清理会话文件...');
  
  const sessionFiles = fileCleanup.getSessionFiles();
  if (sessionFiles.length === 0) {
    console.log('ℹ️ 没有会话文件需要清理');
    return { cleanedCount: 0, totalSize: 0 };
  }

  try {
    // 调用清理服务API删除会话文件
    const response = await fetch('/api/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'session-files', 
        files: sessionFiles 
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // 清空会话文件列表
      fileCleanup.clearSessionFiles();
      console.log('✅ 会话文件清理完成');
      return result.data?.cleaned || { cleanedCount: 0, totalSize: 0 };
    } else {
      console.warn('⚠️ 会话文件清理失败:', result.error);
      return { cleanedCount: 0, totalSize: 0 };
    }
  } catch (error) {
    console.warn('⚠️ 会话文件清理出错:', error);
    return { cleanedCount: 0, totalSize: 0 };
  }
}

/**
 * 跟踪会话文件
 */
export function trackSessionFile(filePath: string) {
  fileCleanup.trackSessionFile(filePath);
}

/**
 * 获取tmp目录状态
 */
export async function getTmpStatus() {
  try {
    const response = await fetch('/api/cleanup-service');
    const result = await response.json();
    
    if (result.success) {
      return {
        ...result.data,
        sessionFileCount: fileCleanup.getSessionFileCount()
      };
    } else {
      return {
        sessionFileCount: fileCleanup.getSessionFileCount(),
        error: result.error
      };
    }
  } catch (error) {
    console.warn('获取tmp状态时出错:', error);
    return {
      sessionFileCount: fileCleanup.getSessionFileCount(),
      error: 'Failed to fetch status'
    };
  }
} 