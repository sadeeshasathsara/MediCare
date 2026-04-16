import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Stethoscope,
  UserRound,
  ClipboardList,
  CreditCard,
  AlertCircle
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
import { getDoctorAvailability } from "@/features/doctors/services/doctorApi";
import BookingStepper from "../components/BookingStepper";
import DoctorSelectionCard from "../components/DoctorSelectionCard";
import HealthDatePicker from "../components/HealthDatePicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

export default function CreatePatientAppointmentPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.id || "";
  
  const prefill = location.state?.prefill;
  const prefillSpecialty = String(prefill?.specialty || "").trim();
  const prefillDoctorId = String(prefill?.doctorId || "").trim();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    specialty: prefillSpecialty,
    doctorId: prefillDoctorId,
    scheduledAtDate: "",
    scheduledAtTime: "",
    slotId: "",
    reason: "",
  });

  const [availability, setAvailability] = useState([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const doctors = useSelector(selectDoctors);
  const doctorsStatus = useSelector(selectDoctorsStatus);
  const specialties = useSelector(selectDoctorSpecialties);
  const specialtiesStatus = useSelector(selectDoctorSpecialtiesStatus);
  const createAppointmentState = useSelector(selectCreateAppointmentState);

  const loadingOptions =
    doctorsStatus === "idle" ||
    doctorsStatus === "loading" ||
    specialtiesStatus === "idle" ||
    specialtiesStatus === "loading";
  const submitting = createAppointmentState.status === "loading";

  useEffect(() => {
    if (!userId) return;
    dispatch(fetchDoctors());
    dispatch(fetchDoctorSpecialties());
    
    getPatientProfile(userId).then(setProfile).catch(() => null);
  }, [dispatch, userId]);

  const filteredDoctors = useMemo(() => {
    const list = Array.isArray(doctors) ? doctors : [];
    if (!form.specialty) return list;
    return list.filter(
      (d) => String(d?.specialty || "").toLowerCase() === String(form.specialty).toLowerCase()
    );
  }, [doctors, form.specialty]);

  const selectedDoctor = useMemo(() => {
    return filteredDoctors.find(d => (d.userId || d.id) === form.doctorId) || null;
  }, [filteredDoctors, form.doctorId]);

  // FETCH AVAILABILITY WHEN DOCTOR IS SELECTED
  useEffect(() => {
    if (!selectedDoctor?.userId && !selectedDoctor?.id) {
      setAvailability([]);
      return;
    }

    const loadAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const data = await getDoctorAvailability(selectedDoctor.userId || selectedDoctor.id);
        setAvailability(data);
      } catch (e) {
        console.error("Failed to load availability", e);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    loadAvailability();
  }, [selectedDoctor]);

  const mappedSlots = useMemo(() => {
    if (!form.scheduledAtDate || !availability.length) return [];
    
    // Get day of week for selected date
    const date = new Date(form.scheduledAtDate);
    const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()];
    
    return availability.filter(slot => slot.dayOfWeek === dayOfWeek && slot.status === 'AVAILABLE');
  }, [form.scheduledAtDate, availability]);

  const patientName = profile?.name || user?.name || user?.email?.split("@")[0] || "";

  const handleNext = () => {
    if (currentStep === 1 && !form.doctorId) {
      setError("Please select a doctor to continue.");
      return;
    }
    if (currentStep === 2 && (!form.scheduledAtDate || !form.scheduledAtTime)) {
      setError("Please select both date and time.");
      return;
    }
    if (currentStep === 3 && !form.reason.trim()) {
      setError("Please provide a reason for your consultation.");
      return;
    }
    
    setError("");
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setError("");
    
    const dateTime = `${form.scheduledAtDate}T${form.scheduledAtTime}`;
    const scheduledTime = new Date(dateTime).getTime();

    if (scheduledTime <= Date.now()) {
      setError("Appointment time must be in the future.");
      return;
    }

    const payload = {
      doctorId: selectedDoctor.userId || selectedDoctor.id,
      doctorName: selectedDoctor.fullName || selectedDoctor.email,
      doctorSpecialty: selectedDoctor.specialty || "General",
      patientName,
      scheduledAt: new Date(dateTime).toISOString(),
      reason: form.reason.trim(),
    };

    try {
      // NOTE: Here we would ideally also call `bookSlot(doctorId, slotId)`
      // for now we trust the booking flow will be reinforced by backend triggers.
      
      const response = await dispatch(createPatientAppointment(payload)).unwrap();
      
      navigate("/patient/payments", {
        state: {
          appointmentId: response?.id || "",
          description: `Appointment with Dr. ${payload.doctorName}`,
          returnTo: "/patient/appointments",
        },
      });
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Book Consultation</h1>
          <p className="text-muted-foreground">Follow the pipeline to schedule your medical appointment.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/patient/dashboard")}>
          Back to Dashboard
        </Button>
      </div>

      <BookingStepper currentStep={currentStep} />

      <div className="min-h-[500px]">
        {/* STEP 1: DOCTOR SELECTION */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-xl border">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Stethoscope className="text-primary h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Select a Specialist</h2>
                  <p className="text-xs text-muted-foreground">Choose the right expert for your health needs</p>
                </div>
              </div>
              <select
                value={form.specialty}
                onChange={(e) => setForm(f => ({ ...f, specialty: e.target.value, doctorId: "" }))}
                className="rounded-lg border bg-background px-3 py-2 text-sm min-w-[200px]"
              >
                <option value="">All Specialties</option>
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {loadingOptions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No doctors found</h3>
                <p className="text-muted-foreground">Try selecting a different specialty or clearing filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.map(doctor => (
                  <DoctorSelectionCard
                    key={doctor.id || doctor.userId}
                    doctor={doctor}
                    isSelected={form.doctorId === (doctor.userId || doctor.id)}
                    onSelect={(d) => setForm(f => ({ ...f, doctorId: d.userId || d.id }))}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SCHEDULING (PREMIUM EXPERIENCE) */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-4xl mx-auto bg-muted/20 p-6 rounded-3xl border">
              <HealthDatePicker
                selectedDate={form.scheduledAtDate}
                selectedSlotId={form.slotId}
                slots={mappedSlots}
                onDateChange={(date) => setForm(f => ({ ...f, scheduledAtDate: date }))}
                onSlotChange={(slotId, time) => setForm(f => ({ ...f, slotId, scheduledAtTime: time }))}
              />
              
              {isLoadingAvailability && (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Loader2 className="animate-spin h-5 w-5" /> Loading current availability...
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: DETAILS */}
        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Consultation Details
                </CardTitle>
                <CardDescription>What would you like to discuss with the doctor?</CardDescription>
              </CardHeader>
              <CardContent>
                <textarea
                  placeholder="Describe your symptoms or reason for the visit (e.g., persistent cough, annual checkup...)"
                  value={form.reason}
                  onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full min-h-[200px] p-4 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 transition-all text-base"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4: REVIEW & PAY */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="overflow-hidden border-2 border-primary/20">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Confirm & Payment
                </CardTitle>
                <CardDescription>Review your appointment details before proceeding to payment.</CardDescription>
              </div>
              <CardContent className="p-0">
                <div className="p-6 space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserRound className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{selectedDoctor?.fullName}</h4>
                      <p className="text-sm text-primary font-medium">{selectedDoctor?.specialty}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Date</p>
                      <p className="font-medium">{new Date(form.scheduledAtDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Time</p>
                      <p className="font-medium">{form.scheduledAtTime}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Consultation Reason</p>
                    <p className="font-medium p-3 rounded-lg bg-background border italic">"{form.reason}"</p>
                  </div>
                </div>

                <div className="p-6 bg-muted/30 border-t flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Consultation Fee</p>
                    <p className="text-2xl font-bold">${selectedDoctor?.consultationFee?.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">Secured by Stripe</p>
                    <div className="flex gap-1 justify-end">
                      <div className="h-4 w-6 bg-slate-300 rounded-sm" />
                      <div className="h-4 w-6 bg-slate-400 rounded-sm" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* FOOTER NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t p-4 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1 || submitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft size={16} /> Previous
          </Button>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={submitting}
              className="flex items-center gap-2 px-8"
            >
              Next Step <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-10 bg-primary hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />}
              Confirm & Book Appointment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
