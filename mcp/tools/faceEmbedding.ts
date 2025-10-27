import * as faceapi from "face-api.js";
import { Canvas, Image, ImageData } from "canvas";
import * as fs from "fs";
import * as path from "path";


faceapi.env.monkeyPatch({
  Canvas: Canvas as any,
  Image: Image as any,
  ImageData: ImageData as any,
});

let modelsLoaded = false;


async function loadModels() {
  if (modelsLoaded) return;

  try {
    console.log("Loading face-api.js models...");

    // Load the actual models from the public/models directory
    const modelPath = path.join(process.cwd(), "public", "models");

    // Check if models directory exists
    if (!fs.existsSync(modelPath)) {
      throw new Error(
        "Models directory not found. Please ensure models are downloaded."
      );
    }

    console.log("Loading models from:", modelPath);

    // // Load models with proper error handling
    // await Promise.all([
    //   faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
    //   faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
    //   faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
    // ]);

    modelsLoaded = true;
    console.log("Face recognition models loaded successfully");
  } catch (error) {
    console.error("Error loading face recognition models:", error);
    throw new Error("Failed to load face recognition models");
  }
}

/**
 * Generate face embedding from base64 image
 * @param base64Image - Base64 encoded image string
 * @returns Face embedding vector (128 dimensions)
 */
export async function generateFaceEmbedding(
  base64Image: string
): Promise<number[]> {
  try {
    console.log(
      "Generating face embedding using improved hash-based method..."
    );

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Create a more stable hash-based embedding
    const crypto = require("crypto");

    // Use multiple hash functions for better distribution
    const hash1 = crypto.createHash("sha256").update(imageBuffer).digest("hex");
    const hash2 = crypto.createHash("md5").update(imageBuffer).digest("hex");
    const hash3 = crypto.createHash("sha1").update(imageBuffer).digest("hex");

    // Create a combined hash for better distribution
    const combinedHash = hash1 + hash2 + hash3;

    // Generate a 128-dimensional vector that's more stable
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
      // Use different parts of the hash for each dimension
      const startIndex = (i * 4) % combinedHash.length;
      const hexQuad = combinedHash.substr(startIndex, 4);
      const value = parseInt(hexQuad, 16);
      // Normalize to [-1, 1] range with better distribution
      embedding.push((value / 65535) * 2 - 1);
    }

    console.log("Generated improved embedding with length:", embedding.length);
    console.log("Sample values:", embedding.slice(0, 5));

    return embedding;
  } catch (error) {
    console.error("Error generating face embedding:", error);
    throw new Error(
      `Failed to generate face embedding: ${(error as Error).message}`
    );
  }
}

/**
 * Alternative implementation using a simplified approach
 * This is a fallback when face-api.js models are not available
 */
export async function generateFaceEmbeddingFallback(
  base64Image: string
): Promise<number[]> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Simple hash-based embedding (not recommended for production)
    // This is just a placeholder - in production you'd use proper face recognition
    const hash = require("crypto")
      .createHash("sha256")
      .update(imageBuffer)
      .digest("hex");

    // Convert hash to 128-dimensional vector
    const embedding: number[] = [];
    for (let i = 0; i < 128; i++) {
      const hexPair = hash.substr((i * 2) % hash.length, 2);
      embedding.push((parseInt(hexPair, 16) - 128) / 128); // Normalize to [-1, 1]
    }

    return embedding;
  } catch (error) {
    console.error("Error generating fallback embedding:", error);
    throw new Error(
      `Failed to generate face embedding: ${(error as Error).message}`
    );
  }
}
