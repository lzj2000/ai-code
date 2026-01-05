'use client'

import type { ToolCall } from '../page'
import { CheckCircle2, ChevronRight, CircleAlert, Clock, Terminal, XCircle } from 'lucide-react'
import { useState } from 'react'

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (!toolCalls || toolCalls.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 mb-3 w-full">
      {toolCalls.map(toolCall => (
        <ToolCallItem key={toolCall.id} toolCall={toolCall} />
      ))}
    </div>
  )
}

function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasOutput = toolCall.output !== undefined
  const hasError = toolCall.error !== undefined
  const isExecuting = !hasOutput && !hasError

  return (
    <div className="group rounded-lg border border-border bg-card/50 hover:bg-card transition-all duration-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs select-none hover:bg-accent/50 transition-colors"
      >
        <div className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${
          isExecuting
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
            : hasError
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
        }`}
        >
          {isExecuting
            ? <Clock className="h-3.5 w-3.5 animate-pulse" />
            : hasError
              ? <XCircle className="h-3.5 w-3.5" />
              : <Terminal className="h-3.5 w-3.5" />}
        </div>

        <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
          <span className="font-medium text-foreground truncate w-full text-left flex items-center gap-2">
            {toolCall.name}
            {isExecuting && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
          </span>
          <span className="text-[10px] text-muted-foreground truncate w-full text-left">
            {isExecuting
              ? '正在执行...'
              : hasError
                ? '执行失败'
                : '执行完成'}
          </span>
        </div>

        <ChevronRight
          className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground flex-shrink-0 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      <div
        className={`
          grid transition-[grid-template-rows] duration-200 ease-in-out
          ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}
        `}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0 text-xs space-y-3 bg-card/30">
            <div className="h-px bg-border/40 mb-2 mx-1" />

            {/* 参数部分 */}
            {toolCall.args && Object.keys(toolCall.args).length > 0 && (
              <div className="space-y-1.5">
                <div className="text-muted-foreground font-medium px-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  输入参数
                </div>
                <div className="bg-muted/30 border border-border/40 rounded-md p-2.5 overflow-x-auto font-mono text-muted-foreground custom-scrollbar">
                  {JSON.stringify(toolCall.args, null, 2)}
                </div>
              </div>
            )}

            {/* 结果部分 */}
            {hasOutput && (
              <div className="space-y-1.5">
                <div className="text-emerald-600 dark:text-emerald-500 font-medium px-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" />
                  执行结果
                </div>
                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/30 dark:border-emerald-900/30 rounded-md p-2.5 overflow-x-auto font-mono text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                  {typeof toolCall.output === 'string'
                    ? toolCall.output
                    : JSON.stringify(toolCall.output, null, 2)}
                </div>
              </div>
            )}

            {/* 错误部分 */}
            {hasError && (
              <div className="space-y-1.5">
                <div className="text-destructive font-medium px-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <CircleAlert className="h-3 w-3" />
                  错误信息
                </div>
                <div className="bg-destructive/5 border border-destructive/10 rounded-md p-2.5 overflow-x-auto font-mono text-destructive break-all custom-scrollbar">
                  {toolCall.error}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
