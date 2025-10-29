import * as crypto from "crypto";
const sharp = require("sharp");


export async function generateImageHash(base64Image: string): Promise<string> {
  try {
    const imageBuffer = Buffer.from(base64Image, "base64");
    
    const resized = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer();
    

    let sum = 0;
    for (let i = 0; i < resized.length; i++) {
      sum += resized[i];
    }
    const average = sum / resized.length;
    
    let hash = '';
    for (let i = 0; i < resized.length; i++) {
      hash += resized[i] > average ? '1' : '0';
    }
    
    return hash;
  } catch (error) {
    console.error("Error generating image hash:", error);
    throw new Error(`Failed to generate image hash: ${(error as Error).message}`);
  }
}

export function calculateHammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error("Hashes must have the same length");
  }
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  
  return distance;
}


export async function compareImages(
  image1: string,
  image2: string
): Promise<number> {
  try {
    const hash1 = await generateImageHash(image1);
    const hash2 = await generateImageHash(image2);
    
    const hammingDistance = calculateHammingDistance(hash1, hash2);
    const maxDistance = hash1.length;
    

    const similarity = 1 - (hammingDistance / maxDistance);
    
    return Math.max(0, Math.min(1, similarity));
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
    const similarity = await compareImages(image1, image2);
    const match = similarity >= threshold;
    
    return {
      match,
      similarity,
      threshold,
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
    if (candidates.length === 0) {
      return null;
    }
    
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const candidate of candidates) {
      const similarity = await compareImages(queryImage, candidate.image);
      
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
    console.error("Error finding best image match:", error);
    throw new Error(`Failed to find best image match: ${(error as Error).message}`);
  }
}


export function generateSimpleFingerprint(base64Image: string): string {
  try {
    const imageBuffer = Buffer.from(base64Image, "base64");
    

    const hash = crypto
      .createHash("sha256")
      .update(imageBuffer)
      .digest("hex");
    
    return hash;
  } catch (error) {
    console.error("Error generating simple fingerprint:", error);
    throw new Error(`Failed to generate simple fingerprint: ${(error as Error).message}`);
  }
}


export function compareSimpleFingerprints(
  fingerprint1: string,
  fingerprint2: string
): boolean {
  return fingerprint1 === fingerprint2;
}
