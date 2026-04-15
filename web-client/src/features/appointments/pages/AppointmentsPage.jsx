import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import AppointmentsList from "../components/AppointmentsList";
import {
  fetchAppointments,
  selectAppointmentsByParams,
  selectAppointmentsStatusByParams,
  updateAppointmentStatusById,
} from "@/store/slices/appointmentsSlice";

export default function AppointmentsPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const userId = user?.id || "";
  const isDoctor = user?.role === "DOCTOR";

  const appointments = useSelector((state) =>
    selectAppointmentsByParams(
      state,
      userId ? (isDoctor ? { doctorId: userId } : { patientId: userId }) : {},
    ),
  );
  const status = useSelector((state) =>
    selectAppointmentsStatusByParams(
      state,
      userId ? (isDoctor ? { doctorId: userId } : { patientId: userId }) : {},
    ),
  );
  const loading = status === "idle" || status === "loading";

  useEffect(() => {
    if (!userId) return;
    const params = isDoctor ? { doctorId: userId } : { patientId: userId };
    dispatch(fetchAppointments({ params }));
  }, [dispatch, isDoctor, userId]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await dispatch(
        updateAppointmentStatusById({ appointmentId: id, status }),
      ).unwrap();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center animate-pulse text-muted-foreground font-medium">
        Loading your appointments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Manage your schedule, confirmations, and general consultation
          requests.
        </p>
      </div>

      <AppointmentsList
        appointments={appointments}
        handleStatusUpdate={handleStatusUpdate}
        isDoctor={isDoctor}
      />
    </div>
  );
}
