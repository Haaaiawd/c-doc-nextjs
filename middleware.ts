import { NextRequest, NextResponse } from 'next/server';

// 跟踪是否已初始化
let isInitialized = false;

export function middleware(request: NextRequest) {
  // 仅在第一次请求时初始化
  if (!isInitialized) {
    console.log('🚀 首次访问，正在初始化应用...');
    
    // 异步初始化（不阻塞请求）
    Promise.resolve().then(async () => {
      try {
        const { initializeApp } = await import('./lib/startup');
        initializeApp();
      } catch (error) {
        console.warn('⚠️ 应用初始化失败:', error);
      }
    });
    
    isInitialized = true;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 