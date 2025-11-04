# Agents Interface Design

## 🤖 Agent Management UI

### Agent Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ [Discux3 Logo] 🤖 [Agents] 💬 [Chat] ⚙️ [Settings] [👤User] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  My Agents (3/5)                    [+ Create New Agent] │
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ 🚀 Startup  │ │ 💡 Marketing│ │ 📊 Data     │         │
│ │ Advisor     │ │ Expert      │ │ Analyst     │         │
│ │             │ │             │ │             │         │
│ │ Professional │ │ Creative    │ │ Analytical  │         │
│ │ 125 uses    │ │ 89 uses     │ │ 156 uses    │         │
│ │ ⭐⭐⭐⭐⭐     │ │ ⭐⭐⭐⭐      │ │ ⭐⭐⭐⭐⭐     │         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                         │
│  Public Marketplace                                    │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐         │
│ │ 🎯 Product  │ │ 💰 Finance  │ │ 🔧 Tech      │         │
│ │ Manager     │ │ Advisor     │ │ Support     │         │
│ │             │ │             │ │             │         │
│ │ Direct      │ │ Professional│ │ Friendly    │         │
│ │ 1.2k uses   │ │ 890 uses    │ │ 2.3k uses   │         │
│ │ ⭐⭐⭐⭐⭐     │ │ ⭐⭐⭐⭐⭐     │ │ ⭐⭐⭐⭐      │         │
│ └─────────────┘ └─────────────┘ └─────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🎴 Agent Card Component

### Agent Card Design
```typescript
// components/agents/agent-card.tsx
interface AgentCardProps {
  agent: Agent;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onUse?: () => void;
}

export function AgentCard({ agent, isOwn, onEdit, onDelete, onUse }: AgentCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full text-2xl",
                "border-2"
              )}
              style={{ borderColor: agent.color }}
            >
              {agent.emoji}
            </div>

            {/* Info */}
            <div>
              <h3 className="font-semibold">{agent.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {agent.style}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          {isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="pb-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {agent.prompt}
        </p>
      </CardContent>

      {/* Footer */}
      <CardFooter className="pt-0">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {agent.usage_count} uses
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              {getAgentRating(agent)}
            </span>
          </div>

          <Button
            size="sm"
            onClick={onUse}
            className="gap-1"
          >
            <MessageCircle className="h-3 w-3" />
            Use
          </Button>
        </div>
      </CardFooter>

      {/* Public Badge */}
      {!isOwn && agent.is_public && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs">
            <Globe className="mr-1 h-3 w-3" />
            Public
          </Badge>
        </div>
      )}
    </Card>
  );
}

function getAgentRating(agent: Agent): string {
  // Calculate rating based on usage and feedback
  const baseRating = Math.min(5, Math.floor(agent.usage_count / 50) + 3);
  return '⭐'.repeat(baseRating);
}
```

## 📋 Agent Grid Layout

### Agent Grid Component
```typescript
// components/agents/agent-grid.tsx
interface AgentGridProps {
  agents: Agent[];
  title: string;
  showCreateButton?: boolean;
  emptyMessage?: string;
}

export function AgentGrid({
  agents,
  title,
  showCreateButton = false,
  emptyMessage = "No agents found"
}: AgentGridProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showCreateButton && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Agent
          </Button>
        )}
      </div>

      {/* Grid */}
      {agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isOwn={agent.created_by === currentUserId}
              onEdit={() => handleEditAgent(agent)}
              onDelete={() => handleDeleteAgent(agent)}
              onUse={() => handleUseAgent(agent)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-semibold">{emptyMessage}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {showCreateButton
              ? "Create your first agent to get started"
              : "Check back later for new agents"
            }
          </p>
          {showCreateButton && (
            <Button className="mt-4" onClick={handleCreateAgent}>
              <Plus className="mr-2 h-4 w-4" />
              Create Agent
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
```

## ➕ Create Agent Modal

### Agent Creation Form
```typescript
// components/agents/create-agent-modal.tsx
export function CreateAgentModal({ isOpen, onClose }: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    emoji: '🤖',
    color: '#3b82f6',
    style: 'professional' as const,
    is_public: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Create agent logic
    await createAgent(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Design an AI agent with specific expertise and personality.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                placeholder="e.g., Startup Advisor"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select
                value={formData.style}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, style: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="analytical">Analytical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Avatar Selection */}
          <div className="space-y-2">
            <Label>Avatar & Color</Label>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {POPULAR_EMOJIS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant={formData.emoji === emoji ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                {AGENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "h-6 w-6 rounded-full border-2",
                      formData.color === color && "ring-2 ring-offset-2"
                    )}
                    style={{
                      backgroundColor: color,
                      borderColor: formData.color === color ? color : 'transparent'
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">System Prompt</Label>
            <Textarea
              id="prompt"
              placeholder="Describe your agent's expertise, personality, and how they should respond..."
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              rows={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              This defines how your agent thinks and responds. Be specific about their expertise area.
            </p>
          </div>

          {/* Visibility */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="public"
              checked={formData.is_public}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, is_public: !!checked }))
              }
            />
            <Label htmlFor="public">Make this agent public</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || !formData.prompt}>
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const POPULAR_EMOJIS = ['🤖', '🚀', '💡', '📊', '🎯', '💰', '🔧', '🎨', '📈', '🔬'];
const AGENT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
```

## 🧪 Agent Testing Interface

### Test Agent Component
```typescript
// components/agents/test-agent.tsx
export function TestAgent({ agent }: { agent: Agent }) {
  const [testMessage, setTestMessage] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!testMessage.trim()) return;

    setIsLoading(true);
    try {
      const result = await testAgentResponse(agent.id, testMessage);
      setResponse(result);
    } catch (error) {
      setResponse('Error: Failed to get response from agent');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flask className="h-5 w-5" />
          Test {agent.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Label htmlFor="test-message">Test Message</Label>
          <Textarea
            id="test-message"
            placeholder="Type a message to test how this agent responds..."
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={handleTest}
          disabled={!testMessage.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Test Response
            </>
          )}
        </Button>

        {/* Response */}
        {response && (
          <div className="space-y-2">
            <Label>Agent Response</Label>
            <div className="rounded-md border p-3">
              <p className="text-sm">{response}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

## 📊 Agent Analytics Dashboard

### Usage Statistics Component
```typescript
// components/agents/agent-analytics.tsx
export function AgentAnalytics({ agent }: { agent: Agent }) {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadAgentAnalytics(agent.id).then(setAnalytics);
  }, [agent.id]);

  if (!analytics) return <div>Loading analytics...</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Total Uses</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{analytics.totalUses}</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Avg Response</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{analytics.avgResponseTime}s</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">Rating</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{analytics.rating}/5</div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Unique Users</span>
          </div>
          <div className="mt-1 text-2xl font-bold">{analytics.uniqueUsers}</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

**Related Files:**
- [Design System](./design-system.md) - Design principles and theming
- [Chat Interface](./chat-interface.md) - Chat UI components and patterns
- [Responsive Design](./responsive-design.md) - Mobile and responsive layouts