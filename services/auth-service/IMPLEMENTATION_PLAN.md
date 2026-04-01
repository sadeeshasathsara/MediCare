# Authentication & Authorization Service — Implementation Plan

> Service: `auth-service` (Spring Boot 3.2, Java 17, MongoDB)

## Goals

Implement a centralized authentication and authorization service that provides:

- User registration and login for **PATIENT** and **DOCTOR** roles
- A distinct **ADMIN** role with admin-only capabilities
- JWT-based authentication for downstream services (RBAC claims)
- Refresh-token sessions (rotation + revocation)
- Doctor verification workflow (admin approves/rejects doctor registrations)
- Security hardening (rate limiting, HTTPS enforcement in production, CORS)
- Environment-based secret management (local `.env`, Docker, Kubernetes Secrets)

## Roles & RBAC

### Roles

- `PATIENT`
- `DOCTOR`
- `ADMIN`

### Core rules

- **PATIENT** and **DOCTOR** can register and login.
- **DOCTOR** accounts start **unverified** and cannot login until verified.
- **ADMIN** can:
  - Approve/reject doctor registrations
  - Manage accounts (disable/enable users, reset verification status, etc.)

### JWT claims (required by other services)

Access tokens must include enough claims for other services to do RBAC without calling auth-service:

- `sub`: user id (Mongo id)
- `role`: `PATIENT | DOCTOR | ADMIN`
- `verified`: boolean (relevant for doctors)
- `email`: user email (optional but helpful)
- `iat`, `exp`, `iss` (issuer)

## API Endpoints

> All endpoints are under `/auth/*` at the service level. The gateway may expose them as `/api/auth/*`.

### 1) Registration

`POST /auth/register`

- Registers **PATIENT** or **DOCTOR** with role.
- For `DOCTOR`, collects a small set of verification fields and sets `doctorVerified=false` (requires admin approval).

Request (PATIENT example)

```json
{
  "email": "jane@example.com",
  "password": "P@ssw0rd!",
  "role": "PATIENT",
  "fullName": "Jane Doe"
}
```

Request (DOCTOR example — minimal campus-project verification)

```json
{
  "email": "dr.jane@example.com",
  "password": "P@ssw0rd!",
  "role": "DOCTOR",
  "fullName": "Dr. Jane Doe",
  "doctorProfile": {
    "licenseNumber": "SLMC-12345",
    "specialty": "Cardiology",
    "phone": "+94xxxxxxxxx"
  }
}
```

Response (example)

```json
{
  "id": "...",
  "email": "jane@example.com",
  "role": "DOCTOR",
  "doctorVerified": false,
  "doctorProfile": {
    "licenseNumber": "SLMC-12345",
    "specialty": "Cardiology",
    "phone": "+94xxxxxxxxx"
  }
}
```

### 2) Login

`POST /auth/login`

- Returns JWT access token + refresh token.
- Denies login if:
  - account is disabled
  - role is `DOCTOR` and `doctorVerified=false`

Request (example)

```json
{ "email": "jane@example.com", "password": "P@ssw0rd!" }
```

Response (example)

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque>",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "user": { "id": "...", "role": "DOCTOR", "doctorVerified": true }
}
```

### 3) Refresh

`POST /auth/refresh`

- Exchanges a refresh token for a new access token.
- Uses refresh-token rotation: old token is revoked and replaced.

Request

```json
{ "refreshToken": "<opaque>" }
```

Response

```json
{ "accessToken": "<jwt>", "refreshToken": "<new-opaque>", "tokenType": "Bearer" }
```

### 4) Logout

`POST /auth/logout`

- Revokes the provided refresh token.

Request

```json
{ "refreshToken": "<opaque>" }
```

Response: `204 No Content`

### 5) Doctor verification (admin-only)

`POST /auth/verify-doctor`

- Admin approves/rejects doctor registrations.

Request

```json
{
  "doctorUserId": "...",
  "decision": "APPROVE",
  "reason": "License verified"
}
```

Response

```json
{ "doctorUserId": "...", "doctorVerified": true }
```

### (Optional) Admin account management (admin-only)

If needed for the dashboard:

- `GET /auth/admin/users` (paged list)
- `PATCH /auth/admin/users/{id}` (disable/enable, reset verification)

## Data Model (MongoDB)

### `users` collection

Fields:

- `id` (ObjectId)
- `email` (unique index)
- `passwordHash` (BCrypt)
- `role` (`PATIENT|DOCTOR|ADMIN`)
- `doctorVerified` (boolean, default `false` for `DOCTOR`, `true` otherwise)
- `doctorProfile` (object, only for `DOCTOR`)
  - `licenseNumber` (string)
  - `specialty` (string)
  - `phone` (string)
- `doctorVerificationStatus` (enum: `PENDING|APPROVED|REJECTED`, default `PENDING` for `DOCTOR`)
- `status` (`ACTIVE|DISABLED`)
- `createdAt`, `updatedAt`

Indexes:

- Unique: `email`

### `refresh_tokens` (or `sessions`) collection

Fields:

- `id` (ObjectId)
- `userId`
- `tokenHash` (hash of opaque refresh token)
- `expiresAt` (TTL index)
- `revokedAt` (nullable)
- `replacedByTokenId` (nullable)
- `createdAt`
- (optional) `ip`, `userAgent`

Indexes:

- TTL: `expiresAt`
- Query: `userId`

## Implementation Steps (recommended order)

### Step A — Project skeleton & packages

Create packages under `com.healthcare.auth`:

- `config` (security, cors)
- `controller` (auth endpoints)
- `dto` (requests/responses)
- `model` (Mongo documents)
- `repository`
- `service` (AuthService, TokenService, VerificationService)
- `security` (JWT filter, utilities, role guards)

### Step B — Configuration & secrets

Add env-driven properties:

- `SPRING_DATA_MONGODB_URI`
- `JWT_SECRET` (maps to `jwt.secret`)
- `JWT_ACCESS_TTL_MS` (default e.g. 900000)
- `JWT_REFRESH_TTL_MS` (default e.g. 604800000)
- `CORS_ALLOWED_ORIGINS` (comma-separated)

Update:

- `src/main/resources/application.properties` to avoid hard-coded secrets
- `services/auth-service/.env.example` to list required vars
- Kubernetes secret keys must match [k8s/auth-deployment.yaml](../../k8s/auth-deployment.yaml)

### Step C — User registration

- `AuthController.register()`
- Validate payload with `@Valid`
- Enforce role whitelist: only PATIENT/DOCTOR registrable via this endpoint
- Hash password with BCrypt
- Persist user

Doctor-specific requirements (minimal):

- If `role=DOCTOR`, require `doctorProfile.licenseNumber`, `doctorProfile.specialty`, `doctorProfile.phone`
- Set:
  - `doctorVerified=false`
  - `doctorVerificationStatus=PENDING`

### Step D — Login + access/refresh issuance

- `AuthController.login()`
- Authenticate via repository lookup + BCrypt match
- Enforce doctor verification gate
- Create JWT access token
- Create opaque refresh token, store **hash** in DB

### Step E — Refresh rotation

- `AuthController.refresh()`
- Validate refresh token by hashing and comparing
- Ensure not revoked, not expired
- Rotate: revoke old token, issue new refresh token, issue new access token

### Step F — Logout

- `AuthController.logout()`
- Revoke refresh token record

### Step G — JWT middleware + RBAC

- Configure Spring Security with `SecurityFilterChain`
- Stateless sessions
- JWT filter:
  - Verify signature + expiry
  - Populate `Authentication` principal with user context
- Add role guards:
  - `verify-doctor` admin-only
  - optional admin endpoints admin-only

### Step H — Doctor verification flow

- `AuthController.verifyDoctor()` admin-only
- Update doctor user record:
  - Approve: `doctorVerified=true`, `doctorVerificationStatus=APPROVED`
  - Reject: `doctorVerified=false`, `doctorVerificationStatus=REJECTED`
- (optional) record verification audit fields

### Step I — Security hardening

- Rate limiting on `POST /auth/login`
  - Prefer Bucket4j (filter or interceptor)
  - Keyed by IP + email
- HTTPS enforcement in production
  - Respect `X-Forwarded-Proto` when behind gateway/ingress
- CORS
  - Only allow configured origins
  - Allow `Authorization` header

## Integration Notes for Other Services

## API Gateway Validation (Nginx)

> Decision: authenticate/validate at the gateway first, then proxy to the relevant service.

### Approach used (works with OSS Nginx)

- Use Nginx `auth_request` on protected routes (`/api/patients/*`, `/api/doctors/*`, etc.).
- Nginx performs an internal subrequest to `/_auth`.
- `/_auth` proxies to the auth-service endpoint: `GET /auth/validate`.
- Auth-service validates `Authorization: Bearer <JWT>` and returns:
  - `200 OK` + response headers: `X-User-Id`, `X-User-Role`, `X-User-Verified`
  - or `401 Unauthorized` if invalid/missing
- Nginx forwards the verified user context to upstream services as request headers:
  - `X-User-Id`, `X-User-Role`, `X-User-Verified`

### Public vs protected routing

- Public:
  - `/api/auth/*` (login/register/refresh/logout)
- Protected (requires JWT):
  - `/api/patients/*`, `/api/doctors/*`, `/api/appointments/*`, `/api/telemedicine/*`, `/api/payments/*`, `/api/notifications/*`, `/api/ai/*`

### Gateway path mapping note

- The gateway exposes auth-service as `/api/auth/*`.
- Internally, auth-service implements routes under `/auth/*`.
- Gateway should proxy `/api/auth/` to `http://auth-service:3001/auth/`.

Other services need:

- Same `JWT_SECRET`
- A shared JWT validation filter that:
  - validates tokens
  - extracts `sub` + `role` (+ `verified`)
  - enforces role guards per endpoint

## Web Client Changes (Vite + React)

> Scope: update the existing web client to use the real auth-service endpoints and enforce role-based UX.

### 1) Environment configuration

- Ensure the frontend points to the gateway API base URL:
  - `VITE_API_BASE_URL=http://localhost:8080/api` (default already used by `src/services/api.js`)
- In production, set `VITE_API_BASE_URL` to the deployed gateway origin.

### 2) Replace fake login with real API calls

Current: `LoginPage.jsx` generates a fake JWT locally.

Change to:

- Call `POST /auth/login` via the shared Axios instance (`src/services/api.js`).
- On success, persist **access token** and **refresh token**, then route by role:
  - `ADMIN`  ` /`
  - `PATIENT`  ` /patient/dashboard`
  - `DOCTOR`  ` /doctor/dashboard`
- If backend returns a doctor-not-verified error, show a clear message (do not silently fail).

### 3) Token storage & auth state (AuthContext)

Current: `AuthContext` stores only `token` under localStorage key `token` and decodes JWT via `atob()`.

Update to support refresh sessions:

- Store:
  - `accessToken` (short-lived)
  - `refreshToken` (long-lived)
- Recommended approach (more secure for browsers): store refresh token as an `HttpOnly` cookie (requires backend cookie support).
- MVP approach (matches current style): store refresh token in `localStorage` (e.g., key `refreshToken`) and accept the XSS tradeoff.

JWT decoding note:

- JWT payload uses Base64URL encoding; `atob(token.split('.')[1])` can fail for real tokens.
- Add a small Base64URL decode helper in the frontend and use it in `AuthContext`.

### 4) API client behavior (Axios)

Current: `src/services/api.js` redirects to `/login` on any 401.

Change to:

- On 401, attempt `POST /auth/refresh` once (using stored refresh token or cookie).
- If refresh succeeds:
  - update stored access token
  - retry the original failed request
- If refresh fails:
  - clear tokens
  - navigate to `/login`

### 5) Logout UX

Current: logout only clears localStorage.

Change to:

- Call `POST /auth/logout` with the refresh token (or rely on cookie invalidation if using cookies).
- Then clear local auth state and route to `/login`.

### 6) Registration UI

Current: register route is commented out in `AppRoutes.jsx`.

Implement:

- A `RegisterPage` (or split Patient/Doctor registration UI) that calls `POST /auth/register`.
- For doctor registration, collect only these extra fields:
  - License number
  - Specialty
  - Phone
- After doctor registration, display: "Pending admin verification".

### 7) Role-protected routing

Add a simple route guard pattern:

- Block protected pages when unauthenticated.
- Enforce role checks:
  - Admin-only pages/components (doctor verification, account management)
  - Patient-only and Doctor-only dashboards

Implementation options:

- A `ProtectedRoute` wrapper component that checks `user.role` and redirects.
- Or guard inside layouts (`AdminLayout`, `TopNavLayout`) using `useAuth()`.

### 8) Admin dashboard: doctor verification

UI work needed for the ADMIN role:

- Add an admin view in the dashboard to list **unverified doctors** (requires an admin API endpoint, e.g., `GET /auth/admin/users?role=DOCTOR&verified=false`).
- Add Approve/Reject actions that call `POST /auth/verify-doctor`.
- After action, refresh the list and show success/error feedback.

### 9) CORS alignment

- Ensure the frontend origin(s) are included in auth-service CORS configuration.
- If using cookies for refresh tokens, enable `withCredentials` in Axios and configure server-side CORS to allow credentials.

## Testing Checklist

Add tests (MockMvc + Spring Boot Test):

- Register PATIENT succeeds
- Register DOCTOR creates `doctorVerified=false`
- Login DOCTOR denied until verified
- Login returns access + refresh
- Refresh rotates and revokes old token
- Logout revokes refresh token
- Admin-only verify endpoint rejects non-admin
- Rate limit triggers after repeated failures

## Delivery Checklist

- Endpoints implemented and documented
- Mongo collections + indexes present
- JWT + refresh lifecycle works end-to-end
- Admin verification works
- CORS and rate limiting configured
- Secrets configurable via `.env` and K8s secrets
