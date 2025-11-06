"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { createAgentSchema, updateAgentSchema, type CreateAgentInput, type UpdateAgentInput } from "@/lib/validations"

/**
 * Get all agents for the current user
 */
export async function getAgents(userId: string) {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        createdBy: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return { success: true, data: agents }
  } catch (error) {
    console.error("Error fetching agents:", error)
    return { success: false, error: "Failed to fetch agents" }
  }
}

/**
 * Get a single agent by ID
 */
export async function getAgent(id: string, userId: string) {
  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id,
        createdBy: userId,
      },
    })

    if (!agent) {
      return { success: false, error: "Agent not found" }
    }

    return { success: true, data: agent }
  } catch (error) {
    console.error("Error fetching agent:", error)
    return { success: false, error: "Failed to fetch agent" }
  }
}

/**
 * Create a new agent
 */
export async function createAgent(userId: string, data: CreateAgentInput) {
  try {
    // Validate input
    const validatedData = createAgentSchema.parse(data)

    // Check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        subscription: true, 
        maxAgents: true,
        _count: {
          select: { agents: true }
        }
      },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

  
    // Create agent
    const agent = await prisma.agent.create({
      data: {
        ...validatedData,
        style: "TRUTH_TELLER", // Force style to be TRUTH_TELLER
        createdBy: userId,
      },
    })

    revalidatePath("/agents")
    return { success: true, data: agent }
  } catch (error) {
    console.error("Error creating agent:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create agent" }
  }
}

/**
 * Update an existing agent
 */
export async function updateAgent(id: string, userId: string, data: UpdateAgentInput) {
  try {
    // Validate input
    const validatedData = updateAgentSchema.parse(data)

    // Verify ownership
    const existingAgent = await prisma.agent.findFirst({
      where: { id, createdBy: userId },
    })

    if (!existingAgent) {
      return { success: false, error: "Agent not found or unauthorized" }
    }

    // Update agent
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...validatedData,
        style: "TRUTH_TELLER", // Force style to be TRUTH_TELLER
      },
    })

    revalidatePath("/agents")
    revalidatePath(`/agents/${id}`)
    return { success: true, data: agent }
  } catch (error) {
    console.error("Error updating agent:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update agent" }
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string, userId: string) {
  try {
    // Verify ownership
    const existingAgent = await prisma.agent.findFirst({
      where: { id, createdBy: userId },
    })

    if (!existingAgent) {
      return { success: false, error: "Agent not found or unauthorized" }
    }

    // Check if agent is being used in any active rooms
    const roomAgents = await prisma.roomAgent.count({
      where: { agentId: id },
    })

    if (roomAgents > 0) {
      return { 
        success: false, 
        error: "Cannot delete agent that is being used in rooms. Remove it from all rooms first." 
      }
    }

    // Delete agent
    await prisma.agent.delete({
      where: { id },
    })

    revalidatePath("/agents")
    return { success: true, message: "Agent deleted successfully" }
  } catch (error) {
    console.error("Error deleting agent:", error)
    return { success: false, error: "Failed to delete agent" }
  }
}

/**
 * Increment agent usage count
 */
export async function incrementAgentUsage(id: string) {
  try {
    await prisma.agent.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error incrementing agent usage:", error)
    return { success: false, error: "Failed to update usage count" }
  }
}

/**
 * Get public agents (for discovery)
 */
export async function getPublicAgents(limit: number = 20) {
  try {
    const agents = await prisma.agent.findMany({
      where: {
        isPublic: true,
      },
      orderBy: {
        usageCount: "desc",
      },
      take: limit,
      include: {
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return { success: true, data: agents }
  } catch (error) {
    console.error("Error fetching public agents:", error)
    return { success: false, error: "Failed to fetch public agents" }
  }
}
