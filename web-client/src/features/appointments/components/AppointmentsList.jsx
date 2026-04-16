import React from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="py-2 px-6">
      <div className="relative flex justify-between items-center">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[1px] bg-muted z-0" />
        
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex || currentStatus === 'COMPLETED';
          const isCurrent = idx === currentIndex && currentStatus !== 'COMPLETED';
          
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div className={`h-5 w-5 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
                isCompleted ? 'bg-primary border-primary text-primary-foreground' : 
                isCurrent ? 'bg-background border-primary text-primary' : 
                'bg-background border-muted text-muted-foreground'
              }`}>
                {isCompleted ? <CheckCircle2 className="h-3 w-3" /> : 
                 isCurrent ? <Clock3 className="h-3 w-3 animate-pulse" /> : 
                 <Circle className="h-3 w-3" />}
              </div>
              <span className={`absolute top-6 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider ${
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
  cancelingId = null,
  hasMore = false,
  onLoadMore = null,
  isLoadingMore = false,
}) {
  const navigate = useNavigate();

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
    <>
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {appointments.slice().sort((a,b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)).map((app) => (
        <Card
          key={app.id}
          onClick={() => navigate(isDoctor ? `/doctor/appointments/${app.id}` : `/appointments/${app.id}`)}
          className="cursor-pointer group overflow-hidden relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-muted hover:border-primary/20 flex flex-col h-full"
        >
          {/* Status color strip */}
          <div className={`h-1.5 w-full ${
            app.status === 'PENDING' ? 'bg-orange-400' :
            app.status === 'CONFIRMED' ? 'bg-green-500' :
            app.status === 'CANCELLED' ? 'bg-destructive' : 'bg-primary'
          }`} />

          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                  {!isDoctor && app.profileImageUrl ? (
                    <img src={app.profileImageUrl} alt="Doctor" className="h-full w-full object-cover" />
                  ) : isDoctor ? (
                    <User className="h-5 w-5 text-primary" />
                  ) : (
                    <Stethoscope className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-base font-bold line-clamp-1">
                    {isDoctor ? app.patientName : `Dr. ${app.doctorName}`}
                  </CardTitle>
                  {!isDoctor && (
                    <CardDescription className="text-xs font-medium text-primary line-clamp-1">
                      {app.doctorSpecialty || "General Medicine"}
                    </CardDescription>
                  )}
                </div>
              </div>
              <Badge variant={app.status === 'CANCELLED' ? 'destructive' : 'secondary'} className="text-[10px] px-2 py-0 h-5 items-center flex">
                {app.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-4 pb-4 flex flex-col flex-1">
            <div className="p-3 rounded-lg bg-muted/30 border flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium whitespace-nowrap">{new Date(app.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium whitespace-nowrap">{new Date(app.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            <div className="space-y-1 flex-1">
              <p className="text-[10px] font-semibold text-muted-foreground tracking-wide">REASON</p>
              <p className="text-xs font-medium line-clamp-2 italic">"{app.reason || 'No description provided'}"</p>

            </div>

            <StatusPipeline currentStatus={app.status} />

            <div className="pt-4 border-t flex items-center justify-between gap-2">
              {app.status === "PENDING" ? (
                <div className="flex gap-2 w-full">
                  {isDoctor ? (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, "CONFIRMED"); }}
                        className="flex-1 text-xs shadow-sm"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={cancelingId === app.id}
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, "CANCELLED"); }}
                        className="cursor-pointer flex-1 text-xs border-destructive text-destructive hover:bg-destructive/5"
                      >
                        {cancelingId === app.id ? "Declining..." : "Decline"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancelingId === app.id}
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, "CANCELLED"); }}
                      className="cursor-pointer w-full text-xs border-destructive text-destructive hover:bg-destructive/5"
                    >
                      {cancelingId === app.id ? "canceling pending..." : "Cancel Appointment"}
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
      ))}
    </div>
    {hasMore && (
      <div className="flex justify-center mt-8">
        <Button 
          variant="outline" 
          onClick={onLoadMore} 
          disabled={isLoadingMore}
          className="rounded-full px-8 cursor-pointer shadow-sm border-primary/20 hover:border-primary/50"
        >
          {isLoadingMore ? "Loading..." : "Load More Appointments"}
        </Button>
      </div>
    )}
    </>
  );
}
