import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 移除自动初始化逻辑，避免Edge Runtime兼容性问题
  // 应用初始化将在API路由或服务端组件中处理
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}; 