const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function createFileStore(filePath) {
  function read() {
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT") return { services: [], incidents: [] };
      throw error;
    }
  }

  function write(data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, filePath);
  }

  return {
    allServices: () => read().services,
    allIncidents: () => read().incidents,
    addService(service) {
      const data = read();
      data.services.push(service);
      write(data);
      return service;
    },
    addIncident(incident) {
      const data = read();
      data.incidents.push(incident);
      write(data);
      return incident;
    },
    updateIncident(id, updates) {
      const data = read();
      const index = data.incidents.findIndex((item) => item.id === id);
      if (index === -1) return null;
      data.incidents[index] = { ...data.incidents[index], ...updates, updatedAt: new Date().toISOString() };
      write(data);
      return data.incidents[index];
    }
  };
}

function createMemoryStore() {
  const services = [];
  const incidents = [];
  return {
    allServices: () => [...services],
    allIncidents: () => [...incidents],
    addService(service) { services.push(service); return service; },
    addIncident(incident) { incidents.push(incident); return incident; },
    updateIncident(id, updates) {
      const index = incidents.findIndex((item) => item.id === id);
      if (index === -1) return null;
      incidents[index] = { ...incidents[index], ...updates, updatedAt: new Date().toISOString() };
      return incidents[index];
    }
  };
}

function createApp(options = {}) {
  const app = express();
  const startedAt = Date.now();
  const store = options.store || createFileStore(
    process.env.DATA_FILE || path.join(process.cwd(), "data", "store.json")
  );

  app.use(express.json({ limit: "100kb" }));

  // Small structured request log; avoid logging request bodies or sensitive data.
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start
      }));
    });
    next();
  });

  app.get("/", (req, res) => {
    res.json({
      name: "CloudOps Service Health & Incident Tracker",
      version: "1.0.0",
      docs: "See README.md for API endpoints"
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  app.get("/metrics", (req, res) => {
    const services = store.allServices();
    const incidents = store.allIncidents();
    res.json({
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      totalServices: services.length,
      totalIncidents: incidents.length,
      openIncidents: incidents.filter((item) => item.status === "OPEN").length,
      resolvedIncidents: incidents.filter((item) => item.status === "RESOLVED").length
    });
  });

  app.get("/api/services", (req, res) => {
    res.json({ count: store.allServices().length, services: store.allServices() });
  });

  app.post("/api/services", (req, res) => {
    const { name, environment, endpoint } = req.body || {};
    if (![name, environment, endpoint].every((value) => typeof value === "string" && value.trim())) {
      return res.status(400).json({
        error: "name, environment, and endpoint are required non-empty strings"
      });
    }
    const service = {
      id: crypto.randomUUID(),
      name: name.trim(),
      environment: environment.trim(),
      endpoint: endpoint.trim(),
      createdAt: new Date().toISOString()
    };
    store.addService(service);
    return res.status(201).json({ service });
  });

  app.get("/api/incidents", (req, res) => {
    const status = req.query.status;
    let incidents = store.allIncidents();
    if (status) incidents = incidents.filter((item) => item.status === String(status).toUpperCase());
    res.json({ count: incidents.length, incidents });
  });

  app.post("/api/incidents", (req, res) => {
    const { title, description, severity } = req.body || {};
    const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ error: "description is required" });
    }
    if (!validSeverities.includes(String(severity).toUpperCase())) {
      return res.status(400).json({ error: `severity must be one of: ${validSeverities.join(", ")}` });
    }

    const now = new Date().toISOString();
    const incident = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      severity: String(severity).toUpperCase(),
      status: "OPEN",
      createdAt: now,
      updatedAt: now
    };
    store.addIncident(incident);
    return res.status(201).json({ incident });
  });

  app.patch("/api/incidents/:id", (req, res) => {
    const status = String((req.body || {}).status || "").toUpperCase();
    if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status)) {
      return res.status(400).json({ error: "status must be OPEN, IN_PROGRESS, or RESOLVED" });
    }
    const incident = store.updateIncident(req.params.id, { status });
    if (!incident) return res.status(404).json({ error: "incident not found" });
    return res.json({ incident });
  });

  app.use((req, res) => res.status(404).json({ error: "route not found" }));

  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "invalid JSON body" });
    }
    console.error(JSON.stringify({ level: "error", message: err.message }));
    return res.status(500).json({ error: "internal server error" });
  });

  return app;
}

module.exports = { createApp, createMemoryStore };
