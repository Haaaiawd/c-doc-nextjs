/**
 * 简化的临时文件清理工具
 * 只负责会话文件跟踪，实际清理由API路由处理
 */

export class FileCleanup {
  private sessionFiles: Set<string> = new Set();

  /**
   * 记录会话文件
   */
  trackSessionFile(filePath: string) {
    this.sessionFiles.add(filePath);
    console.log(`📝 跟踪会话文件: ${this.getFileName(filePath)}`);
  }

  /**
   * 获取会话文件列表
   */
  getSessionFiles(): string[] {
    return Array.from(this.sessionFiles);
  }

  /**
   * 清空会话文件列表
   */
  clearSessionFiles() {
    const count = this.sessionFiles.size;
    this.sessionFiles.clear();
    console.log(`🧹 清空会话文件列表: ${count}个文件`);
  }

  /**
   * 获取会话文件数量
   */
  getSessionFileCount(): number {
    return this.sessionFiles.size;
  }

  /**
   * 提取文件名
   */
  private getFileName(filePath: string): string {
    return filePath.split(/[/\\]/).pop() || filePath;
  }
}

// 创建全局实例
export const fileCleanup = new FileCleanup(); 