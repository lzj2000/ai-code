/**
 * 工具预加载初始化模块
 * 在应用启动时自动预加载 LangChain 工具
 */

import { preloadLangChainTools } from './tools';

let isInitialized = false;

/**
 * 初始化工具预加载
 * 此函数会在模块首次导入时自动调用
 */
export async function initializeTools() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  await preloadLangChainTools();
}

// 自动初始化（但不在导入时立即执行，而是延迟到首次使用）
// 这样可以避免影响应用启动速度
let initPromise: Promise<void> | null = null;

export function ensureToolsInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeTools();
  }
  return initPromise;
}
