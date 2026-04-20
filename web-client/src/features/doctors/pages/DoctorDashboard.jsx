import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import DashboardMetrics from "../components/DashboardMetrics";
import AppointmentsList from "@/features/appointments/components/AppointmentsList";
import AvailabilitySlots from "../components/AvailabilitySlots";
import {
  fetchAppointments,
  selectAppointmentsByParams,
  selectAppointmentsStatusByParams,
} from "@/store/slices/appointmentsSlice";
import {
  fetchDoctorAvailability,
  selectDoctorAvailability,
  selectDoctorAvailabilityStatus,
} from "@/store/slices/doctorsSlice";

export default function DoctorDashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const doctorId = user?.id || "";

  const appointmentParams = useMemo(() => ({ doctorId }), [doctorId]);
  const appointments = useSelector((state) =>
    selectAppointmentsByParams(state, appointmentParams),
  );
  const appointmentsStatus = useSelector((state) =>
    selectAppointmentsStatusByParams(state, appointmentParams),
  );
  const availability = useSelector((state) =>
    selectDoctorAvailability(state, doctorId),
  );
  const availabilityStatus = useSelector((state) =>
    selectDoctorAvailabilityStatus(state, doctorId),
  );
  const loading =
    !doctorId ||
    appointmentsStatus === "idle" ||
    appointmentsStatus === "loading" ||
    availabilityStatus === "idle" ||
    availabilityStatus === "loading";

  useEffect(() => {
    if (!doctorId) return;
    dispatch(fetchAppointments({ params: { doctorId } }));
    dispatch(fetchDoctorAvailability({ doctorId }));
  }, [dispatch, doctorId]);

  const pendingAppointments = appointments.filter(
    (a) => a.status === "PENDING",
  );
  const upcomingAppointments = appointments.filter(
    (a) => a.status === "CONFIRMED",
  );

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse text-muted-foreground font-medium">
        Preparing dashboard...
      </div>
    );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="space-y-3 pb-4 border-b">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Welcome back, Dr. {user?.name}
        </h1>
        <p className="text-base text-muted-foreground">
          Here's a quick overview of your schedule, patient requests, and active
          consultation slots.
        </p>
      </div>

      {/* KPI Metrics */}
      <DashboardMetrics
        pendingCount={pendingAppointments.length}
        upcomingCount={upcomingAppointments.length}
        slotsCount={availability.length}
      />

      {/* Content rows */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 mt-8">
        {/* Recent pending requests */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold tracking-tight mb-2 flex items-center gap-2">
            Requires Action
            <span className="flex h-5 w-5 ml-1 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {pendingAppointments.length}
            </span>
          </h3>
          <div className="max-h-125 overflow-y-auto pr-2 pb-2">
            <AppointmentsList
              appointments={pendingAppointments.slice(0, 4)}
              handleStatusUpdate={() => {}} // Simplified, you'd integrate the actual function here if you wanted interactions from dash
              isDoctor={true}
              gridClassName="grid gap-4 grid-cols-1"
            />
          </div>
        </div>

        {/* Availability Slots Overview */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold tracking-tight border-l-4 pl-3 border-l-primary mb-2">
            Availability Schedule
          </h3>
          <div className="bg-card rounded-xl p-4 shadow-sm border">
            <AvailabilitySlots slots={availability} />
          </div>
        </div>
      </div>
    </div>
  );
}
