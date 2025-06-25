import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").references(() => users.id),
  groups: json("groups").$type<Record<string, Character[]>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  scenarios: many(scenarios),
}));

export const scenariosRelations = relations(scenarios, ({ one }) => ({
  user: one(users, {
    fields: [scenarios.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertScenarioSchema = createInsertSchema(scenarios).pick({
  name: true,
  groups: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Scenario = typeof scenarios.$inferSelect;

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

export type Character = z.infer<typeof characterSchema>;
export type Group = z.infer<typeof groupSchema>;
