import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["tecnico", "rr_admin", "guanabara", "admin"]).default("tecnico").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Postos de combustível Guanabara
 */
export const stations = mysqlTable("stations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Station = typeof stations.$inferSelect;
export type InsertStation = typeof stations.$inferInsert;

/**
 * Manutenções preventivas realizadas
 */
export const maintenances = mysqlTable("maintenances", {
  id: int("id").autoincrement().primaryKey(),
  stationId: int("stationId").notNull(),
  technicianId: int("technicianId").notNull(),
  preventiveNumber: varchar("preventiveNumber", { length: 50 }).notNull(),
  date: timestamp("date").notNull(),
  status: mysqlEnum("status", ["draft", "completed", "approved"]).default("draft").notNull(),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Maintenance = typeof maintenances.$inferSelect;
export type InsertMaintenance = typeof maintenances.$inferInsert;

/**
 * Itens de verificação da manutenção preventiva
 */
export const checklistItems = mysqlTable("checklistItems", {
  id: int("id").autoincrement().primaryKey(),
  maintenanceId: int("maintenanceId").notNull(),
  itemNumber: int("itemNumber").notNull(),
  equipmentName: varchar("equipmentName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["confere", "nao_conferido", "realizar_limpeza", "realizar_reparo", "realizar_troca"]).notNull(),
  value: varchar("value", { length: 100 }),
  correctiveAction: text("correctiveAction"),
  observations: text("observations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChecklistItem = typeof checklistItems.$inferSelect;
export type InsertChecklistItem = typeof checklistItems.$inferInsert;

/**
 * Fotos dos equipamentos
 */
export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  checklistItemId: int("checklistItemId").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;