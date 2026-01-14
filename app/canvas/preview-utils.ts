/**
 * 生成用于 iframe srcdoc 的完整 HTML
 *
 * 职责：
 * - 注入运行时依赖（React/ReactDOM/Babel/Tailwind/Lucide）
 * - 将用户组件代码转译并渲染到 #root
 * - 通过 postMessage 向父页面回传 ready/console/error 事件
 */
import type { CanvasFile, CanvasProject } from './canvas-types'

export function generateIframeHTML(project: CanvasProject, icons: string[] = []): string {
  const iconList = Array.isArray(icons) ? icons : []
  const projectJson = JSON.stringify(project)
  const iconsJson = JSON.stringify(iconList)
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 预览运行时依赖：这里使用 CDN 注入，避免把预览的依赖绑定到主应用打包产物 -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>

  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; overflow: auto; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: transparent; }
    #root { width: 100%; height: 100%; min-height: 100%; }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    const consoleMethods = ['log', 'info', 'warn', 'error'];
    const originalConsole = {};
    consoleMethods.forEach(method => {
      originalConsole[method] = console[method];
    });

    function sendConsoleMessage(level, args) {
      // 将 iframe 内的 console 透传到父页面，用于在侧栏面板展示输出
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg, null, 2); } catch (e) { return String(arg); }
        }
        return String(arg);
      });

      window.parent.postMessage({
        type: 'canvas:console',
        level,
        message: formattedArgs.join(' ')
      }, '*');
    }

    consoleMethods.forEach(level => {
      console[level] = (...args) => {
        originalConsole[level](...args);
        sendConsoleMessage(level, args);
      };
    });

    window.onerror = (msg, url, line, col, error) => {
      // 将运行时错误透传到父页面（注意：这里的 postMessage targetOrigin 目前为 '*'）
      window.parent.postMessage({
        type: 'canvas:error',
        error: String(msg),
        stack: error?.stack || '',
        line: line,
        col: col
      }, '*');
      return true;
    };

    window.onunhandledrejection = (event) => {
      window.parent.postMessage({
        type: 'canvas:error',
        error: String(event.reason?.message || event.reason),
        stack: event.reason?.stack || ''
      }, '*');
    };

    const project = ${projectJson};
    const icons = ${iconsJson};

    function normalizePath(input) {
      if (!input || typeof input !== 'string') return '';
      const raw = input.replace(/\\\\/g, '/').trim();
      const noPrefix = raw.startsWith('./') ? raw.slice(2) : raw;
      const parts = noPrefix.split('/').filter(Boolean);
      const stack = [];
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
          stack.pop();
          continue;
        }
        stack.push(part);
      }
      return stack.join('/');
    }

    function inferLanguageByPath(path) {
      const lower = String(path || '').toLowerCase();
      if (lower.endsWith('.tsx')) return 'tsx';
      if (lower.endsWith('.ts')) return 'ts';
      if (lower.endsWith('.jsx')) return 'jsx';
      if (lower.endsWith('.js')) return 'js';
      if (lower.endsWith('.css')) return 'css';
      if (lower.endsWith('.json')) return 'json';
      if (lower.endsWith('.txt')) return 'txt';
      return 'jsx';
    }

    function buildLucideReactExports(iconNames) {
      const exportsObj = {};
      for (const iconName of iconNames) {
        exportsObj[iconName] = ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', ...props }) => {
          const iconDef = window.lucide?.icons?.[iconName] || null;
          if (!iconDef) {
            throw new Error('Lucide icon not found: ' + iconName);
          }
          const svgNode = window.lucide.createElement(iconDef, {
            width: size,
            height: size,
            stroke: color,
            'stroke-width': strokeWidth,
            class: 'lucide lucide-' + String(iconName).toLowerCase() + ' ' + className
          });
          const svg = svgNode.outerHTML;
          return React.createElement('span', {
            ...props,
            className: className,
            dangerouslySetInnerHTML: { __html: svg }
          });
        };
      }
      exportsObj.__esModule = true;
      exportsObj.default = exportsObj;
      return exportsObj;
    }

    function createReactExports() {
      return {
        __esModule: true,
        default: React,
        useState: React.useState,
        useEffect: React.useEffect,
        useRef: React.useRef,
        useMemo: React.useMemo,
        useCallback: React.useCallback,
      };
    }

    function createReactDomClientExports() {
      return {
        __esModule: true,
        createRoot: ReactDOM.createRoot,
      };
    }

    const fileMap = new Map();
    const rawFiles = Array.isArray(project?.files) ? project.files : [];
    for (const file of rawFiles) {
      const path = normalizePath(file?.path);
      if (!path) continue;
      const language = file?.language || inferLanguageByPath(path);
      const content = typeof file?.content === 'string' ? file.content : '';
      fileMap.set(path, { path, language, content });
    }

    const moduleCache = new Map();

    function resolveModulePath(specifier, fromPath) {
      const raw = String(specifier || '').trim();
      if (!raw) return '';
      if (!raw.startsWith('.')) return raw;

      const fromDir = normalizePath(fromPath || '').split('/').slice(0, -1).join('/');
      const combined = normalizePath((fromDir ? fromDir + '/' : '') + raw);
      const candidates = [
        combined,
        combined + '.tsx',
        combined + '.ts',
        combined + '.jsx',
        combined + '.js',
        combined + '.css',
        combined + '.json',
        combined + '/index.tsx',
        combined + '/index.ts',
        combined + '/index.jsx',
        combined + '/index.js',
      ];
      for (const c of candidates) {
        if (fileMap.has(c)) return c;
      }
      return combined;
    }

    function requireModule(specifier, fromPath) {
      const resolved = resolveModulePath(specifier, fromPath);
      if (resolved === 'react') return createReactExports();
      if (resolved === 'react-dom/client') return createReactDomClientExports();
      if (resolved === 'lucide-react') return buildLucideReactExports(icons);

      if (resolved.endsWith('.css')) {
        const cssFile = fileMap.get(resolved);
        const css = cssFile ? cssFile.content : '';
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        return { __esModule: true, default: css };
      }

      if (resolved.endsWith('.json')) {
        const jsonFile = fileMap.get(resolved);
        const rawJson = jsonFile ? jsonFile.content : '';
        try {
          return { __esModule: true, default: JSON.parse(rawJson) };
        } catch (e) {
          throw new Error('JSON 解析失败: ' + resolved);
        }
      }

      if (!fileMap.has(resolved)) {
        throw new Error('未找到文件: ' + resolved);
      }

      if (moduleCache.has(resolved)) {
        return moduleCache.get(resolved).exports;
      }

      const mod = { exports: {} };
      moduleCache.set(resolved, mod);

      const source = fileMap.get(resolved).content;
      const lowerResolved = String(resolved || '').toLowerCase();
      const presets = lowerResolved.endsWith('.tsx')
        ? ['react', 'typescript']
        : lowerResolved.endsWith('.ts')
          ? ['typescript']
          : ['react'];
      const transformed = Babel.transform(source, {
        presets,
        plugins: ['transform-modules-commonjs'],
        filename: resolved,
      }).code;

      const fn = new Function('require', 'module', 'exports', transformed);
      fn((s) => requireModule(s, resolved), mod, mod.exports);
      return mod.exports;
    }

    function findFallbackEntry() {
      if (fileMap.has('src/App.tsx')) return 'src/App.tsx';
      if (fileMap.has('src/App.ts')) return 'src/App.ts';
      if (fileMap.has('src/App.jsx')) return 'src/App.jsx';
      if (fileMap.has('src/App.js')) return 'src/App.js';
      if (fileMap.size > 0) return Array.from(fileMap.keys())[0];
      return '';
    }

    try {
      const entryPath = normalizePath(project?.entryPath) || findFallbackEntry();
      if (!entryPath) {
        throw new Error('缺少 entryPath，且无法推断入口文件');
      }
      const entryExports = requireModule(entryPath, '');
      const Component = entryExports?.default || entryExports;
      if (typeof Component !== 'function') {
        throw new Error('入口文件未导出默认 React 组件: ' + entryPath);
      }

      const WrappedComponent = () => {
        React.useEffect(() => {
          setTimeout(() => {
            window.parent.postMessage({ type: 'canvas:ready' }, '*');
          }, 100);
        }, []);
        return React.createElement(Component);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(WrappedComponent));
    } catch (error) {
      window.parent.postMessage({
        type: 'canvas:error',
        error: String(error.message || error),
        stack: error?.stack || ''
      }, '*');
    }
  </script>
</body>
</html>`
}

/**
 * 提取 lucide-react 的图标名称列表
 */
export function collectLucideIconsFromFiles(files: CanvasFile[]): string[] {
  const iconSet = new Set<string>()
  for (const file of files) {
    if (!file || typeof file.content !== 'string')
      continue
    const lucideImportMatch = file.content.match(
      /import\s*\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/,
    )
    if (!lucideImportMatch)
      continue
    const importedIcons = lucideImportMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    for (const icon of importedIcons) {
      iconSet.add(icon)
    }
  }
  return Array.from(iconSet)
}
