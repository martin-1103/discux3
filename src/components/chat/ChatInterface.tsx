"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getMessages, createMessage, createAgentMessage } from "@/lib/actions/messages"
import { generateBatchAgentResponses } from "@/lib/actions/ai"

interface Message {
  id: string
  content: string
  type: "USER" | "AGENT" | "SYSTEM"
  timestamp: Date
  sender: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  mentions: Array<{
    agent: {
      id: string
      name: string
      emoji: string
      color: string
    }
  }>
  parsedAgentInfo?: {
    id: string
    name: string
    emoji: string
    color: string
    style: string
  }
  parsedContent?: string
}

interface Room {
  id: string
  name: string
  agents: Array<{
    id: string
    agent: {
      id: string
      name: string
      emoji: string
      color: string
      style: string
    }
  }>
}

interface ChatInterfaceProps {
  roomId: string
  room: Room
  currentUserId: string
}

export function ChatInterface({ roomId, room, currentUserId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const result = await getMessages(roomId, currentUserId)
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }, [roomId, currentUserId])

  // Load initial messages
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Poll for new messages every 2 seconds when there are active agent responses
  useEffect(() => {
    if (isTyping.length > 0) {
      const interval = setInterval(() => {
        loadMessages()
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [isTyping, loadMessages])

  // Also poll for new messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [loadMessages])

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const messageContent = inputMessage.trim()
    setInputMessage("")
    setIsLoading(true)

    try {
      // Create user message
      const result = await createMessage(currentUserId, {
        roomId,
        content: messageContent,
        mentions: []
      })

      if (result.success && result.data) {
        // Add message to local state
        setMessages(prev => [...prev, result.data as Message])
        
        // Check for agent mentions and generate responses
        await handleAgentMentions(result.data)
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAgentMentions = async (message: Message) => {
    if (message.mentions.length === 0) return

    const mentionedAgents = message.mentions.map(m => m.agent)
    const mentionedAgentIds = mentionedAgents.map(a => a.id)
    setIsTyping(mentionedAgentIds)

    // The agent responses are generated server-side asynchronously
    // We'll just show typing indicator and let polling handle the rest
    console.log(`[ChatInterface] Agent mentions detected for: ${mentionedAgents.map(a => a.name).join(', ')}`)

    // Clear typing indicator after a reasonable time (server should have finished by then)
    setTimeout(() => {
      setIsTyping([])
    }, 10000) // 10 seconds max wait time
  }

  const generateMockResponse = (agent: any, userMessage: string) => {
    const responses = {
      PROFESSIONAL: [
        "Based on my analysis, I recommend a structured approach to this challenge. Let's break down the key components and develop a comprehensive strategy.",
        "This is an interesting challenge. From a professional standpoint, I suggest we consider the following factors...",
        "I appreciate your question. Let me provide a thorough assessment based on best practices in this area."
      ],
      DIRECT: [
        "Here's what you need to do: Focus on the core issue and take immediate action.",
        "Bottom line: Address this directly without overcomplicating the solution.",
        "My advice: Be decisive and implement a straightforward solution."
      ],
      FRIENDLY: [
        "Great question! I'm here to help you work through this. Let's explore some ideas together! 😊",
        "I love that you're thinking about this! Here are some friendly suggestions...",
        "Absolutely! Let me share some thoughts that might help you on your journey."
      ],
      CREATIVE: [
        "Ooh, this sparks some innovative ideas! What if we approached this from a completely different angle?",
        "Let's think outside the box here! I'm imagining some creative possibilities...",
        "This is a canvas for innovation! Here are some unconventional approaches..."
      ],
      ANALYTICAL: [
        "Let me analyze this systematically. The data suggests several key factors to consider...",
        "From an analytical perspective, we should examine the underlying patterns and metrics.",
        "Breaking this down logically, we can identify several critical variables and relationships."
      ]
    }

    const agentResponses = responses[agent.style as keyof typeof responses] || responses.PROFESSIONAL
    const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)]

    return {
      content: `@${agent.name}: ${randomResponse}`,
      processingTime: 1.5 + Math.random() * 2,
      confidence: 0.85 + Math.random() * 0.14,
      contextLength: userMessage.length + Math.floor(Math.random() * 1000)
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const parseAgentInfo = (message: Message): Message => {
    if (message.type === "AGENT" && message.content.startsWith('[AGENT:')) {
      const agentInfoMatch = message.content.match(/^\[AGENT:([^:]+):([^:]+):([^:]+):([^:]+):([^\]]+)\]/)

      if (agentInfoMatch) {
        const [, agentId, agentName, agentEmoji, agentColor, agentStyle] = agentInfoMatch
        const cleanContent = message.content.replace(/^\[AGENT:[^\]]+\]\n/, '')

        return {
          ...message,
          parsedAgentInfo: {
            id: agentId,
            name: agentName,
            emoji: agentEmoji,
            color: agentColor,
            style: agentStyle
          },
          parsedContent: cleanContent
        }
      }
    }
    return message
  }

  const formatMessageContent = (content: string, mentions: any[]) => {
    let formattedContent = content
    
    // Replace @mentions with styled versions
    mentions.forEach(mention => {
      const mentionRegex = new RegExp(`@${mention.agent.name}`, 'g')
      formattedContent = formattedContent.replace(
        mentionRegex,
        `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style="background-color: ${mention.agent.color}20; color: ${mention.agent.color}">@${mention.agent.emoji} ${mention.agent.name}</span>`
      )
    })
    
    return formattedContent
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const parsedMessage = parseAgentInfo(message)
            const agentInfo = parsedMessage.parsedAgentInfo
            const displayContent = parsedMessage.parsedContent || parsedMessage.content

            return (
              <div key={message.id} className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={message.type === "AGENT" ? "text-lg" : ""}>
                    {message.type === "AGENT" ? (agentInfo?.emoji || "🤖") :
                     message.sender.name?.[0] ||
                     message.sender.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {message.type === "AGENT" ? (
                        agentInfo ? (
                          <span className="flex items-center gap-1">
                            <span>{agentInfo.emoji}</span>
                            <span>{agentInfo.name}</span>
                          </span>
                        ) : "AI Agent"
                      ) : (
                        message.sender.name || message.sender.email
                      )}
                    </span>
                    {message.type === "AGENT" && (
                      <Badge variant="outline" className="text-xs">
                        {agentInfo?.style.toLowerCase() || "AI"}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>

                  <div
                    className="text-sm bg-white p-3 rounded-lg border whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(displayContent, message.mentions)
                    }}
                  />
                </div>
              </div>
            )
          })}

          {/* Typing Indicators */}
          {isTyping.length > 0 && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-lg">🤖</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">AI Agent</span>
                  <Badge variant="outline" className="text-xs">Typing</Badge>
                </div>
                <div className="text-sm bg-gray-100 p-3 rounded-lg border">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message... (Use @ to mention agents)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={isLoading}
              className="pr-12"
            />
            
            {/* Agent Suggestions */}
            {inputMessage.includes("@") && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg p-2 z-10">
                <p className="text-xs font-medium text-muted-foreground mb-2">Available Agents:</p>
                <div className="space-y-1">
                  {room.agents.map((roomAgent) => (
                    <div
                      key={roomAgent.agent.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-pointer text-sm"
                      onClick={() => {
                        const mention = `@${roomAgent.agent.name}`
                        setInputMessage(prev => prev.replace(/@\w*$/, mention) + " ")
                        inputRef.current?.focus()
                      }}
                    >
                      <span className="text-lg">{roomAgent.agent.emoji}</span>
                      <span>{roomAgent.agent.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {roomAgent.agent.style.toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          <p>💡 Tip: Mention agents with @ (e.g., @AgentName) to get their responses</p>
        </div>
      </div>
    </div>
  )
}
