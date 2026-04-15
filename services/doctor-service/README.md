# Doctor Service – API Reference & Testing Guide

> **All endpoints are accessed exclusively through the API Gateway.**
>
> **Gateway Base URL:** `http://localhost:8088`
>
> The NGINX gateway routes `/api/doctors/*` → `doctor-service:3003/*` (internal Docker network).
> Individual services are **NOT** directly accessible from your machine.
>
> ⚠️ **Authentication Required:** All `/api/doctors/` endpoints go through gateway JWT validation.
> You must include a valid `Authorization: Bearer <token>` header obtained from the Auth Service.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication (Get a Token First)](#authentication-get-a-token-first)
- [Environment Variables](#environment-variables)
- [1. Health Check](#1-health-check)
- [2. Profile & Specialty Management](#2-profile--specialty-management)
- [3. Availability Schedule](#3-availability-schedule)
- [4. Appointment Request Handling](#4-appointment-request-handling)
- [5. Digital Prescriptions](#5-digital-prescriptions)
- [6. View Patient Reports](#6-view-patient-reports)
- [7. Internal API (Cross-Service)](#7-internal-api-cross-service)
- [Error Response Format](#error-response-format)
- [Data Models](#data-models)

---

## Architecture Overview

```
  Browser / Postman
        │
        ▼
┌──────────────────────┐
│   NGINX API Gateway  │  ← http://localhost:8088
│   (Port 8088)        │
│                      │
│  /api/doctors/*  ────┼──→  doctor-service:3003  (Docker internal)
│  /api/auth/*     ────┼──→  auth-service:3001    (Docker internal)
│  /api/patients/* ────┼──→  patient-service:3002  (Docker internal)
│  ...                 │
└──────────────────────┘

Gateway handles:
  1. JWT validation via auth-service (/_auth subrequest)
  2. Forwards X-User-Id, X-User-Role, X-User-Verified headers
  3. Rate limiting, GZIP, security headers
```

### Project Structure
```
com.healthcare.doctor
├── config/                  # CORS configuration
├── controller/              # REST controllers (API layer)
│   ├── HealthController     # Health check endpoint
│   ├── DoctorController     # Profile & specialty endpoints
│   ├── AvailabilityController # Availability slot management
│   ├── AppointmentController  # Appointment accept/reject
│   ├── PrescriptionController # Prescription CRUD
│   ├── PatientReportController # Patient report viewing
│   └── InternalController     # Cross-service read-only API
├── dto/                     # Request/response DTOs
├── exception/               # Global exception handler
├── model/                   # MongoDB document entities
├── repository/              # Spring Data MongoDB repositories
└── service/                 # Business logic layer
```

---

## Authentication (Get a Token First)

Before calling any doctor endpoints, you need a JWT token from the Auth Service.

> **Note:** Auth endpoints (`/api/auth/login`, `/api/auth/register`) do **NOT** require a token.

### Step 1 – Register a doctor account (one-time)
```bash
curl -X POST http://localhost:8088/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "Test1234!",
    "fullName": "Dr. Test Doctor",
    "role": "DOCTOR",
    "doctorProfile": {
      "licenseNumber": "SLMC-99999",
      "specialty": "Cardiology",
      "phone": "+94771234567"
    }
  }'
```

> ⚠️ Doctor accounts require admin verification before login. An admin must call `/api/auth/verify-doctor`.

### Step 2 – Login to get a token
```bash
curl -X POST http://localhost:8088/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@test.com",
    "password": "Test1234!"
  }'
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "abc123...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "user-id-001",
    "role": "DOCTOR",
    "doctorVerified": true
  }
}
```

### Step 3 – Use the token in all doctor endpoints
```bash
# Save the token to a variable for convenience
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Now use it in every request:
curl http://localhost:8088/api/doctors/doctors \
  -H "Authorization: Bearer $TOKEN"
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SPRING_DATA_MONGODB_URI` | `mongodb+srv://...` | MongoDB connection string |
| `DOCTOR_SERVER_PORT` | `3003` | Internal server port (inside Docker) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins |
| `DOCTOR_DEFAULT_SPECIALTIES` | *(see .env.example)* | Comma-separated default specialties |

---

## 1. Health Check

### `GET /api/doctors/health`

> Health check does NOT require authentication.

```bash
curl http://localhost:8088/api/doctors/health
```

**Response `200 OK`:**
```json
{
  "status": "UP",
  "service": "doctor-service"
}
```

---

## 2. Profile & Specialty Management

### `GET /api/doctors/doctors` – List all verified doctors

**Query Parameters:**
| Param | Required | Description |
|---|---|---|
| `specialty` | No | Filter by specialty (case-insensitive) |

```bash
# List all verified doctors
curl http://localhost:8088/api/doctors/doctors \
  -H "Authorization: Bearer $TOKEN"

# Filter by specialty
curl "http://localhost:8088/api/doctors/doctors?specialty=Cardiology" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:**
```json
[
  {
    "id": "6651abc123def456",
    "userId": "auth-user-id-001",
    "fullName": "Dr. Jane Smith",
    "email": "jane.smith@hospital.com",
    "phone": "+94771234567",
    "specialty": "Cardiology",
    "bio": "15 years of experience in interventional cardiology",
    "qualifications": ["MBBS", "MD", "FACC"],
    "licenseNumber": "SLMC-12345",
    "consultationFee": 3500.00,
    "verified": true,
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-03-20T10:30:00Z"
  }
]
```

**Error `401 Unauthorized` (missing or invalid token):**
> Gateway returns a raw `401` status with no body.

---

### `GET /api/doctors/doctors/specialties` – List all available specialties

```bash
curl http://localhost:8088/api/doctors/doctors/specialties \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:**
```json
[
  "Cardiology",
  "Dermatology",
  "General Practice",
  "Neurology",
  "Pediatrics"
]
```

---

### `GET /api/doctors/doctors/{id}` – Retrieve doctor profile

```bash
curl http://localhost:8088/api/doctors/doctors/6651abc123def456 \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:**
```json
{
  "id": "6651abc123def456",
  "userId": "auth-user-id-001",
  "fullName": "Dr. Jane Smith",
  "email": "jane.smith@hospital.com",
  "phone": "+94771234567",
  "specialty": "Cardiology",
  "bio": "15 years of experience in interventional cardiology",
  "qualifications": ["MBBS", "MD", "FACC"],
  "licenseNumber": "SLMC-12345",
  "consultationFee": 3500.00,
  "verified": true,
  "createdAt": "2026-01-15T08:00:00Z",
  "updatedAt": "2026-03-20T10:30:00Z"
}
```

**Error `404 Not Found`:**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Doctor not found",
  "path": "/doctors/invalid-id"
}
```

---

### `PUT /api/doctors/doctors/{id}` – Update doctor profile

**Request Body (all fields optional):**
```bash
curl -X PUT http://localhost:8088/api/doctors/doctors/6651abc123def456 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Updated bio with 20 years of experience",
    "qualifications": ["MBBS", "MD", "FACC", "PhD"],
    "specialty": "Cardiology",
    "consultationFee": 4000.00,
    "phone": "+94771234999",
    "fullName": "Dr. Jane A. Smith"
  }'
```

**Response `200 OK`:** Returns the full updated doctor profile (same shape as GET).

**Error `400 Bad Request`:**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "specialty cannot be blank",
  "path": "/doctors/6651abc123def456"
}
```

---

## 3. Availability Schedule

### `POST /api/doctors/doctors/{id}/availability` – Set weekly availability slots

```bash
curl -X POST http://localhost:8088/api/doctors/doctors/6651abc123def456/availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slots": [
      {
        "dayOfWeek": "MONDAY",
        "startTime": "09:00",
        "endTime": "12:00"
      },
      {
        "dayOfWeek": "MONDAY",
        "startTime": "14:00",
        "endTime": "17:00"
      },
      {
        "dayOfWeek": "WEDNESDAY",
        "startTime": "10:00",
        "endTime": "15:00"
      }
    ]
  }'
```

**Response `201 Created`:**
```json
[
  {
    "id": "slot-id-001",
    "doctorId": "6651abc123def456",
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "12:00",
    "status": "AVAILABLE",
    "createdAt": "2026-04-05T06:00:00Z",
    "updatedAt": "2026-04-05T06:00:00Z"
  },
  {
    "id": "slot-id-002",
    "doctorId": "6651abc123def456",
    "dayOfWeek": "MONDAY",
    "startTime": "14:00",
    "endTime": "17:00",
    "status": "AVAILABLE",
    "createdAt": "2026-04-05T06:00:00Z",
    "updatedAt": "2026-04-05T06:00:00Z"
  }
]
```

**Validation Rules:**
| Field | Rule |
|---|---|
| `dayOfWeek` | Must be `MONDAY` – `SUNDAY` (case-insensitive) |
| `startTime` | `HH:mm` format (e.g., `09:00`) |
| `endTime` | `HH:mm` format, must be after `startTime` |
| `slots` | At least one slot required |

**Error `400 Bad Request` (invalid day):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid dayOfWeek: Funday. Must be one of: [MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY]",
  "path": "/doctors/6651abc123def456/availability"
}
```

**Error `400 Bad Request` (invalid time format):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "startTime must be in HH:mm format (e.g. 09:00)",
  "path": "/doctors/6651abc123def456/availability"
}
```

**Error `400 Bad Request` (endTime before startTime):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "endTime must be after startTime for slot on MONDAY",
  "path": "/doctors/6651abc123def456/availability"
}
```

---

### `GET /api/doctors/doctors/{id}/availability` – Retrieve available time slots

```bash
curl http://localhost:8088/api/doctors/doctors/6651abc123def456/availability \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:**
```json
[
  {
    "id": "slot-id-001",
    "doctorId": "6651abc123def456",
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "12:00",
    "status": "AVAILABLE",
    "createdAt": "2026-04-05T06:00:00Z",
    "updatedAt": "2026-04-05T06:00:00Z"
  }
]
```

---

### `PUT /api/doctors/doctors/{id}/availability/{slotId}` – Update or block a slot

```bash
curl -X PUT http://localhost:8088/api/doctors/doctors/6651abc123def456/availability/slot-id-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "10:00",
    "endTime": "13:00",
    "status": "BLOCKED"
  }'
```

**Allowed status values:** `AVAILABLE`, `BOOKED`, `BLOCKED`

**Response `200 OK`:** Returns updated slot object.

**Error `403 Forbidden`:**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Slot does not belong to this doctor",
  "path": "/doctors/6651abc123def456/availability/slot-id-999"
}
```

**Error `404 Not Found`:**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 404,
  "error": "Not Found",
  "message": "Slot not found",
  "path": "/doctors/6651abc123def456/availability/invalid-slot"
}
```

---

## 4. Appointment Request Handling

### `GET /api/doctors/doctors/{id}/appointments` – View pending and upcoming appointments

**Query Parameters:**
| Param | Required | Default | Description |
|---|---|---|---|
| `status` | No | `PENDING + ACCEPTED` | Filter by status |

**Allowed status values:** `PENDING`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED`

```bash
# Default: PENDING + ACCEPTED
curl http://localhost:8088/api/doctors/doctors/6651abc123def456/appointments \
  -H "Authorization: Bearer $TOKEN"

# Filter by specific status
curl "http://localhost:8088/api/doctors/doctors/6651abc123def456/appointments?status=PENDING" \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:**
```json
[
  {
    "id": "appt-id-001",
    "doctorId": "6651abc123def456",
    "patientId": "patient-id-001",
    "patientName": "John Doe",
    "scheduledAt": "2026-04-10T09:00:00Z",
    "reason": "Routine cardiac checkup",
    "status": "PENDING",
    "notes": null,
    "createdAt": "2026-04-01T08:00:00Z",
    "updatedAt": "2026-04-01T08:00:00Z"
  }
]
```

**Error `400 Bad Request` (invalid status):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid status filter: INVALID. Must be one of: PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED",
  "path": "/doctors/6651abc123def456/appointments"
}
```

---

### `PATCH /api/doctors/doctors/{id}/appointments/{apptId}/status` – Accept or reject

```bash
curl -X PATCH http://localhost:8088/api/doctors/doctors/6651abc123def456/appointments/appt-id-001/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACCEPTED",
    "notes": "Please arrive 15 minutes early"
  }'
```

**Allowed status values:** `ACCEPTED` or `REJECTED` only.

**Response `200 OK`:**
```json
{
  "id": "appt-id-001",
  "doctorId": "6651abc123def456",
  "patientId": "patient-id-001",
  "patientName": "John Doe",
  "scheduledAt": "2026-04-10T09:00:00Z",
  "reason": "Routine cardiac checkup",
  "status": "ACCEPTED",
  "notes": "Please arrive 15 minutes early",
  "createdAt": "2026-04-01T08:00:00Z",
  "updatedAt": "2026-04-05T06:00:00Z"
}
```

**Error `400 Bad Request` (invalid decision):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "status must be ACCEPTED or REJECTED",
  "path": "/doctors/6651abc123def456/appointments/appt-id-001/status"
}
```

**Error `403 Forbidden` (not this doctor's appointment):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Appointment does not belong to this doctor",
  "path": "/doctors/6651abc123def456/appointments/appt-id-999/status"
}
```

**Error `409 Conflict` (appointment already processed):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Only PENDING appointments can be accepted or rejected. Current status: ACCEPTED",
  "path": "/doctors/6651abc123def456/appointments/appt-id-001/status"
}
```

---

## 5. Digital Prescriptions

### `POST /api/doctors/doctors/{id}/prescriptions` – Issue a prescription

```bash
curl -X POST http://localhost:8088/api/doctors/doctors/6651abc123def456/prescriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient-id-001",
    "appointmentId": "appt-id-001",
    "diagnosis": "Mild hypertension",
    "medications": [
      {
        "name": "Amlodipine",
        "dosage": "5mg",
        "frequency": "Once daily",
        "duration": "30 days",
        "instructions": "Take in the morning with water"
      },
      {
        "name": "Aspirin",
        "dosage": "75mg",
        "frequency": "Once daily",
        "duration": "30 days",
        "instructions": "Take after meals"
      }
    ],
    "notes": "Follow up in 4 weeks. Monitor blood pressure daily."
  }'
```

**Response `201 Created`:**
```json
{
  "id": "rx-id-001",
  "doctorId": "6651abc123def456",
  "patientId": "patient-id-001",
  "appointmentId": "appt-id-001",
  "diagnosis": "Mild hypertension",
  "medications": [
    {
      "name": "Amlodipine",
      "dosage": "5mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "Take in the morning with water"
    },
    {
      "name": "Aspirin",
      "dosage": "75mg",
      "frequency": "Once daily",
      "duration": "30 days",
      "instructions": "Take after meals"
    }
  ],
  "notes": "Follow up in 4 weeks. Monitor blood pressure daily.",
  "issuedAt": "2026-04-05T06:00:00Z",
  "createdAt": "2026-04-05T06:00:00Z"
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| `patientId` | Required, non-blank |
| `appointmentId` | Required, non-blank |
| `diagnosis` | Required, non-blank |
| `medications` | At least one medication required |
| `medications[].name` | Required |
| `medications[].dosage` | Required |
| `medications[].frequency` | Required |

**Error `400 Bad Request` (validation failure):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "patientId: patientId is required, diagnosis: diagnosis is required, medications: At least one medication is required",
  "path": "/doctors/6651abc123def456/prescriptions"
}
```

---

### `GET /api/doctors/doctors/{id}/prescriptions` – List all prescriptions issued

```bash
curl http://localhost:8088/api/doctors/doctors/6651abc123def456/prescriptions \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:** Returns an array of prescription objects (same shape as above).

---

## 6. View Patient Reports

### `GET /api/doctors/doctors/{id}/patients/{patientId}/reports` – View patient-uploaded reports

> **Access Control:** Only a doctor who has at least one appointment with the patient can view their reports. If there's no doctor-patient relationship, the server returns `403 Forbidden`.

```bash
curl http://localhost:8088/api/doctors/doctors/6651abc123def456/patients/patient-id-001/reports \
  -H "Authorization: Bearer $TOKEN"
```

**Response `200 OK`:**
```json
[
  {
    "id": "report-id-001",
    "patientId": "patient-id-001",
    "doctorId": "6651abc123def456",
    "appointmentId": "appt-id-001",
    "reportType": "Blood Test",
    "title": "Complete Blood Count (CBC)",
    "description": "Annual blood work results",
    "fileUrl": "https://storage.example.com/reports/cbc-2026.pdf",
    "uploadedAt": "2026-03-28T14:00:00Z"
  }
]
```

**Error `403 Forbidden` (no appointment relationship):**
```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Access denied: you do not have an appointment with this patient",
  "path": "/doctors/6651abc123def456/patients/unrelated-patient/reports"
}
```

---

## 7. Internal API (Cross-Service)

These endpoints are for **inter-service communication only** (e.g., Patient Service reading prescriptions). They are NOT routed through the API gateway and are only accessible within the Docker network.

### `GET /internal/patients/{patientId}/prescriptions`

Called internally by Patient Service at: `http://doctor-service:3003/internal/patients/{patientId}/prescriptions`

**Response `200 OK`:** Same prescription array shape as above.

---

## Error Response Format

All errors from the doctor-service return a consistent JSON structure:

```json
{
  "timestamp": "2026-04-05T06:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Human-readable description of what went wrong",
  "path": "/doctors/some-id/endpoint"
}
```

### HTTP Status Codes Used

| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful GET, PUT, PATCH |
| `201` | Created | Successful POST (new resource) |
| `400` | Bad Request | Validation failure, invalid input |
| `401` | Unauthorized | Missing or invalid JWT (returned by gateway) |
| `403` | Forbidden | Access denied (wrong doctor, no appointment relationship) |
| `404` | Not Found | Doctor, slot, appointment, or resource not found |
| `409` | Conflict | State conflict (e.g., appointment not PENDING) |
| `500` | Internal Server Error | Unexpected server error |

---

## Data Models

### Doctor
| Field | Type | Description |
|---|---|---|
| `id` | String | MongoDB document ID |
| `userId` | String | Reference to auth-service User ID |
| `fullName` | String | Doctor's full name |
| `email` | String | Email address |
| `phone` | String | Phone number |
| `specialty` | String | Medical specialty |
| `bio` | String | Professional biography |
| `qualifications` | String[] | List of qualifications (MBBS, MD, etc.) |
| `licenseNumber` | String | Medical license number |
| `consultationFee` | Double | Fee per consultation |
| `verified` | Boolean | Whether doctor is verified by admin |
| `createdAt` | Instant | Creation timestamp |
| `updatedAt` | Instant | Last update timestamp |

### AvailabilitySlot
| Field | Type | Description |
|---|---|---|
| `id` | String | MongoDB document ID |
| `doctorId` | String | Reference to Doctor ID |
| `dayOfWeek` | String | `MONDAY` through `SUNDAY` |
| `startTime` | String | Start time in `HH:mm` format |
| `endTime` | String | End time in `HH:mm` format |
| `status` | String | `AVAILABLE`, `BOOKED`, or `BLOCKED` |

### Appointment
| Field | Type | Description |
|---|---|---|
| `id` | String | MongoDB document ID |
| `doctorId` | String | Reference to Doctor ID |
| `patientId` | String | Reference to Patient ID |
| `patientName` | String | Patient's display name |
| `scheduledAt` | Instant | Appointment date/time |
| `reason` | String | Reason for visit |
| `status` | String | `PENDING`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| `notes` | String | Doctor's notes |

### Prescription
| Field | Type | Description |
|---|---|---|
| `id` | String | MongoDB document ID |
| `doctorId` | String | Reference to Doctor ID |
| `patientId` | String | Reference to Patient ID |
| `appointmentId` | String | Reference to Appointment ID |
| `diagnosis` | String | Diagnosis description |
| `medications` | Medication[] | List of prescribed medications |
| `notes` | String | Additional notes |
| `issuedAt` | Instant | When prescription was issued |

### Medication (embedded in Prescription)
| Field | Type | Description |
|---|---|---|
| `name` | String | Medication name |
| `dosage` | String | Dosage (e.g., "5mg") |
| `frequency` | String | How often (e.g., "Once daily") |
| `duration` | String | Duration (e.g., "30 days") |
| `instructions` | String | Special instructions |

### PatientReport
| Field | Type | Description |
|---|---|---|
| `id` | String | MongoDB document ID |
| `patientId` | String | Reference to Patient ID |
| `doctorId` | String | Reference to Doctor ID |
| `appointmentId` | String | Reference to Appointment ID |
| `reportType` | String | Type of report (e.g., "Blood Test") |
| `title` | String | Report title |
| `description` | String | Report description |
| `fileUrl` | String | URL to the uploaded file |
| `uploadedAt` | Instant | Upload timestamp |

---

## Endpoint Summary Table

| Method | Gateway URL | Description |
|---|---|---|
| `GET` | `/api/doctors/health` | Health check |
| `GET` | `/api/doctors/doctors` | List verified doctors |
| `GET` | `/api/doctors/doctors/specialties` | List specialties |
| `GET` | `/api/doctors/doctors/{id}` | Get doctor profile |
| `PUT` | `/api/doctors/doctors/{id}` | Update doctor profile |
| `POST` | `/api/doctors/doctors/{id}/availability` | Create availability slots |
| `GET` | `/api/doctors/doctors/{id}/availability` | Get availability |
| `PUT` | `/api/doctors/doctors/{id}/availability/{slotId}` | Update/block a slot |
| `GET` | `/api/doctors/doctors/{id}/appointments` | List appointments |
| `PATCH` | `/api/doctors/doctors/{id}/appointments/{apptId}/status` | Accept/reject |
| `POST` | `/api/doctors/doctors/{id}/prescriptions` | Issue prescription |
| `GET` | `/api/doctors/doctors/{id}/prescriptions` | List prescriptions |
| `GET` | `/api/doctors/doctors/{id}/patients/{patientId}/reports` | View reports |
