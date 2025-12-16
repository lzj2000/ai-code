import type { Message } from '../page'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
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
      </div>
    </div>
  )
}
