import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getDoctorAvailability } from "../services/doctorApi";
import { getAppointments } from "@/features/appointments/services/appointmentApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar, Clock, Users } from "lucide-react";

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
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading dashboard...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Welcome back, Dr. {user?.email?.split("@")[0]}
        </h1>
        <p
          className="text-sm"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          Here's an overview of your schedule and patient requests.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingAppointments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires your approval
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Consultations
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingAppointments.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmed for the future
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Availability Slots
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availability.length}</div>
            <p className="text-xs text-muted-foreground">
              Configured active slots
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-lg font-medium mb-3">Recent Requests</h3>
          {pendingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending requests right now.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingAppointments.slice(0, 3).map((app) => (
                <Card key={app.id}>
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{app.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-600 rounded">
                      Pending
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
