import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 智能助手 - 您的全能对话伙伴',
  description: '基于先进大语言模型的智能对话助手，提供即时问答、代码辅助、创意写作等功能。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
