# Responsive Design

## 📱 Mobile-First Approach

### Breakpoint System
```typescript
const breakpoints = {
  sm: '640px',   // Small tablets and large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops and large tablets
  xl: '1280px',  // Desktops
  '2xl': '1536px' // Large desktops
}
```

### Mobile Layout Strategy
- **Primary**: Mobile-first design (320px+)
- **Progressive Enhancement**: Add features for larger screens
- **Touch-Friendly**: Minimum 44px tap targets
- **Single Column**: Default mobile layout
- **Navigation**: Bottom navigation on mobile

## 📲 Mobile Chat Interface

### Mobile Chat Layout
```
┌─────────────────────────┐
│ ☰ Discux3        [👤] │ ← Mobile Header
├─────────────────────────┤
│ 📋 Strategy Discussion  │ ← Room selector
│ [🔍]                   │
├─────────────────────────┤
│                         │
│      Messages           │
│                         │
│ ┌─ 👤 John • 2m ─────┐  │
│ │ @all pivot startup? │  │
│ └─────────────────────┘  │
│                         │
│ ┌─ 🚀 Advisor • 1m ──┐  │
│ │ Analyze market fit │  │
│ └─────────────────────┘  │
│                         │
├─────────────────────────┤
│ 🤖📊🎯 [@advisor...]     │ ← Agent chips
│ Type your message...     │ ← Input
│ [📎] [Send]            │
├─────────────────────────┤
│ [💬] [🤖] [⚙️] [🏠]    │ ← Bottom nav
└─────────────────────────┘
```

### Mobile Chat Component
```typescript
// components/mobile/mobile-chat-layout.tsx
export function MobileChatLayout() {
  return (
    <div className="flex h-screen flex-col">
      {/* Mobile Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold">Discux3</h1>
            <p className="text-xs text-muted-foreground">AI-powered chat</p>
          </div>
        </div>
        <UserButton />
      </header>

      {/* Room Selector */}
      <div className="border-b px-4 py-3">
        <MobileRoomSelector />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MobileMessageList />
      </div>

      {/* Input Area */}
      <div className="border-t bg-background">
        <MobileMessageInput />
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
```

### Mobile Message List
```typescript
// components/mobile/mobile-message-list.tsx
export function MobileMessageList() {
  const { messages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-4 flex gap-3",
              message.type === 'user' && "flex-row-reverse"
            )}
          >
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {message.type === 'agent' ? message.agent_emoji : "👤"}
            </div>

            {/* Message Content */}
            <div className={cn(
              "max-w-[70%]",
              message.type === 'user' && "text-right"
            )}>
              {/* Sender Info */}
              <div className="mb-1 text-xs text-muted-foreground">
                {message.type === 'user' ? "You" : message.sender_name}
              </div>

              {/* Message Bubble */}
              <div className={cn(
                "rounded-2xl px-4 py-2 text-sm",
                message.type === 'user'
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted rounded-bl-md"
              )}>
                <p className="whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              </div>

              {/* Timestamp */}
              <div className="mt-1 text-xs text-muted-foreground">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <MobileTypingIndicator />
    </div>
  );
}
```

### Mobile Input Component
```typescript
// components/mobile/mobile-message-input.tsx
export function MobileMessageInput() {
  const [input, setInput] = useState("");
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  return (
    <div className="px-4 py-3">
      {/* Mention Suggestions */}
      {showMentionSuggestions && (
        <div className="mb-2 rounded-lg border bg-popover p-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Mention agents
          </div>
          {/* Agent suggestions */}
        </div>
      )}

      {/* Active Agents */}
      <div className="mb-2 flex flex-wrap gap-1">
        {/* Agent chips */}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="min-h-[44px] resize-none rounded-2xl border-none bg-muted px-4 py-3 text-base"
            rows={1}
            style={{
              maxHeight: '120px',
              resize: 'none'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button size="icon" className="h-10 w-10">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

## 🗂️ Mobile Agent Management

### Mobile Agent Grid
```typescript
// components/mobile/mobile-agent-grid.tsx
export function MobileAgentGrid({ agents }: { agents: Agent[] }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4">
        <h2 className="text-lg font-semibold">My Agents</h2>
        <p className="text-sm text-muted-foreground">
          Manage your AI assistants
        </p>
      </div>

      {/* Agent Cards */}
      <div className="px-4 space-y-3">
        {agents.map((agent) => (
          <MobileAgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Create Button */}
      <div className="px-4">
        <Button className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Create New Agent
        </Button>
      </div>
    </div>
  );
}

// components/mobile/mobile-agent-card.tsx
export function MobileAgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl"
            style={{ backgroundColor: agent.color + '20', borderColor: agent.color }}
          >
            {agent.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold truncate">{agent.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {agent.style}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {agent.prompt}
            </p>

            {/* Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {agent.usage_count}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  4.5
                </span>
              </div>

              <Button size="sm" className="gap-1">
                <MessageCircle className="h-3 w-3" />
                Use
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## 🎯 Touch-Friendly Interactions

### Touch Target Guidelines
```typescript
// Minimum touch target sizes
const touchTargets = {
  button: 'min-h-[44px] min-w-[44px]',    // iOS HIG minimum
  iconButton: 'h-12 w-12',                // Larger for easier touch
  chip: 'h-8 px-3',                      // Filter chips
  link: 'py-2 px-3',                     // Text links
  card: 'p-4',                          // Card interactions
}

// Touch-friendly spacing
const touchSpacing = {
  tight: 'gap-2',      // 8px
  normal: 'gap-3',     // 12px
  comfortable: 'gap-4', // 16px
  generous: 'gap-6'    // 24px
}
```

### Swipe Gestures
```typescript
// components/mobile/swable-message.tsx
export function SwipeableMessage({ message, onReply, onDelete }: {
  message: Message;
  onReply: () => void;
  onDelete: () => void;
}) {
  const [dragOffset, setDragOffset] = useState(0);
  const maxSwipe = 100;

  return (
    <div className="relative overflow-hidden">
      {/* Action Background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center px-4 bg-red-500"
        style={{
          width: `${Math.max(0, -dragOffset)}px`
        }}
      >
        <Trash className="h-5 w-5 text-white" />
      </div>

      {/* Message Content */}
      <div
        className="bg-background transition-transform"
        style={{
          transform: `translateX(${dragOffset}px)`
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <MessageCard message={message} />
      </div>
    </div>
  );

  function handleTouchMove(e: React.TouchEvent) {
    const touch = e.touches[0];
    const offset = touch.clientX - e.currentTarget.getBoundingClientRect().left;
    setDragOffset(Math.max(-maxSwipe, Math.min(0, offset - 50)));
  }

  function handleTouchEnd() {
    if (dragOffset < -maxSwipe * 0.7) {
      onDelete();
    } else {
      setDragOffset(0);
    }
  }
}
```

## 📐 Responsive Utilities

### Responsive Container
```typescript
// components/responsive/responsive-container.tsx
export function ResponsiveContainer({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "container mx-auto px-4 sm:px-6 lg:px-8",
      className
    )}>
      {children}
    </div>
  );
}
```

### Adaptive Grid
```typescript
// components/responsive/adaptive-grid.tsx
interface AdaptiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
}

export function AdaptiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "gap-4"
}: AdaptiveGridProps) {
  return (
    <div className={cn(
      "grid",
      gap,
      `grid-cols-${cols.mobile}`,
      cols.tablet && `md:grid-cols-${cols.tablet}`,
      cols.desktop && `lg:grid-cols-${cols.desktop}`
    )}>
      {children}
    </div>
  );
}
```

### Responsive Typography
```typescript
// components/responsive/responsive-text.tsx
export function ResponsiveText({
  children,
  variant = "body",
  className
}: {
  children: React.ReactNode;
  variant?: "heading" | "subheading" | "body" | "caption";
  className?: string;
}) {
  const variants = {
    heading: "text-xl sm:text-2xl lg:text-3xl font-bold",
    subheading: "text-lg sm:text-xl lg:text-2xl font-semibold",
    body: "text-sm sm:text-base",
    caption: "text-xs sm:text-sm text-muted-foreground"
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}
```

## 🔄 Adaptive Components

### Adaptive Navigation
```typescript
// components/responsive/adaptive-navigation.tsx
export function AdaptiveNavigation() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <MobileBottomNav />;
  }

  return <DesktopNavigation />;
}

// Mobile Bottom Navigation
function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
      <div className="grid grid-cols-4 h-16">
        {[
          { icon: MessageSquare, label: "Chat", href: "/chat" },
          { icon: Bot, label: "Agents", href: "/agents" },
          { icon: Settings, label: "Settings", href: "/settings" },
          { icon: Home, label: "Home", href: "/" }
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 text-xs"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

### Adaptive Layout
```typescript
// components/responsive/adaptive-layout.tsx
export function AdaptiveLayout({ children }: {
  children: React.ReactNode;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <div className="min-h-screen">
        <div className="pb-16"> {/* Account for bottom nav */}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
```

## ♿ Accessibility Considerations

### Mobile Accessibility
- **Minimum Touch Targets**: 44x44px minimum
- **Focus Management**: Visible focus indicators
- **Screen Reader**: Proper ARIA labels
- **Voice Control**: Actionable elements labeled
- **High Contrast**: Support for high contrast mode

### Responsive Accessibility
```typescript
// Responsive focus indicators
const focusStyles = {
  mobile: "focus:ring-2 focus:ring-offset-2",
  desktop: "focus:ring-2 focus:ring-offset-4"
}

// Reduced motion support
const motionPreferences = {
  respectReducedMotion: "motion-reduce:transition-none motion-reduce:animate-none"
}
```

---

**Related Files:**
- [Design System](./design-system.md) - Design principles and theming
- [Chat Interface](./chat-interface.md) - Chat UI components and patterns
- [Agents Interface](./agents-interface.md) - Agent management UI design