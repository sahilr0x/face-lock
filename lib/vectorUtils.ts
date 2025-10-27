/**
 * Utility functions for vector operations and face recognition
 */

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Euclidean distance
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 * @param vector - Input vector
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Check if two face embeddings match based on similarity threshold
 * @param embedding1 - First face embedding
 * @param embedding2 - Second face embedding
 * @param threshold - Similarity threshold (default: 0.6)
 * @returns Match result with similarity score
 */
export function checkFaceMatch(
  embedding1: number[],
  embedding2: number[],
  threshold: number = 0.6
): { match: boolean; similarity: number; threshold: number } {
  const similarity = cosineSimilarity(embedding1, embedding2);
  const match = similarity >= threshold;

  return {
    match,
    similarity,
    threshold,
  };
}

/**
 * Find the best matching face from a list of candidates
 * @param queryEmbedding - The face embedding to match against
 * @param candidates - Array of candidate embeddings with metadata
 * @param threshold - Similarity threshold (default: 0.6)
 * @returns Best match result or null if no match found
 */
export function findBestFaceMatch(
  queryEmbedding: number[],
  candidates: Array<{ id: string; embedding: number[]; name?: string }>,
  threshold: number = 0.6
): { id: string; name?: string; similarity: number; match: boolean } | null {
  if (candidates.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const candidate of candidates) {
    const similarity = cosineSimilarity(queryEmbedding, candidate.embedding);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        id: candidate.id,
        name: candidate.name,
        similarity,
        match: similarity >= threshold,
      };
    }
  }

  return bestMatch;
}

/**
 * Convert base64 image to data URL
 * @param base64 - Base64 encoded image
 * @param mimeType - MIME type (default: 'image/jpeg')
 * @returns Data URL
 */
export function base64ToDataURL(
  base64: string,
  mimeType: string = "image/jpeg"
): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Extract base64 from data URL
 * @param dataURL - Data URL string
 * @returns Base64 string
 */
export function dataURLToBase64(dataURL: string): string {
  const base64 = dataURL.split(",")[1];
  if (!base64) {
    throw new Error("Invalid data URL format");
  }
  return base64;
}

/**
 * Validate face embedding vector
 * @param embedding - Face embedding vector
 * @param expectedLength - Expected vector length (default: 128)
 * @returns Validation result
 */
export function validateFaceEmbedding(
  embedding: number[],
  expectedLength: number = 128
): { valid: boolean; error?: string } {
  if (!Array.isArray(embedding)) {
    return { valid: false, error: "Embedding must be an array" };
  }

  if (embedding.length !== expectedLength) {
    return {
      valid: false,
      error: `Embedding must have ${expectedLength} dimensions, got ${embedding.length}`,
    };
  }

  if (!embedding.every((val) => typeof val === "number" && !isNaN(val))) {
    return {
      valid: false,
      error: "All embedding values must be valid numbers",
    };
  }

  return { valid: true };
}
