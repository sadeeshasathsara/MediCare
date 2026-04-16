import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import AppointmentsList from "../components/AppointmentsList";
import {
  fetchAppointments,
  selectAppointmentsQuery,
  updateAppointmentStatusById,
  cancelAppointmentById,
} from "@/store/slices/appointmentsSlice";

export default function AppointmentsPage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const userId = user?.id || "";
  const isDoctor = user?.role === "DOCTOR";

  const [cancelingId, setCancelingId] = useState(null);

  const baseParams = userId ? (isDoctor ? { doctorId: userId } : { patientId: userId }) : {};
  const upcomingParams = { ...baseParams, filter: "UPCOMING", limit: 8 };
  const pastParams = { ...baseParams, filter: "PAST", limit: 8 };

  const upcomingQuery = useSelector((state) => selectAppointmentsQuery(state, upcomingParams));
  const pastQuery = useSelector((state) => selectAppointmentsQuery(state, pastParams));

  const isInitialLoading = 
    (upcomingQuery.status === "idle" || upcomingQuery.status === "loading") && 
    (pastQuery.status === "idle" || pastQuery.status === "loading") && 
    !upcomingQuery.items.length && 
    !pastQuery.items.length;

  useEffect(() => {
    if (!userId) return;
    if (upcomingQuery.status === 'idle') dispatch(fetchAppointments({ params: upcomingParams }));
    if (pastQuery.status === 'idle') dispatch(fetchAppointments({ params: pastParams }));
  }, [dispatch, userId, isDoctor, upcomingQuery.status, pastQuery.status]);

  const handleLoadMoreUpcoming = () => {
    dispatch(fetchAppointments({ 
      params: { ...upcomingParams, page: (upcomingQuery.page || 0) + 1 }, 
      isLoadMore: true 
    }));
  };

  const handleLoadMorePast = () => {
    dispatch(fetchAppointments({ 
      params: { ...pastParams, page: (pastQuery.page || 0) + 1 }, 
      isLoadMore: true 
    }));
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      if (status === "CANCELLED") setCancelingId(id);
      
      if (!isDoctor && status === "CANCELLED") {
        await dispatch(cancelAppointmentById(id)).unwrap();
      } else {
        await dispatch(
          updateAppointmentStatusById({ appointmentId: id, status }),
        ).unwrap();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      if (status === "CANCELLED") setCancelingId(null);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-muted-foreground font-medium">
        Loading your schedule...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Manage your active schedule, view past medical interactions, and control your time.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2 text-primary">Upcoming Consultations</h2>
        <AppointmentsList
          appointments={upcomingQuery.items || []}
          handleStatusUpdate={handleStatusUpdate}
          isDoctor={isDoctor}
          cancelingId={cancelingId}
          hasMore={upcomingQuery.hasMore}
          onLoadMore={handleLoadMoreUpcoming}
          isLoadingMore={upcomingQuery.status === 'loading'}
        />
      </div>

      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-semibold border-b pb-2 text-muted-foreground">Past Consultations</h2>
        <AppointmentsList
          appointments={pastQuery.items || []}
          handleStatusUpdate={handleStatusUpdate}
          isDoctor={isDoctor}
          cancelingId={cancelingId}
          hasMore={pastQuery.hasMore}
          onLoadMore={handleLoadMorePast}
          isLoadingMore={pastQuery.status === 'loading'}
        />
      </div>
    </div>
  );
}
