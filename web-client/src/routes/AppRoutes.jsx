import { Routes, Route } from 'react-router-dom'
import AdminLayout from '@/components/layout/AdminLayout'
import TopNavLayout from '@/components/layout/TopNavLayout'
import DashboardPage from '@/pages/DashboardPage'

// ── Auth (Member 1) ────────────────────────────────────
import LoginPage from '@/features/auth/pages/LoginPage'
// import RegisterPage from '@/features/auth/pages/RegisterPage'

// ── Patients (Member 1) ────────────────────────────────
// import PatientDashboard from '@/features/patients/pages/PatientDashboard'
// import PatientProfile from '@/features/patients/pages/PatientProfile'

// ── Doctors (Member 2) ─────────────────────────────────
// import DoctorDashboard from '@/features/doctors/pages/DoctorDashboard'
// import DoctorProfile from '@/features/doctors/pages/DoctorProfile'

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
// const patientLinks = [
//   { label: 'My Dashboard', path: '/patient/dashboard' },
//   { label: 'My Appointments', path: '/patient/appointments' },
//   { label: 'My Records', path: '/patient/records' },
// ]

// const doctorLinks = [
//   { label: 'Doctor Dashboard', path: '/doctor/dashboard' },
//   { label: 'Schedule', path: '/doctor/schedule' },
//   { label: 'Patients', path: '/doctor/patients' },
// ]

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      {/* <Route path="/register" element={<RegisterPage />} /> */}

      {/* Admin Routes — wrapped in AdminLayout */}
      <Route path="/" element={<AdminLayout><DashboardPage /></AdminLayout>} />
      
      {/* Patient Routes — wrapped in TopNavLayout */}
      {/* <Route path="/patient/dashboard" element={<TopNavLayout navLinks={patientLinks}><PatientDashboard /></TopNavLayout>} /> */}
      {/* <Route path="/patient/profile" element={<TopNavLayout navLinks={patientLinks}><PatientProfile /></TopNavLayout>} /> */}

      {/* Doctor Routes — wrapped in TopNavLayout */}
      {/* <Route path="/doctor/dashboard" element={<TopNavLayout navLinks={doctorLinks}><DoctorDashboard /></TopNavLayout>} /> */}
      {/* <Route path="/doctor/profile" element={<TopNavLayout navLinks={doctorLinks}><DoctorProfile /></TopNavLayout>} /> */}

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
