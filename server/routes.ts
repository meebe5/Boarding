import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { insertScenarioSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Scenario routes
  app.get("/api/scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getScenarios();
      res.json(scenarios);
    } catch (error) {
      log(`Error fetching scenarios: ${error}`);
      res.status(500).json({ error: "Failed to fetch scenarios" });
    }
  });

  app.post("/api/scenarios", async (req, res) => {
    try {
      const validatedData = insertScenarioSchema.parse(req.body);
      const scenario = await storage.createScenario(validatedData);
      res.json(scenario);
    } catch (error) {
      log(`Error creating scenario: ${error}`);
      res.status(400).json({ error: "Failed to create scenario" });
    }
  });

  app.put("/api/scenarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertScenarioSchema.partial().parse(req.body);
      const scenario = await storage.updateScenario(id, validatedData);
      res.json(scenario);
    } catch (error) {
      log(`Error updating scenario: ${error}`);
      res.status(400).json({ error: "Failed to update scenario" });
    }
  });

  app.delete("/api/scenarios/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteScenario(id);
      res.json({ success: true });
    } catch (error) {
      log(`Error deleting scenario: ${error}`);
      res.status(400).json({ error: "Failed to delete scenario" });
    }
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return server;
}
