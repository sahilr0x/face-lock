/**
 * Camera utility functions for face recognition
 */

/**
 * Convert canvas to base64 image
 * @param canvas - HTML canvas element
 * @param quality - Image quality (0-1, default: 0.8)
 * @returns Base64 encoded image string
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  quality: number = 0.8
): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Convert base64 to blob
 * @param base64 - Base64 encoded image string
 * @param mimeType - MIME type (default: 'image/jpeg')
 * @returns Blob object
 */
export function base64ToBlob(
  base64: string,
  mimeType: string = "image/jpeg"
): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Resize image to specified dimensions
 * @param image - HTML image element
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Resized image as base64
 */
export function resizeImage(
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Calculate new dimensions maintaining aspect ratio
  let { width, height } = image;

  if (width > height) {
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }
  }

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Check if camera is supported
 * @returns Promise<boolean>
 */
export async function isCameraSupported(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === "videoinput");
  } catch (error) {
    console.error("Error checking camera support:", error);
    return false;
  }
}

/**
 * Get camera constraints for optimal face recognition
 * @returns MediaStreamConstraints
 */
export function getCameraConstraints(): MediaStreamConstraints {
  return {
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      facingMode: "user",
      frameRate: { ideal: 30, max: 60 },
    },
    audio: false,
  };
}

/**
 * Capture image from video stream
 * @param video - HTML video element
 * @param canvas - HTML canvas element (optional)
 * @returns Base64 encoded image
 */
export function captureFromVideo(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement
): string {
  const captureCanvas = canvas || document.createElement("canvas");
  const ctx = captureCanvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  return captureCanvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Validate image dimensions for face recognition
 * @param width - Image width
 * @param height - Image height
 * @param minWidth - Minimum width (default: 100)
 * @param minHeight - Minimum height (default: 100)
 * @returns Validation result
 */
export function validateImageDimensions(
  width: number,
  height: number,
  minWidth: number = 100,
  minHeight: number = 100
): { valid: boolean; error?: string } {
  if (width < minWidth || height < minHeight) {
    return {
      valid: false,
      error: `Image too small. Minimum dimensions: ${minWidth}x${minHeight}`,
    };
  }

  return { valid: true };
}
