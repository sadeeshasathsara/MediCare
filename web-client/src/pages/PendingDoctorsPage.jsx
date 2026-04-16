import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/services/api";

export default function PendingDoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [actingDoctorId, setActingDoctorId] = useState(null);

  const pendingDoctors = useMemo(
    () =>
      Array.isArray(doctors)
        ? doctors.filter((doc) => doc?.doctorVerified !== true)
        : [],
    [doctors],
  );
  const pendingCount = useMemo(() => pendingDoctors.length, [pendingDoctors]);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.get("/auth/admin/pending-doctors");
      setDoctors(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      const messageFromServer =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error);

      if (!err?.response) {
        setError(
          "Cannot reach the server. Make sure the API Gateway is running.",
        );
      } else if (messageFromServer) {
        setError(messageFromServer);
      } else if (status === 403) {
        setError("Forbidden. Admin access required.");
      } else {
        setError(
          `Failed to load pending doctors${status ? ` (HTTP ${status})` : ""}.`,
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const verifyDoctor = async (doctorUserId, decision) => {
    setActingDoctorId(doctorUserId);
    setError(null);
    setSuccess(null);

    try {
      await api.post("/auth/verify-doctor", {
        doctorUserId,
        decision,
        reason: "",
      });

      setSuccess(
        decision === "APPROVE" ? "Doctor approved." : "Doctor rejected.",
      );
      await loadPending();
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      const messageFromServer =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error);

      if (!err?.response) {
        setError(
          "Cannot reach the server. Make sure the API Gateway is running.",
        );
      } else if (messageFromServer) {
        setError(messageFromServer);
      } else if (status === 403) {
        setError("Forbidden. Admin access required.");
      } else {
        setError(`Verification failed${status ? ` (HTTP ${status})` : ""}.`);
      }
    } finally {
      setActingDoctorId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Pending Doctors
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            Registered doctors awaiting admin approval.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer"
          style={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
            opacity: loading ? 0.7 : 1,
          }}
          onClick={loadPending}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "hsl(var(--border))",
            backgroundColor: "hsl(var(--accent))",
            color: "hsl(var(--foreground))",
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "hsl(var(--border))",
            backgroundColor: "hsl(var(--secondary))",
            color: "hsl(var(--secondary-foreground))",
          }}
        >
          {success}
        </div>
      ) : null}

      <div
        className="rounded-xl border p-5"
        style={{
          backgroundColor: "hsl(var(--card))",
          borderColor: "hsl(var(--border))",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-base font-semibold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Pending list
          </h2>
          <span
            className="text-sm"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {pendingCount} pending
          </span>
        </div>

        {pendingDoctors.length === 0 ? (
          <div
            className="text-sm"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            No pending doctors.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDoctors.map((doc) => {
              const profile = doc?.doctorProfile || {};
              const busy = actingDoctorId === doc?.id;

              return (
                <div
                  key={doc.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "hsl(var(--border))",
                    backgroundColor: "hsl(var(--background))",
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div
                        className="text-sm font-medium"
                        style={{ color: "hsl(var(--foreground))" }}
                      >
                        {doc.fullName}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        {doc.email}
                      </div>
                      <div
                        className="text-xs mt-2"
                        style={{ color: "hsl(var(--muted-foreground))" }}
                      >
                        License: {profile.licenseNumber || "—"} · Specialty:{" "}
                        {profile.specialty || "—"} · Phone:{" "}
                        {profile.phone || "—"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="px-3 py-2 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                        style={{
                          backgroundColor: "hsl(142 71% 45%)",
                          opacity: busy ? 0.7 : 1,
                        }}
                        onClick={() => verifyDoctor(doc.id, "APPROVE")}
                      >
                        {busy ? "Approving…" : "Approve"}
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        className="px-3 py-2 rounded-xl text-sm font-medium text-white transition-all cursor-pointer"
                        style={{
                          backgroundColor: "hsl(var(--destructive))",
                          opacity: busy ? 0.7 : 1,
                        }}
                        onClick={() => verifyDoctor(doc.id, "REJECT")}
                      >
                        {busy ? "Working…" : "Reject"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
