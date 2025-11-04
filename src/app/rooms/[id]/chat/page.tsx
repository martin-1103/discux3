import { notFound, redirect } from "next/navigation"
import { ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChatInterface } from "@/components/chat/ChatInterface"
import { getRoom } from "@/lib/actions/rooms"
import { getCurrentUser } from "@/lib/session"

interface ChatPageProps {
  params: {
    id: string
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect("/login")
  }

  const result = await getRoom(params.id, user.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const room = result.data

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/rooms/${params.id}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{room.name}</h1>
              <p className="text-sm text-muted-foreground">
                {room._count.participants} participants, {room._count.agents} agents
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/rooms/${params.id}`}>
                <Settings className="h-4 w-4 mr-2" />
                Room Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface 
          roomId={params.id} 
          room={room}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
