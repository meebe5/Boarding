import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Character-related schemas for tactical RPG
export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  class: z.number().min(1).max(6),
  tier: z.number().min(1),
  hp: z.number().min(0),
  maxHp: z.number().min(1),
  con: z.number().min(0).max(2),
  armor: z.number().min(1).max(3),
  cards: z.array(z.number().min(1).max(10)),
  usedCards: z.array(z.number().min(1).max(10)),
  initiative: z.number().min(1).max(20),
});

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  characters: z.array(characterSchema),
});

export const scenarioSchema = z.object({
  name: z.string(),
  groups: z.record(z.string(), z.array(characterSchema)),
});

export type Character = z.infer<typeof characterSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
