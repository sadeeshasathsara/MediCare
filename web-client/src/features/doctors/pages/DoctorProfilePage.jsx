import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Camera, Mail, Phone, Stethoscope, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDoctorByUserId, updateDoctorProfile } from "../services/doctorApi";

export default function DoctorProfilePage() {
  const { user } = useAuth();
  const doctorId = user?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    phone: user?.doctorProfile?.phone || "",
    specialty: user?.doctorProfile?.specialty || "",
    licenseNumber: user?.doctorProfile?.licenseNumber || "",
    consultationFee: "",
  });

  const initials = useMemo(() => {
    const base = (user?.fullName || user?.email || "D").trim();
    return base ? base.slice(0, 1).toUpperCase() : "D";
  }, [user?.email, user?.fullName]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!doctorId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const data = await getDoctorByUserId(doctorId);
        if (cancelled) return;

        setForm((prev) => ({
          ...prev,
          fullName: data?.fullName ?? prev.fullName,
          phone: data?.phone ?? prev.phone,
          specialty: data?.specialty ?? prev.specialty,
          licenseNumber: data?.licenseNumber ?? prev.licenseNumber,
          consultationFee:
            data?.consultationFee != null &&
            !Number.isNaN(Number(data.consultationFee))
              ? String(data.consultationFee)
              : prev.consultationFee,
        }));
      } catch {
        // If the doctor record doesn't exist yet, the first Save will create it.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!doctorId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone,
        specialty: form.specialty,
        licenseNumber: form.licenseNumber,
      };

      const feeTrimmed = String(form.consultationFee ?? "").trim();
      if (feeTrimmed !== "") {
        const feeNumber = Number(feeTrimmed);
        if (Number.isNaN(feeNumber) || feeNumber < 0) {
          setError("Consultation fee must be a number (0 or greater). ");
          setSaving(false);
          return;
        }
        payload.consultationFee = feeNumber;
      }

      await updateDoctorProfile(doctorId, payload);
      setSuccess("Profile updated.");
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.response?.data?.error;
      setError(
        typeof message === "string" && message
          ? message
          : "Failed to update profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="h-28 w-full bg-gradient-to-b from-primary/15 to-background" />
        <div className="px-5 pb-5">
          <div className="-mt-10 flex flex-col items-center text-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center">
                <span className="text-2xl font-semibold text-muted-foreground">
                  {initials}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full border border-border bg-background flex items-center justify-center">
                <Camera size={16} className="text-muted-foreground" />
              </div>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your doctor profile details.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-4">
          {error ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-primary">
              {success}
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  Account
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <Field
                  icon={Mail}
                  label="Email"
                  value={user?.email || ""}
                  disabled={true}
                  helper="Email is managed by the authentication service."
                />
                <Field
                  icon={User}
                  label="Name"
                  value={form.fullName}
                  onChange={(v) => setForm((s) => ({ ...s, fullName: v }))}
                  disabled={loading || saving}
                  placeholder="Full name"
                />
                <Field
                  icon={Phone}
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
                  disabled={loading || saving}
                  placeholder="Phone"
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">
                  Professional
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <Field
                  label="License"
                  value={form.licenseNumber}
                  onChange={(v) => setForm((s) => ({ ...s, licenseNumber: v }))}
                  placeholder="License number"
                  disabled={loading || saving}
                />
                <Field
                  label="Specialty"
                  value={form.specialty}
                  onChange={(v) => setForm((s) => ({ ...s, specialty: v }))}
                  placeholder="Specialty"
                  disabled={loading || saving}
                />
                <Field
                  label="Consultation Fee"
                  value={form.consultationFee}
                  onChange={(v) =>
                    setForm((s) => ({ ...s, consultationFee: v }))
                  }
                  placeholder="0"
                  disabled={loading || saving}
                  helper="This is the price patients pay for a consultation."
                  inputMode="decimal"
                />
              </div>
            </section>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || saving || !doctorId}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  disabled,
  placeholder,
  helper,
  icon: Icon,
  onChange,
  inputMode,
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Icon size={16} className="text-muted-foreground" />
          </div>
        ) : null}
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!onChange}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          inputMode={inputMode}
          className={
            `w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm text-foreground outline-none ` +
            `placeholder:text-muted-foreground/70 disabled:opacity-60 ` +
            (Icon ? "pl-10" : "")
          }
        />
      </div>
      {helper ? (
        <span className="block text-xs text-muted-foreground">{helper}</span>
      ) : null}
    </label>
  );
}
