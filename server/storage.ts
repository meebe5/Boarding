import { users, scenarios, type User, type InsertUser, type Scenario, type InsertScenario } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getScenarios(userId?: number): Promise<Scenario[]>;
  getScenario(id: number): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario & { userId?: number }): Promise<Scenario>;
  updateScenario(id: number, updates: Partial<InsertScenario>): Promise<Scenario>;
  deleteScenario(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getScenarios(userId?: number): Promise<Scenario[]> {
    if (userId) {
      return await db.select().from(scenarios).where(eq(scenarios.userId, userId));
    }
    return await db.select().from(scenarios);
  }

  async getScenario(id: number): Promise<Scenario | undefined> {
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));
    return scenario || undefined;
  }

  async createScenario(scenario: InsertScenario & { userId?: number }): Promise<Scenario> {
    const insertData: any = {
      name: scenario.name,
      groups: scenario.groups,
    };
    if (scenario.userId) {
      insertData.userId = scenario.userId;
    }
    
    const [newScenario] = await db
      .insert(scenarios)
      .values(insertData)
      .returning();
    return newScenario;
  }

  async updateScenario(id: number, updates: Partial<InsertScenario>): Promise<Scenario> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.groups) updateData.groups = updates.groups;
    
    const [updatedScenario] = await db
      .update(scenarios)
      .set(updateData)
      .where(eq(scenarios.id, id))
      .returning();
    return updatedScenario;
  }

  async deleteScenario(id: number): Promise<void> {
    await db.delete(scenarios).where(eq(scenarios.id, id));
  }
}

export const storage = new DatabaseStorage();
