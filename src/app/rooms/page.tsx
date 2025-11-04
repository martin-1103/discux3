import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoomList } from "@/components/rooms/RoomList"
import { RoomListSkeleton } from "@/components/rooms/RoomListSkeleton"

export const metadata = {
  title: "My Rooms | Discux3",
  description: "Manage your collaboration rooms",
}

export default function RoomsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Rooms</h1>
          <p className="text-muted-foreground mt-2">
            Create collaboration spaces and invite team members
          </p>
        </div>
        <Button asChild>
          <Link href="/rooms/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Room
          </Link>
        </Button>
      </div>

      <Suspense fallback={<RoomListSkeleton />}>
        <RoomList />
      </Suspense>
    </div>
  )
}
