import express from "express";
import bodyParser from "body-parser";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { generateFaceEmbedding } from "./tools/faceEmbedding";
import { compareFaceEmbeddings } from "./tools/faceCompare";
import { logAttendance } from "./tools/attendance";

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

export default app;
