import express from "express";
import bodyParser from "body-parser";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { generateFaceEmbedding, warmupFaceApi } from "./tools/faceEmbedding";
import { compareFaceEmbeddings } from "./tools/faceCompare";
import { logAttendance } from "./tools/attendance";
import { 
  compareImages, 
  checkImageMatch, 
  findBestImageMatch,
  generateImageHash,
  generateSimpleFingerprint,
  compareSimpleFingerprints
} from "./tools/imageCompare";

const app = express();
app.use(bodyParser.json());


const server = new Server(
  {
    name: "face-clockin-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);


server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "embedding.generate",
        description: "Generate face embedding from base64 image",
        inputSchema: {
          type: "object",
          properties: {
            image: {
              type: "string",
              description: "Base64 encoded image",
            },
          },
          required: ["image"],
        },
      },
      {
        name: "embedding.compare",
        description: "Compare two face embeddings using cosine similarity",
        inputSchema: {
          type: "object",
          properties: {
            embedding1: {
              type: "array",
              items: { type: "number" },
              description: "First face embedding vector",
            },
            embedding2: {
              type: "array",
              items: { type: "number" },
              description: "Second face embedding vector",
            },
          },
          required: ["embedding1", "embedding2"],
        },
      },
      {
        name: "attendance.log",
        description: "Log attendance record",
        inputSchema: {
          type: "object",
          properties: {
            userId: {
              type: "string",
              description: "User ID",
            },
            status: {
              type: "string",
              enum: ["CLOCK_IN", "CLOCK_OUT"],
              description: "Attendance status",
            },
          },
          required: ["userId", "status"],
        },
      },
      {
        name: "image.compare",
        description: "Compare two images using perceptual hashing",
        inputSchema: {
          type: "object",
          properties: {
            image1: {
              type: "string",
              description: "First base64 encoded image",
            },
            image2: {
              type: "string",
              description: "Second base64 encoded image",
            },
          },
          required: ["image1", "image2"],
        },
      },
      {
        name: "image.match",
        description: "Check if two images match based on similarity threshold",
        inputSchema: {
          type: "object",
          properties: {
            image1: {
              type: "string",
              description: "First base64 encoded image",
            },
            image2: {
              type: "string",
              description: "Second base64 encoded image",
            },
            threshold: {
              type: "number",
              description: "Similarity threshold (default: 0.8)",
              default: 0.8,
            },
          },
          required: ["image1", "image2"],
        },
      },
      {
        name: "image.findBestMatch",
        description: "Find the best matching image from a list of candidates",
        inputSchema: {
          type: "object",
          properties: {
            queryImage: {
              type: "string",
              description: "Query base64 encoded image",
            },
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  image: { type: "string" },
                  name: { type: "string" },
                },
                required: ["id", "image"],
              },
              description: "Array of candidate images with metadata",
            },
            threshold: {
              type: "number",
              description: "Similarity threshold (default: 0.8)",
              default: 0.8,
            },
          },
          required: ["queryImage", "candidates"],
        },
      },
      {
        name: "image.generateHash",
        description: "Generate perceptual hash from image",
        inputSchema: {
          type: "object",
          properties: {
            image: {
              type: "string",
              description: "Base64 encoded image",
            },
          },
          required: ["image"],
        },
      },
      {
        name: "image.generateFingerprint",
        description: "Generate simple hash-based fingerprint from image",
        inputSchema: {
          type: "object",
          properties: {
            image: {
              type: "string",
              description: "Base64 encoded image",
            },
          },
          required: ["image"],
        },
      },
    ],
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "embedding.generate": {
        const { image } = args as { image: string };
        const embedding = await generateFaceEmbedding(image);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ embedding }),
            },
          ],
        };
      }

      case "embedding.compare": {
        const { embedding1, embedding2 } = args as {
          embedding1: number[];
          embedding2: number[];
        };
        const similarity = compareFaceEmbeddings(embedding1, embedding2);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ similarity }),
            },
          ],
        };
      }

      case "attendance.log": {
        const { userId, status } = args as {
          userId: string;
          status: "CLOCK_IN" | "CLOCK_OUT";
        };
        const result = await logAttendance(userId, status);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case "image.compare": {
        const { image1, image2 } = args as {
          image1: string;
          image2: string;
        };
        const similarity = await compareImages(image1, image2);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ similarity }),
            },
          ],
        };
      }

      case "image.match": {
        const { image1, image2, threshold = 0.8 } = args as {
          image1: string;
          image2: string;
          threshold?: number;
        };
        const result = await checkImageMatch(image1, image2, threshold);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case "image.findBestMatch": {
        const { queryImage, candidates, threshold = 0.8 } = args as {
          queryImage: string;
          candidates: Array<{ id: string; image: string; name?: string }>;
          threshold?: number;
        };
        const result = await findBestImageMatch(queryImage, candidates, threshold);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
        };
      }

      case "image.generateHash": {
        const { image } = args as { image: string };
        const hash = await generateImageHash(image);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ hash }),
            },
          ],
        };
      }

      case "image.generateFingerprint": {
        const { image } = args as { image: string };
        const fingerprint = generateSimpleFingerprint(image);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ fingerprint }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: (error as Error).message }),
        },
      ],
      isError: true,
    };
  }
});


async function startMCPServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP Face Clock-In Server started");
}


app.post("/mcp/tool", async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    let result;
    switch (name) {
      case "embedding.generate": {
        const { image } = args;
        const embedding = await generateFaceEmbedding(image);
        result = { embedding };
        break;
      }
      case "embedding.compare": {
        const { embedding1, embedding2 } = args;
        const similarity = await compareFaceEmbeddings(embedding1, embedding2);
        result = { similarity };
        break;
      }
      case "attendance.log": {
        const { userId, status } = args;
        const attendanceLog = await logAttendance(userId, status);
        result = attendanceLog;
        break;
      }
      case "image.compare": {
        const { image1, image2 } = args;
        const similarity = await compareImages(image1, image2);
        result = { similarity };
        break;
      }
      case "image.match": {
        const { image1, image2, threshold = 0.8 } = args;
        const matchResult = await checkImageMatch(image1, image2, threshold);
        result = matchResult;
        break;
      }
      case "image.findBestMatch": {
        const { queryImage, candidates, threshold = 0.8 } = args;
        const bestMatch = await findBestImageMatch(queryImage, candidates, threshold);
        result = bestMatch;
        break;
      }
      case "image.generateHash": {
        const { image } = args;
        const hash = await generateImageHash(image);
        result = { hash };
        break;
      }
      case "image.generateFingerprint": {
        const { image } = args;
        const fingerprint = generateSimpleFingerprint(image);
        result = { fingerprint };
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown tool: ${name}` });
    }

    res.json(result);
  } catch (error) {
    console.error("Error in MCP tool endpoint:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});


const PORT = process.env.MCP_PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP HTTP server running on port ${PORT}`);
});


startMCPServer().catch(console.error);

(async () => {
  try {
    console.log("Warming up face-api.js models...");
    await warmupFaceApi();
  } catch (e) {
    console.warn("Warmup failed:", (e as Error).message);
  }
})();

export default app;
