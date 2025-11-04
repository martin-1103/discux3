import { Suspense } from "react"
import { Bot, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AITestingPanel } from "@/components/ai/AITestingPanel"
import { getCurrentUser } from "@/lib/session"
import { redirect } from "next/navigation"

export const metadata = {
  title: "AI Testing | Discux3",
  description: "Test and configure AI agent integration",
}

export default async function AITestingPage() {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8" />
          AI Integration Testing
        </h1>
        <p className="text-muted-foreground mt-2">
          Test your AI agent integration and verify Z.ai API connectivity
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Info Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Integration Status
              </CardTitle>
              <CardDescription>
                Current AI integration setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">API Provider</p>
                  <p className="text-xs text-muted-foreground">Z.ai</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Default Model</p>
                  <p className="text-xs text-muted-foreground">GLM-4.5 Flash</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Integration Type</p>
                  <p className="text-xs text-muted-foreground">REST API</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Features</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                    <li>Agent-specific responses</li>
                    <li>Style-based personality</li>
                    <li>Conversation context</li>
                    <li>Batch processing</li>
                    <li>Error handling</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Setup Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Z.ai API Key</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Environment variables</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Agent configuration</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Testing Panel */}
        <div className="lg:col-span-3">
          <Suspense fallback={<div>Loading AI Testing Panel...</div>}>
            <AITestingPanel />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
