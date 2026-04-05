# Patient Service

The patient management microservice for the MediCare platform. 

## Responsibility
This service manages the core domain logic regarding patient profiling, demographics, medical history linkage operations, and record indexing.

## Stack
- Java 17
- Spring Boot 3
- Lombok

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```
*Note: It is generally recommended to run this within the fully deployed Docker Compose macro-system.*
*(Also available through the global gateway at `http://localhost:8080/api/patients/`)*

## Environment (.env)
- This service has a service-scoped environment file at `services/patient-service/.env` (gitignored).
- Use `services/patient-service/.env.example` as a template.
- `docker-compose.yml` loads this file via `env_file` for the `patient-service` container.

MongoDB URI note: in Docker Compose, `SPRING_DATA_MONGODB_URI` is provided from the common/root `.env` via `MONGO_URI_PATIENT`.

Standalone note: Spring Boot does not automatically read `.env` files. If you run `./mvnw ...` directly, set the same variables in your shell/IDE run configuration (or run via Docker Compose).
