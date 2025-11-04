# Chat Interface Design

## 🎯 Layout Architecture

### Global Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header Navigation                                        │
│ [Discux3 Logo] 💬 [Chat] 🤖 [Agents] ⚙️ [Settings] [👤User] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                 Page Content Area                       │
│                                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Header Navigation Component
```typescript
// components/navigation.tsx
export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span className="font-bold">Discux3</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/chat"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/chat" ? "text-foreground" : "text-foreground/60"
              )}
            >
              💬 Chat
            </Link>
            <Link
              href="/agents"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/agents" ? "text-foreground" : "text-foreground/60"
              )}
            >
              🤖 Agents
            </Link>
            <Link
              href="/settings"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/settings" ? "text-foreground" : "text-foreground/60"
              )}
            >
              ⚙️ Settings
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
```

## 💬 Chat Page Layout

### Chat Interface Structure
```
┌─────────────────────────────────────────────────────────┐
│ [Discux3 Logo] 📋 [Strategy Discussion ▼]  [🔍] [👤User] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Messages Area                              │
│                                                         │
│ ┌─ 👤 John • 2 min ago ─────────────┐                   │
│ │ @all Should we pivot our startup? │                   │
│ └───────────────────────────────────┘                   │
│                                                         │
│ ┌─ 🚀 Startup Advisor • 1 min ago ───┐                │
│ │ I'd suggest analyzing market fit first. Let me... │    │
│ └───────────────────────────────────┘                   │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 🤖 📊 🎯 📈 [@startup advisor...] [📎] [Send]          │
│ Type your message...                                      │
└─────────────────────────────────────────────────────────┘
```

### Chat Layout Component
```typescript
// components/chat/chat-layout.tsx
export function ChatLayout() {
  return (
    <div className="flex h-screen flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="text-xs">
            📋 Strategy Discussion
          </Badge>
          <Button variant="ghost" size="sm">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4" />
          </Button>
          <InviteButton room_id={currentRoom.id} />
          <Button variant="ghost" size="sm">
            <Users className="h-4 w-4" />
          </Button>
          <UserButton />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <MessageInput />
      </div>
    </div>
  );
}
```

## 📝 Message Components

### Message Card Design
```typescript
// components/chat/message-card.tsx
interface MessageCardProps {
  message: Message;
  isOwn?: boolean;
  isAgent?: boolean;
}

export function MessageCard({ message, isOwn, isAgent }: MessageCardProps) {
  return (
    <div className={cn(
      "flex gap-3 p-4",
      isOwn && "flex-row-reverse",
      isAgent && "bg-muted/50"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isAgent ? message.agent_emoji : "👤"}
      </div>

      {/* Message Content */}
      <div className={cn(
        "max-w-xs lg:max-w-md",
        isOwn && "text-right"
      )}>
        {/* Sender Info */}
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {isOwn ? "You" : message.sender_name}
          </span>
          {isAgent && (
            <Badge variant="secondary" className="text-xs">
              {message.sender_name}
            </Badge>
          )}
          <span>•</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        {/* Message Bubble */}
        <div className={cn(
          "rounded-lg px-3 py-2",
          isOwn
            ? "bg-primary text-primary-foreground ml-auto"
            : "bg-muted",
          isAgent && "border-l-4 border-primary"
        )}>
          <p className="text-sm whitespace-pre-wrap">
            {message.content}
          </p>
        </div>

        {/* Agent Confidence */}
        {isAgent && message.agent_confidence && (
          <div className="mt-1 text-xs text-muted-foreground">
            Confidence: {Math.round(message.agent_confidence * 100)}%
            {message.processing_time && ` • ${message.processing_time}s`}
          </div>
        )}

        {/* Message Mentions */}
        {message.mentions && message.mentions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.mentions.map((mention) => (
              <Badge key={mention.id} variant="outline" className="text-xs">
                @{mention.agent_name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Message List Component
```typescript
// components/chat/message-list.tsx
export function MessageList() {
  const { messages, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold">No messages yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a conversation with @all or mention specific agents
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                isOwn={message.type === 'user'}
                isAgent={message.type === 'agent'}
              />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">
            Agents are thinking...
          </span>
        </div>
      )}
    </div>
  );
}
```

## ⌨️ Message Input Component

### Enhanced Input with Mentions
```typescript
// components/chat/message-input.tsx
export function MessageInput() {
  const [input, setInput] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const { agents, sendMessage } = useChat();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Detect @ mentions
    const mentionMatch = value.match(/@(\w*)$/);
    if (mentionMatch) {
      const query = mentionMatch[1];
      setShowMentionSuggestions(query.length > 0);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const handleMentionSelect = (agent: Agent) => {
    const newInput = input.replace(/@\w*$/, `@${agent.name} `);
    setInput(newInput);
    setMentions([...mentions, agent.id]);
    setShowMentionSuggestions(false);
  };

  const handleSend = () => {
    if (input.trim()) {
      sendMessage({
        content: input.trim(),
        mentions
      });
      setInput("");
      setMentions([]);
    }
  };

  return (
    <div className="relative">
      {/* Mention Suggestions */}
      {showMentionSuggestions && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-md border bg-popover p-1 shadow-md">
          {agents
            .filter(agent =>
              agent.name.toLowerCase().includes(input.match(/@(\w*)$/)?.[1]?.toLowerCase() || "")
            )
            .map((agent) => (
              <button
                key={agent.id}
                className="flex w-full items-center gap-2 rounded-sm p-2 text-left hover:bg-accent"
                onClick={() => handleMentionSelect(agent)}
              >
                <span className="text-lg">{agent.emoji}</span>
                <div>
                  <div className="text-sm font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {agent.style}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Active Agents */}
        <div className="flex items-center gap-1">
          {mentions.map((agentId) => {
            const agent = agents.find(a => a.id === agentId);
            return agent ? (
              <Badge key={agentId} variant="secondary" className="text-xs">
                {agent.emoji} {agent.name}
              </Badge>
            ) : null;
          })}
        </div>

        {/* Text Input */}
        <div className="flex-1">
          <Textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message... (@ to mention agents)"
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <Button variant="outline" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button onClick={handleSend} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## 🏷️ Room Selector Component

### Room Dropdown with Status
```typescript
// components/chat/room-selector.tsx
export function RoomSelector() {
  const { rooms, currentRoom, switchRoom } = useChat();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Badge variant="secondary" className="text-xs">
            📋
          </Badge>
          <span className="truncate max-w-[200px]">
            {currentRoom?.name || "Select Room"}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel>Your Rooms</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {rooms.map((room) => (
          <DropdownMenuItem
            key={room.id}
            onClick={() => switchRoom(room.id)}
            className={cn(
              "flex items-center gap-2 p-2",
              currentRoom?.id === room.id && "bg-accent"
            )}
          >
            <div className="flex-1">
              <div className="font-medium">{room.name}</div>
              <div className="text-xs text-muted-foreground">
                {room.participants?.length} participants •
                {room.agents?.length} agents
              </div>
            </div>
            {room.is_active && (
              <div className="h-2 w-2 rounded-full bg-green-500" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="mr-2 h-4 w-4" />
          Create New Room
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

## 🎯 Typing Indicators

### Typing Status Component
```typescript
// components/chat/typing-indicator.tsx
export function TypingIndicator() {
  const { typingAgents } = useChat();

  if (typingAgents.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-current" />
      </div>

      <span>
        {typingAgents.length === 1
          ? `${typingAgents[0].name} is typing...`
          : `${typingAgents.map(a => a.name).join(", ")} are typing...`
        }
      </span>
    </div>
  );
}
```

## 🎟️ Invitation UI Components

### Invite Button Component
```typescript
// components/chat/invite-button.tsx
interface InviteButtonProps {
  room_id: string;
}

export function InviteButton({ room_id }: InviteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [invitation, setInvitation] = useState<RoomInvitation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { createInvitation } = useInvitations();

  const handleGenerateInvitation = async () => {
    setIsGenerating(true);
    try {
      const newInvitation = await createInvitation({ room_id });
      setInvitation(newInvitation);
    } catch (error) {
      console.error('Failed to generate invitation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (invitation?.invitation_url) {
      await navigator.clipboard.writeText(invitation.invitation_url);
      // Show toast notification
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Room</DialogTitle>
          <DialogDescription>
            Generate a shareable link to invite others to this room
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!invitation ? (
            <Button
              onClick={handleGenerateInvitation}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Generate Invitation Link
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Link className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {invitation.invitation_url}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {formatTime(invitation.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  onClick={() => setInvitation(null)}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Invitation Landing Page
```typescript
// pages/invite/[token].tsx
export function InvitationLandingPage() {
  const { token } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { joinViaInvitation } = useInvitations();

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async () => {
    try {
      // Validate invitation token and get room info
      const response = await fetch(`/api/invitations/${token}/validate`);
      const data = await response.json();

      if (response.ok) {
        setRoom(data.room);
      } else {
        setError(data.error || 'Invalid invitation');
      }
    } catch (err) {
      setError('Failed to validate invitation');
    }
  };

  const handleJoinRoom = async () => {
    if (!user) {
      // Redirect to login with invitation return URL
      router.push(`/login?returnUrl=/invite/${token}`);
      return;
    }

    setIsLoading(true);
    try {
      await joinViaInvitation(token, user.id);
      router.push(`/chat?room=${room?.id}`);
    } catch (err) {
      setError('Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Invalid Invitation</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-6 p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary rounded-full flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>

          <h1 className="mt-4 text-2xl font-bold">
            You're Invited to Join
          </h1>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h2 className="font-semibold">{room.name}</h2>
            {room.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {room.description}
              </p>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              {room.participants?.length} participants • {room.agents?.length} agents
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {user ? (
            <Button
              onClick={handleJoinRoom}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Room...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Join Room as {user.name}
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                asChild
                className="w-full"
              >
                <Link href={`/login?returnUrl=/invite/${token}`}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login to Join
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <Link href={`/register?returnUrl=/invite/${token}`}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account to Join
                </Link>
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          This invitation link will give you access to join the room and participate in the discussion.
        </p>
      </div>
    </div>
  );
}
```

### Room Invitations Management
```typescript
// components/chat/room-invitations.tsx
export function RoomInvitations({ room_id }: { room_id: string }) {
  const { invitations, deleteInvitation } = useInvitations();
  const roomInvitations = invitations.filter(inv => inv.room_id === room_id);

  if (roomInvitations.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">No active invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roomInvitations.map((invitation) => (
        <div key={invitation.id} className="flex items-center gap-2 p-2 border rounded">
          <Link className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {invitation.invitation_url}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Created {formatTime(invitation.created_at)}</span>
              {invitation.expires_at && (
                <>
                  <span>•</span>
                  <span>Expires {formatTime(invitation.expires_at)}</span>
                </>
              )}
              {invitation.used_at && (
                <>
                  <span>•</span>
                  <span className="text-green-600">Used</span>
                </>
              )}
            </div>
          </div>

          {!invitation.used_at && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteInvitation(invitation.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Invitation Hooks
```typescript
// hooks/use-invitations.ts
export function useInvitations() {
  const [invitations, setInvitations] = useState<RoomInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const createInvitation = async ({ room_id, email, expires_at }: {
    room_id: string;
    email?: string;
    expires_at?: Date;
  }) => {
    const response = await fetch(`/api/rooms/${room_id}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, expires_at }),
    });

    if (!response.ok) {
      throw new Error('Failed to create invitation');
    }

    const newInvitation = await response.json();
    setInvitations(prev => [...prev, newInvitation]);
    return newInvitation;
  };

  const joinViaInvitation = async (token: string, userId: string) => {
    const response = await fetch(`/api/invitations/${token}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to join via invitation');
    }

    return response.json();
  };

  const deleteInvitation = async (invitationId: string) => {
    const response = await fetch(`/api/invitations/${invitationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete invitation');
    }

    setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  return {
    invitations,
    isLoading,
    createInvitation,
    joinViaInvitation,
    deleteInvitation,
  };
}
```

---

**Related Files:**
- [Design System](./design-system.md) - Design principles and theming
- [Agents Interface](./agents-interface.md) - Agent management UI design
- [Responsive Design](./responsive-design.md) - Mobile and responsive layouts