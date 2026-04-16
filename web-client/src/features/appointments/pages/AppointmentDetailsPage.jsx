import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/context/AuthContext";
import { fetchAppointments, selectAppointmentsQuery } from "@/store/slices/appointmentsSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Video,
  CreditCard,
  FileText,
  Activity,
  History,
  Pill,
  Paperclip,
} from "lucide-react";

export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  const userId = user?.id || "";
  const isDoctor = user?.role === "DOCTOR";
  const rolePrefix = isDoctor ? "/doctor" : "";

  // 1. Fetch data from Redux
  const queryParams = userId ? (isDoctor ? { doctorId: userId } : { patientId: userId }) : {};
  const queryState = useSelector((state) => selectAppointmentsQuery(state, queryParams));
  const appointment = queryState.items.find((a) => a.id === id);

  useEffect(() => {
    if (!appointment && queryState.status === "idle") {
      dispatch(fetchAppointments({ params: queryParams }));
    }
  }, [appointment, queryState.status, dispatch, queryParams]);

  if (!appointment) {
    if (queryState.status === "loading") {
      return <div className="p-10 text-center animate-pulse text-muted-foreground">Loading appointment details...</div>;
    }
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold mb-4">Appointment not found</h2>
        <Button onClick={() => navigate(`${rolePrefix}/appointments`)}>Return to list</Button>
      </div>
    );
  }

  const isRemote = appointment.telemedicine || appointment.reason?.toLowerCase().includes("video");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Navigation */}
      <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground hover:text-foreground" onClick={() => navigate(`${rolePrefix}/appointments`)}>
        <ArrowLeft className="h-4 w-4" /> Back to Appointments
      </Button>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-background shadow-md">
              {!isDoctor && appointment.profileImageUrl ? (
                <img src={appointment.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : isDoctor ? (
                <User className="h-10 w-10 text-primary" />
              ) : (
                <Stethoscope className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {isDoctor ? appointment.patientName : `Dr. ${appointment.doctorName}`}
                </h1>
                <Badge variant={appointment.status === "CANCELLED" ? "destructive" : "secondary"} className="tracking-wide uppercase text-[10px]">
                  {appointment.status}
                </Badge>
              </div>
              <p className="text-muted-foreground font-medium flex items-center gap-2">
                {!isDoctor && <>{appointment.doctorSpecialty || "General Medicine"} Specialist &bull;</>}
                <Calendar className="h-4 w-4" /> {new Date(appointment.scheduledAt).toLocaleDateString()}
                <Clock className="h-4 w-4 ml-2" /> {new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto mt-4 md:mt-0">
            {isRemote && appointment.status === "CONFIRMED" && (
              <Button className="font-bold gap-2 flex-1 md:flex-none">
                <Video className="h-4 w-4" /> Join Video Call
              </Button>
            )}
            <Button variant="outline" className="gap-2 flex-1 md:flex-none">
              <CreditCard className="h-4 w-4" /> Billing
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val }, { replace: true })} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
          <TabsTrigger value="overview" className="cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 data-[state=active]:shadow-none">
            <Activity className="h-4 w-4 mr-2" /> Overview
          </TabsTrigger>
          <TabsTrigger value="prescriptions" className="cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 data-[state=active]:shadow-none">
            <Pill className="h-4 w-4 mr-2" /> Prescriptions
          </TabsTrigger>
          <TabsTrigger value="history" className="cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 data-[state=active]:shadow-none">
            <History className="h-4 w-4 mr-2" /> Medical History
          </TabsTrigger>
          <TabsTrigger value="documents" className="cursor-pointer rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-1 data-[state=active]:shadow-none">
            <Paperclip className="h-4 w-4 mr-2" /> Documents
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reason for Consultation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/80 leading-relaxed font-medium italic">"{appointment.reason || 'No description provided'}"</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Clinical Notes</CardTitle>
                    {isDoctor && <Button variant="ghost" size="sm">Edit Notes</Button>}
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 p-4 rounded-lg min-h-[100px] border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                      {isDoctor ? "Click 'Edit Notes' to draft observations after the consultation." : "No clinical notes have been published by the doctor yet."}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Quick Vitals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground text-sm">Blood Pressure</span>
                      <span className="font-bold">120/80</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground text-sm">Heart Rate</span>
                      <span className="font-bold">72 bpm</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Weight</span>
                      <span className="font-bold">78 kg</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-4 w-4" /> AI Report</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-4">No automated symptom analysis was generated prior to this booking.</p>
                    {isDoctor && <Button variant="outline" size="sm">Request Patient Questionnaire</Button>}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Active Prescriptions</CardTitle>
                  <p className="text-sm text-muted-foreground">Medications issued during this consultation.</p>
                </div>
                {isDoctor && <Button size="sm" className="gap-2"><Pill className="h-4 w-4" /> Add Medication</Button>}
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden flex flex-col items-center justify-center py-16 text-center bg-muted/10">
                    <Pill className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <h3 className="font-semibold text-lg text-foreground/80">No medications prescribed</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mt-1">There are no digital prescriptions on file for this appointment yet.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Medical History Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="border rounded-lg p-6 text-center bg-muted/10">
                    <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Patient history timeline will populate here based on past records.</p>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Attachments & Reports</CardTitle>
                  <p className="text-sm text-muted-foreground">Lab results, X-rays, and medical certificates.</p>
                </div>
                <Button size="sm" variant="outline" className="gap-2"><Paperclip className="h-4 w-4" /> Upload</Button>
              </CardHeader>
              <CardContent>
                 <div className="border-2 border-dashed rounded-lg p-10 text-center bg-muted/5 flex flex-col items-center">
                    <Paperclip className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="font-medium">No documents attached</p>
                    <p className="text-muted-foreground text-xs mt-1">Easily share diagnostic files before or after the consultation.</p>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
