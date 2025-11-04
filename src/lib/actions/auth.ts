"use server"

import { prisma } from "@/lib/db"
import { hash } from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// Login schema for future use
// const loginSchema = z.object({
//   email: z.string().email("Invalid email address"),
//   password: z.string().min(1, "Password is required"),
// })

export async function registerUser(data: z.infer<typeof registerSchema>) {
  try {
    // Validate input
    const validatedData = registerSchema.parse(data)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return { success: false, error: "Email already registered" }
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        subscription: "FREE",
        maxAgents: 3,
        maxRooms: 1,
        maxMessagesPerMonth: 100,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return { success: true, data: user }
  } catch (error) {
    console.error("Registration error:", error)
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }
    return { success: false, error: "Failed to create account" }
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
      },
    })

    return user
  } catch (error) {
    console.error("Get user error:", error)
    return null
  }
}
