import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APIResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status") as
      | "CLOCK_IN"
      | "CLOCK_OUT"
      | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        (whereClause.timestamp as Record<string, unknown>).gte = new Date(
          startDate
        );
      }
      if (endDate) {
        (whereClause.timestamp as Record<string, unknown>).lte = new Date(
          endDate
        );
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get attendance logs with user information
    const [logs, totalCount] = await Promise.all([
      prisma.attendanceLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.attendanceLog.count({
        where: whereClause,
      }),
    ]);

    const hasMore = skip + logs.length < totalCount;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: totalCount,
        hasMore,
        page,
        limit,
      },
      message: "Attendance logs retrieved successfully",
    } as APIResponse);
  } catch (error) {
    console.error("Error in logs API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      } as APIResponse,
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
    } as APIResponse,
    { status: 405 }
  );
}
