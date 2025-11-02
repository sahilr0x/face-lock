import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APIResponse } from "@/types";

/**
 * Sync API - Returns user metadata for client-side EntityDB syncing
 * Note: Embeddings are not stored server-side, so clients need to
 * check EntityDB and re-register faces if missing
 */
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        })),
        message:
          "User metadata retrieved. Embeddings must be stored client-side in EntityDB.",
      },
    } as APIResponse);
  } catch (error) {
    console.error("Error in sync API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync user metadata",
      } as APIResponse,
      { status: 500 }
    );
  }
}

