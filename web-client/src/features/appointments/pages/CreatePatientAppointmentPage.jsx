import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarPlus,
  Clock3,
  Loader2,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import { getPatientProfile } from "@/features/patients/services/patientApi";
import {
  fetchDoctors,
  fetchDoctorSpecialties,
  selectDoctors,
  selectDoctorsStatus,
  selectDoctorSpecialties,
  selectDoctorSpecialtiesStatus,
} from "@/store/slices/doctorsSlice";
import {
  createPatientAppointment,
  fetchAppointments,
  selectAppointmentsByParams,
  selectAppointmentsStatusByParams,
  selectCreateAppointmentState,
} from "@/store/slices/appointmentsSlice";

function formatApiError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const serverMessage =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error);

  if (!error?.response) {
    return "Cannot reach the server. Make sure the API Gateway is running.";
  }
  if (serverMessage) return serverMessage;
  return `Request failed${status ? ` (HTTP ${status})` : ""}.`;
}

function appointmentStatusStyles(status) {
  const normalized = String(status || "PENDING").toUpperCase();

  if (normalized === "CONFIRMED" || normalized === "ACCEPTED") {
    return {
      text: normalized,
      style: {
        backgroundColor: "hsl(142 52% 91%)",
        color: "hsl(142 56% 24%)",
      },
    };
  }

  if (normalized === "CANCELLED" || normalized === "REJECTED") {
    return {
      text: normalized,
      style: {
        backgroundColor: "hsl(0 85% 94%)",
        color: "hsl(0 68% 38%)",
      },
    };
  }

  if (normalized === "COMPLETED") {
    return {
      text: normalized,
      style: {
        backgroundColor: "hsl(217 50% 93%)",
        color: "hsl(217 48% 33%)",
      },
    };
  }

  return {
    text: normalized,
    style: {
      backgroundColor: "hsl(42 100% 92%)",
      color: "hsl(32 80% 32%)",
    },
  };
}

function formatAppointmentDate(dateTime) {
  if (!dateTime) return "Not set";
  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CreatePatientAppointmentPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.id || "";

  const [profile, setProfile] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    specialty: "",
    doctorId: "",
    scheduledAt: "",
    reason: "",
  });

  const patientAppointmentsParams = useMemo(
    () => ({ patientId: userId }),
    [userId],
  );

  const doctors = useSelector(selectDoctors);
  const doctorsStatus = useSelector(selectDoctorsStatus);
  const specialties = useSelector(selectDoctorSpecialties);
  const specialtiesStatus = useSelector(selectDoctorSpecialtiesStatus);
  const placedAppointments = useSelector((state) =>
    selectAppointmentsByParams(state, patientAppointmentsParams),
  );
  const appointmentsStatus = useSelector((state) =>
    selectAppointmentsStatusByParams(state, patientAppointmentsParams),
  );
  const createAppointmentState = useSelector(selectCreateAppointmentState);

  const loadingOptions =
    doctorsStatus === "idle" ||
    doctorsStatus === "loading" ||
    specialtiesStatus === "idle" ||
    specialtiesStatus === "loading";
  const loadingAppointments =
    appointmentsStatus === "idle" || appointmentsStatus === "loading";
  const submitting = createAppointmentState.status === "loading";

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setError("");

      try {
        const profileData = await getPatientProfile(userId).catch(() => null);

        setProfile(profileData);
      } catch (e) {
        setError(formatApiError(e));
      }
    };

    load();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchDoctors());
    dispatch(fetchDoctorSpecialties());
    dispatch(fetchAppointments({ params: { patientId: userId } }));
  }, [dispatch, userId]);

  const refreshPlacedAppointments = async () => {
    if (!userId) return;
    dispatch(fetchAppointments({ params: { patientId: userId }, force: true }));
  };

  const normalizedDoctors = useMemo(
    () =>
      (Array.isArray(doctors) ? doctors : [])
        .map((doctor) => ({
          ...doctor,
          appointmentDoctorId: doctor?.userId || doctor?.id || "",
        }))
        .filter((doctor) => Boolean(doctor.appointmentDoctorId))
        .sort((left, right) => {
          const leftName = String(
            left?.fullName || left?.email || "",
          ).toLowerCase();
          const rightName = String(
            right?.fullName || right?.email || "",
          ).toLowerCase();
          return leftName.localeCompare(rightName);
        }),
    [doctors],
  );

  const filteredDoctors = useMemo(() => {
    if (!form.specialty) return normalizedDoctors;
    return normalizedDoctors.filter(
      (doctor) =>
        String(doctor?.specialty || "").toLowerCase() ===
        String(form.specialty).toLowerCase(),
    );
  }, [normalizedDoctors, form.specialty]);

  const selectedDoctor = useMemo(() => {
    if (!form.doctorId) return null;
    return (
      normalizedDoctors.find(
        (doctor) => doctor.appointmentDoctorId === form.doctorId,
      ) || null
    );
  }, [normalizedDoctors, form.doctorId]);

  useEffect(() => {
    const prefill = location.state?.prefill;
    if (!prefill) return;

    const normalizedSpecialty = String(prefill.specialty || "").trim();
    const normalizedDoctorId = String(prefill.doctorId || "").trim();
    const normalizedDoctorName = String(prefill.doctorName || "").trim().toLowerCase();

    let matchedDoctor = null;
    if (normalizedDoctorId) {
      matchedDoctor = normalizedDoctors.find(
        (doctor) => doctor.appointmentDoctorId === normalizedDoctorId,
      );
    }

    if (!matchedDoctor && normalizedDoctorName) {
      matchedDoctor = normalizedDoctors.find((doctor) => {
        const name = String(doctor?.fullName || doctor?.email || "").trim().toLowerCase();
        const specialtyMatches =
          !normalizedSpecialty ||
          String(doctor?.specialty || "").toLowerCase() ===
            normalizedSpecialty.toLowerCase();
        return name === normalizedDoctorName && specialtyMatches;
      });
    }

    setForm((prev) => ({
      ...prev,
      specialty:
        (matchedDoctor?.specialty && String(matchedDoctor.specialty).trim()) ||
        normalizedSpecialty ||
        prev.specialty,
      doctorId: matchedDoctor?.appointmentDoctorId || prev.doctorId,
      reason: String(prefill.reason || "").trim() || prev.reason,
    }));
  }, [location.state, normalizedDoctors]);

  const patientName = useMemo(() => {
    const fromProfile = String(profile?.name || "").trim();
    if (fromProfile) return fromProfile;
    const fromUser = String(user?.name || "").trim();
    if (fromUser) return fromUser;
    const fromEmail = String(user?.email || "").trim();
    if (!fromEmail) return "";
    return fromEmail.split("@")[0];
  }, [profile?.name, user?.email, user?.name]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSpecialtyChange = (nextSpecialty) => {
    setForm((prev) => ({
      ...prev,
      specialty: nextSpecialty,
      doctorId: "",
    }));
  };

  const handleDoctorChange = (nextDoctorId) => {
    const doctor = normalizedDoctors.find(
      (entry) => entry.appointmentDoctorId === nextDoctorId,
    );
    setForm((prev) => ({
      ...prev,
      doctorId: nextDoctorId,
      specialty: doctor?.specialty || prev.specialty,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!patientName) {
      setError(
        "Please complete your patient profile name before creating an appointment.",
      );
      return;
    }
    if (!form.doctorId) {
      setError("Please select a doctor.");
      return;
    }
    if (!form.scheduledAt) {
      setError("Please choose date and time.");
      return;
    }

    const scheduledTime = new Date(form.scheduledAt).getTime();
    if (Number.isNaN(scheduledTime)) {
      setError("Please provide a valid appointment date and time.");
      return;
    }

    if (scheduledTime <= Date.now()) {
      setError("Appointment time must be in the future.");
      return;
    }

    const scheduledAtIso = new Date(scheduledTime).toISOString();

    const reason = String(form.reason || "").trim();
    if (!reason) {
      setError("Please enter the reason for your visit.");
      return;
    }

    const doctor = normalizedDoctors.find(
      (entry) => entry.appointmentDoctorId === form.doctorId,
    );
    if (!doctor) {
      setError("Selected doctor is invalid. Please select again.");
      return;
    }

    const payload = {
      doctorId: doctor.appointmentDoctorId,
      doctorName: String(doctor?.fullName || doctor?.email || "Doctor").trim(),
      doctorSpecialty: String(
        doctor?.specialty || form.specialty || "General",
      ).trim(),
      patientName,
      scheduledAt: scheduledAtIso,
      reason,
    };

    try {
      const response = await dispatch(
        createPatientAppointment(payload),
      ).unwrap();

      setForm((prev) => ({ ...prev, scheduledAt: "", reason: "" }));
      await dispatch(
        fetchAppointments({ params: { patientId: userId }, force: true }),
      );

      navigate("/patient/payments", {
        state: {
          appointmentId: response?.id || "",
          description: response?.id
            ? `Appointment payment (${response.id})`
            : "Appointment payment",
          returnTo: "/patient/appointments/new",
        },
      });
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Create Appointment
          </h1>
          <p
            className="text-sm"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Book a new consultation with a verified doctor.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/patient/dashboard")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
          style={{
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        >
          Back to dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div
          className="rounded-xl border p-5"
          style={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
          }}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-sm font-medium"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Specialty
                </label>
                <select
                  value={form.specialty}
                  onChange={(event) =>
                    handleSpecialtyChange(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--input))",
                    color: "hsl(var(--foreground))",
                  }}
                  disabled={loadingOptions || submitting}
                >
                  <option value="">All specialties</option>
                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-sm font-medium"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Doctor
                </label>
                <select
                  value={form.doctorId}
                  onChange={(event) => handleDoctorChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--input))",
                    color: "hsl(var(--foreground))",
                  }}
                  disabled={loadingOptions || submitting}
                  required
                >
                  <option value="">Select a doctor</option>
                  {filteredDoctors.map((doctor) => (
                    <option
                      key={doctor.appointmentDoctorId}
                      value={doctor.appointmentDoctorId}
                    >
                      {doctor.fullName ||
                        doctor.email ||
                        doctor.appointmentDoctorId}
                      {doctor.specialty ? ` (${doctor.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className="text-sm font-medium"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Patient
                </label>
                <input
                  value={patientName || "No name found"}
                  disabled
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--secondary))",
                    color: "hsl(var(--muted-foreground))",
                  }}
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium"
                  style={{ color: "hsl(var(--foreground))" }}
                >
                  Date and time
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(event) =>
                    handleChange("scheduledAt", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--input))",
                    color: "hsl(var(--foreground))",
                  }}
                  disabled={loadingOptions || submitting}
                  required
                />
              </div>
            </div>

            {selectedDoctor ? (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "hsl(var(--secondary))",
                  color: "hsl(var(--foreground))",
                }}
              >
                Booking with{" "}
                <span className="font-medium">
                  {selectedDoctor.fullName ||
                    selectedDoctor.email ||
                    selectedDoctor.appointmentDoctorId}
                </span>
                {selectedDoctor.specialty
                  ? ` (${selectedDoctor.specialty})`
                  : ""}
              </div>
            ) : null}

            <div>
              <label
                className="text-sm font-medium"
                style={{ color: "hsl(var(--foreground))" }}
              >
                Reason for visit
              </label>
              <textarea
                value={form.reason}
                onChange={(event) => handleChange("reason", event.target.value)}
                className="mt-1 w-full min-h-28 rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "hsl(var(--input))",
                  color: "hsl(var(--foreground))",
                }}
                placeholder="Describe symptoms or consultation reason"
                disabled={loadingOptions || submitting}
                required
              />
            </div>

            {error ? (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "hsl(var(--destructive))",
                  color: "hsl(var(--destructive))",
                }}
              >
                {error}
              </div>
            ) : null}

            {success ? (
              <div
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary))",
                }}
              >
                {success}{" "}
                <Link className="underline" to="/patient/telemedicine">
                  View appointments
                </Link>
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
              disabled={loadingOptions || submitting}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <CalendarPlus size={16} />
              )}
              {submitting ? "Creating appointment..." : "Create appointment"}
            </button>

            {loadingOptions ? (
              <p
                className="text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Loading doctors and specialties...
              </p>
            ) : null}
          </form>
        </div>

        <section
          className="rounded-xl border p-5 space-y-4 xl:sticky xl:top-4"
          style={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                className="text-base font-semibold flex items-center gap-2"
                style={{ color: "hsl(var(--foreground))" }}
              >
                <span
                  className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "hsl(var(--accent))",
                    color: "hsl(var(--accent-foreground))",
                  }}
                >
                  {placedAppointments.length}
                </span>
                Your placed appointments
              </h2>
              <p
                className="text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                All appointments created for your account.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshPlacedAppointments}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium"
              style={{
                borderColor: "hsl(var(--border))",
                color: "hsl(var(--foreground))",
              }}
              disabled={loadingAppointments}
            >
              {loadingAppointments ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loadingAppointments ? (
            <div className="space-y-2">
              <div
                className="h-20 rounded-lg animate-pulse"
                style={{ backgroundColor: "hsl(var(--secondary))" }}
              />
              <div
                className="h-20 rounded-lg animate-pulse"
                style={{ backgroundColor: "hsl(var(--secondary))" }}
              />
              <div
                className="h-20 rounded-lg animate-pulse"
                style={{ backgroundColor: "hsl(var(--secondary))" }}
              />
            </div>
          ) : placedAppointments.length === 0 ? (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{
                borderColor: "hsl(var(--border))",
                backgroundColor: "hsl(var(--secondary))",
                color: "hsl(var(--muted-foreground))",
              }}
            >
              No appointments placed yet. Create your first appointment from the
              form on the left.
            </div>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              {placedAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="rounded-xl border p-4 shadow-sm"
                  style={{
                    borderColor: "hsl(var(--border))",
                    background:
                      "linear-gradient(135deg, hsl(var(--secondary)) 0%, hsl(var(--card)) 100%)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {appointment.reason || "Consultation"}
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
                        <div
                          className="inline-flex items-center gap-1.5 text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <UserRound size={13} />
                          Doctor:{" "}
                          {appointment.doctorName ||
                            appointment.doctorId ||
                            "Unknown doctor"}
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <Stethoscope size={13} />
                          Specialty: {appointment.doctorSpecialty || "General"}
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <Clock3 size={13} />
                          Scheduled:{" "}
                          {formatAppointmentDate(appointment.scheduledAt)}
                        </div>
                        <div
                          className="inline-flex items-center gap-1.5 text-xs"
                          style={{ color: "hsl(var(--muted-foreground))" }}
                        >
                          <CalendarPlus size={13} />
                          Created:{" "}
                          {formatAppointmentDate(appointment.createdAt)}
                        </div>
                      </div>

                      <div
                        className="text-xs mt-3"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        Appointment ID: {appointment.id}
                      </div>
                    </div>

                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={appointmentStatusStyles(appointment.status).style}
                    >
                      {appointmentStatusStyles(appointment.status).text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
