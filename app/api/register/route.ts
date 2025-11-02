import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APIResponse } from "@/types";

/**
 * Register API - Only handles Prisma operations
 * Face embedding generation and EntityDB storage happen client-side
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    // Validate input
    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name and email are required",
        } as APIResponse,
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        } as APIResponse,
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email already exists",
        } as APIResponse,
        { status: 409 }
      );
    }

    // Create user in Prisma database only
    // Face embedding and EntityDB storage happen client-side
    const user = await prisma.user.create({
      data: {
        name,
        email,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      message: "User registered successfully",
    } as APIResponse);
  } catch (error) {
    console.error("Error in register API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      } as APIResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
    } as APIResponse,
    { status: 405 }
  );
}
