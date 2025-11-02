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
  const maxRetries = 2;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300_000); // 5 minutes safeguard

      const response = await fetch(`${MCP_SERVER_URL}/mcp/tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: toolName,
          arguments: args,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      lastError = error;
      const message = (error as Error).message || "";
      const isTimeout = message.includes("Timeout") || message.includes("UND_ERR_HEADERS_TIMEOUT") || message.includes("The operation was aborted");
      if (attempt < maxRetries && isTimeout) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      console.error(`Error calling MCP tool ${toolName} (attempt ${attempt + 1}):`, error);
      break;
    }
  }

  throw new Error(`Failed to call MCP tool: ${(lastError as Error)?.message || "unknown error"}`);
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


export async function compareImages(
  image1: string,
  image2: string
): Promise<number> {
  try {
    const result = await callMCPTool("image.compare", {
      image1,
      image2,
    });

    return result.similarity as number;
  } catch (error) {
    console.error("Error comparing images:", error);
    throw new Error(`Failed to compare images: ${(error as Error).message}`);
  }
}


export async function checkImageMatch(
  image1: string,
  image2: string,
  threshold: number = 0.8
): Promise<{ match: boolean; similarity: number; threshold: number }> {
  try {
    const result = await callMCPTool("image.match", {
      image1,
      image2,
      threshold,
    });

    return result as {
      match: boolean;
      similarity: number;
      threshold: number;
    };
  } catch (error) {
    console.error("Error checking image match:", error);
    throw new Error(`Failed to check image match: ${(error as Error).message}`);
  }
}


export async function findBestImageMatch(
  queryImage: string,
  candidates: Array<{
    id: string;
    image: string;
    name?: string;
  }>,
  threshold: number = 0.8
): Promise<{ id: string; name?: string; similarity: number; match: boolean } | null> {
  try {
    const result = await callMCPTool("image.findBestMatch", {
      queryImage,
      candidates,
      threshold,
    });

    return result as {
      id: string;
      name?: string;
      similarity: number;
      match: boolean;
    } | null;
  } catch (error) {
    console.error("Error finding best image match:", error);
    throw new Error(`Failed to find best image match: ${(error as Error).message}`);
  }
}


export async function generateImageHash(image: string): Promise<string> {
  try {
    const result = await callMCPTool("image.generateHash", {
      image,
    });

    return result.hash as string;
  } catch (error) {
    console.error("Error generating image hash:", error);
    throw new Error(`Failed to generate image hash: ${(error as Error).message}`);
  }
}


export async function generateSimpleFingerprint(image: string): Promise<string> {
  try {
    const result = await callMCPTool("image.generateFingerprint", {
      image,
    });

    return result.fingerprint as string;
  } catch (error) {
    console.error("Error generating simple fingerprint:", error);
    throw new Error(`Failed to generate simple fingerprint: ${(error as Error).message}`);
  }
}
