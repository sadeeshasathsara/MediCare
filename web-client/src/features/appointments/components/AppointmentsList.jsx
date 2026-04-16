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
import { 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  MapPin, 
  CheckCircle2, 
  Circle,
  Clock3,
  XCircle,
  MoreHorizontal
} from "lucide-react";

const STAGES = [
  { id: 'PENDING', label: 'Requested' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'COMPLETED', label: 'Completed' }
];

function StatusPipeline({ currentStatus }) {
  const isCancelled = currentStatus === 'CANCELLED';
  
  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive text-sm font-medium">
        <XCircle className="h-4 w-4" /> This appointment has been cancelled.
      </div>
    );
  }

  const getStageIndex = (status) => STAGES.findIndex(s => s.id === status);
  const currentIndex = getStageIndex(currentStatus);

  return (
    <div className="py-4">
      <div className="relative flex justify-between items-center">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted z-0" />
        
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex || currentStatus === 'COMPLETED';
          const isCurrent = idx === currentIndex && currentStatus !== 'COMPLETED';
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                isCurrent ? 'bg-background border-primary text-primary' : 
                'bg-background border-muted text-muted-foreground'
              }`}>
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : 
                 isCurrent ? <Clock3 className="h-4 w-4 animate-pulse" /> : 
                 <Circle className="h-4 w-4" />}
              </div>
              <span className={`absolute top-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider ${
                isCompleted || isCurrent ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AppointmentsList({
  appointments,
  handleStatusUpdate,
  isDoctor,
}) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed p-20 text-center flex flex-col items-center gap-4">
        <div className="bg-muted p-4 rounded-full">
          <Calendar className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-semibold">No appointments yet</h3>
          <p className="text-muted-foreground max-w-xs mx-auto">When you schedule or receive consultations, they will appear here as a clear pipeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {appointments.slice().sort((a,b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)).map((app) => (
        <Card
          key={app.id}
          className="group overflow-hidden relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-muted hover:border-primary/20"
        >
          {/* Status color strip */}
          <div className={`h-1.5 w-full ${
            app.status === 'PENDING' ? 'bg-orange-400' :
            app.status === 'CONFIRMED' ? 'bg-green-500' :
            app.status === 'CANCELLED' ? 'bg-destructive' : 'bg-primary'
          }`} />

          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {isDoctor ? <User className="h-5 w-5 text-primary" /> : <Stethoscope className="h-5 w-5 text-primary" />}
                  {isDoctor ? app.patientName : `Dr. ${app.doctorName}`}
                </CardTitle>
                {!isDoctor && (
                  <CardDescription className="font-medium text-primary">
                    {app.doctorSpecialty || "General Medicine"} Specialist
                  </CardDescription>
                )}
              </div>
              <Badge variant={app.status === 'CANCELLED' ? 'destructive' : 'secondary'} className="font-bold">
                {app.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/30 border space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{new Date(app.scheduledAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{new Date(app.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Reason for Consultation</p>
              <p className="text-sm font-medium line-clamp-2 italic">"{app.reason || 'No description provided'}"</p>
            </div>

            <StatusPipeline currentStatus={app.status} />

            <div className="pt-6 border-t flex items-center justify-between gap-3">
              {app.status === "PENDING" ? (
                <div className="flex gap-2 w-full">
                  {isDoctor ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(app.id, "CONFIRMED")}
                        className="flex-1 font-bold shadow-sm"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(app.id, "CANCELLED")}
                        className="flex-1 font-bold border-destructive text-destructive hover:bg-destructive/5"
                      >
                        Decline
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(app.id, "CANCELLED")}
                      className="w-full font-bold border-destructive text-destructive hover:bg-destructive/5"
                    >
                      Cancel Appointment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-muted-foreground italic">
                    ID: {app.id.substring(0, 8)}...
                  </span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
