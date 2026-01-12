/**
 * 生成用于 iframe srcdoc 的完整 HTML
 *
 * 职责：
 * - 注入运行时依赖（React/ReactDOM/Babel/Tailwind/Lucide）
 * - 将用户组件代码转译并渲染到 #root
 * - 通过 postMessage 向父页面回传 ready/console/error 事件
 */
export function generateIframeHTML(code: string, icons: string[] = []): string {
  // 将用户代码包装进 iframe 的 srcdoc：隔离运行环境，避免影响主应用全局状态
  const iconComponents
    = icons.length > 0
      ? `
    ${icons
      .map((iconName) => {
        // 运行在 iframe 内：把 lucide 的 icon 定义转成 React 组件，供用户代码直接使用
        return `const ${iconName} = ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', ...props }) => {
      const iconDef = window.lucide?.icons?.['${iconName}'] || null;
      if (!iconDef) {
        throw new Error('Lucide icon not found: ${iconName}');
      }
      const svgNode = window.lucide.createElement(iconDef, {
        width: size,
        height: size,
        stroke: color,
        'stroke-width': strokeWidth,
        class: 'lucide lucide-${iconName.toLowerCase()} ' + className
      });
      const svg = svgNode.outerHTML;
      return React.createElement('span', {
        ...props,
        className: className,
        dangerouslySetInnerHTML: { __html: svg }
      });
    };`
      })
      .join('\n    ')}
  `
      : ''

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

  <script type="text/babel">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

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

    ${iconComponents}

    try {
      const originalCode = ${JSON.stringify(code)};
      // 约定：用户必须 export default 一个组件；这里替换成全局变量，便于在 iframe 中取到并渲染
      const userCode = originalCode.replace(/export default/g, 'window.UserComponent =');

      if (!userCode.includes('window.UserComponent')) {
        throw new Error('代码必须包含 \"export default\" 语句');
      }

      const transformedCode = Babel.transform(userCode, {
        presets: ['react'],
        filename: 'user-component.jsx'
      }).code;

      eval(transformedCode);

      if (typeof window.UserComponent !== 'function') {
        throw new Error('UserComponent 未能正确定义');
      }

      const WrappedComponent = () => {
        useEffect(() => {
          // 用于标记“首屏渲染完成”，让父页面关闭 loading 蒙层
          setTimeout(() => {
            window.parent.postMessage({ type: 'canvas:ready' }, '*');
          }, 100);
        }, []);

        return React.createElement(window.UserComponent);
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
 * 清理并提取预览所需信息
 *
 * 设计目的：
 * - iframe 内会自行注入 React 与 Lucide，因此移除用户代码中的对应 import
 * - 提取 lucide-react 的图标名称列表，便于仅注入用到的图标桥接组件
 */
export function sanitizeCode(code: string): { sanitized: string, icons: string[] } {
  // 预览 iframe 会自己注入 React / Tailwind / Lucide，因此需要移除用户代码中的对应 import
  const icons: string[] = []
  let sanitized = code

  const lucideImportMatch = sanitized.match(
    /import\s*\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/,
  )
  if (lucideImportMatch) {
    // 收集用户实际引用过的图标名称，仅为这些图标生成桥接组件，避免注入无用代码
    const importedIcons = lucideImportMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    icons.push(...importedIcons)
  }

  sanitized = sanitized.replace(
    /import\s+React\s*(?:,\s*)?\{[^}]*\}\s+from\s+['"]react['"];\s*/g,
    '',
  )
  sanitized = sanitized.replace(
    /import\s*\{[^}]*\}\s+from\s+['"]lucide-react['"];\s*/g,
    '',
  )

  return { sanitized, icons }
}
