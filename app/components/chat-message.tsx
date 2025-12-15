import type { Message } from '../page'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  message: Message
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

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
        <div
          className={`prose prose-sm max-w-none break-words leading-relaxed ${isUser
            ? 'prose-invert dark:prose-neutral'
            : 'prose-neutral dark:prose-invert'
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        <p
          className={`mt-1.5 text-xs ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          }`}
        >
          {format(message.timestamp, 'HH:mm')}
        </p>
      </div>
    </div>
  )
}
