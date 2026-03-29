# Payment Service

The billing mechanism microservice for the MediCare platform. 

## Responsibility
This isolated scope securely handles financial records, invoice delivery models, connection layers to external payment gateways, and insurance claim calculations.

## Stack
- Java 17
- Spring Boot 3
- Lombok

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```
*Note: It is generally recommended to run this within the fully deployed Docker Compose macro-system.*
*(Also available through the global gateway at `http://localhost:8080/api/payments/`)*
