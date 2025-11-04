import { getRooms } from "@/lib/actions/rooms"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { RoomCard } from "./RoomCard"

export async function RoomList() {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect("/login")
  }

  const result = await getRooms(user.id)

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load rooms</p>
      </div>
    )
  }

  const rooms = result.data

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first collaboration room to start working with your team and AI agents
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  )
}
