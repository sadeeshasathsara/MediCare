import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import { fetchAppointmentById, selectAppointmentById, updateAppointmentNotesById } from "@/store/slices/appointmentsSlice";
import { fetchPrescriptionsByAppointment, selectPrescriptionsByAppointment, createPrescription } from "@/store/slices/prescriptionsSlice";
import { fetchPatientReports, selectPatientReports, uploadPatientReport } from "@/store/slices/patientReportsSlice";
import { getAppointments } from "@/features/appointments/services/appointmentApi";
import { listUserPayments } from "@/features/payments/services/paymentApi";
import DocumentViewer from "@/components/DocumentViewer";
import ProfileAvatar from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Video,
  CreditCard,
  FileText,
  Activity,
  History,
  Pill,
  Paperclip,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TimerReset,
  Syringe,
  HeartPulse,
  FlaskConical,
  ScanLine,
  Download,
  Plus,
  ClipboardEdit,
} from "lucide-react";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "bg-amber-500/15 text-amber-600 border-amber-500/30", icon: AlertCircle, bar: "bg-amber-500" },
  CONFIRMED: { label: "Confirmed", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", icon: CheckCircle2, bar: "bg-emerald-500" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/15 text-red-600 border-red-500/30", icon: XCircle, bar: "bg-red-500" },
  COMPLETED: { label: "Completed", color: "bg-primary/10 text-primary border-primary/30", icon: CheckCircle2, bar: "bg-primary" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DetailsSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-pulse">
      <Skeleton className="h-8 w-40" />
      <div className="rounded-2xl border p-6 space-y-4">
        <div className="flex gap-5 items-center">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ─── Info chip ────────────────────────────────────────────────────────────────
function InfoChip({ icon: Icon, label, value, highlight }) {
  const IconComponent = Icon;
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${highlight ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-muted"}`}>
      <IconComponent className={`h-4 w-4 shrink-0 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? "text-primary" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Prescription card ────────────────────────────────────────────────────────
const MOCK_PRESCRIPTIONS = [
  { id: 1, name: "Amoxicillin", dose: "500 mg", frequency: "3×/day", duration: "7 days", type: "Antibiotic" },
  { id: 2, name: "Ibuprofen", dose: "400 mg", frequency: "2×/day", duration: "5 days", type: "Pain Relief" },
];

function PrescriptionRow({ rx }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-muted">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Syringe className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-sm">{rx.name}</p>
          <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground font-medium">{rx.type}</span>
        </div>
        <p className="text-xs text-muted-foreground">{rx.dose} · {rx.frequency} · {rx.duration}</p>
      </div>
      <Button variant="ghost" size="sm" className="gap-1 text-xs cursor-pointer">
        <Download className="h-3.5 w-3.5" /> Export
      </Button>
    </div>
  );
}

// ─── History timeline entry ───────────────────────────────────────────────────
const MOCK_HISTORY = [
  { id: 1, date: "Mar 2025", title: "Hypertension Diagnosis", icon: HeartPulse, note: "Blood pressure consistently above 140/90. Started Losartan 50mg." },
  { id: 2, date: "Jan 2025", title: "Annual Blood Panel", icon: FlaskConical, note: "Cholesterol: 185 mg/dL. All markers within normal range." },
  { id: 3, date: "Oct 2024", title: "Chest X-Ray", icon: ScanLine, note: "Lungs clear. No abnormalities identified." },
];

function HistoryEntry({ entry }) {
  const Icon = entry.icon;
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="h-9 w-9 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="w-[2px] flex-1 bg-border mt-2" />
      </div>
      <div className="pb-6 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm">{entry.title}</p>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{entry.date}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{entry.note}</p>
      </div>
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────
const MOCK_DOCS = [
  { id: 1, name: "Blood Test Results — March 2025.pdf", size: "1.2 MB", type: "Lab Report", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", mimetype: "application/pdf" },
  { id: 2, name: "Chest X-Ray — October 2024.png", size: "3.8 MB", type: "Imaging", url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg", mimetype: "image/jpeg" },
];

function formatMoneyFromCents(amountCents, currency) {
  const cents = Number(amountCents);
  if (!Number.isFinite(cents)) return "-";
  const code = String(currency || "usd").toUpperCase();
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

function pickPaymentForAppointment(payments, appointment) {
  const list = Array.isArray(payments) ? payments : [];
  if (!appointment) return list[0] || null;

  const apptId = String(appointment.id || "").trim();
  const succeeded = list.filter((p) => p?.status === "SUCCEEDED");

  if (apptId) {
    const exact = succeeded.find((p) => String(p?.description || "").includes(apptId));
    if (exact) return exact;
  }

  // Fallback: pick the latest SUCCEEDED payment.
  const toTime = (val) => {
    if (!val) return 0;
    const d = new Date(val);
    const t = d.getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const succeededSorted = [...succeeded].sort((a, b) => {
    const aTime = toTime(a?.paidAt) || toTime(a?.createdAt) || toTime(a?.updatedAt);
    const bTime = toTime(b?.paidAt) || toTime(b?.createdAt) || toTime(b?.updatedAt);
    return bTime - aTime;
  });

  return succeededSorted[0] || list[0] || null;
}

function downloadBillingReportPng({ appointment, payment }) {
  const a = appointment || {};
  const p = payment || {};

  const canvas = document.createElement("canvas");
  const width = 980;
  const height = 620;
  const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.floor(width * scale);
  canvas.height = Math.floor(height * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("MediCare — Billing Report", 40, 56);

  ctx.fillStyle = "#334155";
  ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const nowStr = new Date().toLocaleString();
  ctx.fillText(`Generated: ${nowStr}`, 40, 80);

  // Divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 102);
  ctx.lineTo(width - 40, 102);
  ctx.stroke();

  const leftX = 40;
  const rightX = 520;
  let y = 140;

  const label = (x, yPos, text) => {
    ctx.fillStyle = "#64748b";
    ctx.font = "700 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(String(text).toUpperCase(), x, yPos);
  };

  const value = (x, yPos, text) => {
    ctx.fillStyle = "#0f172a";
    ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    const s = String(text ?? "-");
    ctx.fillText(s, x, yPos);
  };

  // Appointment block
  label(leftX, y, "Appointment");
  y += 22;
  value(leftX, y, `ID: ${a.id || "-"}`);
  y += 20;
  value(leftX, y, `Doctor: Dr. ${a.doctorName || "-"}`);
  y += 20;
  value(leftX, y, `Patient: ${a.patientName || "-"}`);
  y += 20;
  value(leftX, y, `Scheduled: ${a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "-"}`);

  // Payment block
  let y2 = 140;
  label(rightX, y2, "Payment");
  y2 += 22;
  value(rightX, y2, `Status: ${p.status || "-"}`);
  y2 += 20;
  value(rightX, y2, `Amount: ${formatMoneyFromCents(p.amount, p.currency)}`);
  y2 += 20;
  value(rightX, y2, `Paid At: ${p.paidAt ? new Date(p.paidAt).toLocaleString() : "-"}`);
  y2 += 20;
  value(rightX, y2, `Card: ${p.cardBrand ? `${p.cardBrand} •••• ${p.cardLast4 || ""}`.trim() : "-"}`);
  y2 += 20;
  value(rightX, y2, `Intent: ${p.stripePaymentIntentId || "-"}`);

  // Description
  ctx.fillStyle = "#64748b";
  ctx.font = "700 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("DESCRIPTION", 40, 360);
  ctx.fillStyle = "#0f172a";
  ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const desc = String(p.description || "-");
  const maxWidth = width - 80;
  const words = desc.split(/\s+/);
  let line = "";
  let dy = 386;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth) {
      ctx.fillText(line, 40, dy);
      dy += 18;
      line = w;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, 40, dy);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billing-appointment-${a.id || "report"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function DocumentRow({ doc, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors border border-muted cursor-pointer group"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.name}</p>
        <p className="text-xs text-muted-foreground">{doc.type} · {doc.size}</p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const dispatch = useDispatch();
  const { user } = useAuth();

  const userId = user?.id || "";
  const isDoctor = user?.role === "DOCTOR";
  const rolePrefix = isDoctor ? "/doctor" : "";

  const appointment = useSelector((s) => selectAppointmentById(s, id));
  const [fetchStatus, setFetchStatus] = useState("idle");
  const [viewerDoc, setViewerDoc] = useState(null);

  // States for dynamic functionality
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  const [isAddingMed, setIsAddingMed] = useState(false);
  const [medData, setMedData] = useState({ name: "", dose: "", frequency: "", duration: "", type: "General" });

  const patientId = appointment?.patientId;

  // Redux connected data
  const prescriptionsState = useSelector((s) => selectPrescriptionsByAppointment(s, id));
  const reportsState = useSelector((s) => selectPatientReports(s, patientId));
  const fileInputRef = React.useRef(null);

  const [medicalHistory, setMedicalHistory] = useState([]);
  const [historyFetched, setHistoryFetched] = useState(false);

  const [billingOpen, setBillingOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingPayment, setBillingPayment] = useState(null);

  useEffect(() => {
    setFetchStatus("loading");
    dispatch(fetchAppointmentById(id))
      .unwrap()
      .then(() => setFetchStatus("succeeded"))
      .catch(() => setFetchStatus("failed"));
  }, [id, dispatch]);

  const openBilling = async () => {
    if (isDoctor) return;
    if (!userId) return;

    setBillingOpen(true);
    setBillingLoading(true);
    setBillingError("");
    setBillingPayment(null);

    try {
      const payments = await listUserPayments(userId);
      const selected = pickPaymentForAppointment(payments, appointment);
      setBillingPayment(selected);
      if (!selected) {
        setBillingError("No payment record found for this appointment yet.");
      }
    } catch (e) {
      setBillingError(e?.response?.data?.message || e?.message || "Failed to load payment details");
    } finally {
      setBillingLoading(false);
    }
  };

  const openTelemedicineCall = () => {
    if (!appointment) return;
    if (!isRemote) return;

    const status = String(appointment.status || '').toUpperCase();
    const blockedStatuses = new Set(["CANCELLED", "COMPLETED"]);
    if (blockedStatuses.has(status)) return;

    if (isDoctor) {
      window.open(`/doctor/telemedicine/${appointment.id}?autostart=1&popup=1`, "_blank");
      return;
    }

    window.open(`/telemedicine/${appointment.id}?autojoin=1&popup=1`, "_blank");
  };

  useEffect(() => {
    if (appointment && currentTab === "prescriptions" && prescriptionsState.status === "idle") {
      dispatch(fetchPrescriptionsByAppointment(id));
    }
  }, [appointment, currentTab, prescriptionsState.status, id, dispatch]);

  useEffect(() => {
    if (appointment && currentTab === "documents" && reportsState.status === "idle") {
      dispatch(fetchPatientReports(appointment.patientId));
    }
  }, [appointment, currentTab, reportsState.status, dispatch]);

  useEffect(() => {
    if (appointment && currentTab === "history" && !historyFetched) {
      getAppointments({ patientId: appointment.patientId, filter: "PAST", limit: 5 })
        .then((res) => {
          setMedicalHistory(res.content || []);
          setHistoryFetched(true);
        })
        .catch((err) => console.error("Failed to fetch history:", err));
    }
  }, [appointment, currentTab, historyFetched]);

  const handleSaveNotes = () => {
    if (!notesInput.trim()) return;
    dispatch(updateAppointmentNotesById({ appointmentId: id, status: appointment.status, notes: notesInput }))
      .unwrap()
      .then(() => setIsEditingNotes(false))
      .catch((err) => console.error("Failed to update notes", err));
  };

  const handleSaveMedication = () => {
    if (!medData.name || !medData.dose) return;
    dispatch(createPrescription({
      doctorId: appointment.doctorId,
      payload: {
        patientId: appointment.patientId,
        appointmentId: id,
        diagnosis: "General",
        notes: "",
        medications: [medData]
      }
    }))
      .unwrap()
      .then(() => {
        setIsAddingMed(false);
        setMedData({ name: "", dose: "", frequency: "", duration: "", type: "General" });
      })
      .catch(console.error);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !patientId) return;
    dispatch(uploadPatientReport({ patientId, file })).unwrap().catch(console.error);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isLoading = !appointment && (fetchStatus === "idle" || fetchStatus === "loading");

  if (isLoading) return <DetailsSkeleton />;

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Appointment not found</h2>
        <p className="text-muted-foreground text-sm">This appointment may have been removed or you don't have access.</p>
        <Button onClick={() => navigate(`${rolePrefix}/appointments`)} className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Appointments
        </Button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;
  // Platform is online-only: treat all appointments as telemedicine.
  const isRemote = true;
  const isActive = appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED";

  const scheduledDate = new Date(appointment.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const formattedTime = scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-5xl mx-auto pb-24 space-y-6">

      {/* ── Back navigation ── */}
      <Button
        variant="ghost"
        className="gap-2 -ml-2 text-muted-foreground hover:text-foreground cursor-pointer"
        onClick={() => navigate(`${rolePrefix}/appointments`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Appointments
      </Button>

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* status bar at top */}
        <div className={`h-1.5 w-full ${cfg.bar}`} />

        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between">

            {/* Avatars + name */}
            <div className="flex items-center gap-6">
              <div className="relative flex items-center -space-x-4 shrink-0">
                {/* Doctor Avatar */}
                <div
                  className="h-20 w-20 rounded-full border-4 border-card shadow-md overflow-hidden z-10 relative group"
                  title={`Dr. ${appointment.doctorName}`}
                >
                  <ProfileAvatar
                    src={null}
                    alt={`Dr. ${appointment.doctorName}`}
                    className="h-full w-full rounded-full"
                    fallback={
                      <div className="h-full w-full flex items-center justify-center bg-primary/10">
                        <Stethoscope className="h-8 w-8 text-primary" />
                      </div>
                    }
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-medium text-white tracking-wider uppercase">Doctor</span>
                  </div>
                </div>

                {/* Patient Avatar */}
                <div
                  className="h-20 w-20 rounded-full border-4 border-card shadow-md overflow-hidden z-20 relative group"
                  title={appointment.patientName}
                >
                  <ProfileAvatar
                    src={`/patients/${appointment.patientId}/profile-photo`}
                    alt={appointment.patientName}
                    className="h-full w-full rounded-full"
                    fallback={
                      <div className="h-full w-full flex items-center justify-center bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                    }
                  />
                  <div className="absolute inset-0 rounded-full bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-medium text-white tracking-wider uppercase">Patient</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    {appointment.patientName} <span className="text-muted-foreground font-normal mx-1">&</span> Dr. {appointment.doctorName}
                  </h1>
                  <StatusBadge status={appointment.status} />
                </div>
                <p className="text-muted-foreground font-medium text-sm">
                  {appointment.doctorSpecialty || "General Medicine"} Consultation
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5 font-mono">ID: {appointment.id}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 shrink-0">
              {isRemote ? (
                <Button
                  className="gap-2 font-semibold cursor-pointer shadow-sm"
                  onClick={openTelemedicineCall}
                  disabled={["CANCELLED", "COMPLETED"].includes(String(appointment.status || "").toUpperCase())}
                  title={
                    ["CANCELLED", "COMPLETED"].includes(String(appointment.status || "").toUpperCase())
                      ? "Not available for cancelled or completed appointments"
                      : ""
                  }
                >
                  <Video className="h-4 w-4" /> Join Video Consultation
                </Button>
              ) : null}
              {!isDoctor ? (
                <Button variant="outline" className="gap-2 cursor-pointer" onClick={openBilling}>
                  <CreditCard className="h-4 w-4" /> Billing
                </Button>
              ) : null}
              {isDoctor && appointment.status === "CONFIRMED" && (
                <Button variant="outline" className="gap-2 cursor-pointer">
                  <ClipboardEdit className="h-4 w-4" /> Write Notes
                </Button>
              )}
            </div>
          </div>

          {/* Info chips row */}
          <div className="flex flex-wrap gap-3 mt-6">
            <InfoChip icon={Calendar} label="Date" value={formattedDate} />
            <InfoChip icon={Clock} label="Time" value={formattedTime} highlight />
            <InfoChip icon={Video} label="Type" value="Telemedicine" />
            {!isDoctor && <InfoChip icon={Stethoscope} label="Specialty" value={appointment.doctorSpecialty || "General Medicine"} />}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-1">
          {[
            { val: "overview", label: "Overview", icon: Activity },
            { val: "prescriptions", label: "Prescriptions", icon: Pill },
            { val: "history", label: "Medical History", icon: History },
            { val: "documents", label: "Documents", icon: Paperclip },
          ].map(({ val, label, icon }) => {
            const Icon = icon
            return (
            <TabsTrigger
              key={val}
              value={val}
              className="cursor-pointer inline-flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4 data-[state=active]:shadow-none text-sm font-medium text-muted-foreground data-[state=active]:text-primary transition-colors"
            >
              <Icon className="h-4 w-4" /> {label}
            </TabsTrigger>
            )
          })}
        </TabsList>

        <div className="mt-6">

          {/* ── Overview ── */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-5">

              {/* Left column: Reason + Notes */}
              <div className="md:col-span-2 space-y-5">

                <Card className="border-muted/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> Reason for Consultation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80 leading-relaxed italic bg-muted/30 rounded-lg p-4 border text-sm">
                      "{appointment.reason || "No reason provided by the patient."}"
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-muted/60">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <ClipboardEdit className="h-4 w-4 text-primary" /> Clinical Notes
                    </CardTitle>
                    {isDoctor && isActive && !isEditingNotes && (
                      <Button onClick={() => { setNotesInput(appointment.notes || ""); setIsEditingNotes(true); }} variant="ghost" size="sm" className="gap-1.5 text-xs cursor-pointer h-7">
                        <Plus className="h-3.5 w-3.5" /> {appointment.notes ? "Edit Notes" : "Add Notes"}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes ? (
                      <div className="space-y-3">
                        <Textarea
                          value={notesInput}
                          onChange={(e) => setNotesInput(e.target.value)}
                          placeholder="Enter clinical notes, diagnoses, and observations..."
                          className="min-h-[120px] text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
                          <Button size="sm" onClick={handleSaveNotes}>Save Notes</Button>
                        </div>
                      </div>
                    ) : appointment?.notes ? (
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed p-4 bg-muted/20 rounded-lg border">
                        {appointment.notes}
                      </div>
                    ) : (
                      <div className="min-h-[100px] rounded-lg border border-dashed bg-muted/20 flex flex-col items-center justify-center gap-2 p-6 text-center">
                        <ClipboardEdit className="h-7 w-7 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          {isDoctor
                            ? (isActive ? "Click 'Add Notes' to start documenting post-consultation observations." : "No clinical notes were recorded for this appointment.")
                            : "Your doctor hasn't published any clinical notes for this visit yet."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* Right column: Vitals + Details */}
              <div className="space-y-5">

                {/* ── Appointment Timeline ── */}
                <Card className="border-muted/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TimerReset className="h-4 w-4 text-primary" /> Appointment Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {[
                      {
                        label: "Booked",
                        value: appointment.createdAt
                          ? new Date(appointment.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                          : "—",
                        icon: Calendar,
                        done: true,
                      },
                      {
                        label: "Scheduled",
                        value: new Date(appointment.scheduledAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }),
                        icon: Clock,
                        done: appointment.status === "COMPLETED" || appointment.status === "CONFIRMED",
                      },
                      {
                        label: "Status",
                        value: <StatusBadge status={appointment.status} />,
                        icon: Activity,
                        done: appointment.status === "COMPLETED",
                      },
                    ].map(({ label, value, icon, done }, idx) => {
                      const Icon = icon
                      return (
                      <div key={label} className="flex gap-3 pb-4 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border-2 ${done ? "bg-primary/10 border-primary/40" : "bg-muted border-muted"
                            }`}>
                            <Icon className={`h-3.5 w-3.5 ${done ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                          {idx < 2 && <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[16px]" />}
                        </div>
                        <div className="pt-1 pb-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                          <div className="text-xs font-medium mt-0.5">{value}</div>
                        </div>
                      </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* ── Pre-Consultation Checklist ── */}
                <Card className="border-muted/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {isDoctor ? "Doctor Preparation" : "Before Your Session"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5">
                    {(isDoctor ? [
                      { text: "Review patient's past consultation notes", done: false },
                      { text: "Check any uploaded documents or reports", done: false },
                      { text: "Prepare any required prescription templates", done: false },
                      { text: "Ensure your video/audio is working", done: false },
                    ] : [
                      { text: "Test your camera and microphone", done: false },
                      { text: "Find a quiet, well-lit private space", done: false },
                      { text: "Have your ID and insurance info ready", done: false },
                      { text: "List your current medications", done: false },
                      { text: "Write down your symptoms and questions", done: false },
                    ]).map(({ text, done }) => (
                      <div key={text} className="flex items-start gap-2.5">
                        <div className={`h-4 w-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${done ? "bg-primary border-primary" : "border-muted-foreground/30"
                          }`}>
                          {done && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="text-xs text-muted-foreground leading-relaxed">{text}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

              </div>
            </div>
          </TabsContent>

          {/* ── Prescriptions ── */}
          <TabsContent value="prescriptions">
            <Card className="border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" /> Prescriptions
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Medications issued during this consultation</p>
                </div>
                {isDoctor && isActive && !isAddingMed && (
                  <Button onClick={() => setIsAddingMed(true)} size="sm" className="gap-2 text-xs cursor-pointer">
                    <Plus className="h-3.5 w-3.5" /> Add Medication
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {isAddingMed && (
                  <div className="p-4 border rounded-xl bg-muted/10 space-y-3 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input placeholder="Medication name" value={medData.name} onChange={(e) => setMedData({ ...medData, name: e.target.value })} className="col-span-2 md:col-span-1" />
                      <Input placeholder="Dose (e.g. 500mg)" value={medData.dose} onChange={(e) => setMedData({ ...medData, dose: e.target.value })} />
                      <Input placeholder="Frequency" value={medData.frequency} onChange={(e) => setMedData({ ...medData, frequency: e.target.value })} />
                      <Input placeholder="Duration" value={medData.duration} onChange={(e) => setMedData({ ...medData, duration: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingMed(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveMedication}>Save</Button>
                    </div>
                  </div>
                )}
                {prescriptionsState.items?.flatMap(p => p.medications).length > 0 ? (
                  prescriptionsState.items.flatMap(p => p.medications).map((rx, idx) => (
                    <PrescriptionRow
                      key={`${rx.name}-${idx}`}
                      rx={{ name: rx.name, dose: rx.dosage, frequency: rx.frequency, duration: rx.duration, type: "Prescribed" }}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed bg-muted/10">
                    <Pill className="h-10 w-10 text-muted-foreground/30" />
                    <div>
                      <p className="font-semibold text-foreground/70">No prescriptions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Medications prescribed will appear here.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Medical History ── */}
          <TabsContent value="history">
            <Card className="border-muted/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" /> Medical History
                </CardTitle>
                <p className="text-xs text-muted-foreground">Chronological record of past medical events</p>
              </CardHeader>
              <CardContent>
                {medicalHistory.length > 0 ? (
                  <div className="mt-2">
                    {medicalHistory.map((appt) => (
                      <HistoryEntry
                        key={appt.id}
                        entry={{
                          id: appt.id,
                          date: new Date(appt.scheduledAt).toLocaleDateString(undefined, { month: "short", year: "numeric" }),
                          title: `${appt.doctorSpecialty || 'General'} Consultation`,
                          icon: History,
                          note: appt.notes || appt.reason || 'No clinical notes available.'
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border border-dashed bg-muted/10">
                    <History className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No medical history available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Documents ── */}
          <TabsContent value="documents">
            <Card className="border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-primary" /> Documents & Attachments
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Lab results, X-rays, and medical certificates</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,image/png,image/jpeg"
                />
                <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="gap-2 text-xs cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Upload
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportsState.items?.length > 0 ? (
                  reportsState.items.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={{
                        name: doc.displayFileName || doc.originalFileName,
                        size: (doc.size / 1024 / 1024).toFixed(2) + ' MB',
                        type: doc.contentType?.includes('pdf') ? "Document" : "Image",
                        url: `${import.meta.env.VITE_API_BASE_URL || "/api"}/patients/${patientId}/reports/${doc.id}/download`,
                        mimetype: doc.contentType
                      }}
                      onClick={() => setViewerDoc({
                        ...doc,
                        name: doc.displayFileName || doc.originalFileName,
                        url: `${import.meta.env.VITE_API_BASE_URL || "/api"}/patients/${patientId}/reports/${doc.id}/download`,
                        mimetype: doc.contentType
                      })}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center rounded-xl border-2 border-dashed bg-muted/5">
                    <Paperclip className="h-10 w-10 text-muted-foreground/30" />
                    <div>
                      <p className="font-semibold text-foreground/70">No documents attached</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload diagnostic files to share with your doctor.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </Tabs>

      {billingOpen ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setBillingOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <Card className="border shadow-sm max-h-[85vh] overflow-auto">
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">Billing Report</CardTitle>
                    <p className="text-sm text-muted-foreground">Payment details for this appointment</p>
                  </div>
                  <Button variant="ghost" className="cursor-pointer" onClick={() => setBillingOpen(false)}>
                    Close
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {billingLoading ? (
                    <div className="text-sm text-muted-foreground">Loading payment details…</div>
                  ) : billingError ? (
                    <div className="text-sm text-destructive">{billingError}</div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Appointment</p>
                      <p className="text-sm"><span className="text-muted-foreground">ID:</span> <span className="font-medium">{appointment?.id}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Doctor:</span> <span className="font-medium">Dr. {appointment?.doctorName}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Patient:</span> <span className="font-medium">{appointment?.patientName}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Scheduled:</span> <span className="font-medium">{appointment?.scheduledAt ? new Date(appointment.scheduledAt).toLocaleString() : "-"}</span></p>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                      <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Payment</p>
                      <p className="text-sm"><span className="text-muted-foreground">Status:</span> <span className="font-medium">{billingPayment?.status || "-"}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{formatMoneyFromCents(billingPayment?.amount, billingPayment?.currency)}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Paid At:</span> <span className="font-medium">{billingPayment?.paidAt ? new Date(billingPayment.paidAt).toLocaleString() : "-"}</span></p>
                      <p className="text-sm"><span className="text-muted-foreground">Card:</span> <span className="font-medium">{billingPayment?.cardBrand ? `${billingPayment.cardBrand} •••• ${billingPayment.cardLast4 || ""}`.trim() : "-"}</span></p>
                      <p className="text-sm break-all"><span className="text-muted-foreground">Intent:</span> <span className="font-medium">{billingPayment?.stripePaymentIntentId || "-"}</span></p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-2">
                    <p className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Description</p>
                    <p className="text-sm text-foreground/90 break-words">{billingPayment?.description || "-"}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      className="cursor-pointer"
                      disabled={!billingPayment}
                      onClick={() => downloadBillingReportPng({ appointment, payment: billingPayment })}
                    >
                      Download PNG
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      <DocumentViewer
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
        url={viewerDoc?.url || ""}
        filename={viewerDoc?.name || "Document"}
        mimetype={viewerDoc?.mimetype || ""}
      />
    </div>
  );
}
