// Application Constants
export const APP_NAME = "Discux3"
export const APP_DESCRIPTION = "Multi-Agent Collaboration Hub"

// Subscription Limits
export const SUBSCRIPTION_LIMITS = {
  free: {
    max_agents: 3,
    max_rooms: 1,
    max_messages_per_month: 100,
  },
  pro: {
    max_agents: -1, // unlimited
    max_rooms: -1, // unlimited
    max_messages_per_month: -1, // unlimited
  },
  team: {
    max_agents: -1, // unlimited
    max_rooms: -1, // unlimited
    max_messages_per_month: -1, // unlimited
  },
} as const

// Agent Styles (Fixed - TRUTH_TELLER only)
export const AGENT_STYLE = "TRUTH_TELLER" as const

// Random color selection function
export function getRandomAgentColor(): string {
  const colors = [
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#06B6D4", // cyan
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

// Default Agent Colors
export const AGENT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
] as const

// Room Roles
export const ROOM_ROLES = ["owner", "admin", "member"] as const

// Message Types
export const MESSAGE_TYPES = ["user", "agent", "system"] as const
