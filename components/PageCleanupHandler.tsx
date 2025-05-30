"use client";

import { useEffect } from 'react';

/**
 * 页面清理处理组件 - 简化版
 * 只在真正退出时清理，避免频繁调用
 */
export default function PageCleanupHandler() {
  
  useEffect(() => {
    // 仅在页面真正退出时清理（禁用频繁的可见性检测）
    const handleBeforeUnload = () => {
      // 只在确实退出时才清理
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/cleanup', JSON.stringify({ type: 'session' }));
      }
    };

    // 只添加真正的退出监听器，移除可见性变化检测
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理函数
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
} 