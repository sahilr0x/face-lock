"use client";

import { EntityDB } from "@babycommando/entity-db";

let dbInstance: EntityDB | null = null;
let initPromise: Promise<EntityDB> | null = null;


async function initEntityDB(): Promise<EntityDB> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = new EntityDB({
        vectorPath: "face_recognition_db",
        model: "Xenova/all-MiniLM-L6-v2", // HuggingFace embeddings model
      });
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      dbInstance = db;
      return db;
    } catch (error) {
      initPromise = null;
      console.error("Error initializing EntityDB:", error);
      throw new Error(`Failed to initialize EntityDB: ${(error as Error).message}`);
    }
  })();

  return initPromise;
}


async function getEntityDB(): Promise<EntityDB> {
  if (!dbInstance) {
    await initEntityDB();
  }
  return dbInstance!;
}


export async function storeFaceEmbedding(
  userId: string,
  embedding: number[],
  metadata?: { email?: string; name?: string }
): Promise<void> {
  try {
    const db = await getEntityDB();
    
    // validate embedding
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding: must be a non-empty array");
    }

    await db.insertManualVectors({
      id: userId,
      vector: embedding, 
      metadata: metadata || {},
    });

    console.log(`Stored face embedding for user: ${userId}`);
  } catch (error) {
    console.error("Error storing face embedding:", error);
    throw new Error(
      `Failed to store face embedding: ${(error as Error).message}`
    );
  }
}

//query entityDB for matching face embeddings
export async function queryFaceEmbeddings(
  queryEmbedding: number[],
  limit: number = 1,
  threshold: number = 0.9
): Promise<
  Array<{
    id: string;
    score: number;
    metadata?: { email?: string; name?: string };
  }>
> {
  try {
    const db = await getEntityDB();
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error("Invalid query embedding: must be a non-empty array");
    }
    console.log("Querying EntityDB with embedding:", {
      length: queryEmbedding.length,
      sample: queryEmbedding.slice(0, 5),
      limit,
      threshold,
    });

    let results;
    try {
      console.log("Calling db.queryManualVectors with:", {
        embeddingLength: queryEmbedding.length,
        limit,
      });
      results = await db.queryManualVectors(queryEmbedding, { limit });
      console.log("Raw results from queryManualVectors:", results);
      console.log("Results type:", typeof results);
      console.log("Is array?", Array.isArray(results));
      if (results && typeof results === 'object') {
        console.log("Results keys:", Object.keys(results));
      }
    } catch (queryError: any) {
      // Check if error is about undefined[0] - indicates old data format
      if (
        queryError?.message?.includes("undefined") ||
        queryError?.message?.includes("Cannot read properties of undefined")
      ) {
        console.error(
          "EntityDB query error - likely old data format detected. (clear it dude)"
        );
        throw new Error(
          "Database contains old format data. Please clear IndexedDB (DevTools > Application > IndexedDB > face_recognition_db > Delete) and re-register users."
        );
      }
      throw queryError;
    }

    if (!results) {
      console.warn("No results returned from queryManualVectors - results is:", results);
      console.warn("This might mean:");
      console.warn("1. No vectors are stored in the database");
      console.warn("2. The query format is incorrect");
      console.warn("3. EntityDB is not initialized properly");
      return [];
    }

    let resultsArray: any[] = [];
    
    if (Array.isArray(results)) {
      console.log("Results is already an array, length:", results.length);
      resultsArray = results;
    } else if (results && typeof results === 'object') {
      console.log("Results is an object, checking structure...");
      const resultObj = results as any;
      console.log("Result object structure:", {
        hasResults: !!resultObj.results,
        resultsIsArray: Array.isArray(resultObj.results),
        hasId: resultObj.id !== undefined,
        hasScore: resultObj.score !== undefined,
        keys: Object.keys(resultObj),
      });
      
      if (resultObj.results && Array.isArray(resultObj.results)) {
        console.log("Found results.results array");
        resultsArray = resultObj.results;
      } else if (resultObj.id !== undefined || resultObj.score !== undefined) {
        console.log("Treating as single result object");
        resultsArray = [resultObj];
      } else {

        console.warn("Unknown result structure, attempting to extract:", resultObj);
        if (resultObj instanceof Map) {
          resultsArray = Array.from(resultObj.values());
        } else if (resultObj.data && Array.isArray(resultObj.data)) {
          resultsArray = resultObj.data;
        }
      }
    }

    if (resultsArray.length === 0) {
      console.warn("No results array after normalization - original results:", results);
      console.warn("This means EntityDB returned data but we couldn't parse it into an array");
      return [];
    }
    
    console.log(`Normalized to ${resultsArray.length} result(s)`);
    console.log(`Found ${resultsArray.length} result(s) from EntityDB:`, 
      resultsArray.map(r => ({
        id: r.id || r._id,
        score: r.score,
        hasScore: r.score !== undefined,
        scoreType: typeof r.score
      }))
    );


    const filteredResults = resultsArray
      .filter((result) => {
        const scoreValue = result.score !== undefined ? result.score : result.similarity;
        
        const hasValidScore = result && 
               typeof result === 'object' && 
               scoreValue !== undefined && 
               typeof scoreValue === 'number';
        
        if (!hasValidScore) {
          console.warn("Result missing valid score/similarity:", result);
          return false;
        }
        
        const passesThreshold = scoreValue >= threshold;
        if (!passesThreshold) {
          console.log(`Result similarity ${scoreValue} below threshold ${threshold}`);
        }
        
        return passesThreshold;
      })
      .map((result) => ({
        id: String(result.id || result._id || ''),
        score: Number(result.score !== undefined ? result.score : result.similarity || 0),
        metadata: (result.metadata as { email?: string; name?: string }) || {},
      }));

    console.log(`Filtered to ${filteredResults.length} result(s) above threshold ${threshold}`);
    
    return filteredResults;
  } catch (error) {
    console.error("Error querying face embeddings:", error);
    throw new Error(
      `Error querying manual vectors: ${(error as Error).message}`
    );
  }
}

//finding best match from entity
export async function findBestFaceMatch(
  queryEmbedding: number[],
  threshold: number = 0.7
): Promise<{
  id: string;
  score: number;
  metadata?: { email?: string; name?: string };
} | null> {
  let results = await queryFaceEmbeddings(queryEmbedding, 1, threshold);
  if (results.length === 0) {
    console.log(`No results with threshold ${threshold}, trying lower threshold 0.5 to debug...`);
    const debugResults = await queryFaceEmbeddings(queryEmbedding, 5, 0.5);
    if (debugResults.length > 0) {
      console.log(`Found ${debugResults.length} result(s) with lower threshold:`, 
        debugResults.map(r => ({ id: r.id, score: r.score }))
      );
      return null;
    }
  }
  
  return results[0] || null;
}


export async function clearEntityDB(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      const dbName = 'face_recognition_db';
      const deleteRequest = indexedDB.deleteDatabase(dbName);
      
      await new Promise((resolve, reject) => {
        deleteRequest.onsuccess = () => {
          console.log('EntityDB cleared successfully');
          dbInstance = null;
          initPromise = null;
          resolve(undefined);
        };
        deleteRequest.onerror = () => {
          reject(new Error('Failed to clear EntityDB'));
        };
        deleteRequest.onblocked = () => {
          console.warn('EntityDB delete blocked - close other tabs/windows');
          // Still resolve, but warn user
          setTimeout(() => resolve(undefined), 1000);
        };
      });
    }
  } catch (error) {
    console.error("Error clearing EntityDB:", error);
    throw new Error(`Failed to clear EntityDB: ${(error as Error).message}`);
  }
}

