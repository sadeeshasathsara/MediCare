import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getDoctorAvailability } from "../services/doctorApi";
import { getAppointments } from "@/features/appointments/services/appointmentApi";
import DashboardMetrics from "../components/DashboardMetrics";
import AppointmentsList from "@/features/appointments/components/AppointmentsList";
import AvailabilitySlots from "../components/AvailabilitySlots";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      try {
        const [appsData, availData] = await Promise.all([
          getAppointments({ doctorId: user.id }),
          getDoctorAvailability(user.id),
        ]);
        setAppointments(appsData);
        setAvailability(availData);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

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
          <div className="max-h-[500px] overflow-y-auto pr-2 pb-2">
            <AppointmentsList
              appointments={pendingAppointments.slice(0, 4)}
              handleStatusUpdate={() => {}} // Simplified, you'd integrate the actual function here if you wanted interactions from dash
              isDoctor={true}
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
