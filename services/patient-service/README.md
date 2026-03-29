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
