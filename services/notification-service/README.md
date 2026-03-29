# Notification Service

The global alert mechanism microservice for the MediCare platform. 

## Responsibility
A reactive processing service dedicated entirely to async notifications. Transmits dynamic payloads as SMS alerts or rich HTML emails (e.g. appointment confirmations or billing invoices).

## Stack
- Java 17
- Spring Boot 3
- Lombok

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```
*Note: It is generally recommended to run this within the fully deployed Docker Compose macro-system.*
*(Also available through the global gateway at `http://localhost:8080/api/notifications/`)*
