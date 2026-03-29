# MediCare Healthcare Platform

A robust, microservices-based healthcare management software system designed to handle patient records, doctor schedules, telemedicine, billing, AI-assisted symptom checking, and notifications.

## 🏗️ System Architecture Overview

The system operates as a polyglot monorepo featuring a decoupled frontend UI communicating with an array of backend domain services through an optimized NGINX API Gateway.

### Frontend
- **Web Client**: A React-based Single Page Application (SPA). Powered by Vite, configured with Tailwind v4 styling utilizing a modern "shadcn-inspired" dynamic UI.

### Backend Infrastructure (Spring Boot 3 + Java 17)
The backend logic is horizontally sliced into standalone functional units:
1. **Auth Service (`:3001` | `/api/auth/`)**: Handles authentication and system-wide JWT issuing.
2. **Patient Service (`:3002` | `/api/patients/`)**: Core patient demographic and record endpoints.
3. **Doctor Service (`:3003` | `/api/doctors/`)**: Doctor credential, specialty, and availability management.
4. **Appointment Service (`:3004` | `/api/appointments/`)**: Booking reservations, cancellations, and state synchronization.
5. **Telemedicine Service (`:3005` | `/api/telemedicine/`)**: Remote video consultation management tools.
6. **Payment Service (`:3006` | `/api/payments/`)**: Invoicing, transaction states, and billing history.
7. **Notification Service (`:3007` | `/api/notifications/`)**: Webhook triggers, Email, and SMS alert delivery systems.
8. **AI Symptom Service (`:3008` | `/api/ai/`)**: Algorithms and third-party integrations for symptom diagnostics checking.

### API Gateway (`:8080`)
A production-grade **NGINX** gateway sits in front of the microservices. It handles:
- Layer 7 Route resolution
- GZIP response compression
- Endbound Rate limiting (DDoS protection)
- Enforcing strict browser security headers (XSS, HSTS, frame options)

---

## 🚀 Setup & Execution Instructions

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Start the Docker Daemon first)
- [Node.js](https://nodejs.org/) (For running the frontend)

### Step 1: Spin up the Backend Stack
From the root directory of the repository, execute:
```bash
docker compose up --build -d
```
Docker will compile all 8 Maven/Spring Boot projects natively using Eclipse Temurin images, build the NGINX gateway, and spin up an isolated network container for each. To verify, run `docker compose ps`. 
The entire backend API is now accessible via `http://localhost:8080`.

### Step 2: Spin up the Dashboard Frontend
Open a new terminal session and navigate into the `web-client` directory. Install the dependencies and initiate the Vite dev server:
```bash
cd web-client
npm install
npm run dev
```

### Step 3: Access the System
Navigate to the localhost port provided by Vite in Step 2 (e.g., `http://localhost:5173`) in your web browser. You will see the MediCare dashboard.

---

> **Development Note**: A history of team-assigned service responsibilities structure (from the initial scaffold) is maintained by the team leads directly on the issue tracker. JWT filter sharing is actively governed in `auth-service`.
