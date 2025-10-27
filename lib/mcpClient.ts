/**
 * MCP Server Configuration
 */
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3001";

/**
 * Call MCP server tool
 */
async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/mcp/tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: toolName,
        arguments: args,
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling MCP tool ${toolName}:`, error);
    throw new Error(`Failed to call MCP tool: ${(error as Error).message}`);
  }
}

/**
 * Generate face embedding using MCP server
 * @param base64Image - Base64 encoded image
 * @returns Face embedding vector
 */
export async function generateFaceEmbedding(
  base64Image: string
): Promise<number[]> {
  try {
    const result = await callMCPTool("embedding.generate", {
      image: base64Image,
    });

    return result.embedding as number[];
  } catch (error) {
    console.error("Error generating face embedding:", error);
    throw new Error(
      `Failed to generate face embedding: ${(error as Error).message}`
    );
  }
}

/**
 * Compare two face embeddings using MCP server
 * @param embedding1 - First face embedding
 * @param embedding2 - Second face embedding
 * @returns Similarity score
 */
export async function compareFaceEmbeddings(
  embedding1: number[],
  embedding2: number[]
): Promise<number> {
  try {
    const result = await callMCPTool("embedding.compare", {
      embedding1,
      embedding2,
    });

    return result.similarity as number;
  } catch (error) {
    console.error("Error comparing face embeddings:", error);
    throw new Error(
      `Failed to compare face embeddings: ${(error as Error).message}`
    );
  }
}

/**
 * Log attendance using MCP server
 * @param userId - User ID
 * @param status - Attendance status
 * @returns Attendance log result
 */
export async function logAttendance(
  userId: string,
  status: "CLOCK_IN" | "CLOCK_OUT"
): Promise<{ id: string; userId: string; status: string; timestamp: Date }> {
  try {
    const result = await callMCPTool("attendance.log", {
      userId,
      status,
    });

    return result as {
      id: string;
      userId: string;
      status: string;
      timestamp: Date;
    };
  } catch (error) {
    console.error("Error logging attendance:", error);
    throw new Error(`Failed to log attendance: ${(error as Error).message}`);
  }
}
