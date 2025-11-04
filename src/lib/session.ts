import { auth } from "@/lib/auth"
import { prisma } from "./db"

/**
 * Get current user from session
 * This is a server-side only function for use in Server Components
 */
export async function getCurrentUser() {
  try {
    const session = await auth()

    if (!session?.user) {
      return null
    }

    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
    }
  } catch (error) {
    console.error("Session error:", error)
    return null
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}

/**
 * Get user by ID - utility function
 */
export async function getUserById(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        subscription: true,
        maxAgents: true,
        maxRooms: true,
        maxMessagesPerMonth: true,
      },
    })
    return user
  } catch (error) {
    console.error("Get user error:", error)
    return null
  }
}
