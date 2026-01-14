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

function normalizePath(input: string): string {
  const raw = String(input || '').replace(/\\/g, '/').trim()
  const noPrefix = raw.startsWith('./') ? raw.slice(2) : raw
  const parts = noPrefix.split('/').filter(Boolean)
  const stack: string[] = []
  for (const part of parts) {
    if (part === '.')
      continue
    if (part === '..') {
      stack.pop()
      continue
    }
    stack.push(part)
  }
  return stack.join('/')
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
): VirtualFile[] {
  const projectFiles = artifact.project?.files || []
  const entryPath = normalizePath(artifact.project?.entryPath || '') || 'src/App.jsx'

  // main.jsx 负责挂载 React Root，保持结构与标准 Vite 模板一致
  const mainFile = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

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

  const userFiles: VirtualFile[] = projectFiles
    .map((f) => {
      const path = normalizePath(f.path)
      const content = normalizeLineEndings(String(f.content || ''))
      return { path, content }
    })
    .filter(f => f.path.length > 0)

  const hasEntry = userFiles.some(f => f.path === entryPath)
  const entryFallback = `import React from 'react'

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      未找到入口文件：${entryPath}
    </div>
  )
}
`

  const viteScaffold: VirtualFile[] = [
    { path: 'package.json', content: packageJson },
    { path: 'vite.config.js', content: viteConfig },
    { path: 'index.html', content: indexHtml },
    { path: 'src/main.jsx', content: mainFile },
    { path: 'src/index.css', content: indexCss },
  ]

  const extraEntryFile: VirtualFile[] = hasEntry
    ? []
    : [{ path: entryPath, content: normalizeLineEndings(entryFallback) }]

  const ensuredAppProxy: VirtualFile[] = [
    {
      path: 'src/App.jsx',
      content: normalizeLineEndings(`export { default } from '/${entryPath}'\n`),
    },
  ]

  const merged = new Map<string, VirtualFile>()
  for (const f of [...viteScaffold, ...userFiles, ...extraEntryFile, ...ensuredAppProxy]) {
    if (!f.path)
      continue
    merged.set(f.path, f)
  }

  return Array.from(merged.values()).sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * 列出并排序虚拟文件路径（用于展示或快速检查）
 */
export function listVirtualFilePaths(files: VirtualFile[]): string[] {
  return files.map(f => f.path).sort((a, b) => a.localeCompare(b))
}
