import { NextRequest, NextResponse } from 'next/server';
import { 
  scheduledCleanup, 
  startScheduledCleanup, 
  stopScheduledCleanup, 
  getScheduledCleanupStatus 
} from '@/lib/scheduled-cleanup';

/**
 * GET - 获取定时清理服务状态
 */
export async function GET() {
  try {
    const status = getScheduledCleanupStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取定时清理状态时出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}

/**
 * POST - 管理定时清理服务
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      case 'start':
        const startResult = startScheduledCleanup();
        return NextResponse.json({
          success: startResult,
          message: startResult ? '定时清理服务已启动' : '定时清理服务启动失败或已在运行'
        });

      case 'stop':
        stopScheduledCleanup();
        return NextResponse.json({
          success: true,
          message: '定时清理服务已停止'
        });

      case 'status':
        const status = getScheduledCleanupStatus();
        return NextResponse.json({
          success: true,
          data: status
        });

      case 'execute':
        const result = await scheduledCleanup.executeNow();
        return NextResponse.json({
          success: true,
          message: '手动清理已执行',
          data: result
        });

      case 'reset-stats':
        scheduledCleanup.resetStats();
        return NextResponse.json({
          success: true,
          message: '统计信息已重置'
        });

      default:
        return NextResponse.json({
          success: false,
          error: '无效的操作'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('管理定时清理服务时出错:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败'
    }, { status: 500 });
  }
} 