# ai-code

一个基于 Next.js App Router 的 AI Chat 应用：支持多模型（OpenAI 兼容 / Gemini）、工具调用（LangChain Tools / MCP）、会话管理（Supabase），并内置 Canvas 模式把 AI 产物以“可运行的 React 工程”形式实时预览、导出与分享。

## 功能概览

- 多模型选择：Gemini / OpenAI 兼容（含 Qwen、DeepSeek 等）
- 工具调用：自定义工具、LangChain 预构建工具（如 Tavily）、MCP 工具
- 会话管理：创建/切换/删除会话，持久化到 Supabase
- Canvas 产物：解析 AI 输出的 `<canvasArtifact>`，侧栏预览/查看代码/导出虚拟工程
- 分享：生成分享链接，在 `/share/[shareId]` 里独立预览

## 快速开始

### 1) 安装依赖

```bash
# 建议 Node.js >= 20，包管理器使用 pnpm（package.json 已锁定版本）
pnpm install
```

### 2) 配置环境变量

在项目根目录创建 `.env`（或在部署平台配置同名环境变量）：

```bash
# Supabase（必填）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_anon_key

# 站点地址（可选；用于 OAuth 回调等场景）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 模型 API Key
GOOGLE_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key
QWEN_API_KEY=your_qwen_key
```

### 3) 启动开发环境

```bash
pnpm dev
```

打开：http://localhost:3000

## 常用脚本

- `pnpm dev`：启动开发环境
- `pnpm build`：构建
- `pnpm start`：启动生产服务
- `pnpm lint`：ESLint 检查

## 关键目录

- `app/page.tsx`：主界面（聊天区 + 侧边栏 + Canvas Dock）
- `app/agent/`：模型/工具/工作流（LangGraph）相关实现
- `app/api/`：后端路由（会话、artifact、分享、认证）
- `app/canvas/`：Canvas Artifact 解析、虚拟工程构建、iframe 预览运行时
- `app/database/`：Supabase 客户端（SSR/Client）与数据访问
- `sql/supabase.sql`：表结构参考（文件头注明仅用于上下文，不保证可直接执行）

## 工具与模型配置

### 工具列表

工具定义与默认启用项在：
- `app/agent/config/tools.config.ts`

其中：
- `type: 'custom'`：自定义工具（必须提供 `schema` + `handler`）
- `type: 'langchain'`：LangChain 预构建工具（通过动态 import 预加载）
- `type: 'mcp'`：MCP 工具（通过 `@langchain/mcp-adapters` 拉取）
- `type: 'canvas'`：Canvas 模式开关（不参与 LangChain 工具调用，只注入系统提示词）

### 模型列表

模型列表与默认模型在：
- `app/agent/utils/models.ts`
- `app/agent/utils/modelFactory.ts`

默认模型：`google:gemini-2.5-flash`（可在 UI 里切换）。
