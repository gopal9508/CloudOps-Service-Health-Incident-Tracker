# CloudOps Service Health & Incident Tracker

A small cloud-ready REST API for registering services, tracking incidents, checking application health, and viewing operational metrics. It is designed as a portfolio project to demonstrate backend API development, validation, logging, testing, containerization, and a basic CI workflow.

> Important: This repository is a starter project. Run it locally, execute the tests, and deploy it yourself before describing it as deployed or production-ready on your resume.

## Features

- `GET /health` — health-check endpoint with uptime and timestamp.
- `GET /metrics` — service and incident counts, including open/resolved incidents.
- Service registry — add and list services.
- Incident management — create/list incidents and update status.
- Input validation and JSON error responses.
- JSON-file persistence for local demos.
- Request logs with HTTP method, route, status code, and response duration.
- Automated API tests using Jest and Supertest.
- Dockerfile and GitHub Actions CI workflow.

## Tech stack

- Node.js 20+
- Express.js
- Jest and Supertest
- Docker
- GitHub Actions

## Run locally

1. Install Node.js 20 or later.
2. In the project folder, run:

   ```bash
   npm install
   npm test
   npm start
   ```

3. Open `http://localhost:3000/health`.

The default data file is `data/store.json`. Override it with the `DATA_FILE` environment variable if needed.

## API examples

### Add a service

```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Resume API","environment":"development","endpoint":"http://localhost:3000/health"}'
```

### Create an incident

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{"title":"Slow response","description":"Response time is higher than expected","severity":"medium"}'
```

### List incidents

```bash
curl http://localhost:3000/api/incidents
```

### Resolve an incident

Replace `INCIDENT_ID` with the ID returned by the create endpoint.

```bash
curl -X PATCH http://localhost:3000/api/incidents/INCIDENT_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

### View metrics

```bash
curl http://localhost:3000/metrics
```

## Docker

Build and run:

```bash
docker build -t cloudops-service-health-tracker .
docker run --rm -p 3000:3000 cloudops-service-health-tracker
```

Note: the container's local JSON data is ephemeral unless you mount a persistent volume. For a real cloud deployment, configure durable storage or use a managed database.

## Suggested deployment path

You can deploy this app to a Node.js hosting platform or a cloud service that supports Docker. Configure the start command as `npm start` and use the platform-provided `PORT`. After deployment, test `/health`, `/metrics`, and the service/incident endpoints.

Do not put secrets in source control. This starter does not require API keys.

## Test coverage in this starter

The automated tests cover:
- healthy status response;
- creating a service;
- rejecting invalid service input;
- creating an incident;
- updating incident status;
- 404 handling for an unknown incident;
- metrics counts.

Run `npm test` and record the actual result before mentioning test outcomes on your resume.

## Resume wording — only after you complete the work

After running the project and tests, you can use wording such as:

**CloudOps Service Health & Incident Tracker | Node.js, Express.js, REST APIs, Jest, Supertest, Docker, GitHub Actions**
- Built REST endpoints for service registration, incident tracking, health checks, and operational metrics.
- Added request logging, input validation, and automated API tests.
- Containerized the service with Docker and configured a GitHub Actions workflow to run tests.

Only say that you deployed it to a cloud platform after you have actually deployed it. Add the platform name and live URL once verified.
