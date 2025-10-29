import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  compareImages,
  checkImageMatch,
  findBestImageMatch,
  generateImageHash,
  generateSimpleFingerprint,
  logAttendance,
} from "@/lib/mcpClient";
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

    // Generate image hash and fingerprint for the captured image
    let queryHash: string;
    let queryFingerprint: string;
    try {
      queryHash = await generateImageHash(faceImage);
      queryFingerprint = await generateSimpleFingerprint(faceImage);
    } catch (error) {
      console.error("Error processing face image:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to process face image. Please ensure a clear face is visible.",
        } as APIResponse,
        { status: 400 }
      );
    }

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

      if (!user.faceImage) {
        return NextResponse.json(
          {
            success: false,
            error: "User has no registered face image",
          } as APIResponse,
          { status: 400 }
        );
      }

      // Compare with the specific user's image
      const matchResult = await checkImageMatch(faceImage, user.faceImage, 0.7);
      const { match, similarity, threshold } = matchResult;

      if (!match) {
        return NextResponse.json(
          {
            success: false,
            error: "Face does not match registered user",
            data: { similarity, threshold },
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
          similarity,
        },
        message: `Successfully ${
          status === "CLOCK_IN" ? "clocked in" : "clocked out"
        }`,
      } as APIResponse);
    } else {
      // Find best matching user from all users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          faceImage: true,
        },
        where: {
          faceImage: {
            not: null,
          },
        },
      });

      if (users.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No registered users with face images found",
          } as APIResponse,
          { status: 404 }
        );
      }

      // Find best match using image comparison
      const candidates = users.map((user) => ({
        id: user.id,
        name: user.name,
        image: user.faceImage!,
      }));

      const bestMatch = await findBestImageMatch(faceImage, candidates, 0.7);

      console.log("Face matching debug:");
      console.log("Number of candidates:", candidates.length);
      console.log("Best match similarity:", bestMatch?.similarity || 0);
      console.log("Threshold used:", 0.7);
      console.log("Best match user:", bestMatch?.name || "none");
      console.log("Match result:", bestMatch?.match || false);

      // Log all similarity scores for debugging
      for (let index = 0; index < candidates.length; index++) {
        const candidate = candidates[index];
        const similarity = await compareImages(faceImage, candidate.image);
        console.log(
          `Candidate ${index + 1} (${candidate.name}): similarity = ${similarity.toFixed(4)}`
        );
      }

      if (!bestMatch || !bestMatch.match) {
        return NextResponse.json(
          {
            success: false,
            error: "No matching user found",
            data: {
              similarity: bestMatch?.similarity || 0,
              threshold: 0.7,
              candidates: candidates.length,
            },
          } as APIResponse,
          { status: 400 }
        );
      }

      // Determine clock-in or clock-out based on last status
      const lastLog = await prisma.attendanceLog.findFirst({
        where: { userId: bestMatch.id },
        orderBy: { timestamp: "desc" },
      });

      const status = lastLog?.status === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN";

      // Log attendance
      const attendanceLog = await logAttendance(bestMatch.id, status);

      return NextResponse.json({
        success: true,
        data: {
          userId: bestMatch.id,
          name: bestMatch.name,
          status,
          timestamp: attendanceLog.timestamp,
          similarity: bestMatch.similarity,
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
