import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Log attendance record
 * @param userId - User ID
 * @param status - Attendance status (CLOCK_IN or CLOCK_OUT)
 * @returns Created attendance log
 */
export async function logAttendance(
  userId: string,
  status: "CLOCK_IN" | "CLOCK_OUT"
): Promise<{ id: string; userId: string; status: string; timestamp: Date }> {
  try {
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Create attendance log
    const attendanceLog = await prisma.attendanceLog.create({
      data: {
        userId,
        status: status as any, // Type assertion for enum
      },
    });

    return {
      id: attendanceLog.id,
      userId: attendanceLog.userId,
      status: attendanceLog.status,
      timestamp: attendanceLog.timestamp,
    };
  } catch (error) {
    console.error("Error logging attendance:", error);
    throw new Error(`Failed to log attendance: ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get attendance logs for a user
 * @param userId - User ID
 * @param limit - Maximum number of records to return (default: 50)
 * @returns Array of attendance logs
 */
export async function getAttendanceLogs(
  userId: string,
  limit: number = 50
): Promise<Array<{ id: string; status: string; timestamp: Date }>> {
  try {
    const logs = await prisma.attendanceLog.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        timestamp: true,
      },
    });

    return logs;
  } catch (error) {
    console.error("Error fetching attendance logs:", error);
    throw new Error(
      `Failed to fetch attendance logs: ${(error as Error).message}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get user's last attendance status
 * @param userId - User ID
 * @returns Last attendance status or null if no records
 */
export async function getLastAttendanceStatus(userId: string): Promise<{
  status: string;
  timestamp: Date;
} | null> {
  try {
    const lastLog = await prisma.attendanceLog.findFirst({
      where: { userId },
      orderBy: { timestamp: "desc" },
      select: {
        status: true,
        timestamp: true,
      },
    });

    return lastLog;
  } catch (error) {
    console.error("Error fetching last attendance status:", error);
    throw new Error(
      `Failed to fetch last attendance status: ${(error as Error).message}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get attendance statistics for a user
 * @param userId - User ID
 * @param startDate - Start date for statistics (optional)
 * @param endDate - End date for statistics (optional)
 * @returns Attendance statistics
 */
export async function getAttendanceStats(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalClockIns: number;
  totalClockOuts: number;
  lastClockIn?: Date;
  lastClockOut?: Date;
}> {
  try {
    const whereClause: any = { userId };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = startDate;
      if (endDate) whereClause.timestamp.lte = endDate;
    }

    const [clockIns, clockOuts, lastClockIn, lastClockOut] = await Promise.all([
      prisma.attendanceLog.count({
        where: { ...whereClause, status: "CLOCK_IN" },
      }),
      prisma.attendanceLog.count({
        where: { ...whereClause, status: "CLOCK_OUT" },
      }),
      prisma.attendanceLog.findFirst({
        where: { ...whereClause, status: "CLOCK_IN" },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
      prisma.attendanceLog.findFirst({
        where: { ...whereClause, status: "CLOCK_OUT" },
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
    ]);

    return {
      totalClockIns: clockIns,
      totalClockOuts: clockOuts,
      lastClockIn: lastClockIn?.timestamp,
      lastClockOut: lastClockOut?.timestamp,
    };
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    throw new Error(
      `Failed to fetch attendance stats: ${(error as Error).message}`
    );
  } finally {
    await prisma.$disconnect();
  }
}
