import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, stations, maintenances, checklistItems, photos, InsertMaintenance, InsertChecklistItem, InsertPhoto } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Station helpers
export async function getAllStations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stations);
}

export async function getStationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(stations).where(eq(stations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Maintenance helpers
export async function createMaintenance(data: InsertMaintenance) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(maintenances).values(data);
  return result[0].insertId;
}

export async function getMaintenancesByStation(stationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(maintenances).where(eq(maintenances.stationId, stationId));
}

export async function getMaintenanceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(maintenances).where(eq(maintenances.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateMaintenanceStatus(id: number, status: "draft" | "completed" | "approved") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(maintenances).set({ status }).where(eq(maintenances.id, id));
}

// Checklist item helpers
export async function createChecklistItem(data: InsertChecklistItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(checklistItems).values(data);
  return result[0].insertId;
}

export async function getChecklistItemsByMaintenance(maintenanceId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(checklistItems).where(eq(checklistItems.maintenanceId, maintenanceId));
}

// Photo helpers
export async function createPhoto(data: InsertPhoto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(photos).values(data);
  return result[0].insertId;
}

export async function getPhotosByChecklistItem(checklistItemId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(photos).where(eq(photos.checklistItemId, checklistItemId));
}
