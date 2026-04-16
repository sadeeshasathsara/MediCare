import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import TopNavLayout from "@/components/layout/TopNavLayout";
import DashboardPage from "@/pages/DashboardPage";
import CreateAdminPage from "@/pages/CreateAdminPage";
import PendingDoctorsPage from "@/pages/PendingDoctorsPage";
import LandingPage from "@/pages/LandingPage";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// ── Auth (Member 1) ────────────────────────────────────
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";

// ── Patients (Member 1) ────────────────────────────────
import PatientDashboard from "@/features/patients/pages/PatientDashboard";
import PatientProfilePage from "@/features/patients/pages/PatientProfilePage";
import AdminPatientsPage from "@/features/patients/pages/AdminPatientsPage";
import PatientTelemedicinePage from "@/features/telemedicine/pages/PatientTelemedicinePage";
import SymptomCheckerPage from '@/features/ai-symptom/pages/SymptomCheckerPage'
import BookConsultationPage from "@/features/appointments/pages/BookConsultationPage";

// ── Doctors (Member 2) ─────────────────────────────────
import DoctorDashboard from "@/features/doctors/pages/DoctorDashboard";
import DoctorProfilePage from "@/features/doctors/pages/DoctorProfilePage";
import ManageAvailabilityPage from "@/features/doctors/pages/ManageAvailabilityPage";

// ── Shared Microservices Pages ─────────────────────────
import AppointmentsPage from "@/features/appointments/pages/AppointmentsPage";
import TelemedicinePage from "@/features/telemedicine/pages/TelemedicinePage";
import PaymentsPage from "@/features/payments/pages/PaymentsPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";

// ── Appointments (Member 2) ────────────────────────────
// import AppointmentList from '@/features/appointments/pages/AppointmentList'
// import BookAppointment from '@/features/appointments/pages/BookAppointment'

// ── Telemedicine (Member 3) ────────────────────────────
// import VideoConsultation from '@/features/telemedicine/pages/VideoConsultation'

// ── Payments (Member 3) ────────────────────────────────
// import PaymentHistory from '@/features/payments/pages/PaymentHistory'

// ── Notifications (Member 4) ───────────────────────────
// import NotificationCenter from '@/features/notifications/pages/NotificationCenter'

// ── AI Symptom Checker (Member 4) ──────────────────────
// import SymptomChecker from '@/features/ai-symptom/pages/SymptomChecker'

// --- Navigation Links for Top Nav ---
const patientLinks = [
  { label: 'Dashboard', path: '/' },
  { label: 'Book Consultation', path: '/patient/book' },
  { label: 'My Appointments', path: '/appointments' },
  { label: 'AI Symptom', path: '/symptom-checker' },
]

const doctorLinks = [
  { label: "Dashboard", path: "/doctor/dashboard" },
  { label: "Appointments", path: "/doctor/appointments" },
  { label: "Availability", path: "/doctor/availability" },
  { label: "Telemedicine", path: "/doctor/telemedicine" },
  { label: "Payments", path: "/doctor/payments" },
  { label: "Notifications", path: "/doctor/notifications" },
];

export default function AppRoutes() {
  const { loading, accessToken, user } = useAuth();

  const loadingScreen = () => (
    <TopNavLayout>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
            }}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-7 w-40" />
            <Skeleton className="mt-3 h-4 w-56" />
          </div>
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
            }}
          >
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-3 h-4 w-60" />
          </div>
          <div
            className="rounded-xl border p-5"
            style={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
            }}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-44" />
            <Skeleton className="mt-3 h-4 w-52" />
          </div>
        </div>
      </div>
    </TopNavLayout>
  );

  const requireRole = (role, element) => {
    if (loading) return loadingScreen();
    if (!accessToken) return <Navigate to="/login" replace />;
    if (user?.role !== role) {
      return (
        <TopNavLayout>
          <div className="text-center py-20">
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 opacity-60">
              You don’t have permission to view this page.
            </p>
          </div>
        </TopNavLayout>
      );
    }
    return element;
  };

  const requireAdmin = (element) => {
    if (loading) return loadingScreen();
    if (!accessToken) return <Navigate to="/login" replace />;
    if (user?.role !== "ADMIN") {
      return (
        <TopNavLayout>
          <div className="text-center py-20">
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 opacity-60">Admin access is required.</p>
          </div>
        </TopNavLayout>
      );
    }
    return element;
  };

  const roleHome = () => {
    if (loading) return loadingScreen();
    if (!accessToken) return <LandingPage />;

    if (user?.role === "ADMIN") {
      return (
        <AdminLayout>
          <DashboardPage />
        </AdminLayout>
      );
    }
    if (user?.role === "PATIENT")
      return <Navigate to="/patient/dashboard" replace />;
    if (user?.role === "DOCTOR")
      return <Navigate to="/doctor/dashboard" replace />;

    return (
      <TopNavLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 opacity-60">Unknown account role.</p>
        </div>
      </TopNavLayout>
    );
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Home: redirect to role dashboard */}
      <Route path="/" element={roleHome()} />

      {/* Admin Routes — wrapped in AdminLayout */}
      <Route
        path="/admin/create-admin"
        element={requireAdmin(
          <AdminLayout>
            <CreateAdminPage />
          </AdminLayout>,
        )}
      />
      <Route
        path="/admin/pending-doctors"
        element={requireAdmin(
          <AdminLayout>
            <PendingDoctorsPage />
          </AdminLayout>,
        )}
      />
      <Route
        path="/patients"
        element={requireAdmin(
          <AdminLayout>
            <AdminPatientsPage />
          </AdminLayout>,
        )}
      />

      {/* Patient Routes — wrapped in TopNavLayout */}
      <Route
        path="/patient/dashboard"
        element={requireRole(
          "PATIENT",
          <TopNavLayout navLinks={patientLinks}>
            <PatientDashboard />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/patient/profile"
        element={requireRole(
          "PATIENT",
          <TopNavLayout navLinks={patientLinks}>
            <PatientProfilePage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/patient/book"
        element={requireRole(
          "PATIENT",
          <TopNavLayout navLinks={patientLinks}>
            <BookConsultationPage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/appointments"
        element={requireRole(
          "PATIENT",
          <TopNavLayout navLinks={patientLinks}>
            <AppointmentsPage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/symptom-checker"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><SymptomCheckerPage /></TopNavLayout>)}
      />

      {/* Doctor Routes — wrapped in TopNavLayout */}
      <Route
        path="/doctor/dashboard"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <DoctorDashboard />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/appointments"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <AppointmentsPage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/telemedicine"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <TelemedicinePage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/telemedicine/:appointmentId"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <TelemedicinePage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/payments"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <PaymentsPage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/notifications"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <NotificationsPage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/profile"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <DoctorProfilePage />
          </TopNavLayout>,
        )}
      />
      <Route
        path="/doctor/availability"
        element={requireRole(
          "DOCTOR",
          <TopNavLayout navLinks={doctorLinks}>
            <ManageAvailabilityPage />
          </TopNavLayout>,
        )}
      />

      {/* Admin specific features */}
      {/* <Route path="/appointments" element={<AdminLayout><AppointmentList /></AdminLayout>} /> */}
      {/* <Route path="/appointments/book" element={<AdminLayout><BookAppointment /></AdminLayout>} /> */}
      {/* <Route path="/telemedicine" element={<AdminLayout><VideoConsultation /></AdminLayout>} /> */}
      {/* <Route path="/payments" element={<AdminLayout><PaymentHistory /></AdminLayout>} /> */}
      {/* <Route path="/notifications" element={<AdminLayout><NotificationCenter /></AdminLayout>} /> */}
      {/* <Route path="/symptom-checker" element={<AdminLayout><SymptomChecker /></AdminLayout>} /> */}

      {/* 404 */}
      <Route
        path="*"
        element={
          <TopNavLayout>
            <div className="text-center py-20">
              <h1 className="text-2xl font-semibold">404</h1>
              <p className="mt-2 opacity-60">Page not found</p>
            </div>
          </TopNavLayout>
        }
      />
    </Routes>
  );
}
