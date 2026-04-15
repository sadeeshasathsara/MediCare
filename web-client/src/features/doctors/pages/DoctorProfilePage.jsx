import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Camera, Mail, Phone, Stethoscope, User } from "lucide-react";

export default function DoctorProfilePage() {
  const { user } = useAuth();

  const initials = useMemo(() => {
    const base = (user?.fullName || user?.email || "D").trim();
    return base ? base.slice(0, 1).toUpperCase() : "D";
  }, [user?.email, user?.fullName]);

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
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <User size={16} className="text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Account</h2>
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
              value={user?.fullName || ""}
              disabled={true}
            />
            <Field
              icon={Phone}
              label="Phone"
              value={""}
              placeholder="Not set"
              disabled={true}
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
              value={""}
              placeholder="Not set"
              disabled={true}
            />
            <Field
              label="Specialty"
              value={""}
              placeholder="Not set"
              disabled={true}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, disabled, placeholder, helper, icon: Icon }) {
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
          readOnly={true}
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
