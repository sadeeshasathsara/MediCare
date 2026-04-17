# Notification Service

Notification delivery microservice for MediCare.
This service supports email + SMS notifications with async processing and delivery tracking.

## What Is Currently Done

- Internal event ingestion APIs implemented for:
  - Appointment confirmed
  - Appointment cancelled (with refund details)
  - Consultation completed (with prescription link)
- Token-protected internal endpoints (`X-Service-Token`).
- MongoDB persistence for each recipient (patient and doctor as separate records).
- Idempotency implemented using unique key:
  - `eventId + eventType + recipientUserId + channel + smsType`
- Async worker implemented:
  - polls pending/failed notifications
  - renders HTML templates
  - sends email via SendGrid
  - sends SMS via provider adapter (Twilio implemented)
  - retries with exponential backoff
- User inbox API implemented:
  - `GET /notifications/me`
  - supports pagination + filtering by type/status
- HTML email templates added:
  - `appointment-confirmed`
  - `appointment-cancelled`
  - `consultation-completed`
- SMS templates added:
  - `booking-confirmation`
  - `appointment-reminder`
- Appointment confirmed event now creates:
  - email notifications immediately (patient + doctor)
  - booking confirmation SMS immediately (patient + doctor when phone numbers are present)
  - reminder SMS at 1 hour before appointment (patient + doctor when phone numbers are present)

## Developed APIs

Base URL via gateway: `http://localhost:8080/api/notifications`
Direct service URL (if running standalone): `http://localhost:3007`

### 1) Appointment Confirmed Event

- `POST /internal/events/appointment-confirmed`
- Header: `X-Service-Token: <NOTIFICATION_INTERNAL_TOKEN>`
- Behavior:
  - always stores email records for patient + doctor
  - additionally stores booking/reminder SMS records when `phoneNumber` is provided in recipients
  - returns `202 Accepted`.

### 2) Appointment Cancelled Event

- `POST /internal/events/appointment-cancelled`
- Header: `X-Service-Token: <NOTIFICATION_INTERNAL_TOKEN>`
- Behavior: stores 2 recipient records with cancellation/refund context, returns `202 Accepted`.

### 3) Consultation Completed Event

- `POST /internal/events/consultation-completed`
- Header: `X-Service-Token: <NOTIFICATION_INTERNAL_TOKEN>`
- Behavior: stores 2 recipient records with prescription link, returns `202 Accepted`.

### 4) Get Current User Notifications

- `GET /notifications/me?page=0&size=20&type=&status=`
- Required header: `X-User-Id: <user-id>`
- Optional query params:
  - `type`: `APPOINTMENT_CONFIRMED | APPOINTMENT_CANCELLED | CONSULTATION_COMPLETED`
  - `status`: `PENDING | SENT | FAILED`

## Email + SMS Setup Completion Tracker

Use this section to track what is still pending before email notifications are production-ready.

### 1) Required Environment Variables

Set these variables for `notification-service`:

- [ ] `SPRING_DATA_MONGODB_URI`
- [ ] `NOTIFICATION_INTERNAL_TOKEN`
- [ ] `NOTIFICATION_EMAIL_PROVIDER=sendgrid`
- [ ] `NOTIFICATION_EMAIL_FROM` (must be a verified sender/domain in SendGrid)
- [ ] `SENDGRID_API_KEY` (Mail Send permission required)
- [ ] `NOTIFICATION_SMS_ENABLED=true`
- [ ] `NOTIFICATION_SMS_PROVIDER=twilio`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_FROM_NUMBER`

Optional tuning variables:

- [ ] `NOTIFICATION_WORKER_FIXED_DELAY_MS` (default `5000`)
- [ ] `NOTIFICATION_WORKER_BATCH_SIZE` (default `25`)
- [ ] `NOTIFICATION_WORKER_MAX_ATTEMPTS` (default `5`)
- [ ] `NOTIFICATION_WORKER_RETRY_BASE_DELAY_MS` (default `30000`)
- [ ] `NOTIFICATION_RETENTION_DAYS` (default `90`)
- [ ] `CORS_ALLOWED_ORIGINS`

### 2) SendGrid Account Prerequisites

- [ ] Create SendGrid API key and keep it secure.
- [ ] Verify sender identity (single sender or authenticated domain).
- [ ] Confirm `NOTIFICATION_EMAIL_FROM` matches the verified sender.

### 3) Where To Configure

- Local run: shell environment variables before starting app.
- Docker Compose: `.env` + `docker-compose.yml` under `notification-service.environment`.
- Kubernetes: secret values + env mappings in `k8s/notification-deployment.yaml`.

### 4) Functional Verification Checklist

- [ ] `POST /internal/events/appointment-confirmed` returns `202 Accepted`.
- [ ] `GET /notifications/me` shows created records (`PENDING` initially).
- [ ] Worker processes records and status becomes `SENT`.
- [ ] SendGrid dashboard shows accepted outbound email.
- [ ] Twilio dashboard shows accepted SMS messages.
- [ ] Reminder SMS is queued for `appointmentDateTime - 1 hour`.
- [ ] Retry behavior works when key is invalid or SendGrid fails (`FAILED` with attempts).

### 5) Important Notes

- Without `SENDGRID_API_KEY`, events are accepted but delivery stays `FAILED`.
- Without a verified sender email/domain, SendGrid can reject emails.
- Without valid Twilio credentials, SMS records will move to `FAILED` and retry.
- Internal calls must include `X-Service-Token` matching `NOTIFICATION_INTERNAL_TOKEN`.
- This service is async by design: domain actions should not wait for email success.

## How To Test Created APIs

### Prerequisites

Set these environment variables:

- `SPRING_DATA_MONGODB_URI`
- `NOTIFICATION_INTERNAL_TOKEN`
- `NOTIFICATION_EMAIL_PROVIDER=sendgrid`
- `NOTIFICATION_EMAIL_FROM`
- `SENDGRID_API_KEY`
- `NOTIFICATION_SMS_ENABLED=true`
- `NOTIFICATION_SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Run service:

```bash
./mvnw clean spring-boot:run
```

Windows:

```bash
.\mvnw.cmd clean spring-boot:run
```

### A) Test Appointment Confirmed

```bash
curl -X POST "http://localhost:8080/api/notifications/internal/events/appointment-confirmed" \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: your_notification_internal_token" \
  -d '{
    "eventId": "evt-confirmed-001",
    "occurredAt": "2026-04-05T10:00:00Z",
    "appointmentId": "apt-1001",
    "sourceService": "appointment-service",
    "patient": { "userId": "user-p-1", "name": "John Patient", "email": "john.patient@example.com", "phoneNumber": "+94770000001" },
    "doctor": { "userId": "user-d-1", "name": "Dr. Smith", "email": "dr.smith@example.com", "phoneNumber": "+94770000002" },
    "appointmentDateTime": "2026-04-08T09:30:00Z",
    "channel": "video",
    "notes": "Join 5 minutes early"
  }'
```

### B) Test Appointment Cancelled

```bash
curl -X POST "http://localhost:8080/api/notifications/internal/events/appointment-cancelled" \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: your_notification_internal_token" \
  -d '{
    "eventId": "evt-cancelled-001",
    "occurredAt": "2026-04-05T11:00:00Z",
    "appointmentId": "apt-1002",
    "sourceService": "appointment-service",
    "patient": { "userId": "user-p-2", "name": "Jane Patient", "email": "jane.patient@example.com", "phoneNumber": "+94770000003" },
    "doctor": { "userId": "user-d-2", "name": "Dr. Brown", "email": "dr.brown@example.com", "phoneNumber": "+94770000004" },
    "cancellationReason": "Doctor unavailable",
    "refund": {
      "status": "INITIATED",
      "amount": 2500.00,
      "currency": "LKR",
      "reference": "rf-1002",
      "expectedAt": "2026-04-07T12:00:00Z"
    }
  }'
```

### C) Test Consultation Completed

```bash
curl -X POST "http://localhost:8080/api/notifications/internal/events/consultation-completed" \
  -H "Content-Type: application/json" \
  -H "X-Service-Token: your_notification_internal_token" \
  -d '{
    "eventId": "evt-completed-001",
    "occurredAt": "2026-04-05T12:00:00Z",
    "appointmentId": "apt-1003",
    "sourceService": "telemedicine-service",
    "patient": { "userId": "user-p-3", "name": "Alex Patient", "email": "alex.patient@example.com", "phoneNumber": "+94770000005" },
    "doctor": { "userId": "user-d-3", "name": "Dr. Taylor", "email": "dr.taylor@example.com", "phoneNumber": "+94770000006" },
    "prescription": {
      "url": "https://example.com/prescriptions/rx-1003",
      "label": "View Prescription"
    }
  }'
```

### D) Test Notification Inbox

```bash
curl "http://localhost:8080/api/notifications/notifications/me?page=0&size=20&type=APPOINTMENT_CONFIRMED&status=SENT" \
  -H "X-User-Id: user-p-1"
```

## Important Things

- Internal trigger APIs are non-blocking for business flow:
  - they store event records and return `202`, email send happens asynchronously.
- If SendGrid fails:
  - record becomes `FAILED`
  - worker retries with exponential backoff until max attempts.
- If Twilio fails:
  - SMS records become `FAILED`
  - worker retries with exponential backoff until max attempts.
- Deduplication is per recipient/channel/smsType.
- Retention is TTL based:
  - `NOTIFICATION_RETENTION_DAYS` default `90`
- Provider is currently expected as:
  - `NOTIFICATION_EMAIL_PROVIDER=sendgrid`
- SMS provider currently implemented:
  - `NOTIFICATION_SMS_PROVIDER=twilio`
- Email templates path:
  - `src/main/resources/templates/email/`
- SMS templates path:
  - `src/main/resources/templates/sms/`
