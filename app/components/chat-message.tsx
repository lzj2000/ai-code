import type { Message } from '../page'
import { FileCode2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ToolCallDisplay } from './ToolCallDisplay'

function stripCanvasArtifacts(text: string): string {
  const withoutComplete = text.replace(/<canvasArtifact[\s\S]*?<\/canvasArtifact>/gi, '')
  const lower = withoutComplete.toLowerCase()
  const openTag = '<canvasartifact'
  const openIdx = lower.indexOf(openTag)
  if (openIdx === -1) {
    return withoutComplete
  }

  const closeIdx = lower.indexOf('</canvasartifact>', openIdx)
  if (closeIdx === -1) {
    return withoutComplete.slice(0, openIdx)
  }

  return withoutComplete
}

interface ChatMessageProps {
  message: Message
  onFocusArtifact?: (artifactKey: string) => void
}

export default function ChatMessage({ message, onFocusArtifact }: ChatMessageProps) {
  const messageType = message.getType?.() || (message as any)._getType?.()
  const isUser = messageType === 'human'
  // 处理不同类型的 content
  let messageContent = ''
  const imageUrls: string[] = []

  if (typeof message.content === 'string') {
    messageContent = message.content
  }
  else if (Array.isArray(message.content)) {
    // 处理数组类型的 content（文本 + 图片）
    message.content.forEach((block) => {
      if (typeof block === 'string') {
        messageContent += block
      }
      else if (block && typeof block === 'object') {
        // 提取文本
        if ('text' in block && block.text) {
          messageContent += block.text
        }
        // 提取图片 URL
        if ('image_url' in block && block.image_url) {
          const imageUrl = block.image_url as any
          const url = typeof imageUrl === 'string'
            ? imageUrl
            : imageUrl?.url
          if (url) {
            imageUrls.push(url)
          }
        }
      }
    })
  }
  else {
    messageContent = JSON.stringify(message.content)
  }

  if (!isUser && typeof messageContent === 'string') {
    messageContent = stripCanvasArtifacts(messageContent)
  }

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] lg:max-w-[65%] rounded-2xl px-5 py-3.5 ${isUser
          ? 'rounded-br-sm bg-primary text-primary-foreground shadow-sm'
          : 'rounded-bl-sm bg-card border border-border text-card-foreground shadow-sm'
        }`}
      >
        {/* 图片展示区域 */}
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Uploaded ${index}`}
                className="max-w-full h-auto rounded-lg object-contain max-h-[300px] bg-background/50"
              />
            ))}
          </div>
        )}

        {/* 工具调用展示区域 */}
        {!isUser && (message.tool_calls || message.toolCallResults) && (
          <ToolCallDisplay toolCalls={message.toolCallResults || message.tool_calls || []} />
        )}

        <div
          className={`prose prose-sm max-w-none break-words leading-relaxed ${isUser
            ? 'prose-invert dark:prose-neutral'
            : 'prose-neutral dark:prose-invert'
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {messageContent}
          </ReactMarkdown>
        </div>

        {!isUser && message.artifacts && message.artifacts.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.artifacts.map((artifact) => {
              const artifactKey = `${artifact.sessionId}:${artifact.messageId}:${artifact.id}`
              return (
                <button
                  key={artifactKey}
                  type="button"
                  onClick={() => onFocusArtifact?.(artifactKey)}
                  className="w-full rounded-xl border border-border bg-background/40 px-3 py-2 text-left transition-colors hover:bg-accent active:scale-[0.99]"
                  aria-label={`打开 ${artifact.title}`}
                  title="点击在右侧侧边栏打开"
                >
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                      <FileCode2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {artifact.title || '代码产物'}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        点击在右侧打开
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
