import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLayout from '@/components/layout/AdminLayout'
import TopNavLayout from '@/components/layout/TopNavLayout'
import DashboardPage from '@/pages/DashboardPage'
import CreateAdminPage from '@/pages/CreateAdminPage'
import PendingDoctorsPage from '@/pages/PendingDoctorsPage'
import LandingPage from '@/pages/LandingPage'
import { useAuth } from '@/context/AuthContext'

// ── Auth (Member 1) ────────────────────────────────────
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'

// ── Patients (Member 1) ────────────────────────────────
import PatientDashboard from '@/features/patients/pages/PatientDashboard'
import PatientProfilePage from '@/features/patients/pages/PatientProfilePage'

// ── Doctors (Member 2) ─────────────────────────────────
import DoctorDashboard from '@/features/doctors/pages/DoctorDashboard'
import DoctorProfilePage from '@/features/doctors/pages/DoctorProfilePage'

// ── Shared Microservices Pages ─────────────────────────
import AppointmentsPage from '@/features/appointments/pages/AppointmentsPage'
import TelemedicinePage from '@/features/telemedicine/pages/TelemedicinePage'
import PaymentsPage from '@/features/payments/pages/PaymentsPage'
import NotificationsPage from '@/features/notifications/pages/NotificationsPage'
import SymptomCheckerPage from '@/features/ai-symptom/pages/SymptomCheckerPage'

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
  { label: 'Dashboard', path: '/patient/dashboard' },
  { label: 'Appointments', path: '/patient/appointments' },
  { label: 'Telemedicine', path: '/patient/telemedicine' },
  { label: 'Payments', path: '/patient/payments' },
  { label: 'Notifications', path: '/patient/notifications' },
  { label: 'AI Symptom', path: '/patient/symptom-checker' },
  { label: 'Profile', path: '/patient/profile' },
]

const doctorLinks = [
  { label: 'Dashboard', path: '/doctor/dashboard' },
  { label: 'Appointments', path: '/doctor/appointments' },
  { label: 'Telemedicine', path: '/doctor/telemedicine' },
  { label: 'Payments', path: '/doctor/payments' },
  { label: 'Notifications', path: '/doctor/notifications' },
  { label: 'Profile', path: '/doctor/profile' },
]

export default function AppRoutes() {
  const { loading, accessToken, user } = useAuth()

  const requireRole = (role, element) => {
    if (loading) return null
    if (!accessToken) return <Navigate to="/login" replace />
    if (user?.role !== role) {
      return (
        <TopNavLayout>
          <div className="text-center py-20">
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 opacity-60">You don’t have permission to view this page.</p>
          </div>
        </TopNavLayout>
      )
    }
    return element
  }

  const requireAdmin = (element) => {
    if (loading) return null
    if (!accessToken) return <Navigate to="/login" replace />
    if (user?.role !== 'ADMIN') {
      return (
        <TopNavLayout>
          <div className="text-center py-20">
            <h1 className="text-2xl font-semibold">Access denied</h1>
            <p className="mt-2 opacity-60">Admin access is required.</p>
          </div>
        </TopNavLayout>
      )
    }
    return element
  }

  const roleHome = () => {
    if (loading) return null
    if (!accessToken) return <LandingPage />

    if (user?.role === 'ADMIN') {
      return (
        <AdminLayout>
          <DashboardPage />
        </AdminLayout>
      )
    }
    if (user?.role === 'PATIENT') return <Navigate to="/patient/dashboard" replace />
    if (user?.role === 'DOCTOR') return <Navigate to="/doctor/dashboard" replace />

    return (
      <TopNavLayout>
        <div className="text-center py-20">
          <h1 className="text-2xl font-semibold">Access denied</h1>
          <p className="mt-2 opacity-60">Unknown account role.</p>
        </div>
      </TopNavLayout>
    )
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Home: redirect to role dashboard */}
      <Route path="/" element={roleHome()} />

      {/* Admin Routes — wrapped in AdminLayout */}
      <Route path="/admin/create-admin" element={requireAdmin(<AdminLayout><CreateAdminPage /></AdminLayout>)} />
      <Route path="/admin/pending-doctors" element={requireAdmin(<AdminLayout><PendingDoctorsPage /></AdminLayout>)} />

      {/* Patient Routes — wrapped in TopNavLayout */}
      <Route
        path="/patient/dashboard"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><PatientDashboard /></TopNavLayout>)}
      />
      <Route
        path="/patient/appointments"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><AppointmentsPage /></TopNavLayout>)}
      />
      <Route
        path="/patient/telemedicine"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><TelemedicinePage /></TopNavLayout>)}
      />
      <Route
        path="/patient/payments"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><PaymentsPage /></TopNavLayout>)}
      />
      <Route
        path="/patient/notifications"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><NotificationsPage /></TopNavLayout>)}
      />
      <Route
        path="/patient/symptom-checker"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><SymptomCheckerPage /></TopNavLayout>)}
      />
      <Route
        path="/patient/profile"
        element={requireRole('PATIENT', <TopNavLayout navLinks={patientLinks}><PatientProfilePage /></TopNavLayout>)}
      />

      {/* Doctor Routes — wrapped in TopNavLayout */}
      <Route
        path="/doctor/dashboard"
        element={requireRole('DOCTOR', <TopNavLayout navLinks={doctorLinks}><DoctorDashboard /></TopNavLayout>)}
      />
      <Route
        path="/doctor/appointments"
        element={requireRole('DOCTOR', <TopNavLayout navLinks={doctorLinks}><AppointmentsPage /></TopNavLayout>)}
      />
      <Route
        path="/doctor/telemedicine"
        element={requireRole('DOCTOR', <TopNavLayout navLinks={doctorLinks}><TelemedicinePage /></TopNavLayout>)}
      />
      <Route
        path="/doctor/payments"
        element={requireRole('DOCTOR', <TopNavLayout navLinks={doctorLinks}><PaymentsPage /></TopNavLayout>)}
      />
      <Route
        path="/doctor/notifications"
        element={requireRole('DOCTOR', <TopNavLayout navLinks={doctorLinks}><NotificationsPage /></TopNavLayout>)}
      />
      <Route
        path="/doctor/profile"
        element={requireRole('DOCTOR', <TopNavLayout navLinks={doctorLinks}><DoctorProfilePage /></TopNavLayout>)}
      />

      {/* Admin specific features */}
      {/* <Route path="/appointments" element={<AdminLayout><AppointmentList /></AdminLayout>} /> */}
      {/* <Route path="/appointments/book" element={<AdminLayout><BookAppointment /></AdminLayout>} /> */}
      {/* <Route path="/telemedicine" element={<AdminLayout><VideoConsultation /></AdminLayout>} /> */}
      {/* <Route path="/payments" element={<AdminLayout><PaymentHistory /></AdminLayout>} /> */}
      {/* <Route path="/notifications" element={<AdminLayout><NotificationCenter /></AdminLayout>} /> */}
      {/* <Route path="/symptom-checker" element={<AdminLayout><SymptomChecker /></AdminLayout>} /> */}

      {/* 404 */}
      <Route path="*" element={<TopNavLayout><div className="text-center py-20"><h1 className="text-2xl font-semibold">404</h1><p className="mt-2 opacity-60">Page not found</p></div></TopNavLayout>} />
    </Routes>
  )
}
