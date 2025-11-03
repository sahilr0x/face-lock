import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFaceEmbedding } from "@/lib/mcpClient";
import { entityDb } from "@/lib/entityDbInstance";
import { faceEmbeddingToBinary } from "@/lib/entityDb";
import { UserRegistrationData, APIResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: UserRegistrationData = await request.json();
    const { name, email, faceImage } = body;

    // Validate input
    if (!name || !email || !faceImage) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: name, email, and faceImage are required",
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

    // Compute embedding for registration and store ONLY in in-memory EntityDB
    let embedding: number[];
    try {
      embedding = await generateFaceEmbedding(faceImage);
    } catch (error) {
      console.error("Error generating face embedding:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to generate face embedding. Please ensure a clear face is visible.",
        } as APIResponse,
        { status: 400 }
      );
    }

    // Create user metadata in Prisma (no face data persisted)
    const user = await prisma.user.create({
      data: {
        name,
        email,
      },
    });

    // Upsert into EntityDB with binarized vector
    const binary = faceEmbeddingToBinary(embedding);
    entityDb.upsert({ id: user.id, vector: binary, metadata: { name, email } });

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
