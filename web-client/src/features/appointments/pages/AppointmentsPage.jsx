import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import AppointmentsList from "../components/AppointmentsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const baseParams = useMemo(() => {
    if (!userId) return {};
    return isDoctor ? { doctorId: userId } : { patientId: userId };
  }, [userId, isDoctor]);

  const upcomingParams = useMemo(() => ({ ...baseParams, filter: "UPCOMING", limit: 8 }), [baseParams]);
  const pastParams = useMemo(() => ({ ...baseParams, filter: "PAST", limit: 8 }), [baseParams]);

  const upcomingQuery = useSelector((state) => selectAppointmentsQuery(state, upcomingParams));
  const pastQuery = useSelector((state) => selectAppointmentsQuery(state, pastParams));



  useEffect(() => {
    if (!userId) return;
    if (upcomingQuery.status === 'idle') dispatch(fetchAppointments({ params: upcomingParams }));
    if (pastQuery.status === 'idle') dispatch(fetchAppointments({ params: pastParams }));
  }, [dispatch, userId, upcomingParams, pastParams, upcomingQuery.status, pastQuery.status]);

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

  const isUpcomingInitialLoading = (upcomingQuery.status === 'idle' || upcomingQuery.status === 'loading') && !upcomingQuery.items.length;
  const isPastInitialLoading = (pastQuery.status === 'idle' || pastQuery.status === 'loading') && !pastQuery.items.length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground text-sm">
          Manage your active schedule, view past medical interactions, and control your time.
        </p>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="upcoming" className="cursor-pointer">
            Upcoming ({upcomingQuery.items?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="past" className="cursor-pointer">
            Past ({pastQuery.items?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingQuery.error && <div className="p-3 mb-4 bg-red-100 text-red-600 rounded">Error: {upcomingQuery.error}</div>}
          <AppointmentsList
            appointments={upcomingQuery.items || []}
            handleStatusUpdate={handleStatusUpdate}
            isDoctor={isDoctor}
            cancelingId={cancelingId}
            hasMore={upcomingQuery.hasMore}
            onLoadMore={handleLoadMoreUpcoming}
            isLoadingMore={upcomingQuery.status === 'loading'}
            isInitialLoading={isUpcomingInitialLoading}
          />
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastQuery.error && <div className="p-3 mb-4 bg-red-100 text-red-600 rounded">Error: {pastQuery.error}</div>}
          <AppointmentsList
            appointments={pastQuery.items || []}
            handleStatusUpdate={handleStatusUpdate}
            isDoctor={isDoctor}
            cancelingId={cancelingId}
            hasMore={pastQuery.hasMore}
            onLoadMore={handleLoadMorePast}
            isLoadingMore={pastQuery.status === 'loading'}
            isInitialLoading={isPastInitialLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
