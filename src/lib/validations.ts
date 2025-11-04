import { z } from "zod"

// Agent Validations
export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(4000, "Prompt must be less than 4000 characters"),
  emoji: z.string().emoji("Invalid emoji").optional().default("🤖"),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional().default("#3B82F6"),
  style: z.enum(["PROFESSIONAL", "DIRECT", "FRIENDLY", "CREATIVE", "ANALYTICAL"]).default("PROFESSIONAL"),
})

export const updateAgentSchema = createAgentSchema.partial()

// Room Validations
export const createRoomSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be less than 200 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
})

export const updateRoomSchema = createRoomSchema.partial()

export const roomSettingsSchema = z.object({
  maxAgents: z.number().int().min(1).max(10).default(5),
  allowAgentCreation: z.boolean().default(true),
  autoSummarize: z.boolean().default(false),
})

// Message Validations
export const createMessageSchema = z.object({
  roomId: z.string().cuid("Invalid room ID"),
  content: z.string().min(1, "Message cannot be empty").max(4000, "Message must be less than 4000 characters"),
  mentions: z.array(z.string().cuid()).optional().default([]),
})

// Invitation Validations
export const createInvitationSchema = z.object({
  roomId: z.string().cuid("Invalid room ID"),
  email: z.string().email("Invalid email").optional(),
  expiresAt: z.date().optional(),
})

// User Validations
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
})

// Type exports
export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>
export type RoomSettingsInput = z.infer<typeof roomSettingsSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
