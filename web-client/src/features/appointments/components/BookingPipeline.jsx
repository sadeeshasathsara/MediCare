import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Stethoscope,
  ClipboardList,
  CreditCard,
  AlertCircle,
  Search,
  UserRound
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import { getPatientProfile } from "@/features/patients/services/patientApi";
import {
  fetchDoctors,
  fetchDoctorSpecialties,
  fetchDoctorById,
  selectDoctors,
  selectDoctorsStatus,
  selectDoctorsPagination,
  selectDoctorSpecialties,
  selectDoctorSpecialtiesStatus,
  selectCurrentDoctor,
} from "@/store/slices/doctorsSlice";
import {
  createPatientAppointment,
  fetchAppointmentById,
  selectCreateAppointmentState,
} from "@/store/slices/appointmentsSlice";
import { getDoctorAvailability } from "@/features/doctors/services/doctorApi";
import { confirmAppointmentAfterPayment } from "@/features/appointments/services/appointmentApi";
import BookingStepper from "./BookingStepper";
import DoctorSelectionCard from "./DoctorSelectionCard";
import HealthDatePicker from "./HealthDatePicker";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PatientPaymentTab from "@/features/payments/components/PatientPaymentTab";

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeDoctorDisplayName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const stripped = raw.replace(/^(dr\.?\s+)+/i, '').trim();
  return stripped ? `Dr. ${stripped}` : 'Dr.';
}

function formatLongDateOrToday(dateStr) {
  const parsed = new Date(dateStr);
  const date = dateStr && Number.isFinite(parsed.getTime()) ? parsed : new Date();
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

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

export default function BookingPipeline() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userId = user?.id || "";

  const [searchParams, setSearchParams] = useSearchParams();
  const queryDoctorId = searchParams.get('doctorId') || "";
  const querySpecialty = searchParams.get('specialty') || "";
  const queryAppointmentId = searchParams.get('appointmentId') || "";

  const prefill = location.state?.prefill;
  const prefillSpecialty = String(prefill?.specialty || querySpecialty || "").trim();
  const prefillDoctorId = String(prefill?.doctorId || queryDoctorId || "").trim();

  const stepParam = parseInt(searchParams.get('step') || '1', 10);
  const currentStep = !isNaN(stepParam) && stepParam >= 1 && stepParam <= 5 ? stepParam : (prefillDoctorId ? 2 : 1);

  const setCurrentStep = (step, options = {}) => {
    const { appointmentId } = options;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('step', step);
    if (form.doctorId) newParams.set('doctorId', form.doctorId);
    const idToPersist = appointmentId || createdAppointmentId || queryAppointmentId;
    if (idToPersist) newParams.set('appointmentId', idToPersist);
    setSearchParams(newParams);
  };
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [createdAppointmentId, setCreatedAppointmentId] = useState("");

  // If the page reloads (e.g., after Stripe 3DS), restore appointmentId from URL.
  useEffect(() => {
    if (!createdAppointmentId && queryAppointmentId) {
      setCreatedAppointmentId(queryAppointmentId);
    }
  }, [createdAppointmentId, queryAppointmentId]);

  const [form, setForm] = useState({
    specialty: prefillSpecialty,
    doctorId: prefillDoctorId,
    scheduledAtDate: "",
    scheduledAtTime: "",
    slotId: "",
    reason: "",
    searchQuery: "",
  });

  // Default the scheduling date to today when scheduling/review/payment steps load.
  useEffect(() => {
    if (currentStep < 2 || currentStep > 5) return;

    setForm((prev) => {
      if (prev.scheduledAtDate) return prev;
      return { ...prev, scheduledAtDate: formatDateStr(new Date()) };
    });
  }, [currentStep]);

  const [availability, setAvailability] = useState([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const doctors = useSelector(selectDoctors);
  const doctorsStatus = useSelector(selectDoctorsStatus);
  const { totalPages, page } = useSelector(selectDoctorsPagination);
  const specialties = useSelector(selectDoctorSpecialties);
  const specialtiesStatus = useSelector(selectDoctorSpecialtiesStatus);
  const createAppointmentState = useSelector(selectCreateAppointmentState);

  const [currentPage, setCurrentPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(form.searchQuery);

  const loadingOptions =
    doctorsStatus === "idle" ||
    doctorsStatus === "loading" ||
    specialtiesStatus === "idle" ||
    specialtiesStatus === "loading";
  const submitting = createAppointmentState.status === "loading";

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(form.searchQuery);
      setCurrentPage(0); // Reset page on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [form.searchQuery]);

  // Reset page when specialty changes
  useEffect(() => {
    setCurrentPage(0);
  }, [form.specialty]);

  // Fetch initial non-paged reference data
  useEffect(() => {
    if (!userId) return;
    dispatch(fetchDoctorSpecialties());
    getPatientProfile(userId).then(setProfile).catch(() => null);
  }, [dispatch, userId]);

  // Fetch paginated doctors
  useEffect(() => {
    dispatch(fetchDoctors({
      params: {
        search: debouncedSearch,
        specialty: form.specialty,
        page: currentPage,
        limit: 8
      },
      force: true
    }));
  }, [dispatch, debouncedSearch, form.specialty, currentPage]);

  const filteredDoctors = Array.isArray(doctors) ? doctors : [];
  const currentDoctor = useSelector(selectCurrentDoctor);

  const selectedDoctor = useMemo(() => {
    const listDoctor = filteredDoctors.find(d => d.id === form.doctorId);
    if (listDoctor) return listDoctor;
    if (currentDoctor && currentDoctor.id === form.doctorId) return currentDoctor;
    return null;
  }, [filteredDoctors, currentDoctor, form.doctorId]);

  // If URL has a doctorId but it's not in the paged list yet, fetch it individually.
  // Don't block on doctorsStatus — fire immediately on mount.
  useEffect(() => {
    if (form.doctorId && !selectedDoctor) {
      dispatch(fetchDoctorById(form.doctorId));
    }
  }, [form.doctorId, selectedDoctor, dispatch]);

  // FETCH AVAILABILITY WHEN DOCTOR IS SELECTED
  useEffect(() => {
    if (!selectedDoctor?.id) {
      setAvailability([]);
      return;
    }

    const loadAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const data = await getDoctorAvailability(selectedDoctor.id);
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

    // Filter to available slots that are NOT full
    return availability.filter(slot =>
      slot.dayOfWeek === dayOfWeek &&
      slot.status === 'AVAILABLE' &&
      (slot.currentBookings ?? 0) < slot.maxCapacity
    );
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
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setError("");
    setCurrentStep(currentStep - 1);
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
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.fullName || selectedDoctor.email,
      doctorSpecialty: selectedDoctor.specialty || "General",
      patientName,
      scheduledAt: new Date(dateTime).toISOString(),
      reason: form.reason.trim(),
    };

    try {
      const response = await dispatch(createPatientAppointment(payload)).unwrap();
      const newId = response?.id || "";
      setCreatedAppointmentId(newId);
      setCurrentStep(5, { appointmentId: newId }); // advance to payment step + persist id
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <BookingStepper currentStep={currentStep} />

      <div className="min-h-[400px]">
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
                  <p className="text-xs text-muted-foreground">Search and choose the right expert</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search doctor name..."
                    value={form.searchQuery || ''}
                    onChange={(e) => setForm(f => ({ ...f, searchQuery: e.target.value, doctorId: "" }))}
                    className="w-full pl-9 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <select
                  value={form.specialty}
                  onChange={(e) => setForm(f => ({ ...f, specialty: e.target.value, doctorId: "" }))}
                  className="w-full sm:w-auto rounded-lg border bg-background px-3 py-2 text-sm min-w-[160px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">All Specialties</option>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {loadingOptions ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-2xl border border-dashed">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No doctors found</h3>
                <p className="text-muted-foreground">Try selecting a different specialty or clearing filters.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDoctors.map(doctor => (
                    <DoctorSelectionCard
                      key={doctor.id}
                      doctor={doctor}
                      isSelected={form.doctorId === doctor.id}
                      onSelect={(d) => setForm(f => ({ ...f, doctorId: d.id }))}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4">
                    <p className="text-sm text-muted-foreground font-medium">
                      Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={page === 0 || loadingOptions}
                        className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        aria-label="Previous Page"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1 || loadingOptions}
                        className="p-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        aria-label="Next Page"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* STEP 2: SCHEDULING */}
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
                  placeholder="Describe your symptoms or reason for the visit..."
                  value={form.reason}
                  onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full min-h-[200px] p-4 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 transition-all text-base"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4: REVIEW & CONFIRM */}
        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="overflow-hidden border-2 border-primary/20">
              <div className="bg-primary/5 p-6 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Review & Confirm
                </CardTitle>
              </div>
              <CardContent className="p-6 space-y-6">
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
                  <div className="space-y-1 col-span-2">
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Reason</p>
                    <p className="font-medium text-sm italic">"{form.reason}"</p>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 bg-muted/30 border-t flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Consultation Fee</p>
                  <p className="text-2xl font-bold">{selectedDoctor?.consultationFee ? `$${selectedDoctor.consultationFee.toFixed(2)}` : 'TBD'}</p>
                </div>
                <p className="text-xs text-muted-foreground italic tracking-wide">Payment collected at next step</p>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 5: PAYMENT */}
        {currentStep === 5 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
              <CalendarPlus className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Appointment booked successfully</p>
                <p className="text-xs text-muted-foreground">Complete your payment below to confirm the session with {normalizeDoctorDisplayName(selectedDoctor?.fullName)}.</p>
              </div>
            </div>
            <PatientPaymentTab
              user={user}
              userId={userId}
              showSavedRecords={false}
              editableDetails={false}
              initialAmount={selectedDoctor?.consultationFee != null ? String(selectedDoctor.consultationFee) : ''}
              initialCurrency="usd"
              initialDescription={`Appointment ${createdAppointmentId || queryAppointmentId || ''} with ${normalizeDoctorDisplayName(selectedDoctor?.fullName)} on ${formatLongDateOrToday(form.scheduledAtDate)}`.trim()}
              onPaymentSuccess={async () => {
                const appointmentId = createdAppointmentId || queryAppointmentId;
                try {
                  if (appointmentId) {
                    await confirmAppointmentAfterPayment(appointmentId);
                    // Refresh cache so appointment status isn't stuck as PENDING.
                    await dispatch(fetchAppointmentById(appointmentId)).unwrap();
                  }
                } catch (e) {
                  console.error('Failed to confirm appointment after payment', e);
                  setError(formatApiError(e));
                  return;
                }

                if (appointmentId) {
                  navigate(`/appointments/${appointmentId}`, { replace: true });
                } else {
                  navigate('/appointments', { replace: true });
                }
              }}
            />
          </div>
        )}
      </div>

      {/* ERROR */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* CONTROLS */}
      <div className={`flex items-center pt-8 border-t ${currentStep === 1 ? 'justify-end' : 'justify-between'}`}>
        {currentStep > 1 && (
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 5 || submitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft size={16} /> Previous
          </Button>
        )}

        {currentStep < 4 ? (
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="flex items-center gap-2 px-8"
          >
            Next Step <ChevronRight size={16} />
          </Button>
        ) : currentStep === 4 ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-10 bg-primary hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />}
            Confirm Booking
          </Button>
        ) : null}
      </div>
    </div>
  );
}
