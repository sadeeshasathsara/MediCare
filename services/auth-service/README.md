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
