import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAppointments,
  updateAppointmentStatus,
} from "../services/appointmentApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const params =
          user?.role === "DOCTOR"
            ? { doctorId: user.id }
            : { patientId: user.id };
        const data = await getAppointments(params);
        setAppointments(data);
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchAppointments();
  }, [user]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(
        appointments.map((a) => (a.id === id ? { ...a, status } : a)),
      );
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Loading appointments...
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Appointments
        </h1>
        <p
          className="text-sm"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          View and manage your upcoming schedule and consultations.
        </p>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No appointments found.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <CardTitle>
                  {user?.role === "DOCTOR"
                    ? app.patientName
                    : `Dr. ${app.doctorName}`}
                </CardTitle>
                <CardDescription>
                  {app.doctorSpecialty ||
                    (user?.role === "DOCTOR" ? "Patient" : "General")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Status:{" "}
                    <span className="uppercase text-primary">{app.status}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Scheduled: {new Date(app.scheduledAt).toLocaleString()}
                  </p>
                  {app.reason && (
                    <p className="text-sm mt-2 text-muted-foreground break-words">
                      Reason: {app.reason}
                    </p>
                  )}
                </div>

                {app.status === "PENDING" && (
                  <div className="flex gap-2 pt-2">
                    {user?.role === "DOCTOR" ? (
                      <>
                        <Button
                          onClick={() =>
                            handleStatusUpdate(app.id, "CONFIRMED")
                          }
                          size="sm"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            handleStatusUpdate(app.id, "CANCELLED")
                          }
                          size="sm"
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="destructive"
                        onClick={() => handleStatusUpdate(app.id, "CANCELLED")}
                        size="sm"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
