'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Message } from '@/types'

export function useChat(pinId: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Load existing messages
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('pin_messages')
        .select(`
          *,
          sender:profiles!pin_messages_sender_id_fkey(
            id, display_name, avatar_url, is_local
          )
        `)
        .eq('pin_id', pinId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (!error && data) {
        setMessages(data as Message[])
      }
      setLoading(false)
    }

    load()
  }, [pinId])

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${pinId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pin_messages',
          filter: `pin_id=eq.${pinId}`,
        },
        async (payload) => {
          // Fetch full message with sender profile
          const { data } = await supabase
            .from('pin_messages')
            .select(`
              *,
              sender:profiles!pin_messages_sender_id_fkey(
                id, display_name, avatar_url, is_local
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages((prev) => [...prev, data as Message])
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pinId])

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('pin_messages').insert({
      pin_id: pinId,
      sender_id: user.id,
      content,
      type: 'text',
    })

    if (error) console.error('Error sending message:', error)
  }, [pinId])

  return { messages, loading, sendMessage }
}
