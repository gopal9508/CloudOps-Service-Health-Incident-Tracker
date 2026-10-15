const request = require("supertest");
const { createApp, createMemoryStore } = require("../src/app");

describe("CloudOps Service Health & Incident Tracker API", () => {
  let app;
  beforeEach(() => {
    app = createApp({ store: createMemoryStore() });
  });

  test("GET /health returns healthy status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(typeof response.body.uptimeSeconds).toBe("number");
  });

  test("POST /api/services creates a service", async () => {
    const response = await request(app).post("/api/services").send({
      name: "Resume API",
      environment: "development",
      endpoint: "https://example.com/health"
    });
    expect(response.status).toBe(201);
    expect(response.body.service.name).toBe("Resume API");
    expect(response.body.service.id).toBeTruthy();
  });

  test("POST /api/services rejects missing fields", async () => {
    const response = await request(app).post("/api/services").send({ name: "Incomplete" });
    expect(response.status).toBe(400);
  });

  test("POST /api/incidents creates an open incident", async () => {
    const response = await request(app).post("/api/incidents").send({
      title: "Elevated response time",
      description: "API response time is above expected threshold",
      severity: "high"
    });
    expect(response.status).toBe(201);
    expect(response.body.incident.status).toBe("OPEN");
    expect(response.body.incident.severity).toBe("HIGH");
  });

  test("PATCH /api/incidents/:id updates incident status", async () => {
    const created = await request(app).post("/api/incidents").send({
      title: "API unavailable",
      description: "Health endpoint returned errors",
      severity: "critical"
    });
    const id = created.body.incident.id;
    const updated = await request(app).patch(`/api/incidents/${id}`).send({ status: "resolved" });
    expect(updated.status).toBe(200);
    expect(updated.body.incident.status).toBe("RESOLVED");
  });

  test("PATCH returns 404 for an unknown incident", async () => {
    const response = await request(app).patch("/api/incidents/missing").send({ status: "RESOLVED" });
    expect(response.status).toBe(404);
  });

  test("GET /metrics returns counts", async () => {
    await request(app).post("/api/incidents").send({
      title: "Sample incident",
      description: "Testing metrics endpoint",
      severity: "low"
    });
    const response = await request(app).get("/metrics");
    expect(response.status).toBe(200);
    expect(response.body.totalIncidents).toBe(1);
    expect(response.body.openIncidents).toBe(1);
  });
});
