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
export const activeEffectSchema = z.object({
  cardId: z.number().min(1).max(10),
  sourceProfileId: z.string(),
  sourceProfileName: z.string(),
  turnsRemaining: z.number().min(0),
});

export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  class: z.number().min(1).max(6),
  tier: z.number().min(1),
  hp: z.number().min(0),
  maxHp: z.number().min(1),
  con: z.number().min(0).max(2),
  armor: z.number().min(1).max(3),
  tempArmor: z.number().min(0).default(0),
  cards: z.array(z.number().min(1).max(10)),
  usedCards: z.array(z.number().min(1).max(10)),
  initiative: z.number().min(1).max(20),
  activeEffects: z.array(activeEffectSchema).default([]),
  isAlive: z.boolean().default(true),
});

export const groupSchema = z.object({
  id: z.string(),
  name: z.string(),
  characters: z.array(characterSchema),
});

export const warParticipantSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  characters: z.array(characterSchema),
});

export const warStateSchema = z.object({
  isActive: z.boolean(),
  group1: warParticipantSchema.optional(),
  group2: warParticipantSchema.optional(),
  currentTurn: z.number().default(0),
  currentGroup: z.number().min(1).max(2).default(1),
  combatLog: z.array(z.string()).default([]),
});

export const scenarioSchema = z.object({
  name: z.string(),
  groups: z.record(z.string(), z.array(characterSchema)),
});

export type Character = z.infer<typeof characterSchema>;
export type Group = z.infer<typeof groupSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type ActiveEffect = z.infer<typeof activeEffectSchema>;
export type WarParticipant = z.infer<typeof warParticipantSchema>;
export type WarState = z.infer<typeof warStateSchema>;
