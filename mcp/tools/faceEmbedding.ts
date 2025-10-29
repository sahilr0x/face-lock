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


function getDetectorOptions() {
  const inputSize = Number(process.env.MCP_DETECTOR_INPUT_SIZE || 224);
  const scoreThreshold = Number(process.env.MCP_DETECTOR_THRESHOLD || 0.5);
  return new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });
}


async function loadModels() {
  if (modelsLoaded) {
    console.log("📦 [MODELS] Models already loaded, skipping...");
    return;
  }

  const loadStart = Date.now();
  try {
    console.log(" [MODELS] Loading face-api.js models...");

    // Load the actual models from the public/models directory
    const modelPath = path.join(process.cwd(), "public", "models");

    // Check if models directory exists
    if (!fs.existsSync(modelPath)) {
      throw new Error(
        "Models directory not found. Please ensure models are downloaded."
      );
    }

    console.log(" [MODELS] Loading models from:", modelPath);

    const detectorStart = Date.now();
    await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
    console.log(` [MODELS] TinyFaceDetector loaded in: ${Date.now() - detectorStart}ms`);

    const landmarksStart = Date.now();
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    console.log(` [MODELS] FaceLandmark68Net loaded in: ${Date.now() - landmarksStart}ms`);

    const recognitionStart = Date.now();
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    console.log(` [MODELS] FaceRecognitionNet loaded in: ${Date.now() - recognitionStart}ms`);

    modelsLoaded = true;
    console.log(` [MODELS] All face recognition models loaded successfully in: ${Date.now() - loadStart}ms`);
  } catch (error) {
    console.error("[MODELS] Error loading face recognition models:", error);
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
  const startTime = Date.now();
  try {
    console.log("🔍 [FACE-EMBEDDING] Starting face embedding generation...");

    const modelLoadStart = Date.now();
    await loadModels();
    console.log(` [FACE-EMBEDDING] Model loading took: ${Date.now() - modelLoadStart}ms`);

    const imageProcessStart = Date.now();
    let imageBuffer = Buffer.from(base64Image, "base64");
    console.log(`[FACE-EMBEDDING] Original image buffer size: ${imageBuffer.length} bytes`);

    if (imageBuffer.length > 50000) {
      console.log(" [FACE-EMBEDDING] Image too large, compressing...");
      const sharp = require('sharp');
      const compressedBuffer = await sharp(imageBuffer)
        .resize(640, 480, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      imageBuffer = compressedBuffer;
      console.log(`📸 [FACE-EMBEDDING] Compressed image buffer size: ${imageBuffer.length} bytes`);
    }

    const imageLoadStart = Date.now();
    const canvas = new Canvas(1, 1);
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    const imageLoadPromise = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        console.log(` [FACE-EMBEDDING] Image loaded successfully`);
        resolve();
      };
      img.onerror = (err) => {
        console.error(`[FACE-EMBEDDING] Image load error:`, err);
        reject(new Error("Failed to load image"));
      };
    });

    img.src = `data:image/jpeg;base64,${base64Image}`;
    
    await Promise.race([
      imageLoadPromise,
      new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error("Image load timeout")), 5000)
      )
    ]);
    console.log(`[FACE-EMBEDDING] Image loading took: ${Date.now() - imageLoadStart}ms`);

    const detectionStart = Date.now();
    const options = getDetectorOptions();
    console.log(` [FACE-EMBEDDING] Detector options: inputSize=${options.inputSize}, scoreThreshold=${options.scoreThreshold}`);
    
    const result = await Promise.race([
      faceapi
        .detectSingleFace(img as any, options)
        .withFaceLandmarks()
        .withFaceDescriptor(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Face detection timeout after 30 seconds")), 30000)
      )
    ]);

    console.log(`  [FACE-EMBEDDING] Face detection + landmarks + descriptor took: ${Date.now() - detectionStart}ms`);

    if (!result || !result.descriptor) {
      throw new Error("No face descriptor could be computed (no face or low confidence)");
    }

    console.log(` [FACE-EMBEDDING] Generated face embedding with length: ${result.descriptor.length}`);
    console.log(` [FACE-EMBEDDING] Sample values:`, Array.from(result.descriptor).slice(0, 5));
    console.log(` [FACE-EMBEDDING] Total processing time: ${Date.now() - startTime}ms`);

    return Array.from(result.descriptor as Float32Array);
  } catch (error) {
    console.error("Error generating face embedding:", error);
    throw new Error(
      `Failed to generate face embedding: ${(error as Error).message}`
    );
  }
}


export async function warmupFaceApi(): Promise<void> {
  const warmupStart = Date.now();
  try {
    console.log(" [WARMUP] Starting face-api.js warmup...");
    await loadModels();
    
    const canvasStart = Date.now();
    const canvas = new Canvas(64, 64);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 64, 64);
    console.log(`⏱️  [WARMUP] Canvas creation took: ${Date.now() - canvasStart}ms`);
    
    const detectionStart = Date.now();
    const options = getDetectorOptions();
    await faceapi
      .detectSingleFace(canvas as any, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    console.log(`⏱️  [WARMUP] Detection warmup took: ${Date.now() - detectionStart}ms`);
    
    console.log(` [WARMUP] face-api.js warmup complete in: ${Date.now() - warmupStart}ms`);
  } catch (e) {
    console.warn(` [WARMUP] face-api.js warmup skipped: ${(e as Error).message}`);
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
