# Auth Service

The authentication microservice for the MediCare platform. 

## Responsibility
This service governs user logins, RBAC (Role-Based Access Control), credential verification, and issues JSON Web Tokens (JWTs). It acts as the backbone filter mechanism shared across the rest of the ecosystem.

## Stack
- Java 17
- Spring Boot 3
- Lombok
- Spring Security 

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```
*Note: It is generally recommended to run this within the fully deployed Docker Compose macro-system.*
*(Also available through the global gateway at `http://localhost:8080/api/auth/`)*

## Key Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/validate` (used by the API gateway)
- `POST /auth/verify-doctor` (ADMIN)
- `GET /auth/admin/pending-doctors` (ADMIN)

## Environment Variables

Required:

- `SPRING_DATA_MONGODB_URI`
- `JWT_SECRET`

Optional:

- `JWT_ACCESS_TTL_MS` (default `900000`)
- `JWT_REFRESH_TTL_MS` (default `604800000`)
- `CORS_ALLOWED_ORIGINS`

Admin bootstrap (disabled by default):

- `ADMIN_BOOTSTRAP_ENABLED`
- `ADMIN_BOOTSTRAP_EMAIL`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `ADMIN_BOOTSTRAP_FULL_NAME`
