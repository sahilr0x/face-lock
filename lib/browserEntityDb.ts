export type BabyEntityDb = {
	upsert: (doc: unknown) => Promise<void> | void;
	queryBinary: (query: string | Uint8Array | ArrayBuffer) => Promise<unknown>;
	queryBinarySIMD?: (query: string | Uint8Array | ArrayBuffer) => Promise<unknown>;
};

let instancePromise: Promise<BabyEntityDb | null> | null = null;

export async function getBrowserEntityDb(): Promise<BabyEntityDb | null> {
	if (typeof window === "undefined" || typeof indexedDB === "undefined") {
		return null;
	}
	if (instancePromise) return instancePromise;

	instancePromise = (async () => {
		try {
			const mod = await import("@babycommando/entity-db");
			const EntityDB = mod.EntityDB ?? mod.default;
			if (!EntityDB) return null;

			const db = new EntityDB({
				vectorPath: "face_vectors",
				model: "Xenova/all-MiniLM-L6-v2",
			});
			return db as BabyEntityDb;
		} catch {
			return null;
		}
	})();

	return instancePromise;
}
