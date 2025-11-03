export type EntityId = string;

export type BinaryVector = BigUint64Array; // each element represents 64 bits

export interface EntityRecord<TMeta = unknown> {
	id: EntityId;
	vector: BinaryVector; // Packed binary vector (e.g., 128 bits -> length 2)
	metadata?: TMeta;
}

export interface QueryResult<TMeta = unknown> extends EntityRecord<TMeta> {
	distance: number; // Hamming distance 
}

export interface EntityDb<TMeta = unknown> {
	upsert: (record: EntityRecord<TMeta>) => void;
	remove: (id: EntityId) => void;
	clear: () => void;
	all: () => EntityRecord<TMeta>[];
	get: (id: EntityId) => EntityRecord<TMeta> | undefined;
	queryBinary: (query: BinaryVector, topK?: number) => Promise<Array<QueryResult<TMeta>>>;
	queryBinarySIMD: (query: BinaryVector, topK?: number) => Promise<Array<QueryResult<TMeta>>>;
}


export function binarizeEmbedding(
	embedding: ArrayLike<number>,
	threshold: number = 0
): BinaryVector {
	const bitCount = embedding.length;
	const numWords = Math.ceil(bitCount / 64);
	const words = new BigUint64Array(numWords);

	let wordIndex = 0;
	let bitIndexInWord = 0;
	let currentWord = BigInt(0);

	for (let i = 0; i < bitCount; i++) {
		const bit = embedding[i] > threshold ? BigInt(1) : BigInt(0);
		if (bit === BigInt(1)) {
			currentWord |= BigInt(1) << BigInt(bitIndexInWord);
		}
		bitIndexInWord++;
		if (bitIndexInWord === 64 || i === bitCount - 1) {
			words[wordIndex++] = currentWord;
			currentWord = BigInt(0);
			bitIndexInWord = 0;
		}
	}
	return words;
}

// -----------------------------
// Hamming Distance 
// -----------------------------

function popcount64BigInt(x: bigint): number {
	let count = 0;
	while (x !== BigInt(0)) {
		x &= x - BigInt(1);
		count++;
	}
	return count;
}

function hammingDistancePacked(a: BinaryVector, b: BinaryVector): number {
	if (a.length !== b.length) {
		throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
	}
	let distance = 0;
	for (let i = 0; i < a.length; i++) {
		const xorVal = a[i] ^ b[i];
		distance += popcount64BigInt(xorVal);
	}
	return distance;
}

// -----------------------------
// Optional WASM SIMD Loader (stub)
// -----------------------------

interface WasmSimdExports {
	// Example function signature; actual WASM may differ.
	// Should compute Hamming distance between two equal-length byte arrays.
	hamming_distance(ptrA: number, ptrB: number, byteLength: number): number;
	memory: WebAssembly.Memory;
}

async function loadHammingSimdWasm(): Promise<WasmSimdExports | null> {
	try {
		// Feature-detect SIMD support
		// @ts-expect-error: WebAssembly SIMD detection
		const simdSupported = typeof WebAssembly === "object" && WebAssembly.validate
			? true
			: true; // Optimistic; most modern runtimes support it

		if (!simdSupported) return null;

		// Attempt to fetch a WASM module if present in public assets
		const wasmUrl = "/wasm/hamming_distance_simd.wasm";
		const res = await fetch(wasmUrl);
		if (!res.ok) return null;
		const buffer = await res.arrayBuffer();
		const { instance } = await WebAssembly.instantiate(buffer, {});
		return instance.exports as unknown as WasmSimdExports;
	} catch {
		return null;
	}
}


export function createEntityDb<TMeta = unknown>(): EntityDb<TMeta> {
	const records = new Map<EntityId, EntityRecord<TMeta>>();
	let wasm: Promise<WasmSimdExports | null> | null = null;

	const ensureWasm = (): Promise<WasmSimdExports | null> => {
		if (!wasm) wasm = loadHammingSimdWasm();
		return wasm;
	};

	const upsert = (record: EntityRecord<TMeta>): void => {
		records.set(record.id, record);
	};

	const remove = (id: EntityId): void => {
		records.delete(id);
	};

	const clear = (): void => {
		records.clear();
	};

	const all = (): EntityRecord<TMeta>[] => Array.from(records.values());

	const get = (id: EntityId): EntityRecord<TMeta> | undefined => records.get(id);

	const queryBinary = async (
		query: BinaryVector,
		topK: number = 5
	): Promise<Array<QueryResult<TMeta>>> => {
		const results: Array<QueryResult<TMeta>> = [];
		for (const rec of records.values()) {
			const distance = hammingDistancePacked(query, rec.vector);
			results.push({ ...rec, distance });
		}
		results.sort((a, b) => a.distance - b.distance);
		return results.slice(0, topK);
	};

	const queryBinarySIMD = async (
		query: BinaryVector,
		topK: number = 5
	): Promise<Array<QueryResult<TMeta>>> => {
		const wasmExports = await ensureWasm();
		if (!wasmExports) {
			// Fallback to JS implementation if WASM unavailable
			return queryBinary(query, topK);
		}

		// Convert packed 64-bit words into a Uint8Array view for WASM (little-endian)
		const packToBytes = (v: BinaryVector): Uint8Array => {
			return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
		};

		const qBytes = packToBytes(query);
		const mem = wasmExports.memory;

		// Helper to compute distance via WASM for a target vector
		const distanceFor = (target: BinaryVector): number => {
			const tBytes = packToBytes(target);
			const len = qBytes.byteLength;

			// Allocate two regions; simplistic bump alloc using current memory size
			const pageSize = 64 * 1024;
			const ensureBytes = (needed: number) => {
				const available = mem.buffer.byteLength;
				if (available < needed) {
					const pagesNeeded = Math.ceil((needed - available) / pageSize);
					mem.grow(pagesNeeded);
				}
			};

			// Reserve space: place A then B consecutively
			const baseOffset = 0; // For simplicity; in real use, manage offsets safely
			ensureBytes(baseOffset + len * 2);
			const heap = new Uint8Array(mem.buffer);
			heap.set(qBytes, baseOffset);
			heap.set(tBytes, baseOffset + len);

			return wasmExports.hamming_distance(baseOffset, baseOffset + len, len);
		};

		const results: Array<QueryResult<TMeta>> = [];
		for (const rec of records.values()) {
			const distance = distanceFor(rec.vector);
			results.push({ ...rec, distance });
		}
		results.sort((a, b) => a.distance - b.distance);
		return results.slice(0, topK);
	};

	return { upsert, remove, clear, all, get, queryBinary, queryBinarySIMD };
}


export function faceEmbeddingToBinary(embedding: ArrayLike<number>): BinaryVector {
	return binarizeEmbedding(embedding, 0);
}
