import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AppointmentsList({
  appointments,
  handleStatusUpdate,
  isDoctor,
}) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="text-muted-foreground">No appointments found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
      {appointments.map((app) => (
        <Card
          key={app.id}
          className="transition-all hover:bg-muted/50 h-full flex flex-col min-w-[200px]"
        >
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start md:items-center justify-between gap-2">
              <CardTitle className="text-base break-words">
                {isDoctor ? app.patientName : `Dr. ${app.doctorName}`}
              </CardTitle>
              <Badge
                variant={
                  app.status === "PENDING"
                    ? "outline"
                    : app.status === "CONFIRMED"
                      ? "default"
                      : "secondary"
                }
              >
                {app.status}
              </Badge>
            </div>
            {!isDoctor && (
              <CardDescription>
                {app.doctorSpecialty || "General"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Scheduled:</span>{" "}
                {new Date(app.scheduledAt).toLocaleString()}
              </div>
              {app.reason && (
                <div className="text-sm text-muted-foreground break-words line-clamp-2">
                  <span className="font-medium text-foreground">Reason:</span>{" "}
                  {app.reason}
                </div>
              )}
            </div>

            {app.status === "PENDING" && (
              <div className="flex flex-wrap gap-2 pt-2">
                {isDoctor ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(app.id, "CONFIRMED")}
                      className="flex-1 min-w-[80px]"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatusUpdate(app.id, "CANCELLED")}
                      className="flex-1 min-w-[80px]"
                    >
                      Decline
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusUpdate(app.id, "CANCELLED")}
                    className="w-full"
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
  );
}
