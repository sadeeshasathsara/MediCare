# Payment Service

The billing microservice for the MediCare platform.

## Responsibility
This service handles Stripe-based card payments and stores payment transaction history in MongoDB.

## Stack
- Java 17
- Spring Boot 3
- Lombok
- Stripe Java SDK
- MongoDB

## API Endpoints
- `POST /payments/users/{userId}/intent`: create a Stripe PaymentIntent and persist a pending payment record.
- `POST /payments/users/{userId}/confirm`: verify Stripe payment status and update persisted payment record.
- `GET /payments/users/{userId}`: list payment records for a user.

All endpoints are expected to be called through the API gateway path prefix:
- `http://localhost:8080/api/payments/...`

## Required Environment Variables
- `MONGO_URI_PAYMENT`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `CORS_ALLOWED_ORIGINS` (optional)

## Running Locally (Standalone)
```bash
./mvnw clean spring-boot:run
```

Note: It is generally recommended to run this via the full Docker Compose deployment.
