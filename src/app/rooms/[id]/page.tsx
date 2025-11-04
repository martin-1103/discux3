import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RoomDetails } from "@/components/rooms/RoomDetails"
import { getRoom } from "@/lib/actions/rooms"
import { getCurrentUser } from "@/lib/session"

interface RoomPageProps {
  params: {
    id: string
  }
}

export default async function RoomPage({ params }: RoomPageProps) {
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/rooms">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rooms
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{room.name}</h1>
            <p className="text-muted-foreground mt-2">
              {room.description || "Collaboration space for your team"}
            </p>
          </div>
          <Button asChild>
            <Link href={`/rooms/${room.id}/chat`}>
              Enter Chat
            </Link>
          </Button>
        </div>
      </div>

      <RoomDetails room={room} currentUserId={user.id} />
    </div>
  )
}
