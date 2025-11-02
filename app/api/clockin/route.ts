import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAttendance } from "@/lib/mcpClient";
import { APIResponse } from "@/types";

/**
 * Clock-in API - Only handles Prisma operations
 * Face recognition and EntityDB querying happen client-side
 * Client sends only the user ID after matching
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing user ID" } as APIResponse,
        { status: 400 }
      );
    }

    // Find the user in Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found in database" } as APIResponse,
        { status: 404 }
      );
    }

    // Determine whether to clock in or out
    const lastLog = await prisma.attendanceLog.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: "desc" },
    });

    const status = lastLog?.status === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN";

    // Log the attendance
    const attendanceLog = await logAttendance(user.id, status);

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        status,
        timestamp: attendanceLog.timestamp,
      },
      message: `Successfully ${
        status === "CLOCK_IN" ? "clocked in" : "clocked out"
      }`,
    } as APIResponse);
  } catch (error) {
    console.error("Clock-in error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" } as APIResponse,
      { status: 500 }
    );
  }
}
