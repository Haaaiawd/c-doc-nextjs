import { autoCleanup, CleanupStats } from './auto-cleanup';

/**
 * 定时清理系统配置
 */
export interface ScheduledCleanupConfig {
  /** 清理间隔（毫秒） */
  interval: number;
  /** 是否启用 */
  enabled: boolean;
  /** 最大文件保留时间（毫秒） */
  maxAge: number;
  /** 是否在开发环境运行 */
  runInDev: boolean;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: ScheduledCleanupConfig = {
  interval: 30 * 60 * 1000, // 30分钟
  enabled: true,
  maxAge: 60 * 60 * 1000,   // 1小时
  runInDev: true,
};

/**
 * 定时清理系统
 * 
 * 特性：
 * - 可靠的定时清理机制
 * - 智能跳过重复执行
 * - 详细的统计和日志
 * - 优雅的启动和停止
 */
export class ScheduledCleanupService {
  private config: ScheduledCleanupConfig;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private totalStats = {
    executionCount: 0,
    totalDeletedFiles: 0,
    totalFreedSpace: 0,
    totalErrors: 0,
    lastExecution: null as Date | null,
    lastResult: null as CleanupStats | null
  };

  constructor(config: Partial<ScheduledCleanupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动定时清理服务
   */
  start(): boolean {
    // 检查是否应该在当前环境运行
    if (!this.shouldRun()) {
      console.log('🛑 定时清理服务在当前环境中被禁用');
      return false;
    }

    if (this.timer) {
      console.log('⚠️ 定时清理服务已在运行');
      return false;
    }

    console.log(`🚀 启动定时清理服务，间隔: ${this.config.interval / 1000 / 60}分钟`);
    
    // 立即执行一次清理
    this.executeCleanup();
    
    // 设置定时清理
    this.timer = setInterval(() => {
      this.executeCleanup();
    }, this.config.interval);

    return true;
  }

  /**
   * 停止定时清理服务
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 定时清理服务已停止');
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isRunning: this.timer !== null,
      isExecuting: this.isRunning,
      config: this.config,
      stats: this.totalStats,
      nextExecution: this.timer ? 
        new Date(Date.now() + this.config.interval) : null
    };
  }

  /**
   * 手动执行一次清理
   */
  async executeNow(): Promise<CleanupStats | null> {
    return await this.executeCleanup();
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.totalStats = {
      executionCount: 0,
      totalDeletedFiles: 0,
      totalFreedSpace: 0,
      totalErrors: 0,
      lastExecution: null,
      lastResult: null
    };
    console.log('📊 定时清理统计信息已重置');
  }

  /**
   * 执行清理操作
   */
  private async executeCleanup(): Promise<CleanupStats | null> {
    if (this.isRunning) {
      console.log('⏭️ 清理正在进行中，跳过本次执行');
      return null;
    }

    this.isRunning = true;
    this.totalStats.executionCount++;
    this.totalStats.lastExecution = new Date();

    try {
      console.log(`🧹 执行第${this.totalStats.executionCount}次定时清理...`);
      
      const result = await autoCleanup.cleanupNow();
      
      // 更新统计信息
      this.totalStats.totalDeletedFiles += result.deletedFiles;
      this.totalStats.totalFreedSpace += result.freedSpace;
      this.totalStats.totalErrors += result.errors;
      this.totalStats.lastResult = result;

      // 记录清理结果
      if (result.deletedFiles > 0) {
        console.log(`✅ 定时清理完成 #${this.totalStats.executionCount}: 删除 ${result.deletedFiles} 个文件，释放 ${(result.freedSpace / 1024 / 1024).toFixed(2)}MB`);
      } else {
        console.log(`ℹ️ 定时清理完成 #${this.totalStats.executionCount}: 没有需要清理的文件`);
      }

      // 显示累计统计
      if (this.totalStats.executionCount % 5 === 0) {
        this.logCumulativeStats();
      }

      return result;
    } catch (error) {
      this.totalStats.totalErrors++;
      console.error(`❌ 定时清理失败 #${this.totalStats.executionCount}:`, error);
      return null;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 检查是否应该在当前环境运行
   */
  private shouldRun(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // 生产环境始终运行
    if (process.env.NODE_ENV === 'production') {
      return true;
    }

    // 开发环境根据配置决定
    return this.config.runInDev;
  }

  /**
   * 记录累计统计信息
   */
  private logCumulativeStats(): void {
    console.log(`📊 定时清理累计统计 (${this.totalStats.executionCount}次执行):`);
    console.log(`   💾 累计删除文件: ${this.totalStats.totalDeletedFiles} 个`);
    console.log(`   🗂️ 累计释放空间: ${(this.totalStats.totalFreedSpace / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   ⚠️ 累计错误次数: ${this.totalStats.totalErrors}`);
    if (this.totalStats.lastExecution) {
      console.log(`   🕐 上次执行时间: ${this.totalStats.lastExecution.toLocaleString()}`);
    }
  }
}

/**
 * 全局定时清理服务实例
 */
export const scheduledCleanup = new ScheduledCleanupService({
  interval: parseInt(process.env.CLEANUP_INTERVAL || '1800000'), // 默认30分钟
  maxAge: parseInt(process.env.CLEANUP_MAX_AGE || '3600000'),     // 默认1小时
  enabled: process.env.CLEANUP_ENABLED !== 'false',               // 默认启用
  runInDev: process.env.CLEANUP_RUN_IN_DEV !== 'false',          // 默认在开发环境运行
});

/**
 * 启动定时清理服务的便捷函数
 */
export function startScheduledCleanup(): boolean {
  return scheduledCleanup.start();
}

/**
 * 停止定时清理服务的便捷函数
 */
export function stopScheduledCleanup(): void {
  scheduledCleanup.stop();
}

/**
 * 获取定时清理服务状态的便捷函数
 */
export function getScheduledCleanupStatus() {
  return scheduledCleanup.getStatus();
} 