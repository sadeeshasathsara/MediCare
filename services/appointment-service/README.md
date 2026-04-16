# Appointment Service – API Reference & Testing Guide

> **All endpoints are accessed exclusively through the API Gateway.**
>
> **Gateway Base URL:** `http://localhost:8088`
>
> The NGINX gateway routes `/api/appointments/*` → `appointment-service:3004/*` (internal Docker network).

---

## 1. Booking & Search

### `GET /api/appointments/appointments/search` – Search available doctors
Wait, as per requirement, this searches available doctors by specialty and date.
*(Note: To get live doctor availability, this endpoint simulates it or you can directly hit the Doctor Service `GET /api/doctors/doctors?specialty=...`)*

```bash
curl "http://localhost:8088/api/appointments/appointments/search?specialty=Cardiology&date=2026-04-10" \
  -H "Authorization: Bearer <your-patient-token>"
```

### `POST /api/appointments/appointments` – Create a new appointment booking
**Role Required:** `PATIENT`

```bash
curl -X POST http://localhost:8088/api/appointments/appointments \
  -H "Authorization: Bearer <your-patient-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "doctorId": "6651abc123def456",
    "doctorName": "Dr. Jane Smith",
    "doctorSpecialty": "Cardiology",
    "patientName": "John Doe",
    "scheduledAt": "2026-04-15T10:00:00Z",
    "reason": "Routine Checkup"
  }'
```

**Response `201 Created`:**
```json
{
  "id": "appt-id-001",
  "doctorId": "6651abc123def456",
  "patientId": "user-patient-id",
  "patientName": "John Doe",
  "doctorName": "Dr. Jane Smith",
  "doctorSpecialty": "Cardiology",
  "status": "PENDING",
  "scheduledAt": "2026-04-15T10:00:00Z",
  "reason": "Routine Checkup",
  "notes": null,
  "createdAt": "2026-04-05T12:00:00Z",
  "updatedAt": "2026-04-05T12:00:00Z"
}
```

### `GET /api/appointments/appointments/{id}` – Get appointment details
**Role Required:** `PATIENT` (owner) or `DOCTOR` (assigned) or `ADMIN`

```bash
curl http://localhost:8088/api/appointments/appointments/appt-id-001 \
  -H "Authorization: Bearer <your-token>"
```

---

## 2. Modify & Cancel

### `PUT /api/appointments/appointments/{id}` – Reschedule appointment
**Role Required:** `PATIENT` (owner) or `DOCTOR` (assigned)

```bash
curl -X PUT http://localhost:8088/api/appointments/appointments/appt-id-001 \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduledAt": "2026-04-16T14:30:00Z"
  }'
```

### `PATCH /api/appointments/appointments/{id}/status` – Update Status
**Role Required:** `DOCTOR` (assigned)

Updates the status (e.g., `PENDING` -> `CONFIRMED`). Triggers Event emission.

```bash
curl -X PATCH http://localhost:8088/api/appointments/appointments/appt-id-001/status \
  -H "Authorization: Bearer <your-doctor-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED",
    "notes": "Please fast for 12 hours before appointment"
  }'
```

### `DELETE /api/appointments/appointments/{id}` – Cancel appointment
**Role Required:** `PATIENT` (owner) or `DOCTOR` (owner)

Cancels the appointment and fires an `appointment.cancelled` event.

```bash
curl -X DELETE http://localhost:8088/api/appointments/appointments/appt-id-001 \
  -H "Authorization: Bearer <your-token>"
```

---

## 3. Patient & Doctor Views

### `GET /api/appointments/appointments?patientId={id}` – List appointments for a patient
**Role Required:** `PATIENT` (owner), `DOCTOR`, or `ADMIN`

```bash
curl "http://localhost:8088/api/appointments/appointments?patientId=user-patient-id" \
  -H "Authorization: Bearer <your-token>"
```

### `GET /api/appointments/appointments?doctorId={id}` – List appointments for a doctor
**Role Required:** `DOCTOR` (owner), `PATIENT`, or `ADMIN`

```bash
curl "http://localhost:8088/api/appointments/appointments?doctorId=6651abc123def456" \
  -H "Authorization: Bearer <your-token>"
```

---

## Database & Models

**status enum:** `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`

**MongoDB Collection:** `appointments` (within `appointment-service` database)
