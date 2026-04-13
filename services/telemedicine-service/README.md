# Telemedicine Service

Spring Boot microservice for doctor-patient remote consultations with appointment decisions, Jitsi meeting sessions, consultation records, prescriptions, events, and audit logs.

## Implemented Scope

- Appointment management via Appointment Service APIs (no local appointment ownership)
- Telemedicine appointment board states (`PENDING`, `ACCEPTED`, `RESCHEDULED`, `REJECTED`, `COMPLETED`)
- Jitsi session lifecycle (`SCHEDULED`, `WAITING`, `LIVE`, `COMPLETED`, `MISSED`, `CANCELLED`)
- Consultation records and follow-up tracking
- Digital prescriptions with status transitions (`DRAFT` -> `ISSUED` -> `DISPENSED`, cancel support)
- Internal event publishing (appointment/session/prescription events)
- Audit logs for appointment/session/prescription status changes
- Session readiness check and auto-expiry scheduler
- Doctor availability slots based on confirmed telemedicine appointments
- JWT-protected APIs with doctor/patient role restrictions
- Standard response envelope: `{ success, data, message, timestamp }`

## Architecture

Layered design:
- Controllers (routes)
- Services (business logic)
- Repositories (MongoDB)
- Security filters and configs
- Scheduled jobs + event publisher

## Main Environment Variables

```env
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/telemedicine-service
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

JWT_SECRET=change_me_to_a_long_random_secret_at_least_32_chars
JWT_ISSUER=auth-service

JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=your_jitsi_app_id
JITSI_APP_SECRET=your_jitsi_app_secret
JITSI_TOKEN_VALIDITY_MINUTES=120

TELEMEDICINE_SESSION_GRACE_MINUTES=15
TELEMEDICINE_SESSION_EXPIRY_JOB_DELAY_MS=60000
TELEMEDICINE_AVAILABILITY_SLOT_MINUTES=30
TELEMEDICINE_AVAILABILITY_START_HOUR=9
TELEMEDICINE_AVAILABILITY_END_HOUR=17
TELEMEDICINE_AVAILABILITY_DAYS_AHEAD=7
TELEMEDICINE_APPOINTMENT_SERVICE_BASE_URL=http://appointment-service:3004
TELEMEDICINE_APPOINTMENT_TELEMEDICINE_KEYWORDS=telemedicine,teleconsultation,video consultation,video consult,video call,virtual consultation,online consultation,remote consultation,jitsi

TELEMEDICINE_BROKER_ENABLED=false
TELEMEDICINE_BROKER_EXCHANGE=telemedicine.events
TELEMEDICINE_ROUTING_APPOINTMENT_STATUS=appointment.status.updated
TELEMEDICINE_ROUTING_CONSULTATION_COMPLETED=consultation.completed
TELEMEDICINE_ROUTING_PRESCRIPTION_ISSUED=prescription.issued

RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
```

## Run

```bash
./mvnw clean spring-boot:run
```

## Tests

```bash
./mvnw test
```

Unit tests included for:
- Appointment status transition behavior
- Jitsi JWT token generation
- Prescription creation flow

## API Summary

Base path: `/api/v1`

### Appointment Management
- `GET /appointments?doctorId=&patientId=&status=&date=`
- `GET /appointments/{id}`
- `PATCH /appointments/{id}/accept`
- `PATCH /appointments/{id}/reject`
- `PATCH /appointments/{id}/reschedule`
- `GET /appointments/upcoming?doctorId=`

### Jitsi Session Management
- `POST /sessions`
- `GET /sessions/{id}`
- `GET /sessions/{id}/join-token?role=doctor|patient&markJoined=true|false`
- `PATCH /sessions/{id}/start`
- `PATCH /sessions/{id}/end`
- `GET /sessions?doctorId=&patientId=&status=`
- `GET /sessions/{id}/ready`

### Consultation Records
- `POST /consultations`
- `GET /consultations/{id}`
- `GET /consultations?patientId=`
- `GET /consultations?doctorId=`
- `PATCH /consultations/{id}`

### Prescriptions
- `POST /prescriptions`
- `GET /prescriptions/{id}`
- `GET /prescriptions?patientId=`
- `GET /prescriptions?consultationId=`
- `PATCH /prescriptions/{id}/cancel`
- `PATCH /prescriptions/{id}/status`

### Doctor Availability
- `GET /doctors/{id}/availability`

## Event Publishing

Published routing keys:
- `appointment.status.updated`
- `consultation.completed`
- `prescription.issued`

When `TELEMEDICINE_BROKER_ENABLED=false`, events are logged instead of being sent to RabbitMQ.
