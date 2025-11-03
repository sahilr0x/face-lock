import { createEntityDb } from "@/lib/entityDb";


export type FaceMeta = { name: string; email: string };

let _db = createEntityDb<FaceMeta>();

export const entityDb = _db;
