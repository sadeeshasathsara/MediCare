# Patient Management Service — Implementation Plan

Date: 2026-04-04

## 1) Scope (what we will deliver)

This plan implements the **Patient Management Service** and the **relevant web-client UI**.

### Backend (patient-service)
- **Profile Management**
  - `GET /patients/{id}` — retrieve patient profile
  - `PUT /patients/{id}` — update name, DOB, contact, address (and email via auth-service flow; see below)
  - `DELETE /patients/{id}` — soft-delete patient account (**Admin only**)
- **Medical Document Upload**
  - `POST /patients/{id}/reports` — upload PDF or image report (`multipart/form-data`)
  - `GET /patients/{id}/reports` — list reports (metadata)
  - `GET /patients/{id}/reports/{reportId}` — download report
  - Files stored in **cloud object storage** (S3-compatible by default); metadata stored in MongoDB
- **Medical History & Prescriptions**
  - `GET /patients/{id}/history` — view appointment + consultation history (via Appointment Service)
  - `GET /patients/{id}/prescriptions` — view prescriptions (via Doctor Service)
- **Admin Operations**
  - `GET /admin/patients` — list all patients (paginated)
  - `PATCH /admin/patients/{id}/status` — activate/deactivate

### Web client (web-client)
- Patient profile page: view/edit profile, upload/list/download reports, view history/prescriptions.
- Admin patients page: list patients (paginated) + activate/deactivate.

## 2) Key decisions (resolved)

### 2.1 Patient identifier (`{id}`)
- `{id}` is the **Auth Service `userId`** (JWT subject), passed through the gateway as `X-User-Id`.
- MongoDB `_id` remains an internal storage identifier.

Why: ownership checks and cross-service joins become trivial (everything keys off `userId`).

### 2.2 MongoDB per-service databases
- Each service uses its **own MongoDB database**.
- Patient-service reads `SPRING_DATA_MONGODB_URI` (already present in root `.env` and `docker-compose.yml`).

### 2.3 Email is editable and must be usable for login
- **Auth Service owns the canonical email** used for login (`findByEmail`).
- The web-client will update email by calling an authenticated **auth-service** endpoint (added if missing):
  - `PATCH /auth/me/email` with `{ "email": "new@example.com" }`
- Patient-service may mirror email for display, but it must not be the system of record.

## 3) API gateway path mapping (required for clean routes)

Your Nginx gateway currently proxies `/api/patients/...` to patient-service `/...` (no rewrite). To expose the spec routes cleanly (and to avoid patient-service having awkward root-level paths), update the gateway to rewrite to patient-service prefixes.

### Proposed Nginx routing
- External (web-client): `http://<gateway>/api/patients/...`
- Internal (patient-service): `http://patient-service:3002/patients/...`

Add these rewrite rules in `gateway/nginx.conf`:
- `/api/patients/admin/` → `/admin/`
- `/api/patients/` → `/patients/`

Acceptance check:
- `GET /api/patients/<userId>` reaches patient-service `GET /patients/<userId>`.

## 4) Backend design (patient-service)

### 4.1 Packages / structure
Use the existing package layout:
- `com.healthcare.patient.controller`
- `com.healthcare.patient.dto`
- `com.healthcare.patient.model`
- `com.healthcare.patient.repository`
- `com.healthcare.patient.security`
- `com.healthcare.patient.service`

### 4.2 MongoDB collections

#### `patients`
- `userId` (string, **unique**) — auth user id
- `email` (string, optional mirror)
- `name` (string)
- `dob` (date)
- `contact` (object: phone, etc.)
- `address` (object)
- `status` (`ACTIVE` | `INACTIVE`)
- `deletedAt` (Instant, nullable)
- `createdAt`, `updatedAt`

Indexes:
- unique index on `userId`
- optional index on `status`

#### `patient_reports`
- `userId` (string)
- `storageKey` (string)
- `originalFileName` (string)
- `contentType` (string)
- `size` (long)
- `uploadedAt` (Instant)

Indexes:
- compound index `{ userId, uploadedAt }`

### 4.3 Authentication & Authorization (gateway header model)

The gateway already validates JWT via `/auth/validate` and forwards these headers:
- `X-User-Id`
- `X-User-Role`
- `X-User-Verified`

Patient-service will:
- Create a `OncePerRequestFilter` that reads `X-User-Id` and `X-User-Role` and populates Spring Security context.
- Enable method security and protect admin endpoints with `@PreAuthorize("hasRole('ADMIN')")`.

Ownership rules:
- For routes with `{id}`:
  - Allow if `X-User-Role == ADMIN` OR `X-User-Id == {id}`
  - Otherwise `403`.

### 4.4 Endpoint specifications

#### Profile
- `GET /patients/{id}`
  - 200: patient profile
  - 404: no profile (optional: auto-create on first access)
- `PUT /patients/{id}`
  - Body: `{ name, dob, contact, address }` (and `email` only if you decide to mirror)
  - 200: updated profile
  - 400: validation
- `DELETE /patients/{id}` (Admin only)
  - Soft-delete: set `deletedAt=now`, `status=INACTIVE`
  - 204 no content

#### Reports
- `POST /patients/{id}/reports`
  - `multipart/form-data` with `file`
  - Validate type: `application/pdf`, `image/png`, `image/jpeg`
  - Store file in object storage; store metadata in Mongo
  - 201: report metadata
- `GET /patients/{id}/reports`
  - 200: list of report metadata
- `GET /patients/{id}/reports/{reportId}`
  - 200: streamed download with correct `Content-Type`
  - 404: unknown report

#### History & prescriptions (aggregation)
- `GET /patients/{id}/history`
  - Calls appointment-service endpoint(s) once implemented.
  - If upstream missing/unavailable: return `503` with a clear message.
- `GET /patients/{id}/prescriptions`
  - Calls doctor-service endpoint(s) once implemented.
  - If upstream missing/unavailable: return `503` with a clear message.

#### Admin
- `GET /admin/patients?page=&size=`
  - 200: `{ items: [...], page, size, total }`
- `PATCH /admin/patients/{id}/status`
  - Body: `{ status: "ACTIVE" | "INACTIVE" }`
  - 200: updated patient

### 4.5 Storage implementation (S3-compatible default)

Implement a `StorageService` interface and an S3 adapter.

Config (env vars):
- `PATIENT_STORAGE_PROVIDER=s3`
- `S3_ENDPOINT` (optional for MinIO)
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

Local dev option (recommended): add a MinIO service to docker-compose and use it as the S3 endpoint.

## 5) Auth-service change (for editable email)

Add authenticated endpoint:
- `PATCH /auth/me/email`
  - Requires valid Bearer token
  - Uses authenticated principal `userId`
  - Normalizes email, checks uniqueness, updates the user record
  - Returns updated user info (or `204`)

Web-client behavior:
- When patient updates profile and changes email:
  - Call auth-service email endpoint first
  - Then call patient-service profile update

Acceptance:
- User can login using the updated email.

## 6) Web-client UI plan

### 6.1 Patient profile page
Update `web-client/src/features/patients/pages/PatientProfilePage.jsx` to include:
- Profile form (name, DOB, contact, address, email)
- Reports section:
  - upload button + file picker
  - list reports with download action
- History + prescriptions sections:
  - read-only lists
  - show “Not available yet” if patient-service returns `503` for upstream dependency

Add API client helpers:
- `web-client/src/features/patients/services/patientsApi.js`
  - `getProfile(userId)`
  - `updateProfile(userId, payload)`
  - `uploadReport(userId, file)`
  - `listReports(userId)`
  - `downloadReport(userId, reportId)`

### 6.2 Admin patients page
Create:
- `web-client/src/features/patients/pages/AdminPatientsPage.jsx`
Wire routing:
- Add admin route in `web-client/src/routes/AppRoutes.jsx` to match sidebar link `/patients`.

UI:
- paginated table
- activate/deactivate control calling `PATCH /api/patients/admin/patients/{id}/status`

## 7) Milestones (recommended implementation order)

1. **Gateway route rewrite** for patient-service (`/api/patients/...` → `/patients/...`)
2. Patient-service security filter (gateway headers) + role/ownership checks
3. Patient profile: model/repo/service/controller + validation
4. Auth-service: `PATCH /auth/me/email` + web-client wiring
5. Reports: storage abstraction + upload/list/download endpoints
6. Admin endpoints: list + status patch
7. Web-client patient profile UI + admin patients UI
8. History/prescriptions aggregator stubs (return `503`) + later integration when upstream endpoints exist
9. Tests + smoke checks

## 8) Testing & acceptance checklist

Backend:
- Ownership enforcement: patient cannot access other patient ids; admin can.
- Soft-delete: patient becomes inactive and excluded/flagged appropriately.
- Upload validation: rejects non-PDF/image and oversized payloads.
- Download returns correct content type and bytes.
- Admin list pagination works.

Frontend:
- Patient can view/edit profile and sees server validation errors.
- Patient can upload and download a report.
- Admin can view patient list and change status.
- Email change updates login behavior.

## 9) Non-goals (explicit)
- No new “nice-to-have” pages, dashboards, or extra filters beyond the required UI.
- No attempt to fully implement appointment/doctor prescription endpoints if they don’t exist yet; patient-service will integrate once upstream contracts are available.
