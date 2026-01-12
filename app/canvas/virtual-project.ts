import type { CanvasArtifact } from './canvas-types'

/**
 * 导出到本地时的“虚拟文件”结构
 */
export interface VirtualFile {
  /** 文件路径（相对项目根） */
  path: string
  /** 文件内容 */
  content: string
}

function normalizeLineEndings(input: string): string {
  // 统一换行符，避免在 Windows 环境导出后出现多余的 CRLF 差异
  return input.replace(/\r\n/g, '\n')
}

/**
 * 根据 artifact 生成一份可运行的虚拟工程文件集（Vite + React）
 *
 * 设计目的：
 * - 让用户“一键导出”后可直接 npm/pnpm install & dev 运行
 * - 不依赖主项目的构建配置，降低环境耦合
 */
export function buildVirtualProjectFiles(
  artifact: CanvasArtifact,
  overrideCode?: string,
): VirtualFile[] {
  // 生成一份最小可运行的 Vite + React 工程，用于“导出”场景
  const code = normalizeLineEndings(overrideCode ?? artifact.code.content)

  // 用户代码作为 App.jsx 的主体（预期包含 export default）
  const appFile = `import React from 'react'

${code}
`

  // main.jsx 负责挂载 React Root，保持结构与标准 Vite 模板一致
  const mainFile = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`

  // index.html 只保留 root 容器与入口脚本
  const indexHtml = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${artifact.title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`

  // 固定依赖版本，避免导出的工程因主项目依赖变化而不可复现
  const packageJson = `{
  "name": "canvas-artifact",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.2"
  }
}
`

  // Vite + React 插件的最简配置
  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`

  // 轻量基础样式：避免默认 margin 影响组件布局观感
  const indexCss = `:root { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
body { margin: 0; }
`

  return [
    { path: 'package.json', content: packageJson },
    { path: 'vite.config.js', content: viteConfig },
    { path: 'index.html', content: indexHtml },
    { path: 'src/main.jsx', content: mainFile },
    { path: 'src/App.jsx', content: appFile },
    { path: 'src/index.css', content: indexCss },
  ]
}

/**
 * 列出并排序虚拟文件路径（用于展示或快速检查）
 */
export function listVirtualFilePaths(files: VirtualFile[]): string[] {
  return files.map(f => f.path).sort((a, b) => a.localeCompare(b))
}
