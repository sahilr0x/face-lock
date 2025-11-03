import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFaceEmbedding, logAttendance } from "@/lib/mcpClient";
import { entityDb } from "@/lib/entityDbInstance";
import { faceEmbeddingToBinary } from "@/lib/entityDb";
import { ClockInData, APIResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: ClockInData = await request.json();
    const { faceImage, userId } = body;

    // Validate input
    if (!faceImage) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: faceImage is required",
        } as APIResponse,
        { status: 400 }
      );
    }

    // Generate embedding for query
    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateFaceEmbedding(faceImage);
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
    const queryBinary = faceEmbeddingToBinary(queryEmbedding);

    // If userId is provided, check against that specific user
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: "User not found",
          } as APIResponse,
          { status: 404 }
        );
      }

      // Compare query against that user's stored binary vector
      const rec = entityDb.get(user.id);
      if (!rec) {
        return NextResponse.json(
          {
            success: false,
            error: "User has no registered face vector",
          } as APIResponse,
          { status: 400 }
        );
      }

      // Hamming distance threshold: tune as needed for your data
      const { distance } = (await entityDb.queryBinary(queryBinary, 1))[0];
      const maxHamming = 40; // for 128 bits; adjust empirically
      if (distance > maxHamming) {
        return NextResponse.json(
          {
            success: false,
            error: "Face does not match registered user",
            data: { distance, maxHamming },
          } as APIResponse,
          { status: 400 }
        );
      }

      // Determine clock-in or clock-out based on last status
      const lastLog = await prisma.attendanceLog.findFirst({
        where: { userId: user.id },
        orderBy: { timestamp: "desc" },
      });

      const status = lastLog?.status === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN";

      // Log attendance
      const attendanceLog = await logAttendance(user.id, status);

      return NextResponse.json({
        success: true,
        data: {
          userId: user.id,
          name: user.name,
          status,
          timestamp: attendanceLog.timestamp,
          hamming: distance,
        },
        message: `Successfully ${
          status === "CLOCK_IN" ? "clocked in" : "clocked out"
        }`,
      } as APIResponse);
    } else {
      // Find best matching user from the in-memory EntityDB
      const users = await prisma.user.findMany({
        select: { id: true, name: true },
      });

      if (users.length === 0 || entityDb.all().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No registered users with face vectors found",
          } as APIResponse,
          { status: 404 }
        );
      }
      const results = await entityDb.queryBinary(queryBinary, 1);
      const best = results[0];
      const maxHamming = 40; // tune empirically
      if (!best || best.distance > maxHamming) {
        return NextResponse.json(
          {
            success: false,
            error: "No matching user found",
            data: { distance: best?.distance || null, maxHamming },
          } as APIResponse,
          { status: 400 }
        );
      }

      // Determine clock-in or clock-out based on last status
      const lastLog = await prisma.attendanceLog.findFirst({
        where: { userId: best.id },
        orderBy: { timestamp: "desc" },
      });

      const status = lastLog?.status === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN";

      // Log attendance
      const attendanceLog = await logAttendance(best.id, status);

      return NextResponse.json({
        success: true,
        data: {
          userId: best.id,
          name: users.find((u) => u.id === best.id)?.name || "Unknown",
          status,
          timestamp: attendanceLog.timestamp,
          hamming: best.distance,
        },
        message: `Successfully ${
          status === "CLOCK_IN" ? "clocked in" : "clocked out"
        }`,
      } as APIResponse);
    }
  } catch (error) {
    console.error("Error in clockin API:", error);
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
