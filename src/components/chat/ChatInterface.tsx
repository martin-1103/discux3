"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { getMessages, createMessage, createAgentMessage } from "@/lib/actions/messages"
import { generateBatchAgentResponses } from "@/lib/actions/ai"
import { ClearHistoryButton } from "./ClearHistoryButton"
import { getUserRoleInRoom } from "@/lib/actions/rooms"
import { useSocket } from "@/hooks/useSocket"

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

interface DiscussionState {
  isActive: boolean
  currentAgent: string | null
  completedAgents: string[]
  totalAgents: number
  agentOrder: string[]
}

interface ChatInterfaceProps {
  roomId: string
  room: Room
  currentUserId: string
  currentUserName: string | null
}

export function ChatInterface({ roomId, room, currentUserId, currentUserName }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState<string[]>([])
  const [userRole, setUserRole] = useState<"OWNER" | "ADMIN" | "MEMBER" | null>(null)
  const [discussionState, setDiscussionState] = useState<DiscussionState>({
    isActive: false,
    currentAgent: null,
    completedAgents: [],
    totalAgents: 0,
    agentOrder: []
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // WebSocket integration
  const { socket, isConnected, joinRoom, sendMessage } = useSocket({
    userId: currentUserId,
    userName: currentUserName || undefined
  })

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

  // Load user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const role = await getUserRoleInRoom(roomId, currentUserId)
        setUserRole(role)
      } catch (error) {
        console.error("Failed to fetch user role:", error)
      }
    }
    fetchUserRole()
  }, [roomId, currentUserId])

  // WebSocket integration: Join room and listen for real-time messages
  useEffect(() => {
    if (isConnected && roomId) {
      joinRoom(roomId)
      console.log(`[ChatInterface] Joined room ${roomId} via WebSocket`)
    }
  }, [isConnected, roomId, joinRoom])

  // Listen for real-time message updates via WebSocket
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const message = event.detail
      console.log(`[ChatInterface] Received new message via WebSocket:`, message)

      setMessages(prev => {
        // Check if message already exists to avoid duplicates
        if (prev.some(msg => msg.id === message.id)) {
          return prev
        }
        return [...prev, message]
      })
    }

    const handleAgentTyping = (event: CustomEvent) => {
      const typingData = event.detail
      console.log(`[ChatInterface] Agent typing:`, typingData)

      if (typingData.isTyping) {
        setIsTyping(prev => prev.includes(typingData.agentId) ? prev : [...prev, typingData.agentId])
      } else {
        setIsTyping(prev => prev.filter(id => id !== typingData.agentId))
      }
    }

    const handleDiscussionUpdate = (event: CustomEvent) => {
      const update = event.detail
      console.log(`[ChatInterface] Discussion update:`, update)

      // Update discussion state based on real-time events
      if (update.type === 'agent_start') {
        setDiscussionState(prev => ({
          ...prev,
          currentAgent: update.agentName,
          isActive: true
        }))
      } else if (update.type === 'agent_complete') {
        setDiscussionState(prev => ({
          ...prev,
          completedAgents: [...prev.completedAgents, update.agentId],
          currentAgent: null
        }))
      } else if (update.type === 'discussion_complete') {
        setDiscussionState({
          isActive: false,
          currentAgent: null,
          completedAgents: [],
          totalAgents: 0,
          agentOrder: []
        })
        setIsTyping([])
      }
    }

    // Add event listeners
    window.addEventListener('socket:new_message', handleNewMessage as EventListener)
    window.addEventListener('socket:agent_typing', handleAgentTyping as EventListener)
    window.addEventListener('socket:discussion_update', handleDiscussionUpdate as EventListener)

    // Load initial messages once
    loadMessages()

    return () => {
      window.removeEventListener('socket:new_message', handleNewMessage as EventListener)
      window.removeEventListener('socket:agent_typing', handleAgentTyping as EventListener)
      window.removeEventListener('socket:discussion_update', handleDiscussionUpdate as EventListener)
    }
  }, [loadMessages, roomId])

  // Auto scroll to bottom
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || discussionState.isActive) return

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
    const mentionedAgentNames = mentionedAgents.map(a => a.name)

    console.log(`[ChatInterface] Starting sequential discussion with agents: ${mentionedAgentNames.join(', ')}`)

    // Initialize discussion state
    setDiscussionState({
      isActive: true,
      currentAgent: null,
      completedAgents: [],
      totalAgents: mentionedAgentIds.length,
      agentOrder: mentionedAgentIds
    })

    // Set initial typing indicators
    setIsTyping(mentionedAgentIds)

    try {
      // Generate batch responses (now sequential)
      const response = await generateBatchAgentResponses(
        mentionedAgentIds,
        roomId,
        message.content,
        currentUserId
      )

      if (response.success) {
        console.log(`[ChatInterface] Discussion completed. ${response.data.responses.length} agents responded.`)

        // Load updated messages to get agent responses
        await loadMessages()

        // Clear discussion state
        setDiscussionState({
          isActive: false,
          currentAgent: null,
          completedAgents: [],
          totalAgents: 0,
          agentOrder: []
        })

        // Clear typing indicators
        setIsTyping([])
      }
    } catch (error) {
      console.error("Failed to generate agent responses:", error)

      // Reset discussion state on error
      setDiscussionState({
        isActive: false,
        currentAgent: null,
        completedAgents: [],
        totalAgents: 0,
        agentOrder: []
      })
      setIsTyping([])
    }
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
        `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium" style="background-color: ${mention.agent.color}20; color: ${mention.agent.color}">@${mention.agent.name}</span>`
      )
    })

    return formattedContent
  }

  // Helper functions for input management
  const isInputDisabled = isLoading || discussionState.isActive

  const getInputPlaceholder = () => {
    if (discussionState.isActive) {
      const progress = discussionState.completedAgents.length
      const total = discussionState.totalAgents
      return `Discussion in progress... (${progress}/${total} agents responded)`
    }
    if (isLoading) return "Sending message..."
    return "Type your message... (Use @ to mention agents)"
  }

  const getSendButtonDisabled = () => {
    return !inputMessage.trim() || isInputDisabled
  }

  // Discussion Progress Component
  const DiscussionProgress = () => {
    if (!discussionState.isActive) return null

    const progress = (discussionState.completedAgents.length / discussionState.totalAgents) * 100

    return (
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">
            Discussion in Progress
          </span>
          <span className="text-sm text-blue-700">
            {discussionState.completedAgents.length} of {discussionState.totalAgents} agents responded
          </span>
        </div>

        <Progress value={progress} className="h-2 mb-2" />

        {discussionState.currentAgent && (
          <p className="text-xs text-blue-600">
            Currently responding: {discussionState.currentAgent}
          </p>
        )}

        {/* Agent Status List */}
        {room.agents
          .filter(agent => discussionState.agentOrder.includes(agent.agent.id))
          .map((roomAgent) => {
            const isCompleted = discussionState.completedAgents.includes(roomAgent.agent.id)
            const isCurrent = discussionState.currentAgent === roomAgent.agent.name
            const isPending = !isCompleted && !isCurrent

            return (
              <div key={roomAgent.agent.id} className="flex items-center gap-2 mt-2">
                <span className="text-sm">{roomAgent.agent.emoji}</span>
                <span className="text-sm font-medium">{roomAgent.agent.name}</span>
                <Badge
                  variant={
                    isCompleted
                      ? "default"
                      : isCurrent
                      ? "secondary"
                      : "outline"
                  }
                  className="text-xs"
                >
                  {isCompleted
                    ? "✅ Done"
                    : isCurrent
                    ? "🔄 Responding"
                    : "⏳ Pending"}
                </Badge>
              </div>
            )
          })}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold">{room.name}</h2>
              <p className="text-sm text-muted-foreground">
                {room.agents.length} agents available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ClearHistoryButton
              roomId={roomId}
              currentUserId={currentUserId}
              userRole={userRole || "MEMBER"}
            />
          </div>
        </div>
      </div>

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

          {/* Enhanced Typing Indicators */}
          {isTyping.length > 0 && (
            <div className="space-y-3">
              {room.agents
                .filter(agent => isTyping.includes(agent.agent.id))
                .map((roomAgent) => (
                  <div key={roomAgent.agent.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-lg">
                        {roomAgent.agent.emoji}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {roomAgent.agent.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          🔄 Responding
                        </Badge>
                      </div>
                      {/* Skeleton loading for response being generated */}
                      <div className="mt-2 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        {/* Discussion Progress */}
        <DiscussionProgress />
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={getInputPlaceholder()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={isInputDisabled}
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
            disabled={getSendButtonDisabled()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <p>💡 Mention agents with @ for sequential discussion</p>
            <span className="text-xs">
              {inputMessage.length}/500 characters
            </span>
          </div>
          {discussionState.isActive && (
            <p className="text-blue-600 mt-1">
              🔄 Sequential discussion in progress - please wait for all agents to respond
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
