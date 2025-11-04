import { Suspense } from "react"
import { Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VectorTestingPanel } from "@/components/vector/VectorTestingPanel"
import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Vector Database Testing | Discux3",
  description: "Test and configure vector database for AI agent memory",
}

export default async function VectorTestingPage() {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Database className="h-8 w-8" />
          Vector Database Testing
        </h1>
        <p className="text-muted-foreground mt-2">
          Test Qdrant vector database and Google Gemini embeddings for AI agent memory
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Info Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Vector Integration
              </CardTitle>
              <CardDescription>
                Current vector database setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Database</p>
                  <p className="text-xs text-muted-foreground">Qdrant</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Embeddings</p>
                  <p className="text-xs text-muted-foreground">Google Gemini text-embedding-004</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Dimensions</p>
                  <p className="text-xs text-muted-foreground">768</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Purpose</p>
                  <p className="text-xs text-muted-foreground">Agent memory & context</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Message Storage</p>
                    <p className="text-muted-foreground">Every chat message is converted to vector embeddings</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Semantic Search</p>
                    <p className="text-muted-foreground">AI agents find relevant context from past conversations</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Enhanced Responses</p>
                    <p className="text-muted-foreground">AI responses include conversation context and author awareness</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium">Author Recognition</p>
                    <p className="text-muted-foreground">AI remembers who said what in conversations</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Testing Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border rounded-full border-gray-300"></div>
                  <span>Qdrant connection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border rounded-full border-gray-300"></div>
                  <span>Google Gemini embeddings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border rounded-full border-gray-300"></div>
                  <span>Vector collection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border rounded-full border-gray-300"></div>
                  <span>Context retrieval</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border rounded-full border-gray-300"></div>
                  <span>History tracking</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Testing Panel */}
        <div className="lg:col-span-3">
          <Suspense fallback={<div>Loading Vector Testing Panel...</div>}>
            <VectorTestingPanel />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
