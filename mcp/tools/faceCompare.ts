// @ts-ignore
import cosineSimilarity from "cosine-similarity";

/**
 * Compare two face embeddings using cosine similarity
 * @param embedding1 - First face embedding vector
 * @param embedding2 - Second face embedding vector
 * @returns Similarity score between 0 and 1 (1 = identical, 0 = completely different)
 */
export function compareFaceEmbeddings(
  embedding1: number[],
  embedding2: number[]
): number {
  try {
    // Validate inputs
    if (!embedding1 || !embedding2) {
      throw new Error("Both embeddings must be provided");
    }

    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same length");
    }

    if (embedding1.length === 0) {
      throw new Error("Embeddings cannot be empty");
    }

    // Calculate cosine similarity
    const similarity = cosineSimilarity(embedding1, embedding2);

    // Ensure similarity is between 0 and 1
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    console.error("Error comparing face embeddings:", error);
    throw new Error(
      `Failed to compare embeddings: ${(error as Error).message}`
    );
  }
}

/**
 * Check if two faces match based on similarity threshold
 * @param embedding1 - First face embedding vector
 * @param embedding2 - Second face embedding vector
 * @param threshold - Similarity threshold (default: 0.6)
 * @returns Object with match result and similarity score
 */
export function checkFaceMatch(
  embedding1: number[],
  embedding2: number[],
  threshold: number = 0.6
): { match: boolean; similarity: number; threshold: number } {
  try {
    const similarity = compareFaceEmbeddings(embedding1, embedding2);
    const match = similarity >= threshold;

    return {
      match,
      similarity,
      threshold,
    };
  } catch (error) {
    console.error("Error checking face match:", error);
    throw new Error(`Failed to check face match: ${(error as Error).message}`);
  }
}

/**
 * Find the best matching face from a list of embeddings
 * @param queryEmbedding - The face embedding to match against
 * @param candidateEmbeddings - Array of candidate embeddings with metadata
 * @param threshold - Similarity threshold (default: 0.6)
 * @returns Best match result or null if no match found
 */
export function findBestMatch(
  queryEmbedding: number[],
  candidateEmbeddings: Array<{
    id: string;
    embedding: number[];
    name?: string;
  }>,
  threshold: number = 0.6
): { id: string; name?: string; similarity: number; match: boolean } | null {
  try {
    if (candidateEmbeddings.length === 0) {
      return null;
    }

    let bestMatch = null;
    let bestSimilarity = 0;

    for (const candidate of candidateEmbeddings) {
      const similarity = compareFaceEmbeddings(
        queryEmbedding,
        candidate.embedding
      );

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
  } catch (error) {
    console.error("Error finding best match:", error);
    throw new Error(`Failed to find best match: ${(error as Error).message}`);
  }
}
