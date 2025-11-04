import { RoomCreateForm } from "@/components/rooms/RoomCreateForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Create Room | Discux3",
  description: "Create a new collaboration room",
}

export default function CreateRoomPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/rooms">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rooms
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Room</h1>
        <p className="text-muted-foreground mt-2">
          Set up a collaboration space for your team
        </p>
      </div>

      <RoomCreateForm />
    </div>
  )
}
