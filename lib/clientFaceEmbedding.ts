/**
 * Client-side face embedding generation using face-api.js in the browser
 */
"use client";

// Dynamic import to ensure face-api.js is only loaded in the browser
let faceapi: typeof import("face-api.js") | null = null;

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/**
 * Load face-api.js module (browser only)
 */
async function loadFaceApi(): Promise<typeof import("face-api.js")> {
  if (faceapi) {
    return faceapi;
  }

  // Only load in browser environment
  if (typeof window === "undefined") {
    throw new Error("face-api.js can only be used in the browser");
  }

  faceapi = await import("face-api.js");
  return faceapi;
}

/**
 * Load face-api.js models in the browser
 */
async function loadModels(): Promise<void> {
  if (modelsLoaded) {
    return;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const faceApiModule = await loadFaceApi();
      const MODEL_URL = "/models";

      await Promise.all([
        faceApiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceApiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceApiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      console.log("Face-api.js models loaded successfully");
    } catch (error) {
      console.error("Error loading face-api.js models:", error);
      modelsLoaded = false;
      loadingPromise = null;
      throw new Error(
        `Failed to load face recognition models: ${(error as Error).message}`
      );
    }
  })();

  return loadingPromise;
}

/**
 * Generate face embedding from base64 image in the browser
 * @param base64Image - Base64 encoded image string (with or without data URL prefix)
 * @returns Face embedding vector (128 dimensions)
 */
export async function generateFaceEmbedding(
  base64Image: string
): Promise<number[]> {
  try {
    // Ensure face-api.js module and models are loaded
    const faceApiModule = await loadFaceApi();
    await loadModels();

    // Normalize base64 image format - ensure it has data URL prefix
    // The camera feed returns raw base64, so we need to add the prefix
    let imageSrc: string;
    if (base64Image.startsWith("data:")) {
      // Already a data URL
      imageSrc = base64Image;
    } else {
      // Raw base64, add data URL prefix
      imageSrc = `data:image/jpeg;base64,${base64Image}`;
    }

    // Create image element from base64 with timeout
    const img = await Promise.race<HTMLImageElement>([
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous"; // Allow CORS if needed
        image.onload = () => resolve(image);
        image.onerror = (error) => {
          console.error("Image load error:", error);
          reject(new Error("Failed to load image. Please ensure a valid image is captured."));
        };
        image.src = imageSrc;
      }),
      new Promise<HTMLImageElement>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Image load timeout after 10 seconds"));
        }, 10000);
      }),
    ]);

    // Detect face and generate descriptor
    const detection = await faceApiModule
      .detectSingleFace(
        img,
        new faceApiModule.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      throw new Error(
        "No face detected or face descriptor could not be generated"
      );
    }

    // Convert Float32Array to number array
    const embedding = Array.from(detection.descriptor);

    return embedding;
  } catch (error) {
    console.error("Error generating face embedding:", error);
    throw new Error(
      `Failed to generate face embedding: ${(error as Error).message}`
    );
  }
}

/**
 * Preload models (call this early in the app lifecycle)
 */
export async function preloadModels(): Promise<void> {
  try {
    await loadModels();
  } catch (error) {
    console.error("Error preloading models:", error);
    // Don't throw - allow lazy loading later
  }
}

