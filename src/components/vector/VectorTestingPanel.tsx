"use client"

import { useState, useEffect } from "react"
import { Database, Search, Activity, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { testVectorDatabase, getVectorDatabaseStats } from "@/lib/actions/ai"
import { useSession } from "next-auth/react"

export function VectorTestingPanel() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isTestRunning, setIsTestRunning] = useState(false)
  
  // Test results
  const [setupTest, setSetupTest] = useState<any>(null)
  const [contextTest, setContextTest] = useState<any>(null)
  const [historyTest, setHistoryTest] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  
  // Form inputs
  const [testRoomId, setTestRoomId] = useState("")
  const [testQuery, setTestQuery] = useState("")
  
  const runSetupTest = async () => {
    setIsLoading(true)
    setSetupTest(null)
    
    try {
      const result = await testVectorDatabase()
      setSetupTest(result)
    } catch (error) {
      setSetupTest({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const runContextTest = async () => {
    if (!testRoomId || !testQuery.trim()) return
    
    setIsTestRunning(true)
    setContextTest(null)
    
    try {
      // For now, simulate context test since we don't have the specific function
      const vectorStore = await import("@/lib/vector-store").then(m => m.getVectorStore())
      const context = await vectorStore.getRelevantContext(testRoomId, testQuery, 3)
      
      setContextTest({
        success: true,
        data: {
          contextCount: context.length,
          context: context.map((ctx: any, index: number) => ({
            rank: index + 1,
            author: ctx.author_name,
            content: ctx.content,
            score: ctx.score,
            timestamp: ctx.timestamp
          }))
        }
      })
    } catch (error) {
      setContextTest({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsTestRunning(false)
    }
  }
  
  const runHistoryTest = async () => {
    if (!testRoomId) return
    
    setIsTestRunning(true)
    setHistoryTest(null)
    
    try {
      // For now, simulate history test since we don't have the specific function
      const vectorStore = await import("@/lib/vector-store").then(m => m.getVectorStore())
      const history = await vectorStore.getConversationHistory(testRoomId, 5)
      
      setHistoryTest({
        success: true,
        data: {
          messageCount: history.length,
          history: history.map((msg: any, index: number) => ({
            sequence: index + 1,
            author: msg.author_name,
            content: msg.content,
            type: msg.message_type,
            timestamp: msg.timestamp
          }))
        }
      })
    } catch (error) {
      setHistoryTest({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsTestRunning(false)
    }
  }
  
  const loadStats = async () => {
    try {
      const result = await getVectorDatabaseStats()
      setStats(result)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }
  
  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [])
  
  return (
    <div className="space-y-6">
      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Vector Database Setup
          </CardTitle>
          <CardDescription>
            Test Qdrant connection and embedding service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Vector Database Status</p>
              {setupTest ? (
                <span className={`flex items-center gap-1 ${
                  setupTest.success ? "text-green-600" : "text-red-600"
                }`}>
                  {setupTest.success ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {setupTest.success ? "Connected" : "Failed"}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Click test to verify connection
                </span>
              )}
            </div>
            
            <Button
              onClick={runSetupTest}
              disabled={isLoading}
              variant={setupTest?.success ? "outline" : "default"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Setup"
              )}
            </Button>
          </div>

          {setupTest?.success && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-2">Setup Results:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>✅ {setupTest.message}</p>
                <p>📊 Google Gemini embeddings connected</p>
                <p>✅ Embedding Dimensions: 768 (text-embedding-004)</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Retrieval Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Context Retrieval Testing
          </CardTitle>
          <CardDescription>
            Test semantic search and context retrieval
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room ID</label>
              <Input
                value={testRoomId}
                onChange={(e) => setTestRoomId(e.target.value)}
                placeholder="Enter room ID..."
                disabled={!session?.user?.id}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Test Query</label>
              <Textarea
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                placeholder="Enter a query to test context retrieval..."
                rows={3}
                disabled={!testRoomId}
              />
            </div>
          </div>
          
          <Button
            onClick={runContextTest}
            disabled={!testRoomId || !testQuery.trim() || isTestRunning}
            className="w-full"
          >
            {isTestRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrieving Context...
              </>
            ) : (
              "Test Context Retrieval"
            )}
          </Button>

          {contextTest?.success && (
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">
                Found {contextTest.data.contextCount} relevant messages:
              </p>
              <div className="space-y-2">
                {contextTest.data.context.map((ctx: any, index: number) => (
                  <div key={index} className="p-2 bg-muted rounded text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">#{ctx.rank} {ctx.author}</span>
                      <Badge variant="outline" className="text-xs">
                        Score: {ctx.score.toFixed(3)}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{ctx.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ctx.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation History Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Conversation History Testing
          </CardTitle>
          <CardDescription>
            Test conversation history retrieval for rooms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Room ID</label>
            <Input
              value={testRoomId}
              onChange={(e) => setTestRoomId(e.target.value)}
              placeholder="Enter room ID..."
              disabled={!session?.user?.id}
            />
          </div>
          
          <Button
            onClick={runHistoryTest}
            disabled={!testRoomId || isTestRunning}
            className="w-full"
          >
            {isTestRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrieving History...
              </>
            ) : (
              "Test History Retrieval"
            )}
          </Button>

          {historyTest?.success && (
            <div className="space-y-4 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">
                Recent {historyTest.data.messageCount} messages:
              </p>
              <div className="space-y-2">
                {historyTest.data.history.map((msg: any, index: number) => (
                  <div key={index} className="p-2 bg-muted rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">#{msg.sequence} {msg.author}</span>
                      <Badge variant="outline" className="text-xs">
                        {msg.type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{msg.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats?.success && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Vector Database Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.data.total_points}</p>
                <p className="text-xs text-muted-foreground">Total Vectors</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.data.enabled ? "Yes" : "No"}</p>
                <p className="text-xs text-muted-foreground">Enabled</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.data.collection}</p>
                <p className="text-xs text-muted-foreground">Collection</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">768</p>
                <p className="text-xs text-muted-foreground">Dimensions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Testing Guide */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Testing Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Setup Test:</strong> Verifies Qdrant connection and Google Gemini embeddings</p>
            <p><strong>2. Context Test:</strong> Tests semantic search with sample query</p>
            <p><strong>3. History Test:</strong> Retrieves conversation chronology</p>
            <p><strong>4. Real Integration:</strong> AI agents will use this context automatically!</p>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-xs font-medium text-blue-900">
              💡 <strong>Next Step:</strong> Test vector database, then try chatting with agents to see context in action!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
