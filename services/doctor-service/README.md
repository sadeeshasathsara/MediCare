# Doctor Service

The doctor entity microservice for the MediCare platform. 

## Responsibility
This service resolves queries and writes relative to internal staff: doctor profiles, hospital department linkage, active schedules, and specific specialty filters.

## Stack
- Java 17
- Spring Boot 3
- Lombok

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```
*Note: It is generally recommended to run this within the fully deployed Docker Compose macro-system.*
*(Also available through the global gateway at `http://localhost:8080/api/doctors/`)*
