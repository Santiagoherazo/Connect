'use client'

import { useEffect, useRef, useState } from 'react'
import { useChat } from '@/lib/hooks/useChat'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { cn, timeAgo } from '@/lib/utils'
import { Send, Sparkles } from 'lucide-react'
import { Message } from '@/types'

interface GroupChatProps {
  pinId: string
  currentUserId: string
}

export function GroupChat({ pinId, currentUserId }: GroupChatProps) {
  const { messages, loading, sendMessage } = useChat(pinId)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    await sendMessage(trimmed)
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Cargando chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">👋</p>
            <p className="text-sm font-medium text-zinc-600">¡El parche está activo!</p>
            <p className="text-xs text-zinc-400 mt-1">Saluda a los demás miembros</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 p-3 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent max-h-24"
          />
          <Button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            size="sm"
            className="rounded-xl h-10 w-10 p-0 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  // System message
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-zinc-400 bg-zinc-50 rounded-full px-3 py-1">
          {message.content}
        </span>
      </div>
    )
  }

  // Icebreaker message
  if (message.type === 'icebreaker') {
    return (
      <div className="flex justify-center">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 max-w-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-xs font-semibold text-teal-700">Icebreaker IA</span>
          </div>
          <p className="text-sm text-teal-900">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2', isOwn && 'flex-row-reverse')}>
      {message.sender && !isOwn && (
        <Avatar profile={message.sender} size="xs" showLocalBadge className="mt-1 flex-shrink-0" />
      )}
      <div className={cn('max-w-[75%]', isOwn && 'items-end flex flex-col')}>
        {!isOwn && message.sender && (
          <span className="text-[10px] text-zinc-400 mb-1 ml-1">
            {message.sender.display_name}
            {message.sender.is_local && ' 🏠'}
          </span>
        )}
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm',
          isOwn
            ? 'bg-teal-600 text-white rounded-tr-sm'
            : 'bg-zinc-100 text-zinc-900 rounded-tl-sm'
        )}>
          {message.content}
        </div>
        <span className={cn('text-[10px] text-zinc-400 mt-1', isOwn ? 'mr-1' : 'ml-1')}>
          {timeAgo(message.created_at)}
        </span>
      </div>
    </div>
  )
}
